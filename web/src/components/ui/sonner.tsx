"use client"

import {
  CircleCheck,
  CircleX,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheck strokeWidth={2} className="size-4" aria-hidden="true" />
        ),
        info: <Info strokeWidth={2} className="size-4" aria-hidden="true" />,
        warning: (
          <TriangleAlert
            strokeWidth={2}
            className="size-4"
            aria-hidden="true"
          />
        ),
        error: (
          <CircleX strokeWidth={2} className="size-4" aria-hidden="true" />
        ),
        loading: (
          <LoaderCircle
            strokeWidth={2}
            className="size-4 animate-spin motion-reduce:animate-pulse"
            aria-hidden="true"
          />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast animate-in fade-in-0 slide-in-from-right-4 duration-fast ease-out animate-out fade-out-0 slide-out-to-right-4 duration-fast ease-out motion-reduce:animate-none",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
