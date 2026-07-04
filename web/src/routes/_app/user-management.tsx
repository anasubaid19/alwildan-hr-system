import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Check, CheckCircle, Copy, KeyRound, UserCog } from "lucide-react"
import { useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type AppRole, ROLE_LABEL } from "@/lib/auth/roles"
import { QK } from "@/lib/query-keys"
import { generateInvitePin } from "@/server/invite"
import { listAppUsers, updateUserRole } from "@/server/users"

/** Salin teks ke clipboard; fallback execCommand utk konteks non-HTTPS. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement("textarea")
    el.value = text
    el.style.position = "fixed"
    el.style.opacity = "0"
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand("copy")
    el.remove()
    return ok
  }
}

export const Route = createFileRoute("/_app/user-management")({
  component: UserManagementPage,
})

const ROLE_OPTIONS: AppRole[] = ["super_admin", "admin", "staff"]

function UserManagementPage() {
  const qc = useQueryClient()

  const usersQuery = useQuery({
    queryKey: QK.appUsers,
    queryFn: () => listAppUsers(),
  })

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [inviteRole, setInviteRole] = useState<AppRole>("admin")
  const [generatedPin, setGeneratedPin] = useState<{
    pin: string
    name: string
    email: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const generatePinMut = useMutation({
    mutationFn: () =>
      generateInvitePin({ data: { email, name, role: inviteRole } }),
    onSuccess: (data) => {
      setGeneratedPin({ pin: data.pin, name: data.name, email: data.email })
      setCopied(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: string }) =>
      updateUserRole({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.appUsers })
      toast.success("Role diperbarui")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const users = usersQuery.data ?? []

  return (
    <>
      <PageHeader
        title="User Management"
        description="Kelola akun HR Pusat dan undang admin baru."
      />

      <div className="flex flex-col gap-6">
        {/* Undang user */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Undang Admin</CardTitle>
            <CardDescription>
              Buat PIN undangan. Calon admin menerima PIN via WhatsApp untuk
              mendaftar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@alwildan.sch.id"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama admin"
                />
              </div>
              <div className="flex flex-col gap-2 sm:w-40">
                <Label htmlFor="invite-role">Role</Label>
                <NativeSelect
                  id="invite-role"
                  className="w-full"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AppRole)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <NativeSelectOption key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <Button
                onClick={() => generatePinMut.mutate()}
                disabled={generatePinMut.isPending || !email || !name.trim()}
              >
                <KeyRound /> Generate PIN
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hasil PIN — tampil sekali, disampaikan manual via WhatsApp */}
        {generatedPin && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-green-800 dark:text-green-200">
                <CheckCircle className="size-5" />
                PIN Berhasil Dibuat
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Kirim PIN ini ke {generatedPin.name} via WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="font-bold font-mono text-4xl text-green-800 tracking-[0.3em] dark:text-green-200">
                  {generatedPin.pin.match(/\d{3}/g)?.join(" ") ??
                    generatedPin.pin}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Salin PIN"
                  onClick={async () => {
                    const ok = await copyText(generatedPin.pin)
                    if (!ok) {
                      toast.error("Gagal menyalin — salin manual")
                      return
                    }
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <div className="text-center text-muted-foreground text-sm">
                <p>Email: {generatedPin.email}</p>
                <p>Role: {ROLE_LABEL[inviteRole]}</p>
                <p className="mt-1 text-xs">
                  Berlaku 48 jam. PIN hanya bisa dipakai sekali.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGeneratedPin(null)
                  setEmail("")
                  setName("")
                }}
              >
                Undang lagi
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Daftar user */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pengguna</CardTitle>
            <CardDescription>Semua akun HR dan rolenya.</CardDescription>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <UserCog className="size-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Belum ada user.</p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-44">Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.nama}
                          {u.isSelf && (
                            <Badge variant="outline" className="ml-2">
                              Anda
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <NativeSelect
                            size="sm"
                            className="w-full"
                            value={u.role}
                            disabled={u.isSelf || roleMut.isPending}
                            onChange={(e) =>
                              roleMut.mutate({
                                userId: u.id,
                                role: e.target.value,
                              })
                            }
                            aria-label={`Role untuk ${u.nama}`}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <NativeSelectOption key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
