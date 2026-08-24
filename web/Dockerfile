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

# Hanya yang dibutuhkan runtime: build output, migrasi SQL + config drizzle
# (drizzle-kit migrate butuh drizzle.config.ts), server.ts, dan node_modules.
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

# Non-root: user `bun` (uid 1000) bawaan image oven/bun.
USER bun

# Terapkan migrasi SQL (drizzle/) lalu jalankan server produksi.
# db:migrate hanya menjalankan migrasi yang belum diterapkan — aman diulang,
# tanpa prompt TTY (pengganti db:push --force yang rawan; lihat riwayat repo).
# server.ts = static file server (dist/client) + SSR handler — server.js
# bawaan hanya SSR, aset statis akan 404.
CMD ["sh", "-c", "bun run db:migrate && bun server.ts"]
