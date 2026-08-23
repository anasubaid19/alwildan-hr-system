import type { ReactNode } from "react"

export interface ChartTooltipContentProps {
  active?: boolean
  label?: string
  theme?: "dark" | "light"
  indicator?: "dot" | "line" | "dashed"
  formatter?: (value: number, name: string) => ReactNode
}

type TooltipPayloadItem = {
  color?: string
  fill?: string
  name?: string
  dataKey?: string
  value?: number | string
}

export function DitherChartTooltipContent({
  active,
  payload,
  label,
  theme = "dark",
  indicator = "dot",
  formatter,
}: ChartTooltipContentProps & { payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null

  const isDark = theme === "dark"

  return (
    <div
      className={`pointer-events-none z-50 rounded-xl border px-3 py-2 font-sans text-xs shadow-2xl backdrop-blur-md transition-all ${
        isDark
          ? "border-white/10 bg-[#181818]/90 text-white shadow-black/80"
          : "border-neutral-200 bg-white/95 text-neutral-900 shadow-neutral-300/50"
      }`}
    >
      {label && (
        <div
          className={`mb-1.5 border-b pb-1 font-medium tracking-tight ${
            isDark
              ? "border-white/10 text-neutral-300"
              : "border-neutral-200 text-neutral-600"
          }`}
        >
          {label}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, idx) => {
          const color =
            item.color || item.fill || (isDark ? "#FFFFFF" : "#151515")
          const numeric = Number(item.value)
          const valueDisplay = formatter
            ? formatter(numeric, item.name ?? "")
            : typeof item.value === "number"
              ? item.value.toLocaleString()
              : item.value

          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {indicator === "dot" && (
                  <span
                    className="h-2 w-2 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: color }}
                  />
                )}
                {indicator === "line" && (
                  <span
                    className="h-0.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span
                  className={`font-normal ${isDark ? "text-neutral-400" : "text-neutral-600"}`}
                >
                  {item.name || item.dataKey}:
                </span>
              </div>
              <span className="font-semibold tabular-nums">{valueDisplay}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
