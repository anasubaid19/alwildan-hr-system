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
            className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border"
            style={{
              background:
                "linear-gradient(160deg, var(--logo-surface-gradient-start), var(--logo-surface-gradient-end))",
              borderColor:
                "color-mix(in oklch, var(--logo-border) calc(var(--logo-stroke-opacity) * 100%), transparent)",
            }}
          >
            <img
              src="/hr2.svg"
              alt="AL-WILDAN"
              className="size-10 rounded-full"
            />
          </div>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-sm text-muted-foreground whitespace-pre-line">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        {children}
      </Card>
    </div>
  )
}
