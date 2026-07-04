import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { acceptInvite, verifyInvitePin } from "@/server/invite"

export const Route = createFileRoute("/verify-invite")({
  component: VerifyInvitePage,
})

function VerifyInvitePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState("")
  const [pin, setPin] = useState("")
  const [invitedName, setInvitedName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function onVerify(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await verifyInvitePin({
        data: { email: email.trim(), pin: pin.trim() },
      })
      setInvitedName(res.name)
      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PIN tidak valid")
    } finally {
      setLoading(false)
    }
  }

  async function onAccept(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("Password minimal 8 karakter")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Konfirmasi password tidak sama")
      return
    }
    setLoading(true)
    try {
      await acceptInvite({
        data: { email: email.trim(), pin: pin.trim(), password },
      })
      toast.success("Akun berhasil dibuat — silakan masuk")
      navigate({ to: "/sign-in" })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat akun")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Verifikasi Undangan"
      description={
        step === 1
          ? "Masukkan PIN yang Anda terima dari super admin"
          : `Halo ${invitedName} — atur password akun Anda`
      }
    >
      {step === 1 ? (
        <form onSubmit={onVerify}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="email@alwildan.sch.id"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pin">PIN (6 digit)</Label>
              <Input
                id="pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="text-center font-mono text-lg tracking-[0.4em]"
                placeholder="••••••"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || pin.length !== 6}
            >
              {loading ? <Spinner /> : null} Verifikasi PIN
            </Button>
            <p className="text-muted-foreground text-sm">
              Sudah punya akun?{" "}
              <Link to="/sign-in" className="text-primary hover:underline">
                Masuk
              </Link>
            </p>
            <p className="text-muted-foreground text-xs">
              Belum dapat PIN? Hubungi super admin.
            </p>
          </CardFooter>
        </form>
      ) : (
        <form onSubmit={onAccept}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password baru</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Konfirmasi password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <p className="text-muted-foreground text-xs">Minimal 8 karakter.</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : null} Buat Akun & Login
            </Button>
          </CardFooter>
        </form>
      )}
    </AuthCard>
  )
}
