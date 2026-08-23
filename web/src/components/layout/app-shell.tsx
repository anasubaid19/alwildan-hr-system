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

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Utama",
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        minRole: "staff",
      },
    ],
  },
  {
    label: "Data",
    items: [
      { to: "/karyawan", label: "Karyawan", icon: Users, minRole: "staff" },
      { to: "/cabang", label: "Cabang", icon: Building2, minRole: "staff" },
      { to: "/gaji", label: "Gaji", icon: Wallet, minRole: "staff" },
      { to: "/upload", label: "Upload Data", icon: Upload, minRole: "admin" },
      { to: "/laporan", label: "Laporan", icon: FileText, minRole: "staff" },
    ],
  },
  {
    label: "Administrasi",
    items: [
      {
        to: "/settings",
        label: "Pengaturan",
        icon: Settings,
        minRole: "admin",
      },
      {
        to: "/user-management",
        label: "Manajemen Pengguna",
        icon: UserCog,
        minRole: "super_admin",
      },
      {
        to: "/system",
        label: "Sistem",
        icon: ShieldAlert,
        minRole: "super_admin",
      },
    ],
  },
]

function useVisibleNavGroups() {
  const role = useAppRole()
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasAtLeast(role, item.minRole)),
  })).filter((group) => group.items.length > 0)
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
    // Morphing sun/moon button dari amicro (LightDarkMorphToggle): ikon
    // berputar 180° + scale pop spring tiap klik, keyframes di styles.css
    // digerakkan class `.dark` — markup identik SSR/klien, bebas hydration
    // mismatch.
    <button
      type="button"
      aria-label="Ganti tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-amber-50/80 outline-none transition-[scale,background-color,border-color] duration-fast ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 dark:border-white/15 dark:bg-[#181818]"
    >
      <span
        aria-hidden="true"
        className="sunmoon-morph relative flex size-4.5 items-center justify-center"
      >
        <Sun className="absolute size-4.5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-opacity duration-fast ease-out motion-reduce:transition-none dark:opacity-0" />
        <Moon className="absolute size-4.5 text-indigo-300 opacity-0 drop-shadow-[0_0_8px_rgba(165,180,252,0.5)] transition-opacity duration-fast ease-out motion-reduce:transition-none dark:opacity-100" />
      </span>
    </button>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const navGroups = useVisibleNavGroups()
  const nav = navGroups.flatMap((group) => group.items)
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
          <img
            src="/hr2.svg"
            alt="Logo AL-WILDAN"
            className="size-8 rounded-lg"
          />
          <div className="leading-tight">
            <p className="font-semibold text-sm">AL-WILDAN</p>
            <p className="text-caption">HR System</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navGroups.map((group, gi) => (
            <div key={group.label}>
              <p
                className={`px-3 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground/70 uppercase ${
                  gi > 0 ? "pt-4" : "pt-1"
                }`}
              >
                {group.label}
              </p>
              {group.items.map(({ to, label, icon: Icon }) => (
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
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 flex-1 items-center gap-2 rounded-lg border bg-popover px-3 text-muted-foreground text-sm transition-colors hover:bg-accent/50 sm:max-w-56"
          >
            <Search className="size-4 shrink-0" />
            <span className="min-w-0 truncate">Cari karyawan, cabang…</span>
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
