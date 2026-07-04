import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Prebundle deps auth di startup agar Vite tak re-optimize di tengah sesi
  // (re-optimasi memicu reload yang meng-invalidasi server function dev).
  optimizeDeps: {
    include: ["better-auth", "better-auth/react", "nanostores"],
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
