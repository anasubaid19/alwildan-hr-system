import { createHash, randomBytes } from "node:crypto"
import { createServerFn } from "@tanstack/react-start"
import { count } from "drizzle-orm"

import { requireRole, requireUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  cabang,
  gaji,
  karyawan,
  masterData,
  notifications,
  uploadLog,
} from "@/lib/db/schema"

const CODE_TTL_MS = 5 * 60 * 1000
const CODE_LENGTH = 8
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

const pendingCodes = new Map<string, { hash: string; expires: number }>()

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return code
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex")
}

function cleanExpired() {
  const now = Date.now()
  for (const [userId, entry] of pendingCodes) {
    if (entry.expires < now) pendingCodes.delete(userId)
  }
}

export const beginDeleteAll = createServerFn({ method: "POST" }).handler(
  async () => {
    await requireRole("super_admin")
    const userId = await requireUserId()

    cleanExpired()

    const code = generateCode()
    const hash = hashCode(code)
    pendingCodes.set(userId, { hash, expires: Date.now() + CODE_TTL_MS })

    return { code }
  }
)

export const confirmDeleteAll = createServerFn({ method: "POST" })
  .validator((d: { code: string }) => ({
    code: typeof d.code === "string" ? d.code.trim().toUpperCase() : "",
  }))
  .handler(async ({ data }) => {
    const { user } = await requireRole("super_admin")
    const userId = user.id

    cleanExpired()

    const entry = pendingCodes.get(userId)
    if (!entry) {
      throw new Error(
        "Kode sudah kadaluarsa atau tidak ada. Klik tombol lagi untuk kode baru."
      )
    }
    if (hashCode(data.code) !== entry.hash) {
      throw new Error("Kode konfirmasi tidak cocok.")
    }

    pendingCodes.delete(userId)

    return await db.transaction(async (tx) => {
      const [
        uploadLogCount,
        masterDataCount,
        gajiCount,
        karyawanCount,
        cabangCount,
      ] = await Promise.all([
        tx.select({ value: count() }).from(uploadLog),
        tx.select({ value: count() }).from(masterData),
        tx.select({ value: count() }).from(gaji),
        tx.select({ value: count() }).from(karyawan),
        tx.select({ value: count() }).from(cabang),
      ])

      await tx.delete(uploadLog)
      await tx.delete(masterData)
      await tx.delete(gaji)
      await tx.delete(karyawan)
      await tx.delete(cabang)

      const deletedCounts = {
        uploadLog: uploadLogCount[0]?.value ?? 0,
        masterData: masterDataCount[0]?.value ?? 0,
        gaji: gajiCount[0]?.value ?? 0,
        karyawan: karyawanCount[0]?.value ?? 0,
        cabang: cabangCount[0]?.value ?? 0,
      }

      await tx.insert(notifications).values({
        userId,
        type: "warning",
        title: "SEMUA DATA DIHAPUS",
        message: `User ${user.name} menghapus seluruh data operasional: ${deletedCounts.uploadLog} upload log, ${deletedCounts.masterData} master data, ${deletedCounts.gaji} slip gaji, ${deletedCounts.karyawan} karyawan, ${deletedCounts.cabang} cabang.`,
        linkPage: "/dashboard",
      })

      return {
        ok: true,
        deleted: deletedCounts,
      }
    })
  })
