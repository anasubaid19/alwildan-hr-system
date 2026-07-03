import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Building2, TrendingUp, Users, Wallet } from "lucide-react"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { PageHeader } from "@/components/layout/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardSummary } from "@/server/dashboard"

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

const chartConfig = {
  total: { label: "Diterima", color: "var(--primary)" },
} satisfies ChartConfig

function DashboardPage() {
  const [periode, setPeriode] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", { periode }],
    queryFn: () => getDashboardSummary({ data: { periode } }),
  })

  const kpis = [
    {
      label: "Total Cabang",
      value: data ? String(data.totalCabang) : "—",
      icon: Building2,
    },
    {
      label: "Total Karyawan",
      value: data ? String(data.totalKaryawan) : "—",
      icon: Users,
    },
    {
      label: "Total Gaji (bruto)",
      value: data ? rupiah.format(data.totalGaji) : "Rp —",
      icon: Wallet,
    },
    {
      label: "Total Diterima",
      value: data ? rupiah.format(data.totalDiterima) : "Rp —",
      icon: TrendingUp,
    },
  ]

  const periodeList = data?.availablePeriodes ?? []
  const perCabang = data?.perCabang ?? []

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan penggajian AL-WILDAN per periode."
        action={
          <NativeSelect
            className="w-44"
            value={data?.periode ?? periode}
            onChange={(e) => setPeriode(e.target.value)}
            aria-label="Pilih periode"
            disabled={isLoading || periodeList.length === 0}
          >
            {periodeList.length === 0 ? (
              <NativeSelectOption value="">Belum ada data</NativeSelectOption>
            ) : (
              periodeList.map((p) => (
                <NativeSelectOption key={p} value={p}>
                  {p}
                </NativeSelectOption>
              ))
            )}
          </NativeSelect>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">
                {isLoading ? <Skeleton className="h-8 w-24" /> : value}
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Gaji per Cabang</CardTitle>
          <CardDescription>
            Total diterima per cabang
            {data?.periode ? ` — periode ${data.periode}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : perCabang.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
              Belum ada data gaji untuk periode ini
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart accessibilityLayer data={perCabang}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="kode"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => rupiah.format(Number(value))}
                    />
                  }
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={6} />
              </BarChart>
            </ChartContainer>
          )}
          {perCabang.length > 0 && (
            <p className="mt-3 text-muted-foreground text-xs">
              Sumbu Y dalam Rupiah · nilai tertinggi:{" "}
              {compact.format(perCabang[0]?.total ?? 0)}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
