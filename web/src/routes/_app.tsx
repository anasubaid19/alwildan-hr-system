import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { ErrorFallback } from "@/components/layout/error-fallback"
import { getSessionUser } from "@/server/session"

export const Route = createFileRoute("/_app")({
  // Guard server-side: user belum login tidak pernah melihat layout app.
  beforeLoad: async () => {
    const user = await getSessionUser()
    if (!user) throw redirect({ to: "/sign-in" })
    return { user }
  },
  component: AppLayout,
  // Error halaman dalam app tetap menampilkan shell (nav tetap bisa dipakai).
  errorComponent: (props) => (
    <AppShell>
      <ErrorFallback {...props} />
    </AppShell>
  ),
})

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
