import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"

import { requireRole, requireUserId } from "@/lib/auth"
import { assertRole } from "@/lib/auth/roles"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"

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
    const me = await requireUserId()
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
    const me = await requireUserId()
    if (data.userId === me) {
      throw new Error("Tidak bisa mengubah role sendiri")
    }
    await db
      .update(userTable)
      .set({ role: data.role })
      .where(eq(userTable.id, data.userId))
    return { ok: true }
  })
