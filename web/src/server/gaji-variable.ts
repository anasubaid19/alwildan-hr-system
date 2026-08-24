import { createServerFn } from "@tanstack/react-start"
import { asc, eq } from "drizzle-orm"

import { requireRole, requireUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { isUniqueViolation } from "@/lib/db/errors"
import { gajiVariable } from "@/lib/db/schema"

export type CustomVarTipe = "pendapatan" | "potongan"

export type GajiVariableRow = {
  id: number
  key: string
  label: string
  tipe: CustomVarTipe
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Daftar variabel custom. Akses: semua user login (dipakai form gaji & laporan). */
export const listGajiVariable = createServerFn().handler(
  async (): Promise<GajiVariableRow[]> => {
    await requireUserId()
    const rows = await db
      .select({
        id: gajiVariable.id,
        key: gajiVariable.key,
        label: gajiVariable.label,
        tipe: gajiVariable.tipe,
      })
      .from(gajiVariable)
      .orderBy(asc(gajiVariable.id))
    return rows.map((r) => ({ ...r, tipe: r.tipe as CustomVarTipe }))
  }
)

/** Tambah variabel custom. Akses: super_admin. */
export const createGajiVariable = createServerFn({ method: "POST" })
  .validator((d: { label: string; tipe: string }) => {
    const label = d.label?.trim() ?? ""
    if (!label) throw new Error("Nama variabel wajib diisi")
    if (label.length > 60) throw new Error("Nama variabel maksimal 60 karakter")
    const tipe = d.tipe === "potongan" ? "potongan" : "pendapatan"
    return { label, tipe: tipe as CustomVarTipe }
  })
  .handler(async ({ data }): Promise<GajiVariableRow> => {
    await requireRole("super_admin")
    const key = slugify(data.label)
    if (!key) throw new Error("Nama variabel tak menghasilkan kunci valid")
    try {
      const [row] = await db
        .insert(gajiVariable)
        .values({ key, label: data.label, tipe: data.tipe })
        .returning({
          id: gajiVariable.id,
          key: gajiVariable.key,
          label: gajiVariable.label,
          tipe: gajiVariable.tipe,
        })
      return { ...row, tipe: row.tipe as CustomVarTipe }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new Error(`Variabel "${data.label}" sudah ada`)
      }
      throw err
    }
  })

/** Hapus variabel custom. Nilai lama di slip tetap tersimpan (jsonb) namun
 * tak tampil lagi di form/laporan. Akses: super_admin. */
export const deleteGajiVariable = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: d.id }))
  .handler(async ({ data }) => {
    await requireRole("super_admin")
    const [row] = await db
      .delete(gajiVariable)
      .where(eq(gajiVariable.id, data.id))
      .returning()
    if (!row) throw new Error("Variabel tidak ditemukan")
    return row
  })
