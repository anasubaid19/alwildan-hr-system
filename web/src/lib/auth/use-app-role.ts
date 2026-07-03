import { useUser } from "@clerk/tanstack-react-start"

import { type AppRole, normalizeRole } from "./roles"

/**
 * Role aplikasi user aktif dari Clerk publicMetadata.role.
 * Di dev, paksa 'super_admin' agar semua menu bisa diuji sebelum role di-set.
 */
export function useAppRole(): AppRole {
  const { user } = useUser()
  const role = normalizeRole(user?.publicMetadata?.role)
  return import.meta.env.DEV ? "super_admin" : role
}
