# syntax=docker/dockerfile:1

# ── Build stage ────────────────────────────────────────────────────────
FROM oven/bun:1 AS build
WORKDIR /app

# Install semua dependency (butuh dev deps untuk build)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ── Runtime stage ──────────────────────────────────────────────────────
FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Salin app hasil build (termasuk node_modules utk runtime & drizzle-kit utk db:push)
COPY --from=build /app ./

EXPOSE 3000

# Selaraskan skema DB lalu jalankan server produksi.
# --force wajib: tanpa TTY drizzle-kit gagal di prompt konfirmasi TAPI exit 0,
# sehingga server tetap start dengan DB kosong.
# (Bun otomatis serve default export ber-`fetch` di server.js.)
CMD ["sh", "-c", "bun run db:push --force && bun dist/server/server.js"]
