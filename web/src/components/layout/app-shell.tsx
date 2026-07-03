import {
  OrganizationSwitcher,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import {
  Building2,
  FileText,
  LayoutDashboard,
  Moon,
  Search,
  Settings,
  Sun,
  Upload,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"
import { useTheme } from "next-themes"

import { NotificationBell } from "@/components/layout/notification-bell"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { type AppRole, hasAtLeast } from "@/lib/auth/roles"
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
]

function useVisibleNav() {
  const role = useAppRole()
  return NAV.filter((item) => hasAtLeast(role, item.minRole))
}

function AuthControl() {
  const { isSignedIn } = useUser()
  if (isSignedIn) {
    return <UserButton />
  }
  return (
    <SignInButton mode="modal">
      <Button size="sm">Masuk</Button>
    </SignInButton>
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

  return (
    <div className="flex min-h-svh bg-background">
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
            className="flex h-9 flex-1 items-center gap-2 rounded-lg border bg-popover px-3 text-muted-foreground text-sm transition-colors hover:bg-accent/50 sm:max-w-xs"
          >
            <Search className="size-4" />
            <span>Cari…</span>
            <Kbd className="ml-auto">⌘K</Kbd>
          </button>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
          />
          <NotificationBell />
          <ThemeToggle />
          <AuthControl />
        </header>

        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t bg-background md:hidden">
        {nav.slice(0, 5).map(({ to, label, icon: Icon }) => (
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
      </nav>
    </div>
  )
}
