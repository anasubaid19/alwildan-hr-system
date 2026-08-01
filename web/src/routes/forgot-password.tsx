import { createFileRoute, Link } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth/client"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await authClient.requestPasswordReset(
        { email: email.trim(), redirectTo: "/reset-password" },
        { signal: AbortSignal.timeout(30_000) }
      )
      if (error) {
        toast.error(error.message ?? "Gagal mengirim tautan reset")
        return
      }
      setSent(true)
    } catch {
      toast.error(
        "Server tidak merespons — pastikan server & Postgres berjalan, lalu coba lagi."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Lupa Password"
      description="Masukkan email untuk menerima tautan reset"
    >
      {sent ? (
        <CardContent className="flex flex-col gap-4 text-center">
          <p className="text-muted-foreground text-sm">
            Jika email terdaftar, tautan reset telah dikirim. (Mode dev: cek log
            server untuk tautannya.)
          </p>
          <Button variant="outline" render={<Link to="/sign-in" />}>
            Kembali ke Masuk
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : null} Kirim Tautan Reset
            </Button>
            <Link
              to="/sign-in"
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              Kembali ke Masuk
            </Link>
          </CardFooter>
        </form>
      )}
    </AuthCard>
  )
}
