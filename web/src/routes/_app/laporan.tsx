import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listCabang } from "@/server/cabang"
import { listPeriodeGaji } from "@/server/gaji"
import {
  getLaporanAll,
  getRekap,
  type LaporanRow,
  listLaporan,
  type RekapResult,
} from "@/server/laporan"

export const Route = createFileRoute("/_app/laporan")({
  component: LaporanPage,
})

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})
const nf = new Intl.NumberFormat("id-ID")
function fmtRp(v: string | number): string {
  const n = Number(v)
  return Number.isFinite(n) ? rupiah.format(n) : String(v)
}

const DETAIL_HEADERS = [
  "NO",
  "NU",
  "NAMA",
  "JABATAN",
  "GENDER",
  "NO ACC",
  "CABANG",
  "PERIODE",
  "GAPOK",
  "PENDDK",
  "T.JABATAN",
  "TRANSPORT",
  "BPJS KS",
  "LAINS",
  "LEMBUR",
  "POT THR",
  "POT BPJS TK",
  "DEPOSIT ITBA",
  "PUNISHMENT",
  "PINJAMAN",
  "JUMLAH GAJI",
  "JML DITERIMA",
]

function detailRow(r: LaporanRow, i: number) {
  return [
    i + 1,
    r.nu ?? "",
    r.nama,
    r.jabatan ?? "",
    r.gender ?? "",
    r.noAcc ?? "",
    r.cabangNama ?? "",
    r.periode,
    Number(r.gapok),
    Number(r.tunjanganPenddk),
    Number(r.tunjanganJabatan),
    Number(r.transport),
    Number(r.bpjsKs),
    Number(r.lains),
    Number(r.lembur),
    Number(r.potThr),
    Number(r.potBpjsTk),
    Number(r.depositItba),
    Number(r.punishment),
    Number(r.pinjaman),
    Number(r.jumlahGaji),
    Number(r.jmlDiterima),
  ]
}

