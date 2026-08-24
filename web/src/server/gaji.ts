import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, desc, eq, ilike, type SQL } from "drizzle-orm"

import { requireRole, requireUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db/errors"
import { cabang, gaji, gajiVariable, karyawan } from "@/lib/db/schema"
import { GAJI_MONEY_FIELDS, type GajiMoneyField } from "@/lib/gaji-fields"

export type { GajiMoneyField }
// Re-export agar importer lama tetap jalan (definisi client-safe di lib).
export { GAJI_MONEY_FIELDS }

export type GajiRow = {
  id: number
  karyawanId: number
  periode: string
  karyawanNama: string | null
  payingCabangId: number
  cabangKode: string | null
  customs: Record<string, number>
} & Record<GajiMoneyField, string>

export type ListGajiResult = {
  rows: GajiRow[]
  total: number
  page: number
  pageSize: number
}

type GajiInput = {
  karyawanId?: number | string | null
  periode?: string
  payingCabangId?: number | string | null
  customs?: Record<string, number | string | null>
} & Partial<Record<GajiMoneyField, number | string | null>>

function toMoney(v: unknown): string {
  if (v === null || v === undefined || v === "") return "0"
  const n =
    typeof v === "number"
      ? v
      : Number.parseFloat(String(v).replace(/[^\d.-]/g, ""))
  return Number.isFinite(n) ? String(n) : "0"
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

/** Validasi & normalisasi input gaji (create & update). */
function parseGajiInput(d: GajiInput) {
  const karyawanId = toInt(d.karyawanId)
  if (!karyawanId) throw new Error("Karyawan wajib dipilih")
  const periode = d.periode?.trim() ?? ""
  if (!/^\d{4}-\d{2}$/.test(periode)) {
    throw new Error("Periode wajib format YYYY-MM (mis. 2026-07)")
  }
  const money = Object.fromEntries(
    GAJI_MONEY_FIELDS.map((f) => [f, toMoney(d[f])])
  ) as Record<GajiMoneyField, string>
  return {
    karyawanId,
    periode,
    payingCabangId: toInt(d.payingCabangId),
    ...money,
  }
}

/** Buang kunci customs yang tak dikenal & normalisasi nilai ke angka. */
async function sanitizeCustoms(
  customs: unknown
): Promise<Record<string, number>> {
  if (!customs || typeof customs !== "object") return {}
  const vars = await db.select({ key: gajiVariable.key }).from(gajiVariable)
  const known = new Set(vars.map((v) => v.key))
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(customs as Record<string, unknown>)) {
    if (!known.has(k)) continue
    const n = Number(toMoney(v))
    if (n !== 0) out[k] = n
  }
  return out
}

/**
 * payingCabangId wajib terisi (bagian unique constraint slip gaji).
 * Fallback: bila tidak dipilih di form, ikut cabang karyawan.
 */
async function resolvePayingCabangId(
  karyawanId: number,
  payingCabangId: number | null
): Promise<number> {
  if (payingCabangId) return payingCabangId
  const [k] = await db
    .select({ cabangId: karyawan.cabangId })
    .from(karyawan)
    .where(eq(karyawan.id, karyawanId))
    .limit(1)
  if (!k?.cabangId) {
    throw new Error(
      "Cabang pembayar wajib dipilih (karyawan belum punya cabang)"
    )
  }
  return k.cabangId
}

type ListParams = {
  search?: string
  periode?: string
  cabangId?: number | null
  page?: number
  pageSize?: number
}

/** Daftar slip gaji + nama karyawan & cabang, filter periode/cabang + search. */
export const listGaji = createServerFn()
  .validator((p: ListParams = {}) => ({
    search: typeof p.search === "string" ? p.search.trim() : "",
    periode: typeof p.periode === "string" ? p.periode.trim() : "",
    cabangId: toInt(p.cabangId),
    page: Math.max(1, Number(p.page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(p.pageSize) || 25)),
  }))
  .handler(async ({ data }): Promise<ListGajiResult> => {
    await requireUserId()

    const conds: SQL[] = []
    if (data.search) conds.push(ilike(karyawan.nama, `%${data.search}%`))
    if (data.periode) conds.push(eq(gaji.periode, data.periode))
    if (data.cabangId) conds.push(eq(gaji.payingCabangId, data.cabangId))
    const where = conds.length ? and(...conds) : undefined

    const moneyCols = Object.fromEntries(
      GAJI_MONEY_FIELDS.map((f) => [f, gaji[f]])
    ) as Record<GajiMoneyField, (typeof gaji)[GajiMoneyField]>

    const [rows, totalRes] = await Promise.all([
      db
        .select({
          id: gaji.id,
          karyawanId: gaji.karyawanId,
          periode: gaji.periode,
          karyawanNama: karyawan.nama,
          payingCabangId: gaji.payingCabangId,
          cabangKode: cabang.kode,
          customs: gaji.customs,
          ...moneyCols,
        })
        .from(gaji)
        .innerJoin(karyawan, eq(gaji.karyawanId, karyawan.id))
        .leftJoin(cabang, eq(gaji.payingCabangId, cabang.id))
        .where(where)
        .orderBy(desc(gaji.periode), asc(karyawan.nama))
        .limit(data.pageSize)
        .offset((data.page - 1) * data.pageSize),
      db
        .select({ value: count() })
        .from(gaji)
        .innerJoin(karyawan, eq(gaji.karyawanId, karyawan.id))
        .where(where),
    ])

    return {
      rows: rows as GajiRow[],
      total: totalRes[0]?.value ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    }
  })

/** Daftar periode (YYYY-MM) yang ada, terbaru dulu — untuk filter. */
export const listPeriodeGaji = createServerFn().handler(
  async (): Promise<string[]> => {
    await requireUserId()
    const rows = await db
      .selectDistinct({ periode: gaji.periode })
      .from(gaji)
      .orderBy(desc(gaji.periode))
    return rows.map((r) => r.periode)
  }
)

/** Tambah slip gaji. Akses: admin ke atas. */
export const createGaji = createServerFn({ method: "POST" })
  .validator((d: GajiInput) => ({ ...parseGajiInput(d), customs: d.customs }))
  .handler(async ({ data }) => {
    await requireRole("admin")
    try {
      const payingCabangId = await resolvePayingCabangId(
        data.karyawanId,
        data.payingCabangId
      )
      const customs = await sanitizeCustoms(data.customs)
      const [row] = await db
        .insert(gaji)
        .values({ ...data, customs, payingCabangId })
        .returning()
      return row
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new Error("Slip untuk karyawan, periode, & cabang ini sudah ada")
      }
      if (isForeignKeyViolation(err)) throw new Error("Karyawan tidak valid")
      throw err
    }
  })

