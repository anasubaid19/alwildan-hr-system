import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Sparkles,
  UploadCloud,
} from "lucide-react"
import { type ChangeEvent, type FormEvent, useState } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { QK } from "@/lib/query-keys"
import { createCabang, listCabang } from "@/server/cabang"
import {
  type AnalyzeResult,
  aiMapping,
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
    queryKey: QK.cabang,
    queryFn: () => listCabang(),
  })
  const cabangList = cabangQuery.data ?? []

  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null)
  const [mapping, setMapping] = useState<Mapping>({})
  const [periode, setPeriode] = useState("")
  const [cabangId, setCabangId] = useState("")
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [addCabangOpen, setAddCabangOpen] = useState(false)
  const [newCabang, setNewCabang] = useState({ kode: "", nama: "" })

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

  const aiMapMut = useMutation({
    mutationFn: () =>
      aiMapping({
        data: {
          headers: analysis?.headers ?? [],
          sample: analysis?.sample ?? [],
        },
      }),
    onSuccess: (res) => {
      setMapping(res)
      setPreview(null)
      toast.success("Pemetaan AI diterapkan")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addCabangMut = useMutation({
    mutationFn: () => createCabang({ data: newCabang }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: QK.cabang })
      setCabangId(String(row.id))
      setPreview(null)
      setAddCabangOpen(false)
      setNewCabang({ kode: "", nama: "" })
      toast.success(`Cabang ${row.kode} ditambahkan & dipilih`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function onAddCabang(e: FormEvent) {
    e.preventDefault()
    addCabangMut.mutate()
  }

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
      qc.invalidateQueries({ queryKey: QK.karyawan })
      qc.invalidateQueries({ queryKey: QK.gaji })
      qc.invalidateQueries({ queryKey: QK.dashboard })
      qc.invalidateQueries({ queryKey: QK.gajiPeriode })
      toast.success(
        `${res.inserted} baru, ${res.updated} diperbarui, ${res.skipped} dilewati`
      )
      reset()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File terlalu besar (maks 10MB)")
      } else {
        analyzeMut.mutate(file)
      }
    }
    e.target.value = ""
  }

  const canPreview = cabangId !== "" && !previewMut.isPending
  const canCommit =
    cabangId !== "" && /^\d{4}-\d{2}$/.test(periode) && !commitMut.isPending

  return (
    <>
      <PageHeader
        title="Upload"
        description="Impor file Excel/CSV gaji cabang dengan pemetaan kolom otomatis."
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
                    : "Klik untuk memilih file Excel/CSV"}
                </p>
                <p className="text-muted-foreground text-sm">
                  .xlsx / .xls / .csv (maks 10MB) — sheet "SIP GAJI" diabaikan
                </p>
              </div>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
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
                <div className="flex gap-2">
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
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Tambah cabang baru"
                    title="Tambah cabang baru"
                    onClick={() => setAddCabangOpen(true)}
                  >
                    <Plus />
                  </Button>
                </div>
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

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => aiMapMut.mutate()}
                  disabled={aiMapMut.isPending}
                >
                  {aiMapMut.isPending ? <Spinner /> : <Sparkles />} Petakan
                  dengan AI
                </Button>
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

      {/* Tambah cabang langsung dari wizard upload */}
      <Dialog open={addCabangOpen} onOpenChange={setAddCabangOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={onAddCabang}>
            <DialogHeader>
              <DialogTitle>Tambah Cabang</DialogTitle>
              <DialogDescription>
                Cabang baru langsung terpilih untuk upload ini.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-cabang-kode">Kode</Label>
                <Input
                  id="new-cabang-kode"
                  value={newCabang.kode}
                  onChange={(e) =>
                    setNewCabang((v) => ({ ...v, kode: e.target.value }))
                  }
                  placeholder="AW 5"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-cabang-nama">Nama</Label>
                <Input
                  id="new-cabang-nama"
                  value={newCabang.nama}
                  onChange={(e) =>
                    setNewCabang((v) => ({ ...v, nama: e.target.value }))
                  }
                  placeholder="AL-WILDAN 5"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddCabangOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={addCabangMut.isPending}>
                {addCabangMut.isPending ? <Spinner /> : null} Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
