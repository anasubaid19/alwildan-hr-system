import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth/client"

export const Route = createFileRoute("/_app")({
  component: AppLayout,
})

function AppLayout() {
  const { data, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!data) {
    return <Navigate to="/sign-in" />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
