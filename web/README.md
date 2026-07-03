# AL-WILDAN HR — Web (rebuild)

Frontend HR system baru sesuai `../PRD-REBUILD.md`. Stack: **Bun · TanStack Start · React 19 · Tailwind v4 · shadcn/ui (base-luma) · Drizzle ORM · Neon (Postgres) · Clerk · Biome**. Komponen & design token (aksen biru OKLCH) diadaptasi dari `../uikit` (referensi).

## Setup

```bash
cp .env.example .env   # isi DATABASE_URL (Neon) + kunci Clerk
bun install
bun run db:push        # buat tabel di Neon dari src/lib/schema.ts
bun run dev            # http://localhost:3000
```

## Struktur

```
src/
├── routes/
│   ├── __root.tsx        # ClerkProvider + QueryClient + ThemeProvider
│   ├── index.tsx         # redirect → /dashboard
│   ├── _app.tsx          # layout route (AppShell + Outlet)
│   └── _app/             # dashboard, karyawan, cabang, gaji, upload, laporan, settings
├── components/
│   ├── ui/               # shadcn/ui (disalin dari uikit)
│   └── layout/           # app-shell, page-header
├── lib/
│   ├── db.ts             # Drizzle + Neon (neon-http)
│   ├── schema.ts         # 9 tabel (users, cabang, karyawan, gaji, …)
│   ├── auth.ts           # helper Clerk (requireRole, getCurrentUser)
│   └── utils.ts          # cn()
├── start.ts              # clerkMiddleware
└── styles.css            # design token + palet biru OKLCH
```

## Skrip

| Perintah | Fungsi |
|---|---|
| `bun run dev` | dev server (HMR) |
| `bun run build` / `start` | build & jalankan produksi |
| `bun run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit |
| `bun run check` / `fix` | Biome lint+format |
| `bun run typecheck` | `tsc --noEmit` |

> Catatan: `src/routeTree.gen.ts` di-generate otomatis oleh plugin TanStack saat `dev`/`build`.
