// Konstanta client-safe (TANPA import db) — dipakai server & client.
// Kolom nominal gaji (numeric → string oleh driver).
export const GAJI_MONEY_FIELDS = [
  "gapok",
  "tunjanganPenddk",
  "tunjanganJabatan",
  "transport",
  "bpjsKs",
  "lains",
  "lembur",
  "potThr",
  "potBpjsTk",
  "depositItba",
  "punishment",
  "pinjaman",
  "jumlahGaji",
  "jmlDiterima",
] as const

export type GajiMoneyField = (typeof GAJI_MONEY_FIELDS)[number]
