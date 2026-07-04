import { getRequest } from "@tanstack/react-start/server"

import { auth } from "@/lib/auth/server"
import { type AppRole, hasAtLeast, normalizeRole } from "./roles"

export type { AppRole }
export { hasAtLeast, normalizeRole }

async function getSession() {
  const request = getRequest()
  return auth.api.getSession({ headers: request.headers })
}

/** Baris user aktif (dgn role) atau null bila belum login. */
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}

/** User id aktif; lempar bila belum login. */
export async function requireUserId(): Promise<string> {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

/** Proteksi berbasis hierarki role (super_admin > admin > staff). */
export async function requireRole(min: AppRole) {
  const session = await getSession()
  const user = session?.user ?? null
  if (!user) throw new Error("Unauthorized")
  const role = normalizeRole((user as { role?: unknown }).role)
  if (!hasAtLeast(role, min)) throw new Error("Forbidden")
  return { user, role }
}
