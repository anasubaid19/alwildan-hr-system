import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Building2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
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
import {
  type CabangRow,
  createCabang,
  deleteCabang,
  listCabang,
  updateCabang,
} from "@/server/cabang"

export const Route = createFileRoute("/_app/cabang")({
  component: CabangPage,
})

function CabangPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: QK.cabang,
    queryFn: () => listCabang(),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CabangRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CabangRow | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: CabangRow) {
    setEditing(row)
    setFormOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (input: {
      id?: number
      kode: string
      nama: string
      alamat: string
    }) =>
      input.id
        ? updateCabang({
            data: {
              id: input.id,
              kode: input.kode,
              nama: input.nama,
              alamat: input.alamat,
            },
          })
        : createCabang({
            data: { kode: input.kode, nama: input.nama, alamat: input.alamat },
          }),
    onSuccess: (_row, input) => {
      qc.invalidateQueries({ queryKey: QK.cabang })
      qc.invalidateQueries({ queryKey: QK.dashboard })
      setFormOpen(false)
      toast.success(input.id ? "Cabang diperbarui" : "Cabang ditambahkan")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCabang({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.cabang })
      qc.invalidateQueries({ queryKey: QK.dashboard })
      setDeleteTarget(null)
      toast.success("Cabang dihapus")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rows = data ?? []

  return (
    <>
      <PageHeader
        title="Cabang"
        description="Struktur organisasi cabang AL-WILDAN."
        action={
          <Button onClick={openCreate}>
            <Plus /> Tambah Cabang
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty className="rounded-xl border border-dashed py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Belum ada cabang</EmptyTitle>
            <EmptyDescription>
              Buat cabang pertama dengan kode unik untuk mulai mencatat
              karyawan.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={openCreate} className="mt-2">
            <Plus /> Tambah Cabang
          </Button>
        </Empty>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead className="text-right">Karyawan</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.kode}</TableCell>
                  <TableCell>{row.nama}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.alamat ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.jumlahKaryawan}
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
      )}

      <CabangFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
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
            <AlertDialogTitle>Hapus cabang?</AlertDialogTitle>
            <AlertDialogDescription>
              Cabang <b>{deleteTarget?.nama}</b> ({deleteTarget?.kode}) akan
              dihapus permanen. Tindakan ini tidak bisa dibatalkan.
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

function CabangFormDialog({
  open,
  onOpenChange,
  editing,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: CabangRow | null
  pending: boolean
  onSubmit: (values: { kode: string; nama: string; alamat: string }) => void
}) {
  const [kode, setKode] = useState(editing?.kode ?? "")
  const [nama, setNama] = useState(editing?.nama ?? "")
  const [alamat, setAlamat] = useState(editing?.alamat ?? "")

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({ kode, nama, alamat })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Cabang" : "Tambah Cabang"}
            </DialogTitle>
            <DialogDescription>
              Kode dipakai sebagai identitas unik cabang (mis. AW01).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="kode">Kode</Label>
              <Input
                id="kode"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="AW01"
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nama">Nama</Label>
              <Input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="AL-WILDAN Pusat"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="alamat">Alamat (opsional)</Label>
              <Input
                id="alamat"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Jl. …"
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
