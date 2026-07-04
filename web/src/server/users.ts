import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { desc, eq } from "drizzle-orm"

import { type AppRole, requireClerkUserId, requireRole } from "@/lib/auth"
import { auth } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"

const VALID_ROLES: AppRole[] = ["super_admin", "admin", "staff"]

function assertRole(role: string): AppRole {
  if (!VALID_ROLES.includes(role as AppRole)) {
    throw new Error("Role tidak valid")
  }
  return role as AppRole
}

export type AppUserRow = {
  id: string
  nama: string
  email: string
  role: string
  createdAt: Date
  isSelf: boolean
}

/** Daftar semua user. Akses: super_admin. */
export const listAppUsers = createServerFn().handler(
  async (): Promise<AppUserRow[]> => {
    await requireRole("super_admin")
    const me = await requireClerkUserId()
    const rows = await db
      .select({
        id: userTable.id,
        nama: userTable.name,
        email: userTable.email,
        role: userTable.role,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .orderBy(desc(userTable.createdAt))
    return rows.map((r) => ({
      ...r,
      role: r.role ?? "staff",
      isSelf: r.id === me,
    }))
  }
)

/** Ubah role user. Akses: super_admin. Tak bisa mengubah role sendiri. */
export const updateUserRole = createServerFn({ method: "POST" })
  .validator((d: { userId: string; role: string }) => {
    if (!d.userId) throw new Error("User tidak valid")
    return { userId: d.userId, role: assertRole(d.role) }
  })
  .handler(async ({ data }) => {
    await requireRole("super_admin")
    const me = await requireClerkUserId()
    if (data.userId === me) {
      throw new Error("Tidak bisa mengubah role sendiri")
    }
    await db
      .update(userTable)
      .set({ role: data.role })
      .where(eq(userTable.id, data.userId))
    return { ok: true }
  })

/** Undang user baru: buat akun + kirim tautan set-password (DEV: log).
 * Akses: super_admin. */
export const inviteUser = createServerFn({ method: "POST" })
  .validator((d: { email: string; name?: string; role: string }) => {
    const email = (d.email ?? "").trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Email tidak valid")
    }
    const name = (d.name ?? "").trim() || (email.split("@")[0] ?? email)
    return { email, name, role: assertRole(d.role) }
  })
  .handler(async ({ data }) => {
    await requireRole("super_admin")
    const { headers } = getRequest()
    await auth.api.createUser({
      body: {
        email: data.email,
        name: data.name,
        password: crypto.randomUUID(),
        role: data.role,
      },
      headers,
    })
    // Tautan set-password via alur reset (DEV: link tampil di log server).
    await auth.api.requestPasswordReset({
      body: { email: data.email, redirectTo: "/reset-password" },
    })
    return { ok: true }
  })
