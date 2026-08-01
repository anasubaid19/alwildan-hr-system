import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth/client"

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
})

function SignInPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await authClient.signIn.email(
        { email: email.trim(), password },
        { signal: AbortSignal.timeout(30_000) }
      )
      if (error) {
        toast.error(error.message ?? "Email atau password salah")
        return
      }
      navigate({ to: "/dashboard" })
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
      title="AL-WILDAN HR System"
      description="Islamic School Management System"
      className="max-w-[27rem] shadow-[var(--shadow-overlay)] [--card-spacing:--spacing(7)] animate-in fade-in-0 zoom-in-95 duration-normal ease-entrance"
    >
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="border-border/60 hover:border-border focus-visible:border-ring"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="border-border/60 hover:border-border focus-visible:border-ring"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-5">
          <Button
            type="submit"
            size="lg"
            className="h-13 w-full text-base font-semibold shadow-md transition-[box-shadow,transform,background-color] duration-fast hover:shadow-lg active:scale-[0.98]"
            isLoading={loading}
            loadingText="Masuk"
          >
            Masuk
          </Button>

          <div className="flex w-full flex-col items-center gap-3 border-t border-border/50 pt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-muted-foreground text-sm transition-colors duration-fast hover:text-foreground"
            >
              Lupa password?
            </Link>
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground text-xs">
              <p>
                Belum punya akun?{" "}
                <Link
                  to="/sign-up"
                  className="text-foreground/70 transition-colors duration-fast hover:text-foreground"
                >
                  Daftar
                </Link>
              </p>
              <p>
                Punya PIN undangan?{" "}
                <Link
                  to="/verify-invite"
                  className="text-foreground/70 transition-colors duration-fast hover:text-foreground"
                >
                  Verifikasi di sini
                </Link>
              </p>
            </div>
          </div>
        </CardFooter>
      </form>
    </AuthCard>
  )
}