function LaporanPage() {
  const [periode, setPeriode] = useState("")
  const [cabangId, setCabangId] = useState("")
  const [view, setView] = useState<"detail" | "rekap">("detail")
  const [page, setPage] = useState(1)

  const filters = {
    periode: periode || undefined,
    cabangId: cabangId ? Number(cabangId) : null,
  }

  const cabangQuery = useQuery({
    queryKey: ["cabang"],
    queryFn: () => listCabang(),
  })
  const periodeQuery = useQuery({
    queryKey: ["gaji-periode"],
    queryFn: () => listPeriodeGaji(),
  })
  const detailQuery = useQuery({
    queryKey: ["laporan", { periode, cabangId, page }],
    queryFn: () => listLaporan({ data: { ...filters, page } }),
    enabled: view === "detail",
  })
  const rekapQuery = useQuery({
    queryKey: ["laporan-rekap", { periode, cabangId }],
    queryFn: () => getRekap({ data: filters }),
    enabled: view === "rekap",
  })

  const label = periode || "semua"

  function buildDetailSheet(rows: LaporanRow[]) {
    return XLSX.utils.aoa_to_sheet([
      ["LAPORAN PENGGAJIAN - AL-WILDAN ISLAMIC SCHOOL"],
      [`Periode: ${label}`],
      [],
      DETAIL_HEADERS,
      ...rows.map(detailRow),
    ])
  }

  function buildRekapSheet(rekap: RekapResult) {
    const headers = ["NO", "NAMA", "JABATAN", ...rekap.cabangCols, "TOTAL"]
    const rows = rekap.data.map((r, i) => [
      i + 1,
      r.nama,
      r.jabatan ?? "",
      ...rekap.cabangCols.map((k) => r.cabang[k] ?? 0),
      r.total,
    ])
    return XLSX.utils.aoa_to_sheet([
      ["REKAP GAJI PER KARYAWAN - AL-WILDAN ISLAMIC SCHOOL"],
      [`Periode: ${label}`],
      [],
      headers,
      ...rows,
    ])
  }

  const exportMut = useMutation({
    mutationFn: async (kind: "xlsx" | "csv" | "rekap") => {
      if (kind === "rekap") {
        const rekap = await getRekap({ data: filters })
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, buildRekapSheet(rekap), "Rekap")
        XLSX.writeFile(wb, `rekap-karyawan-${label}.xlsx`)
        return
      }
      const rows = await getLaporanAll({ data: filters })
      if (rows.length === 0) throw new Error("Tidak ada data untuk diexport")
      const ws = buildDetailSheet(rows)
      if (kind === "csv") {
        const csv = `﻿${XLSX.utils.sheet_to_csv(ws)}`
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = `laporan-gaji-${label}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
      } else {
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Gaji")
        XLSX.writeFile(wb, `laporan-gaji-${label}.xlsx`)
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const cabangList = cabangQuery.data ?? []
  const periodeList = periodeQuery.data ?? []

  return (
    <>
      <PageHeader
        title="Laporan"
        description="Preview & export laporan penggajian per periode."
      />

      {/* Filter + export */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <NativeSelect
          className="w-full sm:w-40"
          value={periode}
          onChange={(e) => {
            setPeriode(e.target.value)
            setPage(1)
          }}
          aria-label="Periode"
        >
          <NativeSelectOption value="">Semua periode</NativeSelectOption>
          {periodeList.map((p) => (
            <NativeSelectOption key={p} value={p}>
              {p}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          className="w-full sm:w-48"
          value={cabangId}
          onChange={(e) => {
            setCabangId(e.target.value)
            setPage(1)
          }}
          aria-label="Cabang pembayar"
        >
          <NativeSelectOption value="">Semua cabang</NativeSelectOption>
          {cabangList.map((c) => (
            <NativeSelectOption key={c.id} value={String(c.id)}>
              {c.kode} — {c.nama}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={exportMut.isPending}
            onClick={() => exportMut.mutate("xlsx")}
          >
            <FileSpreadsheet /> XLSX
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exportMut.isPending}
            onClick={() => exportMut.mutate("csv")}
          >
            <Download /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exportMut.isPending}
            onClick={() => exportMut.mutate("rekap")}
          >
            <FileText /> Rekap XLSX
          </Button>
        </div>
      </div>

      {/* Toggle view */}
      <div className="mb-4 inline-flex rounded-lg border p-1">
        <Button
          variant={view === "detail" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setView("detail")}
        >
          Detail
        </Button>
        <Button
          variant={view === "rekap" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setView("rekap")}
        >
          Rekap per Karyawan
        </Button>
      </div>

      {view === "detail" ? (
        <DetailView query={detailQuery} page={page} onPage={setPage} />
      ) : (
        <RekapView query={rekapQuery} />
      )}
    </>
  )
}

function DetailView({
  query,
  page,
  onPage,
}: {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof listLaporan>>>>
  page: number
  onPage: (p: number) => void
}) {
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }
  const rows = query.data?.rows ?? []
  const total = query.data?.total ?? 0
  const pageSize = query.data?.pageSize ?? 50
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground text-sm">
        Tidak ada data gaji untuk filter ini.
      </p>
    )
  }
  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead className="w-20">Cabang</TableHead>
              <TableHead className="w-24">Periode</TableHead>
              <TableHead className="text-right">Jumlah Gaji</TableHead>
              <TableHead className="text-right">Diterima</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.nama}-${r.periode}-${r.cabangKode}-${i}`}>
                <TableCell className="font-medium">{r.nama}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.jabatan ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.cabangKode ?? "—"}
                </TableCell>
                <TableCell className="tabular-nums">{r.periode}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtRp(r.jumlahGaji)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {fmtRp(r.jmlDiterima)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {total} baris · halaman {page} dari {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPage(Math.max(1, page - 1))}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPage(Math.min(totalPages, page + 1))}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </>
  )
}

function RekapView({
  query,
}: {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getRekap>>>>
}) {
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }
  const data = query.data?.data ?? []
  const cabangCols = query.data?.cabangCols ?? []
  if (data.length === 0) {
    return (
      <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground text-sm">
        Tidak ada data gaji untuk filter ini.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Jabatan</TableHead>
            {cabangCols.map((c) => (
              <TableHead key={c} className="text-right">
                {c}
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow key={r.nama}>
              <TableCell className="font-medium">{r.nama}</TableCell>
              <TableCell className="text-muted-foreground">
                {r.jabatan ?? "—"}
              </TableCell>
              {cabangCols.map((c) => (
                <TableCell key={c} className="text-right tabular-nums">
                  {r.cabang[c] ? nf.format(r.cabang[c]) : "—"}
                </TableCell>
              ))}
              <TableCell className="text-right font-medium tabular-nums">
                {nf.format(r.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
