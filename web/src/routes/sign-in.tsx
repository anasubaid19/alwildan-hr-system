import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
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
    const { error } = await authClient.signIn.email({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message ?? "Email atau password salah")
      return
    }
    navigate({ to: "/dashboard" })
  }

  return (
    <AuthCard title="Masuk" description="Sistem HR AL-WILDAN Islamic School">
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-muted-foreground text-xs hover:text-foreground"
              >
                Lupa password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner /> : null} Masuk
          </Button>
          <p className="text-muted-foreground text-sm">
            Belum punya akun?{" "}
            <Link to="/sign-up" className="text-primary hover:underline">
              Daftar
            </Link>
          </p>
          <p className="text-muted-foreground text-sm">
            Punya PIN undangan?{" "}
            <Link to="/verify-invite" className="text-primary hover:underline">
              Verifikasi di sini
            </Link>
          </p>
        </CardFooter>
      </form>
    </AuthCard>
  )
}
