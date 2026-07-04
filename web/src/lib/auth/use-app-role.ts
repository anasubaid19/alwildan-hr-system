import { authClient } from "@/lib/auth/client"
import { type AppRole, normalizeRole } from "./roles"

/** Role aplikasi user aktif dari sesi Better Auth. */
export function useAppRole(): AppRole {
  const { data } = authClient.useSession()
  return normalizeRole((data?.user as { role?: unknown } | undefined)?.role)
}
