// Role model AL-WILDAN — shared client & server (tanpa import server-only).
// Tenant = 1 Clerk Organization "AL-WILDAN"; role di publicMetadata.role.

export type AppRole = "super_admin" | "admin" | "staff"

export const ROLE_RANK: Record<AppRole, number> = {
  staff: 1,
  admin: 2,
  super_admin: 3,
}

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
}

/** Normalisasi nilai role tak dikenal → 'staff' (paling minim akses). */
export function normalizeRole(value: unknown): AppRole {
  return value === "super_admin" || value === "admin" || value === "staff"
    ? value
    : "staff"
}

/** True bila `role` setara atau di atas `min` dalam hierarki. */
export function hasAtLeast(role: AppRole | undefined, min: AppRole): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/** Validasi role dari input; lempar bila tak dikenal. */
export function assertRole(role: string): AppRole {
  if (role !== "super_admin" && role !== "admin" && role !== "staff") {
    throw new Error("Role tidak valid")
  }
  return role
}
