import { Link, useNavigate } from "@tanstack/react-router"
import {
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  MoreHorizontal,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  Upload,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { NotificationBell } from "@/components/layout/notification-bell"
import { SearchCommand } from "@/components/layout/search-command"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { authClient } from "@/lib/auth/client"
import { type AppRole, hasAtLeast, ROLE_LABEL } from "@/lib/auth/roles"
import { useAppRole } from "@/lib/auth/use-app-role"

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  minRole: AppRole
}

const NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    minRole: "staff",
  },
  { to: "/karyawan", label: "Karyawan", icon: Users, minRole: "staff" },
  { to: "/cabang", label: "Cabang", icon: Building2, minRole: "staff" },
  { to: "/gaji", label: "Gaji", icon: Wallet, minRole: "staff" },
  { to: "/upload", label: "Upload Data", icon: Upload, minRole: "admin" },
  { to: "/laporan", label: "Laporan", icon: FileText, minRole: "staff" },
  { to: "/settings", label: "Settings", icon: Settings, minRole: "admin" },
  {
    to: "/user-management",
    label: "User Management",
    icon: UserCog,
    minRole: "super_admin",
  },
  {
    to: "/system",
    label: "System",
    icon: ShieldAlert,
    minRole: "super_admin",
  },
]

function useVisibleNav() {
  const role = useAppRole()
  return NAV.filter((item) => hasAtLeast(role, item.minRole))
}

function AuthControl() {
  const navigate = useNavigate()
  const { data } = authClient.useSession()
  const user = data?.user
  const role = useAppRole()

  const initials = (user?.name ?? user?.email ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  async function signOut() {
    await authClient.signOut()
    navigate({ to: "/sign-in" })
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Menu akun" />}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs">
          {initials || "?"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="font-medium text-sm">{user.name}</p>
          <p className="text-muted-foreground text-xs">{user.email}</p>
          <p className="mt-1 text-primary text-xs">{ROLE_LABEL[role]}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOut /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Ganti tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const nav = useVisibleNav()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex min-h-svh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:text-sm"
      >
        Skip ke konten utama
      </a>
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 md:flex">
        <div className="flex items-center gap-2 px-2 pb-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
            AW
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-sm">AL-WILDAN</p>
            <p className="text-caption">HR System</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{
                className:
                  "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
              }}
            >
              <Icon className="size-4.5" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 flex-1 items-center gap-2 rounded-lg border bg-popover px-3 text-muted-foreground text-sm transition-colors hover:bg-accent/50 sm:max-w-40"
          >
            <Search className="size-4" />
            <span>Cari…</span>
            <Kbd className="ml-auto">⌘K</Kbd>
          </button>
          <NotificationBell />
          <ThemeToggle />
          <AuthControl />
        </header>

        <main
          id="main-content"
          className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6"
        >
          {children}
        </main>
      </div>

      <MobileNav nav={nav} />

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

// Maks item langsung di bottom nav; sisanya masuk drawer "Lainnya".
const MOBILE_PRIMARY_COUNT = 4

function MobileNav({ nav }: { nav: NavItem[] }) {
  const [moreOpen, setMoreOpen] = useState(false)
  // Muat semua bila cukup; bila tidak, sisakan slot ke-5 untuk "Lainnya".
  const needsMore = nav.length > MOBILE_PRIMARY_COUNT + 1
  const primary = needsMore ? nav.slice(0, MOBILE_PRIMARY_COUNT) : nav
  const rest = needsMore ? nav.slice(MOBILE_PRIMARY_COUNT) : []

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t bg-background md:hidden">
      {primary.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground text-xs transition-colors"
          activeProps={{ className: "text-primary" }}
        >
          <Icon className="size-5" />
          <span className="truncate">{label}</span>
        </Link>
      ))}
      {needsMore && (
        <>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground text-xs transition-colors"
          >
            <MoreHorizontal className="size-5" />
            <span className="truncate">Lainnya</span>
          </button>
          <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Menu lainnya</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-1 px-4 pb-6">
                {rest.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "bg-primary/10 text-primary" }}
                  >
                    <Icon className="size-4.5" />
                    {label}
                  </Link>
                ))}
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}
    </nav>
  )
}
