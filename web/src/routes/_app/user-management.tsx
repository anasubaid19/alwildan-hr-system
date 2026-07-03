import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Mail, Send, Trash2, UserCog } from "lucide-react"
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
import {
  inviteUser,
  listAppUsers,
  listPendingInvitations,
  revokeInvitation,
  updateUserRole,
} from "@/server/users"

export const Route = createFileRoute("/_app/user-management")({
  component: UserManagementPage,
})

const ROLE_OPTIONS: AppRole[] = ["super_admin", "admin", "staff"]

function UserManagementPage() {
  const qc = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ["app-users"],
    queryFn: () => listAppUsers(),
  })
  const invitesQuery = useQuery({
    queryKey: ["pending-invitations"],
    queryFn: () => listPendingInvitations(),
  })

  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<AppRole>("admin")

  const inviteMut = useMutation({
    mutationFn: () => inviteUser({ data: { email, role: inviteRole } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-invitations"] })
      setEmail("")
      toast.success("Undangan dikirim")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const revokeMut = useMutation({
    mutationFn: (invitationId: string) =>
      revokeInvitation({ data: { invitationId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-invitations"] })
      toast.success("Undangan dibatalkan")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: string }) =>
      updateUserRole({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-users"] })
      toast.success("Role diperbarui")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const users = usersQuery.data ?? []
  const invites = invitesQuery.data ?? []

  return (
    <>
      <PageHeader
        title="User Management"
        description="Kelola akun HR Pusat dan undangan admin baru."
      />

      <div className="flex flex-col gap-6">
        {/* Undang user */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Undang Admin</CardTitle>
            <CardDescription>
              Kirim undangan via email. Role tersimpan otomatis saat mereka
              mendaftar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
              <div className="flex flex-col gap-2 sm:w-44">
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
                onClick={() => inviteMut.mutate()}
                disabled={inviteMut.isPending || !email}
              >
                <Send /> Kirim
              </Button>
            </div>

            {invites.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Undangan Pending</TableHead>
                      <TableHead className="w-28">Role</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="flex items-center gap-2">
                          <Mail className="size-4 text-muted-foreground" />
                          {inv.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {ROLE_LABEL[inv.role as AppRole] ?? inv.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Batalkan undangan ${inv.email}`}
                            disabled={revokeMut.isPending}
                            onClick={() => revokeMut.mutate(inv.id)}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daftar user */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pengguna</CardTitle>
            <CardDescription>
              User muncul di sini setelah mereka mendaftar (tersinkron dari
              Clerk).
            </CardDescription>
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
                <p className="text-muted-foreground text-sm">
                  Belum ada user tersinkron.
                </p>
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
