import { createFileRoute } from "@tanstack/react-router"
import { KeyRound, UserCog } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export const Route = createFileRoute("/_app/user-management")({
  component: UserManagementPage,
})

function UserManagementPage() {
  return (
    <>
      <PageHeader
        title="User Management"
        description="Kelola akun HR, role, dan akses cabang. (Admin)"
        action={
          <Button>
            <KeyRound /> Generate Invite Key
          </Button>
        }
      />
      <Empty className="rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserCog />
          </EmptyMedia>
          <EmptyTitle>Belum ada user HR</EmptyTitle>
          <EmptyDescription>
            Buat invite key agar HR baru bisa mendaftar dan tersinkron ke sistem.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  )
}
