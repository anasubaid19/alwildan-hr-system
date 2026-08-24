import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  Eye,
  FileDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useDebounced } from "@/hooks/use-debounced"
import { GAJI_MONEY_FIELDS, type GajiMoneyField } from "@/lib/gaji-fields"
import { QK } from "@/lib/query-keys"
import { listCabang } from "@/server/cabang"
import {
  createGaji,
  deleteGaji,
  type GajiRow,
  listGaji,
  listPeriodeGaji,
  updateGaji,
} from "@/server/gaji"
import { type GajiVariableRow, listGajiVariable } from "@/server/gaji-variable"
import { listKaryawanOptions } from "@/server/karyawan"
import { exportSlipPdf, getSlipHtml } from "@/server/slip"

export const Route = createFileRoute("/_app/gaji")({
  component: GajiPage,
})

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})
function fmtRp(v: string): string {
  const n = Number(v)
  return Number.isFinite(n) ? rupiah.format(n) : v
}

const PENDAPATAN: [GajiMoneyField, string][] = [
  ["gapok", "Gaji Pokok"],
  ["tunjanganPenddk", "Tunj. Pendidikan"],
  ["tunjanganJabatan", "Tunj. Jabatan"],
  ["transport", "Transport"],
  ["bpjsKs", "BPJS KS"],
  ["lains", "Lain-lain"],
  ["lembur", "Lembur"],
]
const POTONGAN: [GajiMoneyField, string][] = [
  ["potThr", "Pot. THR"],
  ["potBpjsTk", "Pot. BPJS TK"],
  ["depositItba", "Deposit ITBA"],
  ["punishment", "Punishment"],
  ["pinjaman", "Pinjaman"],
]
const TOTAL: [GajiMoneyField, string][] = [
  ["jumlahGaji", "Jumlah Gaji (bruto)"],
  ["jmlDiterima", "Diterima (net)"],
]

type GajiFormValues = {
  karyawanId: string
  periode: string
  payingCabangId: string
  customs: Record<string, string>
} & Record<GajiMoneyField, string>

