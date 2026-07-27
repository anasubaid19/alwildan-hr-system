import { randomInt } from "node:crypto"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq } from "drizzle-orm"

import { requireRole } from "@/lib/auth"
import { assertRole } from "@/lib/auth/roles"
import { auth } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { invite as inviteTable, user as userTable } from "@/lib/db/schema"

// Undangan admin via PIN 6 digit: super admin generate PIN di layar lalu
// menyampaikannya manual (mis. WhatsApp). Tidak ada email yang dikirim.

const INVITE_TTL_MS = 48 * 60 * 60 * 1000 // 48 jam
const MAX_VERIFY_ATTEMPTS = 3

// Pesan sengaja generik — jangan bocorkan apakah email diundang / PIN hampir benar.
const PIN_INVALID_MSG = "PIN tidak valid atau sudah kadaluarsa"

function normalizeEmail(v: unknown): string {
  const email = typeof v === "string" ? v.trim().toLowerCase() : ""
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Email tidak valid")
  }
  return email
}

function normalizePin(v: unknown): string {
  const pin = typeof v === "string" ? v.trim() : ""
  if (!/^\d{6}$/.test(pin)) throw new Error("PIN harus 6 digit angka")
  return pin
}

async function findUserByEmail(email: string) {
  const [u] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)
  return u ?? null
}

/**
 * Ambil invite pending yang cocok, sambil menegakkan batas percobaan:
 * PIN salah menambah `attempts`; percobaan ke-3 mengubah status jadi expired.
 * Semua kegagalan memakai pesan generik yang sama (anti-enumeration).
 */
async function consumePendingInvite(email: string, pin: string) {
  const [row] = await db
    .select()
    .from(inviteTable)
    .where(and(eq(inviteTable.email, email), eq(inviteTable.status, "pending")))
    .orderBy(desc(inviteTable.createdAt))
    .limit(1)
  if (!row) throw new Error(PIN_INVALID_MSG)

  if (row.expiresAt <= new Date()) {
    await db
      .update(inviteTable)
      .set({ status: "expired" })
      .where(eq(inviteTable.id, row.id))
    throw new Error(PIN_INVALID_MSG)
  }

  const pinMatch = await Bun.password.verify(pin, row.pin)
  if (!pinMatch) {
    const attempts = row.attempts + 1
    await db
      .update(inviteTable)
      .set(
        attempts >= MAX_VERIFY_ATTEMPTS
          ? { attempts, status: "expired" }
          : { attempts }
      )
      .where(eq(inviteTable.id, row.id))
    throw new Error(PIN_INVALID_MSG)
  }

  return row
}

/** Buat undangan + PIN 6 digit untuk ditampilkan sekali di layar.
 * Akses: super_admin. PIN tidak boleh dicatat ke log. */
export const generateInvitePin = createServerFn({ method: "POST" })
  .validator((d: { email: string; name: string; role: string }) => {
    const email = normalizeEmail(d.email)
    const name = (d.name ?? "").trim()
    if (!name) throw new Error("Nama wajib diisi")
    return { email, name, role: assertRole(d.role) }
  })
  .handler(async ({ data }) => {
    await requireRole("super_admin")

    if (await findUserByEmail(data.email)) {
      throw new Error("Email sudah terdaftar sebagai user")
    }

    const [pending] = await db
      .select({ id: inviteTable.id, expiresAt: inviteTable.expiresAt })
      .from(inviteTable)
      .where(
        and(
          eq(inviteTable.email, data.email),
          eq(inviteTable.status, "pending")
        )
      )
      .limit(1)
    if (pending) {
      if (pending.expiresAt > new Date()) {
        throw new Error("Email sudah diundang, tunggu sampai undangan expire")
      }
      // Pending basi — tandai expired lalu izinkan undangan baru.
      await db
        .update(inviteTable)
        .set({ status: "expired" })
        .where(eq(inviteTable.id, pending.id))
    }

    // randomInt = CSPRNG; rentang 100000-999999 menjamin 6 digit tanpa nol depan.
    const pin = String(randomInt(100000, 1000000))
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS)
    const hashedPin = await Bun.password.hash(pin, { algorithm: "bcrypt" })

    await db.insert(inviteTable).values({
      email: data.email,
      name: data.name,
      role: data.role,
      pin: hashedPin,
      expiresAt,
    })

    return {
      pin,
      name: data.name,
      email: data.email,
      role: data.role,
      expiresAt,
    }
  })

/** Cek email+PIN milik undangan yang masih berlaku (dipanggil tanpa login). */
export const verifyInvitePin = createServerFn({ method: "POST" })
  .validator((d: { email: string; pin: string }) => ({
    email: normalizeEmail(d.email),
    pin: normalizePin(d.pin),
  }))
  .handler(async ({ data }) => {
    const row = await consumePendingInvite(data.email, data.pin)

    if (await findUserByEmail(data.email)) {
      // Terdaftar duluan lewat jalur lain — undangan tak relevan lagi.
      await db.delete(inviteTable).where(eq(inviteTable.id, row.id))
      throw new Error("Email sudah terdaftar, silakan langsung login")
    }

    return { valid: true, email: row.email, name: row.name, role: row.role }
  })

/** Tukar PIN valid dengan akun baru (set password), lalu tandai undangan used. */
export const acceptInvite = createServerFn({ method: "POST" })
  .validator((d: { email: string; pin: string; password: string }) => {
    const password = typeof d.password === "string" ? d.password : ""
    if (password.length < 8) throw new Error("Password minimal 8 karakter")
    return {
      email: normalizeEmail(d.email),
      pin: normalizePin(d.pin),
      password,
    }
  })
  .handler(async ({ data }) => {
    const row = await consumePendingInvite(data.email, data.pin)

    if (await findUserByEmail(data.email)) {
      await db.delete(inviteTable).where(eq(inviteTable.id, row.id))
      throw new Error("Email sudah terdaftar, silakan langsung login")
    }

    // Pemanggil belum login, jadi tak bisa auth.api.createUser (butuh sesi
    // admin) — pakai jalur sign-up publik lalu set role sesuai undangan
    // (databaseHooks selalu memberi role staff pada user baru).
    await auth.api.signUpEmail({
      body: { email: row.email, name: row.name, password: data.password },
    })
    await db
      .update(userTable)
      .set({ role: row.role })
      .where(eq(userTable.email, row.email))

    await db
      .update(inviteTable)
      .set({ status: "used" })
      .where(eq(inviteTable.id, row.id))

    return { ok: true }
  })
