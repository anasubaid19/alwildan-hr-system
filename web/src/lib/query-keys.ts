// Kunci TanStack Query terpusat — dipakai lintas file (query + invalidate),
// supaya tak ada string lepas yang bisa typo/menyimpang.
// Key berparameter: [...QK.gaji, { search, page }] — invalidate cukup prefix QK.gaji.
export const QK = {
  cabang: ["cabang"] as const,
  karyawan: ["karyawan"] as const,
  karyawanOptions: ["karyawan-options"] as const,
  gaji: ["gaji"] as const,
  gajiPeriode: ["gaji-periode"] as const,
  dashboard: ["dashboard"] as const,
  laporan: ["laporan"] as const,
  laporanRekap: ["laporan-rekap"] as const,
  aiSettings: ["ai-settings"] as const,
  notifications: ["notifications"] as const,
  appUsers: ["app-users"] as const,
  invites: ["invites"] as const,
  search: ["search"] as const,
} as const
