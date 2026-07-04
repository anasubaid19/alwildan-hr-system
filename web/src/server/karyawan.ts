import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, eq, ilike, type SQL } from "drizzle-orm"

import { requireRole, requireUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { isForeignKeyViolation } from "@/lib/db/errors"
import { cabang, karyawan, notifications } from "@/lib/db/schema"

export type KaryawanRow = {
  id: number
  no: number | null
  nu: string | null
  nama: string
  jabatan: string | null
  gender: string | null
  gelar: string | null
  thnAktif: number | null
  noAcc: string | null
  status: string
  thnKeluar: number | null
  cabangId: number | null
  cabangNama: string | null
  cabangKode: string | null
}

export type ListKaryawanResult = {
  rows: KaryawanRow[]
  total: number
  page: number
  pageSize: number
}

type KaryawanInput = {
  nama: string
  jabatan?: string | null
  gender?: string | null
  gelar?: string | null
  cabangId?: number | string | null
  status?: string | null
  no?: number | string | null
  nu?: string | null
  thnAktif?: number | string | null
  noAcc?: string | null
  thnKeluar?: number | string | null
}

function toNullableStr(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s || null
}

function toNullableInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

/** Validasi & normalisasi input karyawan (create & update). */
function parseKaryawanInput(d: KaryawanInput) {
  const nama = d.nama?.trim()
  if (!nama) throw new Error("Nama karyawan wajib diisi")
  return {
    nama,
    jabatan: toNullableStr(d.jabatan),
    gender: d.gender === "L" || d.gender === "P" ? d.gender : null,
    gelar: toNullableStr(d.gelar),
    cabangId: toNullableInt(d.cabangId),
    status: d.status === "nonaktif" ? "nonaktif" : "aktif",
    no: toNullableInt(d.no),
    nu: toNullableStr(d.nu),
    thnAktif: toNullableInt(d.thnAktif),
    noAcc: toNullableStr(d.noAcc),
    thnKeluar: toNullableInt(d.thnKeluar),
  }
}

type ListParams = {
  search?: string
  cabangId?: number | null
  status?: string
  page?: number
  pageSize?: number
}

/** Daftar karyawan + nama cabang, dengan filter, pencarian, dan pagination. */
export const listKaryawan = createServerFn()
  .validator((p: ListParams = {}) => ({
    search: typeof p.search === "string" ? p.search.trim() : "",
    cabangId: toNullableInt(p.cabangId),
    status: p.status === "aktif" || p.status === "nonaktif" ? p.status : "",
    page: Math.max(1, Number(p.page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(p.pageSize) || 25)),
  }))
  .handler(async ({ data }): Promise<ListKaryawanResult> => {
    await requireUserId()

    const conds: SQL[] = []
    if (data.search) conds.push(ilike(karyawan.nama, `%${data.search}%`))
    if (data.cabangId) conds.push(eq(karyawan.cabangId, data.cabangId))
    if (data.status) conds.push(eq(karyawan.status, data.status))
    const where = conds.length ? and(...conds) : undefined

    const [rows, totalRes] = await Promise.all([
      db
        .select({
          id: karyawan.id,
          no: karyawan.no,
          nu: karyawan.nu,
          nama: karyawan.nama,
          jabatan: karyawan.jabatan,
          gender: karyawan.gender,
          gelar: karyawan.gelar,
          thnAktif: karyawan.thnAktif,
          noAcc: karyawan.noAcc,
          status: karyawan.status,
          thnKeluar: karyawan.thnKeluar,
          cabangId: karyawan.cabangId,
          cabangNama: cabang.nama,
          cabangKode: cabang.kode,
        })
        .from(karyawan)
        .leftJoin(cabang, eq(karyawan.cabangId, cabang.id))
        .where(where)
        .orderBy(asc(karyawan.nama))
        .limit(data.pageSize)
        .offset((data.page - 1) * data.pageSize),
      db.select({ value: count() }).from(karyawan).where(where),
    ])

    return {
      rows,
      total: totalRes[0]?.value ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    }
  })

export type KaryawanOption = {
  id: number
  nama: string
  cabangKode: string | null
}

/** Opsi karyawan ringkas (semua, tanpa pagination) untuk dropdown/select. */
export const listKaryawanOptions = createServerFn().handler(
  async (): Promise<KaryawanOption[]> => {
    await requireUserId()
    return db
      .select({
        id: karyawan.id,
        nama: karyawan.nama,
        cabangKode: cabang.kode,
      })
      .from(karyawan)
      .leftJoin(cabang, eq(karyawan.cabangId, cabang.id))
      .orderBy(asc(karyawan.nama))
  }
)

/** Tambah karyawan. Akses: admin ke atas. */
export const createKaryawan = createServerFn({ method: "POST" })
  .validator((d: KaryawanInput) => parseKaryawanInput(d))
  .handler(async ({ data }) => {
    await requireRole("admin")
    try {
      const [row] = await db.insert(karyawan).values(data).returning()
      return row
    } catch (err) {
      if (isForeignKeyViolation(err)) throw new Error("Cabang tidak valid")
      throw err
    }
  })

/** Ubah karyawan. Akses: admin ke atas. */
export const updateKaryawan = createServerFn({ method: "POST" })
  .validator((d: KaryawanInput & { id: number }) => ({
    id: d.id,
    ...parseKaryawanInput(d),
  }))
  .handler(async ({ data }) => {
    await requireRole("admin")
    const { id, ...values } = data
    try {
      const [row] = await db
        .update(karyawan)
        .set(values)
        .where(eq(karyawan.id, id))
        .returning()
      if (!row) throw new Error("Karyawan tidak ditemukan")
      return row
    } catch (err) {
      if (isForeignKeyViolation(err)) throw new Error("Cabang tidak valid")
      throw err
    }
  })

/** Hapus satu karyawan (hapus per-orang; data gaji ikut terhapus/cascade).
 * Akses: admin ke atas. */
export const deleteKaryawan = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: d.id }))
  .handler(async ({ data }) => {
    const { user } = await requireRole("admin")
    return db.transaction(async (tx) => {
      const [row] = await tx
        .delete(karyawan)
        .where(eq(karyawan.id, data.id))
        .returning()
      if (!row) throw new Error("Karyawan tidak ditemukan")
      await tx.insert(notifications).values({
        userId: user.id,
        type: "warning",
        title: "Karyawan dihapus",
        message: `${row.nama} dihapus beserta data gajinya.`,
        linkPage: "/karyawan",
      })
      return row
    })
  })
