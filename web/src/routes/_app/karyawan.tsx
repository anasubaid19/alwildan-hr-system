import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
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
import { QK } from "@/lib/query-keys"
import { listCabang } from "@/server/cabang"
import {
  createKaryawan,
  deleteKaryawan,
  type KaryawanRow,
  listKaryawan,
  updateKaryawan,
} from "@/server/karyawan"

export const Route = createFileRoute("/_app/karyawan")({
  component: KaryawanPage,
})

type FormValues = {
  nama: string
  gelar: string
  jabatan: string
  gender: string
  cabangId: string
  status: string
  thnAktif: string
  noAcc: string
  no: string
  nu: string
}

function KaryawanPage() {
  const qc = useQueryClient()

  const [searchInput, setSearchInput] = useState("")
  const search = useDebounced(searchInput)
  const [cabangId, setCabangId] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)

  const cabangQuery = useQuery({
    queryKey: QK.cabang,
    queryFn: () => listCabang(),
  })

  const { data, isLoading } = useQuery({
    queryKey: [...QK.karyawan, { search, cabangId, status, page }],
    queryFn: () =>
      listKaryawan({
        data: {
          search,
          cabangId: cabangId ? Number(cabangId) : null,
          status,
          page,
        },
      }),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<KaryawanRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KaryawanRow | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(row: KaryawanRow) {
    setEditing(row)
    setFormOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (input: FormValues & { id?: number }) => {
      const payload = {
        nama: input.nama,
        gelar: input.gelar,
        jabatan: input.jabatan,
        gender: input.gender,
        cabangId: input.cabangId,
        status: input.status,
        thnAktif: input.thnAktif,
        noAcc: input.noAcc,
        no: input.no,
        nu: input.nu,
      }
      return input.id
        ? updateKaryawan({ data: { id: input.id, ...payload } })
        : createKaryawan({ data: payload })
    },
    onSuccess: (_row, input) => {
      qc.invalidateQueries({ queryKey: QK.karyawan })
      setFormOpen(false)
      toast.success(input.id ? "Karyawan diperbarui" : "Karyawan ditambahkan")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteKaryawan({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.karyawan })
      setDeleteTarget(null)
      toast.success("Karyawan dihapus")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 25
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const cabangList = cabangQuery.data ?? []

  return (
    <>
      <PageHeader
        title="Karyawan"
        description="Kelola data karyawan lintas cabang."
        action={
          <Button onClick={openCreate}>
            <Plus /> Tambah Karyawan
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
        <NativeSelect
          className="w-full sm:w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          aria-label="Filter status"
        >
          <NativeSelectOption value="">Semua status</NativeSelectOption>
          <NativeSelectOption value="aktif">Aktif</NativeSelectOption>
          <NativeSelectOption value="nonaktif">Nonaktif</NativeSelectOption>
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
              <Users />
            </EmptyMedia>
            <EmptyTitle>
              {search || cabangId || status
                ? "Tidak ada karyawan yang cocok"
                : "Belum ada karyawan"}
            </EmptyTitle>
            <EmptyDescription>
              {search || cabangId || status
                ? "Coba ubah kata kunci atau filter."
                : "Tambahkan karyawan manual atau impor lewat menu Upload."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead className="w-16 text-center">Gender</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.gelar ? `${row.nama}, ${row.gelar}` : row.nama}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.jabatan ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.gender ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.cabangKode ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "aktif" ? "secondary" : "outline"
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Aksi untuk ${row.nama}`}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              {total} karyawan · halaman {page} dari {totalPages}
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

      <KaryawanFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        cabangList={cabangList}
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
            <AlertDialogTitle>Hapus karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{deleteTarget?.nama}</b> akan dihapus permanen beserta seluruh
              data gajinya. Tindakan ini tidak bisa dibatalkan.
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

function KaryawanFormDialog({
  open,
  onOpenChange,
  editing,
  cabangList,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: KaryawanRow | null
  cabangList: { id: number; kode: string; nama: string }[]
  pending: boolean
  onSubmit: (values: FormValues) => void
}) {
  const [form, setForm] = useState<FormValues>({
    nama: editing?.nama ?? "",
    gelar: editing?.gelar ?? "",
    jabatan: editing?.jabatan ?? "",
    gender: editing?.gender ?? "",
    cabangId: editing?.cabangId ? String(editing.cabangId) : "",
    status: editing?.status ?? "aktif",
    thnAktif: editing?.thnAktif ? String(editing.thnAktif) : "",
    noAcc: editing?.noAcc ?? "",
    no: editing?.no ? String(editing.no) : "",
    nu: editing?.nu ?? "",
  })

  function set<K extends keyof FormValues>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Karyawan" : "Tambah Karyawan"}
            </DialogTitle>
            <DialogDescription>Hanya nama yang wajib diisi.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="nama">Nama</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="jabatan">Jabatan</Label>
              <Input
                id="jabatan"
                value={form.jabatan}
                onChange={(e) => set("jabatan", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gelar">Gelar</Label>
              <Input
                id="gelar"
                value={form.gelar}
                onChange={(e) => set("gelar", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cabang">Cabang</Label>
              <NativeSelect
                id="cabang"
                className="w-full"
                value={form.cabangId}
                onChange={(e) => set("cabangId", e.target.value)}
              >
                <NativeSelectOption value="">Tanpa cabang</NativeSelectOption>
                {cabangList.map((c) => (
                  <NativeSelectOption key={c.id} value={String(c.id)}>
                    {c.kode} — {c.nama}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gender">Gender</Label>
              <NativeSelect
                id="gender"
                className="w-full"
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                <NativeSelectOption value="">—</NativeSelectOption>
                <NativeSelectOption value="L">L</NativeSelectOption>
                <NativeSelectOption value="P">P</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect
                id="status"
                className="w-full"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <NativeSelectOption value="aktif">Aktif</NativeSelectOption>
                <NativeSelectOption value="nonaktif">
                  Nonaktif
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="thnAktif">Tahun Aktif</Label>
              <Input
                id="thnAktif"
                inputMode="numeric"
                value={form.thnAktif}
                onChange={(e) => set("thnAktif", e.target.value)}
                placeholder="2020"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="noAcc">No. Rekening</Label>
              <Input
                id="noAcc"
                value={form.noAcc}
                onChange={(e) => set("noAcc", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="no">No. Urut</Label>
              <Input
                id="no"
                inputMode="numeric"
                value={form.no}
                onChange={(e) => set("no", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nu">NU</Label>
              <Input
                id="nu"
                value={form.nu}
                onChange={(e) => set("nu", e.target.value)}
              />
            </div>
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
