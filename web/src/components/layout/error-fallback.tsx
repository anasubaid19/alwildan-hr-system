import { type ErrorComponentProps, useRouter } from "@tanstack/react-router"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Tampilan error route (errorComponent) — pengganti white screen. */
export function ErrorFallback({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  async function retry() {
    // Re-run loader route lalu bersihkan state error boundary.
    await router.invalidate()
    reset()
  }

  return (
    <main className="flex min-h-[60svh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div>
        <h1 className="font-semibold text-lg">Terjadi kesalahan</h1>
        <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">
          {error instanceof Error && error.message
            ? error.message
            : "Kesalahan tak terduga. Coba muat ulang halaman."}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={retry}>Coba lagi</Button>
        <Button
          variant="outline"
          onClick={() => window.location.assign("/dashboard")}
        >
          Ke Dashboard
        </Button>
      </div>
    </main>
  )
}