/** Ubah slip gaji. Akses: admin ke atas. */
export const updateGaji = createServerFn({ method: "POST" })
  .validator((d: GajiInput & { id: number }) => ({
    id: d.id,
    customs: d.customs,
    ...parseGajiInput(d),
  }))
  .handler(async ({ data }) => {
    await requireRole("admin")
    const { id, ...input } = data
    try {
      const values = {
        ...input,
        customs: await sanitizeCustoms(input.customs),
        payingCabangId: await resolvePayingCabangId(
          input.karyawanId,
          input.payingCabangId
        ),
      }
      const [row] = await db
        .update(gaji)
        .set(values)
        .where(eq(gaji.id, id))
        .returning()
      if (!row) throw new Error("Slip gaji tidak ditemukan")
      return row
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new Error("Karyawan atau cabang tidak valid")
      }
      if (isUniqueViolation(err)) {
        throw new Error("Slip untuk karyawan, periode, & cabang ini sudah ada")
      }
      throw err
    }
  })

/** Hapus satu slip gaji. Akses: admin ke atas. */
export const deleteGaji = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: d.id }))
  .handler(async ({ data }) => {
    await requireRole("admin")
    const [row] = await db.delete(gaji).where(eq(gaji.id, data.id)).returning()
    if (!row) throw new Error("Slip gaji tidak ditemukan")
    return row
  })
