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
  UploadCloud,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react"
import { useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
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
import { MonoRoundedLineChart } from "@/components/ui/mono-rounded-line"
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
const compact = new Intl.NumberFormat("id-ID", {
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

  const { data, isLoading } = useQuery({
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
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Periode Aktif
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

      {isLoading ? (
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
  const kpis = [
    {
      label: "Cabang Sudah Upload",
      value: `${data.uploadedCabang} / ${data.totalCabang}`,
      icon: Building2,
    },
    {
      label: "Total Karyawan",
      value: String(data.totalKaryawan),
      icon: Users,
    },
    {
      label: "Total Gaji Bulan Ini",
      value: rupiah.format(data.totalGaji),
      icon: Wallet,
    },
    {
      label: "Slip Gaji Diproses",
      value: String(data.totalSlip),
      icon: FileText,
    },
  ]
  const quickActions = QUICK_ACTIONS.filter((a) => hasAtLeast(role, a.minRole))

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </div>
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
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map(({ to, label, hint, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="group flex items-center gap-3 rounded-4xl bg-card p-5 text-sm text-card-foreground shadow-md ring-1 ring-foreground/5 transition-colors hover:bg-accent/50 hover:ring-primary/30 dark:ring-foreground/10"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{hint}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 motion-reduce:transition-none" />
        </Link>
      ))}
    </div>
  )
}

function UploadStatusCard({ data }: { data: DashboardSummary }) {
  const statuses = data.uploadStatus
  const okList = statuses.filter((s) => s.status === "ok")
  const noneList = statuses.filter((s) => s.status === "none")
  const errorList = statuses.filter((s) => s.status === "error")
  const total = statuses.length
  const pct = total > 0 ? Math.round((okList.length / total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Upload Bulan Ini</CardTitle>
        <CardDescription>
          Cabang yang sudah mengirim data
          {data.periode ? ` untuk ${formatPeriode(data.periode)}` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
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
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-500" />
              Sudah upload · {okList.length}
            </h4>
            {okList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada</p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {okList.map((s) => (
                  <li
                    key={s.cabangId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate font-medium">
                      {s.kode} · {s.nama}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatTime(s.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Clock className="size-3.5" />
              Belum upload · {noneList.length}
            </h4>
            {noneList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Semua sudah upload
              </p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {noneList.map((s) => (
                  <li
                    key={s.cabangId}
                    className="truncate text-sm text-muted-foreground"
                  >
                    {s.kode} · {s.nama}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {errorList.length > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-destructive uppercase">
              <AlertCircle className="size-3.5" />
              Upload gagal · {errorList.length}
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
                    <span className="text-xs text-muted-foreground">
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
  const activity = data.activity
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
          <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
            {activity.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background bg-primary" />
                <p className="text-sm">
                  <span className="font-medium">
                    {a.cabangNama ?? a.cabangKode ?? "Cabang"}
                  </span>{" "}
                  mengupload data {a.periode ? formatPeriode(a.periode) : ""}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {a.status === "success" ? (
                    <Badge variant="default">Berhasil</Badge>
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
        )}
      </CardContent>
    </Card>
  )
}

function ChartCard({ data }: { data: DashboardSummary }) {
  const perCabang = data.perCabang
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
        <MonoRoundedLineChart
          title="Statistik Gaji per Cabang"
          unit="rupiah"
          formatValue={(v) => compact.format(v)}
          data={perCabang.map((c) => ({
            label: c.kode,
            value: Number(c.total ?? 0),
          }))}
        />
      )}
    </div>
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
    </>
  )
}
