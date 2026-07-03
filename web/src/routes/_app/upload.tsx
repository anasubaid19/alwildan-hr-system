import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FileSpreadsheet, RotateCcw, UploadCloud } from "lucide-react"
import { type ChangeEvent, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listCabang } from "@/server/cabang"
import {
  type AnalyzeResult,
  analyzeUpload,
  commitUpload,
  type PreviewResult,
  previewUpload,
} from "@/server/upload"

export const Route = createFileRoute("/_app/upload")({
  component: UploadPage,
})

type Mapping = Record<string, string | null>

function UploadPage() {
  const qc = useQueryClient()
  const cabangQuery = useQuery({
    queryKey: ["cabang"],
    queryFn: () => listCabang(),
  })
  const cabangList = cabangQuery.data ?? []

  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null)
  const [mapping, setMapping] = useState<Mapping>({})
  const [periode, setPeriode] = useState("")
  const [cabangId, setCabangId] = useState("")
  const [preview, setPreview] = useState<PreviewResult | null>(null)

  function reset() {
    setAnalysis(null)
    setMapping({})
    setPeriode("")
    setCabangId("")
    setPreview(null)
  }

  const analyzeMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      return analyzeUpload({ data: fd })
    },
    onSuccess: (res) => {
      setAnalysis(res)
      setMapping(res.mapping)
      setPeriode(res.suggestedPeriode ?? "")
      setCabangId(res.suggestedCabangId ? String(res.suggestedCabangId) : "")
      setPreview(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const previewMut = useMutation({
    mutationFn: () =>
      previewUpload({
        data: {
          cabangId: Number(cabangId),
          mapping,
          records: analysis?.records ?? [],
        },
      }),
    onSuccess: (res) => setPreview(res),
    onError: (err: Error) => toast.error(err.message),
  })

  const commitMut = useMutation({
    mutationFn: () =>
      commitUpload({
        data: {
          cabangId: Number(cabangId),
          periode,
          filename: analysis?.filename ?? "upload.xlsx",
          mapping,
          records: analysis?.records ?? [],
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["karyawan"] })
      qc.invalidateQueries({ queryKey: ["gaji"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      qc.invalidateQueries({ queryKey: ["gaji-periode"] })
      toast.success(
        `${res.inserted} baru, ${res.updated} diperbarui, ${res.skipped} dilewati`
      )
      reset()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) analyzeMut.mutate(file)
    e.target.value = ""
  }

  const canPreview = cabangId !== "" && !previewMut.isPending
  const canCommit =
    cabangId !== "" && /^\d{4}-\d{2}$/.test(periode) && !commitMut.isPending

  return (
    <>
      <PageHeader
        title="Upload"
        description="Impor file Excel gaji cabang dengan pemetaan kolom otomatis."
        action={
          analysis ? (
            <Button variant="outline" onClick={reset}>
              <RotateCcw /> Ulang
            </Button>
          ) : undefined
        }
      />

      {!analysis ? (
        <Card>
          <CardContent className="pt-6">
            <label
              htmlFor="file"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-primary/30 border-dashed bg-primary/5 py-16 text-center transition-colors hover:bg-primary/10"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {analyzeMut.isPending ? (
                  <Spinner className="size-6" />
                ) : (
                  <UploadCloud className="size-6" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {analyzeMut.isPending
                    ? "Menganalisis file…"
                    : "Klik untuk memilih file Excel"}
                </p>
                <p className="text-muted-foreground text-sm">
                  .xlsx / .xls (maks 10MB) — sheet "SIP GAJI" diabaikan
                </p>
              </div>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onFile}
                disabled={analyzeMut.isPending}
              />
            </label>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Ringkasan file + periode + cabang */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="size-4.5 text-primary" />
                {analysis.filename}
              </CardTitle>
              <CardDescription>
                {analysis.totalRows} baris data terdeteksi.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="periode">Periode</Label>
                <Input
                  id="periode"
                  type="month"
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cabang">Cabang</Label>
                <NativeSelect
                  id="cabang"
                  className="w-full"
                  value={cabangId}
                  onChange={(e) => {
                    setCabangId(e.target.value)
                    setPreview(null)
                  }}
                >
                  <NativeSelectOption value="">
                    Pilih cabang…
                  </NativeSelectOption>
                  {cabangList.map((c) => (
                    <NativeSelectOption key={c.id} value={String(c.id)}>
                      {c.kode} — {c.nama}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </CardContent>
          </Card>

          {/* Pemetaan kolom */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pemetaan Kolom</CardTitle>
              <CardDescription>
                Cocokkan kolom file ke kolom standar HR. Ubah bila ada yang
                keliru.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kolom File</TableHead>
                      <TableHead>Kolom Standar HR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.headers.map((h) => (
                      <TableRow key={h}>
                        <TableCell className="font-medium">{h}</TableCell>
                        <TableCell>
                          <NativeSelect
                            size="sm"
                            className="w-full"
                            value={mapping[h] ?? ""}
                            onChange={(e) => {
                              setMapping((m) => ({
                                ...m,
                                [h]: e.target.value || null,
                              }))
                              setPreview(null)
                            }}
                            aria-label={`Pemetaan untuk ${h}`}
                          >
                            <NativeSelectOption value="">
                              — abaikan —
                            </NativeSelectOption>
                            {analysis.hrColumns.map((col) => (
                              <NativeSelectOption key={col} value={col}>
                                {col}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => previewMut.mutate()}
                  disabled={!canPreview}
                >
                  {previewMut.isPending ? <Spinner /> : null} Lihat Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview diff */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview Perubahan</CardTitle>
                <CardDescription>
                  Karyawan dicocokkan berdasarkan nama dalam cabang terpilih.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">{preview.baru.length} baru</Badge>
                  <Badge variant="secondary">
                    {preview.update.length} diperbarui
                  </Badge>
                  <Badge variant="outline">
                    {preview.unchanged.length} tidak berubah
                  </Badge>
                </div>

                {preview.baru.length > 0 && (
                  <div>
                    <p className="mb-2 font-medium text-sm">Karyawan baru</p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Jabatan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.baru.map((r) => (
                            <TableRow key={r.nama}>
                              <TableCell>{r.nama}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {r.jabatan || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {preview.update.length > 0 && (
                  <div>
                    <p className="mb-2 font-medium text-sm">
                      Diperbarui (data karyawan berubah)
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Field berubah</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.update.map((r) => (
                            <TableRow key={r.nama}>
                              <TableCell>{r.nama}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {r.changed.join(", ")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => commitMut.mutate()}
                    disabled={!canCommit}
                  >
                    {commitMut.isPending ? <Spinner /> : null} Simpan Data Gaji
                  </Button>
                </div>
                {!/^\d{4}-\d{2}$/.test(periode) && (
                  <p className="text-right text-destructive text-xs">
                    Isi periode dulu sebelum menyimpan.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
