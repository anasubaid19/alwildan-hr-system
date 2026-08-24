// Server produksi Bun: sajikan aset statis dist/client (handler SSR bawaan
// TanStack Start TIDAK menyajikan file statis — tanpa ini CSS/JS 404) lalu
// teruskan request lainnya ke handler SSR.
// ponytail: tanpa preload/gzip/etag ala server referensi TanStack — tool
// internal; tambahkan bila traffic & aset besar terasa.
import { fileURLToPath } from "node:url"
// @ts-expect-error — build output tanpa .d.ts
import handler from "./dist/server/server.js"

// fileURLToPath wajib: .pathname menghasilkan path ter-encode (spasi → %20).
const clientDir = fileURLToPath(new URL("./dist/client", import.meta.url))
const port = Number(process.env.PORT ?? 3000)

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname !== "/") {
      // URL constructor menormalisasi dot-segment → pathname bebas "..".
      const file = Bun.file(clientDir + url.pathname)
      if (await file.exists()) {
        const immutable = url.pathname.startsWith("/assets/")
        return new Response(file, {
          headers: {
            "cache-control": immutable
              ? "public, max-age=31536000, immutable"
              : "public, max-age=3600",
          },
        })
      }
    }
    return handler.fetch(req)
  },
})

console.log(`Server produksi jalan di http://localhost:${port}`)
