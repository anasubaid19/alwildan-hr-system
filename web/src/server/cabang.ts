import { createServerFn } from "@tanstack/react-start"
import { asc, count, eq } from "drizzle-orm"

import { requireClerkUserId, requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { cabang, karyawan, notifications } from "@/lib/db/schema"

// Bentuk baris yang dikembalikan ke UI (cabang + jumlah karyawan).
export type CabangRow = {
  id: number
  kode: string
  nama: string
  alamat: string | null
  createdAt: Date
  jumlahKaryawan: number
}

type CabangInput = { kode: string; nama: string; alamat?: string | null }

/** Validasi & normalisasi input cabang (dipakai create & update). */
function parseCabangInput(d: CabangInput) {
  const kode = d.kode?.trim().toUpperCase()
  const nama = d.nama?.trim()
  if (!kode) throw new Error("Kode cabang wajib diisi")
  if (!nama) throw new Error("Nama cabang wajib diisi")
  return { kode, nama, alamat: d.alamat?.trim() || null }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "23505"
  )
}

function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "23503"
  )
}

/** Daftar cabang + jumlah karyawan. Akses: semua user login. */
export const listCabang = createServerFn().handler(
  async (): Promise<CabangRow[]> => {
    await requireClerkUserId()
    return db
      .select({
        id: cabang.id,
        kode: cabang.kode,
        nama: cabang.nama,
        alamat: cabang.alamat,
        createdAt: cabang.createdAt,
        jumlahKaryawan: count(karyawan.id),
      })
      .from(cabang)
      .leftJoin(karyawan, eq(karyawan.cabangId, cabang.id))
      .groupBy(cabang.id)
      .orderBy(asc(cabang.kode))
  }
)

/** Tambah cabang. Akses: admin ke atas. */
export const createCabang = createServerFn({ method: "POST" })
  .validator((d: CabangInput) => parseCabangInput(d))
  .handler(async ({ data }) => {
    await requireRole("admin")
    try {
      const [row] = await db.insert(cabang).values(data).returning()
      return row
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new Error(`Kode "${data.kode}" sudah dipakai cabang lain`)
      }
      throw err
    }
  })

/** Ubah cabang. Akses: admin ke atas. */
export const updateCabang = createServerFn({ method: "POST" })
  .validator((d: CabangInput & { id: number }) => ({
    id: d.id,
    ...parseCabangInput(d),
  }))
  .handler(async ({ data }) => {
    await requireRole("admin")
    const { id, ...values } = data
    try {
      const [row] = await db
        .update(cabang)
        .set(values)
        .where(eq(cabang.id, id))
        .returning()
      if (!row) throw new Error("Cabang tidak ditemukan")
      return row
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new Error(`Kode "${values.kode}" sudah dipakai cabang lain`)
      }
      throw err
    }
  })

/** Hapus satu cabang (hapus per-cabang). Akses: admin ke atas.
 * Ditolak bila masih ada karyawan yang tertaut. */
export const deleteCabang = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: d.id }))
  .handler(async ({ data }) => {
    await requireRole("admin")
    try {
      return await db.transaction(async (tx) => {
        const [row] = await tx
          .delete(cabang)
          .where(eq(cabang.id, data.id))
          .returning()
        if (!row) throw new Error("Cabang tidak ditemukan")
        await tx.insert(notifications).values({
          type: "warning",
          title: "Cabang dihapus",
          message: `Cabang ${row.nama} (${row.kode}) dihapus.`,
          linkPage: "/cabang",
        })
        return row
      })
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new Error(
          "Cabang masih memiliki karyawan — pindahkan atau hapus karyawannya dulu"
        )
      }
      throw err
    }
  })
