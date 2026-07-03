import { clerkClient } from "@clerk/tanstack-react-start/server"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"

import {
  type AppRole,
  normalizeRole,
  requireClerkUserId,
  requireRole,
} from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

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
  avatar: string | null
  createdAt: Date
  isSelf: boolean
}

/** Daftar user tersinkron (tabel users). Akses: super_admin. */
export const listAppUsers = createServerFn().handler(
  async (): Promise<AppUserRow[]> => {
    await requireRole("super_admin")
    const me = await requireClerkUserId()
    const rows = await db
      .select({
        id: users.id,
        nama: users.nama,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
    return rows.map((r) => ({ ...r, isSelf: r.id === me }))
  }
)

/** Ubah role user: sinkron ke Clerk publicMetadata + tabel users.
 * Akses: super_admin. Tak bisa mengubah role diri sendiri. */
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
    await clerkClient().users.updateUserMetadata(data.userId, {
      publicMetadata: { role: data.role },
    })
    await db
      .update(users)
      .set({ role: data.role })
      .where(eq(users.id, data.userId))
    return { ok: true }
  })

/** Undang user baru via Clerk invitation (role di publicMetadata).
 * Akses: super_admin. */
export const inviteUser = createServerFn({ method: "POST" })
  .validator((d: { email: string; role: string }) => {
    const email = (d.email ?? "").trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Email tidak valid")
    }
    return { email, role: assertRole(d.role) }
  })
  .handler(async ({ data }) => {
    await requireRole("super_admin")
    await clerkClient().invitations.createInvitation({
      emailAddress: data.email,
      publicMetadata: { role: data.role },
      ignoreExisting: true,
    })
    return { ok: true }
  })

export type InvitationRow = {
  id: string
  email: string
  role: string
  createdAt: number
}

/** Daftar undangan yang masih pending. Akses: super_admin. */
export const listPendingInvitations = createServerFn().handler(
  async (): Promise<InvitationRow[]> => {
    await requireRole("super_admin")
    const res = await clerkClient().invitations.getInvitationList({
      status: "pending",
    })
    return res.data.map((inv) => ({
      id: inv.id,
      email: inv.emailAddress,
      role: normalizeRole(
        (inv.publicMetadata as { role?: unknown } | undefined)?.role
      ),
      createdAt: inv.createdAt,
    }))
  }
)

/** Batalkan undangan. Akses: super_admin. */
export const revokeInvitation = createServerFn({ method: "POST" })
  .validator((d: { invitationId: string }) => {
    if (!d.invitationId) throw new Error("Undangan tidak valid")
    return d
  })
  .handler(async ({ data }) => {
    await requireRole("super_admin")
    await clerkClient().invitations.revokeInvitation(data.invitationId)
    return { ok: true }
  })
