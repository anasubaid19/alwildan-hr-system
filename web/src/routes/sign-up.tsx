import { EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useMemo, useState } from "react"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth/client"

type PasswordStrength = "weak" | "medium" | "strong"

function getPasswordStrength(password: string): PasswordStrength | null {
  if (password.length === 0) return null
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 2) return "weak"
  if (score <= 3) return "medium"
  return "strong"
}

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: "Lemah",
  medium: "Sedang",
  strong: "Kuat",
}
const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak: "bg-destructive",
  medium: "bg-warning",
  strong: "bg-success",
}
const STRENGTH_BARS: Record<PasswordStrength, number> = {
  weak: 1,
  medium: 2,
  strong: 3,
}

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
})

function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => getPasswordStrength(password), [password])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok")
      return
    }
    setLoading(true)
    try {
      const { error } = await authClient.signUp.email(
        { name: name.trim(), email: email.trim(), password },
        { signal: AbortSignal.timeout(30_000) }
      )
      if (error) {
        toast.error(error.message ?? "Gagal mendaftar")
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
      title="Daftar"
      description="Buat akun baru untuk mengakses HR System AL-WILDAN."
      className="max-w-[29rem] shadow-[var(--shadow-overlay)] [--card-spacing:--spacing(7)] animate-in fade-in-0 zoom-in-95 duration-normal ease-entrance"
    >
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              className="border-border/60 hover:border-border focus-visible:border-ring"
            />
          </div>
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
            <InputGroup className="border-border/60 hover:border-border">
              <InputGroupInput
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-sm"
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <HugeiconsIcon
                    icon={showPassword ? EyeOffIcon : EyeIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <p className="text-muted-foreground text-xs">Minimal 8 karakter.</p>
            {strength && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3].map((bar) => (
                    <div
                      key={bar}
                      className={`h-1 flex-1 rounded-full transition-colors duration-fast ${
                        bar <= STRENGTH_BARS[strength]
                          ? STRENGTH_COLOR[strength]
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground text-xs">
                  {STRENGTH_LABEL[strength]}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">Konfirmasi Password</Label>
            <InputGroup className="border-border/60 hover:border-border">
              <InputGroupInput
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-sm"
                  aria-label={
                    showConfirmPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  <HugeiconsIcon
                    icon={showConfirmPassword ? EyeOffIcon : EyeIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-4">
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base font-semibold shadow-md transition-[box-shadow,transform,background-color] duration-fast hover:shadow-lg active:scale-[0.98]"
            isLoading={loading}
            loadingText="Daftar"
          >
            Daftar
          </Button>
          <p className="text-muted-foreground text-sm">
            Sudah punya akun?{" "}
            <Link
              to="/sign-in"
              className="text-primary transition-colors duration-fast hover:underline"
            >
              Masuk
            </Link>
          </p>
        </CardFooter>
      </form>
    </AuthCard>
  )
}
