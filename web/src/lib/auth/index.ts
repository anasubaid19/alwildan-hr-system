import { auth } from "@clerk/tanstack-react-start/server"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { type AppRole, hasAtLeast, normalizeRole } from "./roles"

export type { AppRole }
export { hasAtLeast, normalizeRole }

/** Konteks auth + tenant (organization) dari request aktif. */
export async function getAuthContext() {
  const { userId, orgId, orgRole } = await auth()
  return { userId, orgId, orgRole }
}

/** Clerk userId, lempar bila belum login. */
export async function requireClerkUserId(): Promise<string> {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized")
  }
  return userId
}

/** Wajib punya organization aktif (tenant). Kembalikan { userId, orgId }. */
export async function requireOrg() {
  const { userId, orgId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  if (!orgId) throw new Error("No active organization")
  return { userId, orgId }
}

/** Baris user dari DB (users.id = Clerk userId). Null bila belum tersinkron. */
export async function getCurrentUser() {
  const clerkId = await requireClerkUserId()
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, clerkId))
    .limit(1)
  return rows[0] ?? null
}

/** Proteksi berbasis hierarki role (super_admin > admin > staff).
 * DEV: role dipaksa super_admin (samakan dgn use-app-role) sampai sync user
 * Clerk→DB via webhook siap; tetap wajib login. */
export async function requireRole(min: AppRole) {
  const user = await getCurrentUser()
  const role: AppRole = import.meta.env.DEV
    ? "super_admin"
    : normalizeRole(user?.role)
  if (!hasAtLeast(role, min)) {
    throw new Error("Forbidden")
  }
  return { user, role }
}
