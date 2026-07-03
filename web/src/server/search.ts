import { createServerFn } from "@tanstack/react-start"
import { asc, eq, ilike, or } from "drizzle-orm"

import { requireClerkUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { cabang, karyawan } from "@/lib/db/schema"

export type SearchResult = {
  karyawan: {
    id: number
    nama: string
    jabatan: string | null
    cabangKode: string | null
  }[]
  cabang: { id: number; kode: string; nama: string }[]
}

/** Pencarian global karyawan + cabang (⌘K). */
export const searchAll = createServerFn()
  .validator((d: { q: string }) => ({ q: (d.q ?? "").trim() }))
  .handler(async ({ data }): Promise<SearchResult> => {
    await requireClerkUserId()
    if (data.q.length < 2) return { karyawan: [], cabang: [] }
    const like = `%${data.q}%`

    const [kar, cab] = await Promise.all([
      db
        .select({
          id: karyawan.id,
          nama: karyawan.nama,
          jabatan: karyawan.jabatan,
          cabangKode: cabang.kode,
        })
        .from(karyawan)
        .leftJoin(cabang, eq(karyawan.cabangId, cabang.id))
        .where(ilike(karyawan.nama, like))
        .orderBy(asc(karyawan.nama))
        .limit(6),
      db
        .select({ id: cabang.id, kode: cabang.kode, nama: cabang.nama })
        .from(cabang)
        .where(or(ilike(cabang.nama, like), ilike(cabang.kode, like)))
        .orderBy(asc(cabang.kode))
        .limit(6),
    ])

    return { karyawan: kar, cabang: cab }
  })
