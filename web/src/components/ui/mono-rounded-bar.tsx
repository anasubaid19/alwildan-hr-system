import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { DitherChartTooltipContent } from "./recharts-tooltip"

interface BarPoint {
  label: string
  value: number
}

interface MonoRoundedBarChartProps {
  theme?: "dark" | "light"
  compact?: boolean
  /** Data batang; kartu kosong ditangani parent. */
  data?: BarPoint[]
  /** Judul kecil di kiri atas kartu. */
  title?: string
  /** Keterangan singkat di bawah metrik utama. */
  subtitle?: string
  /** Baris tambahan kecil di bawah subtitle, mis. "Potongan Rp 710.000". */
  potonganLabel?: string
  /** Satuan nilai utama, mis. "rupiah". */
  unit?: string
  /** Format tampilan nilai penuh (tooltip, header, footer). */
  formatValue?: (value: number) => string
  /** Format ringkas khusus sumbu Y; default mengikuti formatValue. */
  formatAxis?: (value: number) => string
}

export function MonoRoundedBarChart({
  theme = "dark",
  compact = false,
  data,
  title = "Statistik per Cabang",
  subtitle,
  potonganLabel,
  unit = "",
  formatValue = (v) => `${v}`,
  formatAxis,
}: MonoRoundedBarChartProps) {
  const isDark = theme === "dark"
  const points = data ?? []
  const total = points.reduce((acc, p) => acc + p.value, 0)
  const avg = points.length > 0 ? total / points.length : 0
  const fmtAxis = formatAxis ?? formatValue

  return (
    <div
      className={`relative w-full rounded-[24px] transition-all duration-300 group flex flex-col justify-between overflow-hidden p-4 sm:p-5 ${
        compact ? "h-[220px] sm:h-[268px]" : "min-h-[290px]"
      } ${
        isDark
          ? "bg-[#181818] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-[#202020]"
          : "bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-neutral-100 text-[#151515] hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold tracking-wider uppercase ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
            >
              {title}
            </span>
          </div>
          <div className="text-xl font-bold tracking-tight tabular-nums mt-0.5 font-sans">
            {formatValue(total)}{" "}
            {unit && (
              <span className="text-xs font-normal opacity-70">{unit}</span>
            )}
          </div>
          {subtitle && (
            <div
              className={`mt-0.5 text-[11px] ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
            >
              {subtitle}
            </div>
          )}
          {potonganLabel && (
            <div
              className={`mt-1 text-[11px] ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
            >
              {potonganLabel}
            </div>
          )}
        </div>
      </div>

      {/* Main Recharts Stage */}
      <div
        className={`relative w-full flex-1 rounded-[14px] overflow-hidden p-2 transition-colors duration-300 ${
          isDark ? "bg-[#131313]" : "bg-[#f4f4f6]"
        }`}
      >
        <ResponsiveContainer width="100%" height={compact ? 130 : 160}>
          <BarChart
            data={points}
            margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="2 2"
              vertical={false}
              stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: isDark ? "#71717A" : "#A1A1AA" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v) => fmtAxis(Number(v))}
              tick={{ fontSize: 10, fill: isDark ? "#71717A" : "#A1A1AA" }}
            />
            <Tooltip
              cursor={{
                fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              }}
              content={
                <DitherChartTooltipContent
                  theme={theme}
                  indicator="dot"
                  formatter={(v) => formatValue(Number(v))}
                />
              }
            />

            <Bar
              dataKey="value"
              name={title}
              fill="#2563eb"
              radius={[8, 8, 8, 8]}
              barSize={20}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div
        className={`flex items-center justify-between mt-3 pt-1 border-t text-[11px] font-mono ${
          isDark ? "border-white/5" : "border-neutral-200"
        }`}
      >
        <span className={isDark ? "text-neutral-400" : "text-neutral-600"}>
          Rata-rata / cabang
        </span>
        <span
          className={
            isDark ? "text-white font-medium" : "text-[#151515] font-medium"
          }
        >
          {fmtAxis(avg)}
        </span>
      </div>
    </div>
  )
}
