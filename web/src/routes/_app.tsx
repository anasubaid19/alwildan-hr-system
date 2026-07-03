import { RedirectToSignIn, useAuth } from "@clerk/tanstack-react-start"
import { createFileRoute, Outlet } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { Spinner } from "@/components/ui/spinner"

export const Route = createFileRoute("/_app")({
  component: AppLayout,
})

function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
