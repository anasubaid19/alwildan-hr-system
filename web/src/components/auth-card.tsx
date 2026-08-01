import type { ReactNode } from "react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AuthCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/30 p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--color-primary),transparent_70%)] opacity-[0.05]"
      />
      <Card className={cn("relative w-full max-w-sm", className)}>
        <CardHeader className="text-center">
          <div
            className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border font-heading text-lg font-semibold shadow-md"
            style={{
              background:
                "linear-gradient(160deg, var(--logo-surface-gradient-start), var(--logo-surface-gradient-end))",
              borderColor:
                "color-mix(in oklch, var(--logo-border) calc(var(--logo-stroke-opacity) * 100%), transparent)",
              color: "var(--logo-mark-primary)",
            }}
          >
            {/* TODO: swap for <img src="/logo.svg" alt="AL-WILDAN" className="size-8 rounded-full" /> once a real logo asset exists */}
            AW
          </div>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-sm text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        {children}
      </Card>
    </div>
  )
}
