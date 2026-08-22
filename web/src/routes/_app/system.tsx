import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { AlertTriangle, Check, Loader2, ShieldAlert, X } from "lucide-react"
import { useState } from "react"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { hasAtLeast, normalizeRole } from "@/lib/auth/roles"
import { QK } from "@/lib/query-keys"
import { beginDeleteAll, confirmDeleteAll } from "@/server/system"

export const Route = createFileRoute("/_app/system")({
  beforeLoad: ({ context }) => {
    const role = normalizeRole((context.user as { role?: unknown }).role)
    if (!hasAtLeast(role, "super_admin")) throw redirect({ to: "/dashboard" })
  },
  component: SystemPage,
})

function SystemPage() {
  const qc = useQueryClient()
  const [code, setCode] = useState("")
  const [typed, setTyped] = useState("")
  const [showDialog, setShowDialog] = useState(false)

  const beginMut = useMutation({
    mutationFn: () => beginDeleteAll(),
    onSuccess: (data) => {
      setCode(data.code)
      setTyped("")
      setShowDialog(true)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const confirmMut = useMutation({
    mutationFn: () => confirmDeleteAll({ data: { code: typed } }),
    onSuccess: (res) => {
      const { deleted } = res
      toast.success(
        `Semua data berhasil dihapus: ${deleted.gaji} gaji, ${deleted.karyawan} karyawan, ${deleted.cabang} cabang, ${deleted.uploadLog} upload log, ${deleted.masterData} master data.`
      )
      setShowDialog(false)
      qc.invalidateQueries({ queryKey: QK.dashboard })
      qc.invalidateQueries({ queryKey: QK.cabang })
      qc.invalidateQueries({ queryKey: QK.karyawan })
      qc.invalidateQueries({ queryKey: QK.gaji })
      qc.invalidateQueries({ queryKey: QK.gajiPeriode })
      qc.invalidateQueries({ queryKey: QK.laporan })
      qc.invalidateQueries({ queryKey: QK.laporanRekap })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <PageHeader
        title="System"
        description="Pengaturan level sistem (hanya Super Admin)."
      />

      <div className="max-w-2xl space-y-6">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Tindakan di bawah ini bersifat permanen dan tidak bisa dibatalkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p className="font-medium">Akan DIHAPUS permanen:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Semua slip gaji (gaji)</li>
                <li>Semua data karyawan (karyawan)</li>
                <li>Semua cabang (cabang)</li>
                <li>Riwayat upload log (upload_log)</li>
                <li>Master data referensi (master_data)</li>
              </ul>
              <p className="font-medium mt-4">Tetap DIJAGA (tidak terhapus):</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>User login & role (Better Auth)</li>
                <li>Settings AI (Base URL, API Key, Model)</li>
                <li>Notifikasi & undangan admin</li>
              </ul>
            </div>

            <AlertDialog>
              <Button
                variant="destructive"
                onClick={() => beginMut.mutate()}
                disabled={beginMut.isPending}
              >
                {beginMut.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Menghasilkan
                    kode...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-4" /> Hapus Seluruh Data
                  </>
                )}
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Konfirmasi Hapus Seluruh Data
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Sistem akan menghasilkan kode alfanumerik 8 karakter. Anda
                    harus mengetikkannya persis sama untuk melanjutkan. Kode
                    berlaku 5 menit.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setShowDialog(false)}>
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => setShowDialog(true)}
                    disabled={beginMut.isPending}
                  >
                    Lanjutkan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {showDialog && code && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ShieldAlert className="size-5" /> Masukkan Kode Konfirmasi
              </CardTitle>
              <CardDescription>
                Kode ini hanya ditampilkan sekali. Ketik persis 8 karakter di
                bawah.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-background rounded-lg border">
                <code className="font-mono text-2xl tracking-widest text-primary font-bold select-all">
                  {code}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(code)}
                  aria-label="Salin kode"
                >
                  <Check className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm-code"
                  className="block text-sm font-medium"
                >
                  Ketik kode di atas:
                </label>
                <input
                  id="confirm-code"
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value.toUpperCase())}
                  className="w-full font-mono text-lg tracking-wider rounded-lg border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="ABC123XY"
                  maxLength={8}
                  autoComplete="off"
                />
                <p className="text-sm text-muted-foreground">
                  {typed.length === 8
                    ? "✓ Panjang benar"
                    : `${typed.length}/8 karakter`}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  <X className="size-4" /> Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => confirmMut.mutate()}
                  disabled={confirmMut.isPending || typed !== code}
                >
                  {confirmMut.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Menghapus...
                    </>
                  ) : (
                    <>
                      <X className="size-4" /> Hapus Permanen
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
