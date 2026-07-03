import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, eq, like, type SQL, sum } from "drizzle-orm"

import { requireClerkUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { cabang, gaji, karyawan } from "@/lib/db/schema"
import { GAJI_MONEY_FIELDS, type GajiMoneyField } from "@/lib/gaji-fields"

export type LaporanRow = {
  nu: string | null
  nama: string
  jabatan: string | null
  gender: string | null
  noAcc: string | null
  cabangKode: string | null
  cabangNama: string | null
  periode: string
} & Record<GajiMoneyField, string>

export type ListLaporanResult = {
  rows: LaporanRow[]
  total: number
  page: number
  pageSize: number
}

type Filters = {
  periode?: string
  tahun?: string
  cabangId?: number | null
  page?: number
  pageSize?: number
}

function normFilters(p: Filters) {
  return {
    periode: typeof p.periode === "string" ? p.periode.trim() : "",
    tahun: typeof p.tahun === "string" ? p.tahun.trim() : "",
    cabangId:
      p.cabangId === null || p.cabangId === undefined || p.cabangId === 0
        ? null
        : Number(p.cabangId),
    page: Math.max(1, Number(p.page) || 1),
    pageSize: Math.min(500, Math.max(1, Number(p.pageSize) || 50)),
  }
}

function buildConds(f: {
  periode: string
  tahun: string
  cabangId: number | null
}): SQL[] {
  const conds: SQL[] = []
  if (f.periode) conds.push(eq(gaji.periode, f.periode))
  else if (f.tahun) conds.push(like(gaji.periode, `${f.tahun}-%`))
  if (f.cabangId) conds.push(eq(gaji.payingCabangId, f.cabangId))
  return conds
}

const moneyCols = Object.fromEntries(
  GAJI_MONEY_FIELDS.map((f) => [f, gaji[f]])
) as Record<GajiMoneyField, (typeof gaji)[GajiMoneyField]>

const laporanColumns = {
  nu: karyawan.nu,
  nama: karyawan.nama,
  jabatan: karyawan.jabatan,
  gender: karyawan.gender,
  noAcc: karyawan.noAcc,
  cabangKode: cabang.kode,
  cabangNama: cabang.nama,
  periode: gaji.periode,
  ...moneyCols,
}

/** Preview laporan penggajian (paginated). */
export const listLaporan = createServerFn()
  .validator((p: Filters = {}) => normFilters(p))
  .handler(async ({ data }): Promise<ListLaporanResult> => {
    await requireClerkUserId()
    const where = buildConds(data)
    const cond = where.length ? and(...where) : undefined

    const [rows, totalRes] = await Promise.all([
      db
        .select(laporanColumns)
        .from(gaji)
        .innerJoin(karyawan, eq(gaji.karyawanId, karyawan.id))
        .leftJoin(cabang, eq(gaji.payingCabangId, cabang.id))
        .where(cond)
        .orderBy(asc(cabang.kode), asc(karyawan.nama))
        .limit(data.pageSize)
        .offset((data.page - 1) * data.pageSize),
      db
        .select({ value: count() })
        .from(gaji)
        .innerJoin(karyawan, eq(gaji.karyawanId, karyawan.id))
        .where(cond),
    ])

    return {
      rows: rows as LaporanRow[],
      total: totalRes[0]?.value ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    }
  })

/** Semua baris laporan (tanpa pagination) untuk export. */
export const getLaporanAll = createServerFn()
  .validator((p: Filters = {}) => normFilters(p))
  .handler(async ({ data }): Promise<LaporanRow[]> => {
    await requireClerkUserId()
    const where = buildConds(data)
    const rows = await db
      .select(laporanColumns)
      .from(gaji)
      .innerJoin(karyawan, eq(gaji.karyawanId, karyawan.id))
      .leftJoin(cabang, eq(gaji.payingCabangId, cabang.id))
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(cabang.kode), asc(karyawan.nama))
    return rows as LaporanRow[]
  })

export type RekapRow = {
  nama: string
  jabatan: string | null
  total: number
  cabang: Record<string, number>
}
export type RekapResult = { data: RekapRow[]; cabangCols: string[] }

/** Rekap pivot: 1 baris per karyawan, kolom per cabang pembayar (beban sharing). */
export const getRekap = createServerFn()
  .validator((p: Filters = {}) => normFilters(p))
  .handler(async ({ data }): Promise<RekapResult> => {
    await requireClerkUserId()
    const where = buildConds(data)

    const rows = await db
      .select({
        karyawanId: karyawan.id,
        nama: karyawan.nama,
        jabatan: karyawan.jabatan,
        kodeCabang: cabang.kode,
        total: sum(gaji.jmlDiterima),
      })
      .from(gaji)
      .innerJoin(karyawan, eq(gaji.karyawanId, karyawan.id))
      .leftJoin(cabang, eq(gaji.payingCabangId, cabang.id))
      .where(where.length ? and(...where) : undefined)
      .groupBy(karyawan.id, karyawan.nama, karyawan.jabatan, cabang.kode)
      .orderBy(asc(karyawan.nama))

    const byKaryawan = new Map<number, RekapRow>()
    const cabangSet = new Set<string>()
    for (const r of rows) {
      const kode = r.kodeCabang ?? "—"
      cabangSet.add(kode)
      let entry = byKaryawan.get(r.karyawanId)
      if (!entry) {
        entry = { nama: r.nama, jabatan: r.jabatan, total: 0, cabang: {} }
        byKaryawan.set(r.karyawanId, entry)
      }
      const amt = Number(r.total) || 0
      entry.cabang[kode] = (entry.cabang[kode] ?? 0) + amt
      entry.total += amt
    }

    return {
      data: [...byKaryawan.values()],
      cabangCols: [...cabangSet].sort(),
    }
  })
