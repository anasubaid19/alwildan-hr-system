import { createServerFn } from "@tanstack/react-start"
import { count, desc, eq, sum } from "drizzle-orm"

import { requireUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { cabang, gaji, karyawan } from "@/lib/db/schema"

export type DashboardSummary = {
  periode: string | null
  availablePeriodes: string[]
  totalCabang: number
  totalKaryawan: number
  totalGaji: number
  totalDiterima: number
  perCabang: { kode: string; nama: string; total: number }[]
}

function num(v: string | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Ringkasan dashboard untuk satu periode (default: periode terbaru). */
export const getDashboardSummary = createServerFn()
  .validator((p: { periode?: string } = {}) => ({
    periode: typeof p.periode === "string" ? p.periode.trim() : "",
  }))
  .handler(async ({ data }): Promise<DashboardSummary> => {
    await requireUserId()

    const periodesRes = await db
      .selectDistinct({ periode: gaji.periode })
      .from(gaji)
      .orderBy(desc(gaji.periode))
    const availablePeriodes = periodesRes.map((r) => r.periode)

    // periode efektif: param bila valid & tersedia, jika tidak → terbaru.
    const periode =
      data.periode && availablePeriodes.includes(data.periode)
        ? data.periode
        : (availablePeriodes[0] ?? null)

    const [cabangCnt, karyawanCnt] = await Promise.all([
      db.select({ v: count() }).from(cabang),
      db.select({ v: count() }).from(karyawan),
    ])

    let totalGaji = 0
    let totalDiterima = 0
    let perCabang: DashboardSummary["perCabang"] = []

    if (periode) {
      const [sums, per] = await Promise.all([
        db
          .select({
            gaji: sum(gaji.jumlahGaji),
            diterima: sum(gaji.jmlDiterima),
          })
          .from(gaji)
          .where(eq(gaji.periode, periode)),
        db
          .select({
            kode: cabang.kode,
            nama: cabang.nama,
            total: sum(gaji.jmlDiterima),
          })
          .from(gaji)
          .innerJoin(karyawan, eq(gaji.karyawanId, karyawan.id))
          .innerJoin(cabang, eq(karyawan.cabangId, cabang.id))
          .where(eq(gaji.periode, periode))
          .groupBy(cabang.id, cabang.kode, cabang.nama)
          .orderBy(desc(sum(gaji.jmlDiterima))),
      ])
      totalGaji = num(sums[0]?.gaji)
      totalDiterima = num(sums[0]?.diterima)
      perCabang = per.map((r) => ({
        kode: r.kode,
        nama: r.nama,
        total: num(r.total),
      }))
    }

    return {
      periode,
      availablePeriodes,
      totalCabang: cabangCnt[0]?.v ?? 0,
      totalKaryawan: karyawanCnt[0]?.v ?? 0,
      totalGaji,
      totalDiterima,
      perCabang,
    }
  })
