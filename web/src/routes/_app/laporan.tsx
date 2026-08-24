import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
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
import { QK } from "@/lib/query-keys"
import { listCabang } from "@/server/cabang"
import { listPeriodeGaji } from "@/server/gaji"
import { type GajiVariableRow, listGajiVariable } from "@/server/gaji-variable"
import {
  getLaporanAll,
  getPergerakan,
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

// Kolom uang standar urut slip: pendapatan → potongan → total.
const MONEY_COLS: [keyof LaporanRow, string][] = [
  ["gapok", "GAPOK"],
  ["tunjanganPenddk", "PENDDK"],
  ["tunjanganJabatan", "T.JABATAN"],
  ["transport", "TRANSPORT"],
  ["bpjsKs", "BPJS KS"],
  ["lains", "LAINS"],
  ["lembur", "LEMBUR"],
  ["potThr", "POT THR"],
  ["potBpjsTk", "POT BPJS TK"],
  ["depositItba", "DEPOSIT ITBA"],
  ["punishment", "PUNISHMENT"],
  ["pinjaman", "PINJAMAN"],
]

function customHeaders(variables: GajiVariableRow[]): string[] {
  return variables.map((v) => v.label.toUpperCase())
}

function detailRow(
  r: LaporanRow,
  i: number,
  variables: GajiVariableRow[]
): (string | number)[] {
  return [
    i + 1,
    r.nu ?? "",
    r.nama,
    r.jabatan ?? "",
    r.gender ?? "",
    r.noAcc ?? "",
    r.cabangNama ?? "",
    r.periode,
    ...MONEY_COLS.map(([f]) => Number(r[f])),
    ...variables.map((v) => r.customs?.[v.key] ?? 0),
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
    queryKey: QK.cabang,
    queryFn: () => listCabang(),
  })
  const periodeQuery = useQuery({
    queryKey: QK.gajiPeriode,
    queryFn: () => listPeriodeGaji(),
  })
  const detailQuery = useQuery({
    queryKey: [...QK.laporan, { periode, cabangId, page }],
    queryFn: () => listLaporan({ data: { ...filters, page } }),
    enabled: view === "detail",
  })
  const rekapQuery = useQuery({
    queryKey: [...QK.laporanRekap, { periode, cabangId }],
    queryFn: () => getRekap({ data: filters }),
    enabled: view === "rekap",
  })
  const variableQuery = useQuery({
    queryKey: QK.gajiVariable,
    queryFn: () => listGajiVariable(),
  })
  const variables = variableQuery.data ?? []

  // Pergerakan karyawan: pakai periode terpilih, atau periode terbaru.
  const periodeEfektif = periode || periodeQuery.data?.[0] || ""
  const pergerakanQuery = useQuery({
    queryKey: [...QK.laporan, "pergerakan", periodeEfektif],
    queryFn: () => getPergerakan({ data: { periode: periodeEfektif } }),
    enabled: !!periodeEfektif,
  })

  const label = periode || "semua"

  function buildDetailSheet(rows: LaporanRow[]) {
    const headers = [...DETAIL_HEADERS, ...customHeaders(variables)]
    return XLSX.utils.aoa_to_sheet([
      ["LAPORAN PENGGAJIAN - AL-WILDAN ISLAMIC SCHOOL"],
      [`Periode: ${label}`],
      [],
      headers,
      ...rows.map((r, i) => detailRow(r, i, variables)),
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

  function buildPdf(rows: LaporanRow[]) {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    })
    const pw = doc.internal.pageSize.getWidth()
    doc.setFillColor(26, 59, 143)
    doc.rect(0, 0, pw, 60, "F")
    doc.setTextColor(255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(15)
    doc.text("LAPORAN PENGGAJIAN — AL-WILDAN ISLAMIC SCHOOL", 32, 26)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(
      `Periode: ${label}  ·  ${rows.length} baris  ·  ${new Date().toLocaleDateString("id-ID")}`,
      32,
      44
    )

    const totalGaji = rows.reduce((a, r) => a + Number(r.jumlahGaji), 0)
    const totalDiterima = rows.reduce((a, r) => a + Number(r.jmlDiterima), 0)
    const totalPot = Math.abs(totalGaji - totalDiterima)
    doc.setTextColor(10)
    doc.setFontSize(9)
    doc.text(
      `Total Penggajian: ${rupiah.format(totalGaji)}     Total Potongan: ${rupiah.format(totalPot)}     Total Diterima: ${rupiah.format(totalDiterima)}`,
      32,
      78
    )

    // Semua variabel slip: kolom uang standar + custom + total.
    const head = [
      "NO",
      "NAMA",
      "CABANG",
      "PERIODE",
      ...MONEY_COLS.map(([, l]) => l),
      ...customHeaders(variables),
      "JUMLAH",
      "DITERIMA",
    ]
    const body = rows.map((r, i) => [
      i + 1,
      r.nama,
      r.cabangKode ?? "",
      r.periode,
      ...MONEY_COLS.map(([f]) => nf.format(Number(r[f]))),
      ...variables.map((v) => nf.format(r.customs?.[v.key] ?? 0)),
      nf.format(Number(r.jumlahGaji)),
      nf.format(Number(r.jmlDiterima)),
    ])
    const foot = [
      [
        "",
        "TOTAL",
        "",
        "",
        ...MONEY_COLS.map(([f]) =>
          nf.format(rows.reduce((a, r) => a + Number(r[f]), 0))
        ),
        ...variables.map((v) =>
          nf.format(rows.reduce((a, r) => a + (r.customs?.[v.key] ?? 0), 0))
        ),
        nf.format(totalGaji),
        nf.format(totalDiterima),
      ],
    ]
    const numCols = head.map((_, i) => i).slice(4) // kolom angka mulai setelah NO/NAMA/CABANG/PERIODE

    autoTable(doc, {
      startY: 88,
      head: [head],
      body,
      foot,
      styles: { fontSize: 5.5, cellPadding: 1.5 },
      headStyles: { fillColor: [26, 59, 143], textColor: 255, fontSize: 5 },
      footStyles: {
        fillColor: [26, 59, 143],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      columnStyles: Object.fromEntries(
        numCols.map((i) => [i, { halign: "right" as const }])
      ),
      margin: { left: 32, right: 32 },
    })

    doc.save(`laporan-gaji-${label}.pdf`)
  }

  const exportMut = useMutation({
    mutationFn: async (kind: "xlsx" | "csv" | "pdf" | "rekap") => {
      if (kind === "rekap") {
        const rekap = await getRekap({ data: filters })
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, buildRekapSheet(rekap), "Rekap")
        XLSX.writeFile(wb, `rekap-karyawan-${label}.xlsx`)
        return
      }
      const rows = await getLaporanAll({ data: filters })
      if (rows.length === 0) throw new Error("Tidak ada data untuk diexport")
      if (kind === "pdf") {
        buildPdf(rows)
        return
      }
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
            onClick={() => exportMut.mutate("pdf")}
          >
            <FileDown /> PDF
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

      {/* Pergerakan karyawan masuk/keluar antar periode */}
      {periodeEfektif && pergerakanQuery.data && (
        <PergerakanCard data={pergerakanQuery.data} />
      )}

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
        <DetailView
          query={detailQuery}
          page={page}
          onPage={setPage}
          variables={variables}
        />
      ) : (
        <RekapView query={rekapQuery} />
      )}
    </>
  )
}

function PergerakanCard({
  data,
}: {
  data: Awaited<ReturnType<typeof getPergerakan>>
}) {
  return (
    <div className="mb-4 rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="font-medium text-sm">Pergerakan Karyawan</p>
        <span className="text-muted-foreground text-sm">
          {data.periode}
          {data.periodeSebelum
            ? ` · vs ${data.periodeSebelum}`
            : " · periode pertama"}
        </span>
        <Badge variant="secondary">
          {data.totalKini} karyawan
          {data.periodeSebelum && data.totalKini !== data.totalSebelum && (
            <span className="ml-1">
              ({data.totalKini > data.totalSebelum ? "+" : ""}
              {data.totalKini - data.totalSebelum})
            </span>
          )}
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-medium text-sm">
            <ArrowUpCircle className="size-4 text-emerald-600" /> Masuk (
            {data.masuk.length})
          </p>
          {data.masuk.length === 0 ? (
            <p className="text-muted-foreground text-sm">—</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {data.masuk.map((k) => (
                <li key={k.id}>
                  <Badge variant="success">{k.nama}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-medium text-sm">
            <ArrowDownCircle className="size-4 text-destructive" /> Keluar (
            {data.keluar.length})
          </p>
          {data.keluar.length === 0 ? (
            <p className="text-muted-foreground text-sm">—</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {data.keluar.map((k) => (
                <li key={k.id}>
                  <Badge variant="destructive">{k.nama}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailView({
  query,
  page,
  onPage,
  variables,
}: {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof listLaporan>>>>
  page: number
  onPage: (p: number) => void
  variables: GajiVariableRow[]
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
              {MONEY_COLS.map(([f, l]) => (
                <TableHead key={f} className="text-right whitespace-nowrap">
                  {l}
                </TableHead>
              ))}
              {variables.map((v) => (
                <TableHead key={v.key} className="text-right whitespace-nowrap">
                  {v.label}
                </TableHead>
              ))}
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
                {MONEY_COLS.map(([f]) => (
                  <TableCell
                    key={f}
                    className="text-right tabular-nums whitespace-nowrap"
                  >
                    {nf.format(Number(r[f]))}
                  </TableCell>
                ))}
                {variables.map((v) => (
                  <TableCell
                    key={v.key}
                    className="text-right tabular-nums whitespace-nowrap"
                  >
                    {r.customs?.[v.key] ? nf.format(r.customs[v.key]) : "—"}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                  {fmtRp(r.jumlahGaji)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
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
              <TableCell className="text-right">
                <div className="font-medium tabular-nums">
                  {nf.format(r.total)}
                </div>
                {/* Rincian per cabang pembayar (beban sharing) — kecil di
                    bawah total; export XLSX tetap matriks penuh. */}
                {Object.keys(r.cabang).length > 1 && (
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {Object.entries(r.cabang)
                      .map(([k, v]) => `${k}: ${nf.format(v)}`)
                      .join(" · ")}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
