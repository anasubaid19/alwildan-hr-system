import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileText,
  type LucideIcon,
  RefreshCw,
  UploadCloud,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { MonoRoundedBarChart } from "@/components/ui/mono-rounded-bar"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { authClient } from "@/lib/auth/client"
import { type AppRole, hasAtLeast } from "@/lib/auth/roles"
import { useAppRole } from "@/lib/auth/use-app-role"
import { QK } from "@/lib/query-keys"
import { type DashboardSummary, getDashboardSummary } from "@/server/dashboard"

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
})

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})
const compactRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
})
const monthYear = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
})
const timeOnly = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

/** "2026-07" → "Juli 2026". */
function formatPeriode(p: string): string {
  const [y, m] = p.split("-").map(Number)
  if (!y || !m) return p
  return monthYear.format(new Date(y, m - 1, 1))
}

function formatTime(d: Date | null): string {
  return d ? timeOnly.format(new Date(d)) : ""
}

function timeAgo(d: Date | null): string {
  if (!d) return ""
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "baru saja"
  if (mins < 60) return `${mins} mnt lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d))
}

type QuickAction = {
  to: string
  label: string
  hint: string
  icon: LucideIcon
  minRole: AppRole
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    to: "/upload",
    label: "Upload Data",
    hint: "Impor Excel gaji cabang",
    icon: UploadCloud,
    minRole: "admin",
  },
  {
    to: "/cabang",
    label: "Tambah Cabang",
    hint: "Buat cabang baru",
    icon: Building2,
    minRole: "admin",
  },
  {
    to: "/karyawan",
    label: "Tambah Karyawan",
    hint: "Tambah data pegawai",
    icon: UserPlus,
    minRole: "admin",
  },
  {
    to: "/laporan",
    label: "Lihat Laporan",
    hint: "Rekap penggajian",
    icon: FileText,
    minRole: "staff",
  },
]

const ONBOARDING_STEPS = [
  { to: "/cabang", label: "Tambahkan Cabang" },
  { to: "/karyawan", label: "Tambahkan Karyawan" },
  { to: "/upload", label: "Upload File Excel" },
  { to: "/laporan", label: "Lihat Rekap" },
] as const

function DashboardPage() {
  const { data: sessionData } = authClient.useSession()
  const role = useAppRole()
  const [periode, setPeriode] = useState("")

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...QK.dashboard, { periode }],
    queryFn: () => getDashboardSummary({ data: { periode } }),
  })

  const periodeList = data?.availablePeriodes ?? []
  const firstName = sessionData?.user?.name?.split(/\s+/)[0]

  return (
    <>
      <PageHeader
        title={`Selamat Datang${firstName ? `, ${firstName}` : ""}`}
        description="Pusat rekapitulasi penggajian seluruh cabang AL-WILDAN."
        action={
          <div className="flex flex-col items-end gap-1">
            <span className="text-muted-foreground text-sm font-medium">
              Periode
            </span>
            <NativeSelect
              className="w-44"
              value={periode || data?.periode || ""}
              onChange={(e) => setPeriode(e.target.value)}
              aria-label="Pilih periode"
              disabled={isLoading || periodeList.length === 0}
            >
              {periodeList.length === 0 ? (
                <NativeSelectOption value="">Belum ada data</NativeSelectOption>
              ) : (
                periodeList.map((p) => (
                  <NativeSelectOption key={p} value={p}>
                    {formatPeriode(p)}
                  </NativeSelectOption>
                ))
              )}
            </NativeSelect>
          </div>
        }
      />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <DashboardSkeleton />
      ) : data && data.totalCabang === 0 ? (
        <Onboarding />
      ) : data ? (
        <DashboardContent data={data} role={role} />
      ) : null}
    </>
  )
}

function DashboardContent({
  data,
  role,
}: {
  data: DashboardSummary
  role: AppRole
}) {
  const kpiPeriode = data.periode
    ? `Periode ${formatPeriode(data.periode)}`
    : "—"
  const uploadedTotal = data.uploadStatus.length
  const uploadPct =
    uploadedTotal > 0
      ? Math.round((data.uploadedCabang / uploadedTotal) * 100)
      : 0

  const kpis = [
    {
      label: "Cabang Sudah Upload",
      value: `${data.uploadedCabang} / ${uploadedTotal}`,
      context: `${uploadPct}% terupload`,
      icon: Building2,
    },
    {
      label: "Total Karyawan",
      value: String(data.totalKaryawan),
      context: "Seluruh cabang",
      icon: Users,
    },
    {
      label: "Total Gaji Bruto",
      value: rupiah.format(data.totalGaji),
      context: kpiPeriode,
      icon: Wallet,
    },
    {
      label: "Slip Gaji Diproses",
      value: String(data.totalSlip),
      context: kpiPeriode,
      icon: FileText,
    },
  ]
  const quickActions = QUICK_ACTIONS.filter((a) => hasAtLeast(role, a.minRole))

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, context, icon: Icon }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
              <p className="text-muted-foreground text-xs">{context}</p>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
        ))}
      </div>

      <QuickActions actions={quickActions} />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <UploadStatusCard data={data} />
        <ActivityCard data={data} />
      </div>

      <ChartCard data={data} />
    </>
  )
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 font-medium text-sm">Tindakan Cepat</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 rounded-4xl bg-card p-5 text-sm text-card-foreground ring-1 ring-foreground/5 transition-colors duration-normal hover:bg-accent/50 hover:ring-primary/30 motion-reduce:transition-none dark:ring-foreground/10"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-normal group-hover:scale-105 motion-reduce:group-hover:scale-100">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{hint}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-normal group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 motion-reduce:transition-none" />
          </Link>
        ))}
      </div>
    </section>
  )
}

function UploadStatusCard({ data }: { data: DashboardSummary }) {
  const statuses = data.uploadStatus
  const okList = statuses.filter((s) => s.status === "ok")
  const errorList = statuses.filter((s) => s.status === "error")
  const pendingCount = statuses.length - okList.length - errorList.length
  const total = statuses.length
  const pct = total > 0 ? Math.round((okList.length / total) * 100) : 0

  // Urutan berbasis atensi: gagal dulu, lalu belum upload, terakhir berhasil.
  const order = { error: 0, none: 1, ok: 2 } as const
  const sorted = [...statuses].sort((a, b) => order[a.status] - order[b.status])
  const visible = sorted.slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Upload Bulan Ini</CardTitle>
        <CardDescription>
          Cabang yang sudah mengirim data
          {data.periode ? ` untuk ${formatPeriode(data.periode)}` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">
              {okList.length} / {total} cabang sudah upload
            </span>
            <span className="text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-normal ease-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${pct / 100})` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-500" />
              Berhasil · {okList.length}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Belum upload · {pendingCount}
            </span>
            {errorList.length > 0 && (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="size-3.5" />
                Gagal · {errorList.length}
              </span>
            )}
          </div>
        </div>

        {pct === 100 && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-600/20 bg-emerald-600/5 p-3 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
            <span>Semua cabang sudah upload untuk periode ini.</span>
          </div>
        )}

        <div>
          <ul className="divide-y divide-border/60">
            {visible.map((s) => (
              <li
                key={s.cabangId}
                className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate font-medium">
                  {s.kode} · {s.nama}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={
                      s.status === "ok"
                        ? "success"
                        : s.status === "error"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {s.status === "ok"
                      ? "Berhasil"
                      : s.status === "error"
                        ? "Gagal"
                        : "Belum"}
                  </Badge>
                  <span className="w-[104px] text-right text-xs text-muted-foreground tabular-nums">
                    {formatTime(s.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {statuses.length > visible.length && (
            <Link
              to="/cabang"
              className="mt-2 inline-flex items-center gap-1 text-primary text-sm hover:underline"
            >
              Lihat detail
              <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>

        {errorList.length > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-destructive uppercase">
              <AlertCircle className="size-3.5" />
              Detail kegagalan · {errorList.length}
            </p>
            <ul className="flex flex-col gap-1">
              {errorList.map((s) => (
                <li
                  key={s.cabangId}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <span className="font-medium">
                    {s.kode} · {s.nama}
                  </span>
                  {s.detail && (
                    <span className="text-right text-xs text-muted-foreground">
                      {s.detail}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityCard({ data }: { data: DashboardSummary }) {
  const activity = data.activity.slice(0, 3)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitas Terbaru</CardTitle>
        <CardDescription>Peristiwa upload data gaji terbaru.</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada aktivitas upload untuk periode ini.
          </p>
        ) : (
          <>
            <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
              {activity.map((a) => (
                <li key={a.id} className="relative">
                  <span
                    className={`absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background ${a.status === "success" ? "bg-emerald-600" : a.status === "failed" ? "bg-destructive" : "bg-primary"}`}
                  />
                  <p className="text-sm">
                    <span className="font-medium">
                      {a.cabangNama ?? a.cabangKode ?? "Cabang"}
                    </span>{" "}
                    mengupload data {a.periode ? formatPeriode(a.periode) : ""}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {a.status === "success" ? (
                      <Badge variant="success">Berhasil</Badge>
                    ) : a.status === "failed" ? (
                      <Badge variant="destructive">Gagal</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                    {a.detail && <span>{a.detail}</span>}
                    <span className="tabular-nums">{timeAgo(a.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ol>
            {data.activity.length > 3 && (
              <Link
                to="/laporan"
                className="mt-4 inline-flex items-center gap-1 text-primary text-sm hover:underline"
              >
                Lihat detail
                <ChevronRight className="size-3.5" />
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ChartCard({ data }: { data: DashboardSummary }) {
  const perCabang = data.perCabang
  // undefined (pra-hidrasi) → "light", sama dengan defaultTheme aplikasi.
  const chartTheme = useTheme().resolvedTheme === "dark" ? "dark" : "light"
  const top5 = perCabang.slice(0, 5)
  const potongan = data.totalGaji - data.totalDiterima
  return (
    <div className="mt-6">
      {perCabang.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Belum ada data gaji untuk periode ini
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <MonoRoundedBarChart
            theme={chartTheme}
            title="Statistik Gaji Diterima per Cabang"
            subtitle={`Top ${top5.length} cabang · total diterima (netto)${
              data.periode ? ` · ${formatPeriode(data.periode)}` : ""
            }`}
            potonganLabel={
              potongan > 0 ? `Potongan ${rupiah.format(potongan)}` : undefined
            }
            unit="rupiah"
            formatValue={(v) => rupiah.format(v)}
            formatAxis={(v) => compactRupiah.format(v)}
            data={top5.map((c) => ({
              label: c.kode,
              value: Number(c.total ?? 0),
            }))}
          />
          <div className="mt-2 text-right">
            <Link
              to="/laporan"
              className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
            >
              Lihat detail di Laporan
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Empty className="rounded-xl border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircle />
        </EmptyMedia>
        <EmptyTitle>Gagal memuat dashboard</EmptyTitle>
        <EmptyDescription>
          Terjadi kesalahan saat mengambil data. Periksa koneksi Anda, lalu coba
          lagi.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Coba lagi
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function Onboarding() {
  return (
    <Empty className="rounded-xl border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Database />
        </EmptyMedia>
        <EmptyTitle>Belum ada data</EmptyTitle>
        <EmptyDescription>
          Pusat rekapitulasi penggajian siap dipakai. Mulai dari langkah
          berikut:
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="w-full max-w-md">
        <ol className="flex w-full flex-col gap-2">
          {ONBOARDING_STEPS.map((s, i) => (
            <li
              key={s.to}
              className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium">{s.label}</span>
              <Link
                to={s.to}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Buka
              </Link>
            </li>
          ))}
        </ol>
      </EmptyContent>
    </Empty>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[88px] rounded-4xl" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <Skeleton className="h-[290px] w-full rounded-[24px]" />
      </div>
    </>
  )
}