function GajiPage() {
  const qc = useQueryClient()

  const [searchInput, setSearchInput] = useState("")
  const search = useDebounced(searchInput)
  const [periode, setPeriode] = useState("")
  const [cabangId, setCabangId] = useState("")
  const [page, setPage] = useState(1)

  const cabangQuery = useQuery({
    queryKey: QK.cabang,
    queryFn: () => listCabang(),
  })
  const periodeQuery = useQuery({
    queryKey: QK.gajiPeriode,
    queryFn: () => listPeriodeGaji(),
  })
  const karyawanQuery = useQuery({
    queryKey: QK.karyawanOptions,
    queryFn: () => listKaryawanOptions(),
  })
  const variableQuery = useQuery({
    queryKey: QK.gajiVariable,
    queryFn: () => listGajiVariable(),
  })

  const { data, isLoading } = useQuery({
    queryKey: [...QK.gaji, { search, periode, cabangId, page }],
    queryFn: () =>
      listGaji({
        data: {
          search,
          periode,
          cabangId: cabangId ? Number(cabangId) : null,
          page,
        },
      }),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<GajiRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GajiRow | null>(null)
  const [slipPreview, setSlipPreview] = useState<{
    html: string
    filename: string
  } | null>(null)

  const slipPreviewMut = useMutation({
    mutationFn: (row: GajiRow) =>
      getSlipHtml({
        data: { karyawanId: row.karyawanId, periode: row.periode },
      }),
    onSuccess: (res) => setSlipPreview(res),
    onError: (err: Error) => toast.error(err.message),
  })

  const slipPdfMut = useMutation({
    mutationFn: (row: GajiRow) =>
      exportSlipPdf({
        data: { karyawanId: row.karyawanId, periode: row.periode },
      }),
    onSuccess: (res) => {
      const bin = Uint8Array.from(atob(res.pdf), (c) => c.charCodeAt(0))
      const blob = new Blob([bin], { type: "application/pdf" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = res.filename
      a.click()
      URL.revokeObjectURL(a.href)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(row: GajiRow) {
    setEditing(row)
    setFormOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (input: GajiFormValues & { id?: number }) => {
      const { id, ...payload } = input
      return id
        ? updateGaji({ data: { id, ...payload } })
        : createGaji({ data: payload })
    },
    onSuccess: (_row, input) => {
      qc.invalidateQueries({ queryKey: QK.gaji })
      qc.invalidateQueries({ queryKey: QK.gajiPeriode })
      setFormOpen(false)
      toast.success(input.id ? "Slip gaji diperbarui" : "Slip gaji ditambahkan")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteGaji({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.gaji })
      setDeleteTarget(null)
      toast.success("Slip gaji dihapus")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 25
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const cabangList = cabangQuery.data ?? []
  const periodeList = periodeQuery.data ?? []
  const karyawanList = karyawanQuery.data ?? []

  return (
    <>
      <PageHeader
        title="Gaji"
        description="Slip gaji karyawan per periode."
        action={
          <Button onClick={openCreate}>
            <Plus /> Tambah Gaji
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Cari nama karyawan…"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            setPage(1)
          }}
          className="sm:max-w-xs"
        />
        <NativeSelect
          className="w-full sm:w-40"
          value={periode}
          onChange={(e) => {
            setPeriode(e.target.value)
            setPage(1)
          }}
          aria-label="Filter periode"
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
          aria-label="Filter cabang"
        >
          <NativeSelectOption value="">Semua cabang</NativeSelectOption>
          {cabangList.map((c) => (
            <NativeSelectOption key={c.id} value={String(c.id)}>
              {c.kode} — {c.nama}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty className="rounded-xl border border-dashed py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet />
            </EmptyMedia>
            <EmptyTitle>
              {search || periode || cabangId
                ? "Tidak ada slip gaji yang cocok"
                : "Belum ada data gaji"}
            </EmptyTitle>
            <EmptyDescription>
              {search || periode || cabangId
                ? "Coba ubah kata kunci atau filter."
                : "Tambahkan slip manual atau impor lewat menu Upload."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead className="w-20">Cabang</TableHead>
                  <TableHead className="w-24">Periode</TableHead>
                  <TableHead className="text-right">Gaji Pokok</TableHead>
                  <TableHead className="text-right">Diterima</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.karyawanNama ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.cabangKode ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.periode}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtRp(row.gapok)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {fmtRp(row.jmlDiterima)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Aksi untuk slip ${row.karyawanNama}`}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => slipPreviewMut.mutate(row)}
                          >
                            <Eye /> Preview Slip
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => slipPdfMut.mutate(row)}
                          >
                            <FileDown /> Unduh PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(row)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              {total} slip · halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={slipPreview !== null}
        onOpenChange={(o) => !o && setSlipPreview(null)}
      >
        <DialogContent className="max-h-[95vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview Slip — {slipPreview?.filename}</DialogTitle>
            <DialogDescription>
              Slip total gabungan semua cabang pembayar.
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Preview slip gaji"
            srcDoc={slipPreview?.html ?? ""}
            className="h-[70vh] w-full rounded-lg border"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlipPreview(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GajiFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        karyawanList={karyawanList}
        cabangList={cabangList}
        variables={variableQuery.data ?? []}
        pending={saveMutation.isPending}
        onSubmit={(values) =>
          saveMutation.mutate({ id: editing?.id, ...values })
        }
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus slip gaji?</AlertDialogTitle>
            <AlertDialogDescription>
              Slip <b>{deleteTarget?.karyawanNama}</b> periode{" "}
              {deleteTarget?.periode} akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function GajiFormDialog({
  open,
  onOpenChange,
  editing,
  karyawanList,
  cabangList,
  variables,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: GajiRow | null
  karyawanList: { id: number; nama: string; cabangKode: string | null }[]
  cabangList: { id: number; kode: string; nama: string }[]
  variables: GajiVariableRow[]
  pending: boolean
  onSubmit: (values: GajiFormValues) => void
}) {
  const [form, setForm] = useState<GajiFormValues>(() => {
    const money = Object.fromEntries(
      GAJI_MONEY_FIELDS.map((f) => [f, editing?.[f] ?? "0"])
    ) as Record<GajiMoneyField, string>
    const customs = Object.fromEntries(
      variables.map((v) => [v.key, String(editing?.customs?.[v.key] ?? "0")])
    )
    return {
      karyawanId: editing?.karyawanId ? String(editing.karyawanId) : "",
      periode: editing?.periode ?? "",
      payingCabangId: editing?.payingCabangId
        ? String(editing.payingCabangId)
        : "",
      customs,
      ...money,
    }
  })

  function set(key: keyof GajiFormValues, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  const moneyField = ([key, label]: [GajiMoneyField, string]) => (
    <div key={key} className="flex flex-col gap-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        inputMode="numeric"
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  )

  const customField = (v: GajiVariableRow) => (
    <div key={v.key} className="flex flex-col gap-2">
      <Label htmlFor={`custom-${v.key}`}>{v.label}</Label>
      <Input
        id={`custom-${v.key}`}
        inputMode="numeric"
        value={form.customs[v.key] ?? "0"}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            customs: { ...f.customs, [v.key]: e.target.value },
          }))
        }
      />
    </div>
  )

  const customPendapatan = variables.filter((v) => v.tipe === "pendapatan")
  const customPotongan = variables.filter((v) => v.tipe === "potongan")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Slip Gaji" : "Tambah Slip Gaji"}
            </DialogTitle>
            <DialogDescription>
              Pilih karyawan & periode, lalu isi komponen gaji.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="karyawan">Karyawan</Label>
              <NativeSelect
                id="karyawan"
                className="w-full"
                value={form.karyawanId}
                onChange={(e) => set("karyawanId", e.target.value)}
                required
              >
                <NativeSelectOption value="">
                  Pilih karyawan…
                </NativeSelectOption>
                {karyawanList.map((k) => (
                  <NativeSelectOption key={k.id} value={String(k.id)}>
                    {k.nama}
                    {k.cabangKode ? ` (${k.cabangKode})` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="paying-cabang">Cabang Pembayar</Label>
              <NativeSelect
                id="paying-cabang"
                className="w-full"
                value={form.payingCabangId}
                onChange={(e) => set("payingCabangId", e.target.value)}
              >
                <NativeSelectOption value="">
                  Ikut cabang karyawan (otomatis)
                </NativeSelectOption>
                {cabangList.map((c) => (
                  <NativeSelectOption key={c.id} value={String(c.id)}>
                    {c.kode} — {c.nama}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="periode">Periode</Label>
              <Input
                id="periode"
                type="month"
                value={form.periode}
                onChange={(e) => set("periode", e.target.value)}
                required
              />
            </div>
          </div>

          <p className="font-medium text-muted-foreground text-sm">
            Pendapatan
          </p>
          <div className="grid gap-4 py-3 sm:grid-cols-3">
            {PENDAPATAN.map(moneyField)}
            {customPendapatan.map(customField)}
          </div>

          <p className="font-medium text-muted-foreground text-sm">Potongan</p>
          <div className="grid gap-4 py-3 sm:grid-cols-3">
            {POTONGAN.map(moneyField)}
            {customPotongan.map(customField)}
          </div>

          <p className="font-medium text-muted-foreground text-sm">Total</p>
          <div className="grid gap-4 py-3 sm:grid-cols-2">
            {TOTAL.map(moneyField)}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
