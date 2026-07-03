import { ClerkProvider } from "@clerk/tanstack-react-start"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { ThemeProvider } from "next-themes"

import { Toaster } from "@/components/ui/sonner"
import appCss from "../styles.css?url"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AL-WILDAN HR System" },
      {
        name: "description",
        content:
          "Sistem HR AL-WILDAN Islamic School — manajemen karyawan, cabang, dan penggajian.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-title">404</h1>
      <p className="text-muted-foreground">Halaman tidak ditemukan.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryClientProvider>
        </ClerkProvider>
        {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
        <Scripts />
      </body>
    </html>
  )
}
