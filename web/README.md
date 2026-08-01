# AL-WILDAN HR — Web (rebuild)

Frontend HR system baru sesuai `../PRD-REBUILD.md`. Stack: **Bun · TanStack Start · React 19 · Tailwind v4 · shadcn/ui (base-luma) · Drizzle ORM · PostgreSQL (self-hosted) · Better Auth · Biome**. Komponen & design token (aksen biru OKLCH) diadaptasi dari `../uikit` (referensi).

## Setup

```bash
cp .env.example .env   # isi DATABASE_URL + BETTER_AUTH_SECRET (openssl rand -base64 32)
bun install
bun run db:push        # buat tabel dari src/lib/db/schema.ts
bun run dev            # http://localhost:3100
```

Env variable (lihat `.env.example`):

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | koneksi PostgreSQL |
| `BETTER_AUTH_SECRET` | secret sesi Better Auth (wajib) |
| `BETTER_AUTH_URL` | origin app (default `http://localhost:3100`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | email reset password via Resend (opsional di dev — tanpa key, link dicetak ke console) |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | fallback config AI (utama dari Settings di app) |

Auth: email + password (Better Auth, plugin admin). User pertama yang mendaftar otomatis menjadi `super_admin`; user berikutnya `staff` (role diatur via User Management).

## Docker

```bash
cp .env.example .env   # minimal isi BETTER_AUTH_SECRET
docker compose up -d --build   # app :3100 + postgres :5432
```

## Struktur

```
src/
├── routes/
│   ├── __root.tsx        # QueryClient + ThemeProvider + errorComponent
│   ├── index.tsx         # redirect → /dashboard
│   ├── sign-in.tsx …     # halaman auth (sign-up, forgot/reset-password, verify-invite)
│   ├── _app.tsx          # layout route (guard beforeLoad + AppShell)
│   └── _app/             # dashboard, karyawan, cabang, gaji, upload, laporan, settings, user-management
├── components/
│   ├── ui/               # shadcn/ui (disalin dari uikit)
│   └── layout/           # app-shell, page-header, notification-bell, …
├── lib/
│   ├── db/               # Drizzle + pg (schema.ts, errors.ts)
│   ├── auth/             # Better Auth server/client + role helpers
│   ├── email.ts          # kirim email (Resend)
│   └── utils.ts          # cn()
├── server/               # server functions per domain (karyawan, gaji, upload, …)
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
