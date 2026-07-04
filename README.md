# AL-WILDAN HR System

Sistem Data Kepegawaian & Penggajian AL-WILDAN Islamic School.

Aplikasi aktif ada di folder [`web/`](./web) (rebuild modern, full-stack, self-hosted).

## Tech Stack

- **Runtime & tooling:** Bun, Biome
- **Framework:** TanStack Start (React 19, SSR, server functions)
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better Auth (email/password, self-hosted — tanpa layanan cloud)
- **UI:** shadcn/ui (base-ui) + Tailwind CSS v4, Recharts
- **Excel/PDF:** SheetJS (xlsx), jsPDF

## Fitur

- Manajemen **Cabang**, **Karyawan**, dan **Gaji** (dengan beban sharing lintas cabang)
- **Dashboard** ringkasan (KPI + grafik gaji per cabang, per periode)
- **Upload Excel** gaji: deteksi periode/cabang otomatis + pemetaan kolom (heuristik & AI)
- **Laporan**: preview, rekap per karyawan, export **XLSX / CSV / PDF**
- **User Management** (RBAC: super_admin / admin / staff) + undang admin
- **Notifikasi** in-app & **Search ⌘K**

## Prasyarat

- [Bun](https://bun.sh) 1.2+
- PostgreSQL (via Docker atau lokal, mis. `brew install postgresql@16`)

## Cara Menjalankan (development)

```bash
# 1. Clone & masuk ke folder aplikasi
git clone <repo-url>
cd alwildan-hr-system/web

# 2. Nyalakan PostgreSQL
#    Opsi A — Docker (pakai docker-compose.yml yang sudah ada):
docker compose up -d
#    Opsi B — Postgres lokal: buat role `alwildan` (password alwildan2026)
#             dan database `alwildan_hr` sesuai DATABASE_URL di bawah.

# 3. Install dependency
bun install

# 4. Environment
cp .env.example .env.local
#    Isi minimal:
#      DATABASE_URL=postgresql://alwildan:alwildan2026@localhost:5432/alwildan_hr
#      BETTER_AUTH_SECRET=<hasil `openssl rand -base64 32`>
#      BETTER_AUTH_URL=http://localhost:3000

# 5. Buat tabel database
bun run db:push

# 6. Jalankan
bun run dev
```

Buka **http://localhost:3000**.

## First Setup

Klik **Daftar**, buat akun pertama. **User pertama otomatis menjadi Super Admin.**
Selanjutnya Super Admin bisa mengundang admin lain lewat menu **User Management**.

## Konfigurasi AI (opsional)

Fitur "Petakan dengan AI" pada Upload butuh provider kompatibel OpenAI
(mis. Groq/OpenAI). Isi Base URL, API Key, dan Model di menu **Settings**.
Tanpa AI, pemetaan kolom heuristik tetap berjalan.

> Email invite & reset password saat ini di-log ke konsol server (dev).
> Untuk produksi, hubungkan SMTP/Resend di konfigurasi Better Auth.

## Skrip berguna (di `web/`)

```bash
bun run dev         # dev server (port 3000)
bun run build       # build produksi
bun run typecheck   # cek TypeScript
bun run check       # lint + format (Biome)
bun run db:push     # sinkronkan skema Drizzle ke DB
bun run db:studio   # Drizzle Studio
```

## Deploy dengan Docker

Aplikasi + database bisa dijalankan penuh via Docker (dari folder `web/`):

```bash
cd web

# Sediakan secret untuk compose (dibaca dari file .env di samping compose)
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env
# (opsional) domain publik:  echo "BETTER_AUTH_URL=https://hr.example.sch.id" >> .env

# Build + jalankan (Postgres + app)
docker compose up --build -d
```

- App: **http://localhost:3000** — Postgres di service `postgres` (jaringan internal compose).
- Saat start, container app menjalankan `db:push` (membuat tabel) lalu server produksi.
- Data Postgres persist di volume `postgres_data`.

> Untuk produksi di balik domain, set `BETTER_AUTH_URL` ke URL publik dan
> jalankan di belakang reverse proxy (HTTPS).

## Arsip

Versi lama (Node.js + Express + SQLite backend, React + Vite frontend) tetap
tersimpan di `backend/` dan `frontend/` sebagai referensi, tidak lagi digunakan.
