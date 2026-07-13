import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // strictPort: bila 3000 terpakai, GAGAL dengan jelas — jangan diam-diam
  // pindah ke 3001 (origin :3001 ditolak Better Auth → "invalid origin").
  server: { strictPort: true },
  // Prebundle deps auth di startup agar Vite tak re-optimize di tengah sesi
  // (re-optimasi memicu reload yang meng-invalidasi server function dev).
  optimizeDeps: {
    include: [
      "better-auth",
      "better-auth/react",
      "@better-auth/core/env",
      "@better-auth/core/error",
      "@better-auth/core/utils/string",
      "@better-auth/core/utils/url",
      "@better-fetch/fetch",
      "nanostores",
      "seroval",
      "defu",
      "@tanstack/router-core",
      "@tanstack/router-core/isServer",
      "@tanstack/router-core/ssr/client",
    ],
  },
  plugins: [
    // consolePiping off: relay console server↔browser bisa saling memantul
    // (pesan server → console browser → terminal → relay lagi) sampai log
    // membengkak & tab browser beku.
    devtools({ consolePiping: { enabled: false } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
