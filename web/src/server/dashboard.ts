import { createServerFn } from "@tanstack/react-start"
import { asc, count, desc, eq, sum } from "drizzle-orm"

import { requireUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { cabang, gaji, karyawan, uploadLog } from "@/lib/db/schema"

export type UploadStatusRow = {
  cabangId: number
  kode: string
  nama: string
  status: "ok" | "error" | "none"
  detail: string | null
  createdAt: Date | null
}

export type ActivityRow = {
  id: number
  cabangKode: string | null
  cabangNama: string | null
  periode: string | null
  status: string | null
  detail: string | null
  createdAt: Date | null
}

export type DashboardSummary = {
  periode: string | null
  availablePeriodes: string[]
  totalCabang: number
  totalKaryawan: number
  totalGaji: number
  totalDiterima: number
  totalSlip: number
  uploadedCabang: number
  uploadStatus: UploadStatusRow[]
  activity: ActivityRow[]
  perCabang: { kode: string; nama: string; total: number }[]
}

function num(v: string | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function noneRow(c: {
  id: number
  kode: string
  nama: string
}): UploadStatusRow {
  return {
    cabangId: c.id,
    kode: c.kode,
    nama: c.nama,
    status: "none",
    detail: null,
    createdAt: null,
  }
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

    const [cabangList, karyawanCnt] = await Promise.all([
      db
        .select({ id: cabang.id, kode: cabang.kode, nama: cabang.nama })
        .from(cabang)
        .orderBy(asc(cabang.kode)),
      db.select({ v: count() }).from(karyawan),
    ])
    const totalCabang = cabangList.length

    let totalGaji = 0
    let totalDiterima = 0
    let totalSlip = 0
    let uploadedCabang = 0
    let uploadStatus: UploadStatusRow[] = cabangList.map(noneRow)
    let activity: ActivityRow[] = []
    let perCabang: DashboardSummary["perCabang"] = []

    if (periode) {
      const [sums, slipRes, statusRows, activityRes, per] = await Promise.all([
        db
          .select({
            gaji: sum(gaji.jumlahGaji),
            diterima: sum(gaji.jmlDiterima),
          })
          .from(gaji)
          .where(eq(gaji.periode, periode)),
        db.select({ v: count() }).from(gaji).where(eq(gaji.periode, periode)),
        db
          .select({
            cabangId: uploadLog.cabangId,
            kode: cabang.kode,
            nama: cabang.nama,
            status: uploadLog.status,
            detail: uploadLog.detail,
            createdAt: uploadLog.createdAt,
          })
          .from(uploadLog)
          .innerJoin(cabang, eq(uploadLog.cabangId, cabang.id))
          .where(eq(uploadLog.periode, periode))
          .orderBy(desc(uploadLog.createdAt)),
        db
          .select({
            id: uploadLog.id,
            cabangKode: cabang.kode,
            cabangNama: cabang.nama,
            periode: uploadLog.periode,
            status: uploadLog.status,
            detail: uploadLog.detail,
            createdAt: uploadLog.createdAt,
          })
          .from(uploadLog)
          .leftJoin(cabang, eq(uploadLog.cabangId, cabang.id))
          .where(eq(uploadLog.periode, periode))
          .orderBy(desc(uploadLog.createdAt))
          .limit(8),
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
      totalSlip = slipRes[0]?.v ?? 0
      activity = activityRes

      // Status tiap cabang = upload_log terbaru periode ini; cabang tanpa
      // upload (atau upload lama/gagal diurutan terakhir) → none/error.
      const latestByCabang = new Map<number, UploadStatusRow>()
      for (const r of statusRows) {
        if (r.cabangId !== null && !latestByCabang.has(r.cabangId)) {
          latestByCabang.set(r.cabangId, {
            cabangId: r.cabangId,
            kode: r.kode,
            nama: r.nama,
            status:
              r.status === "success"
                ? "ok"
                : r.status === "failed"
                  ? "error"
                  : "none",
            detail: r.detail,
            createdAt: r.createdAt,
          })
        }
      }
      uploadStatus = cabangList.map(
        (c) => latestByCabang.get(c.id) ?? noneRow(c)
      )
      uploadedCabang = uploadStatus.filter((s) => s.status === "ok").length

      perCabang = per.map((r) => ({
        kode: r.kode,
        nama: r.nama,
        total: num(r.total),
      }))
    }

    return {
      periode,
      availablePeriodes,
      totalCabang,
      totalKaryawan: karyawanCnt[0]?.v ?? 0,
      totalGaji,
      totalDiterima,
      totalSlip,
      uploadedCabang,
      uploadStatus,
      activity,
      perCabang,
    }
  })
