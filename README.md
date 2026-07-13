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
- **Upload Excel/CSV** gaji: deteksi periode/cabang & baris header otomatis + pemetaan kolom (heuristik & AI)
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
#    Opsi A — Docker, HANYA service postgres (tanpa `postgres` di akhir,
#    container app ikut naik dan menempati port 3000 → `bun run dev`
#    terlempar ke 3001 dan login ditolak "invalid origin"):
docker compose up -d postgres
#    Opsi B — Postgres lokal: buat role `alwildan` (password alwildan2026)
#             dan database `alwildan_hr` sesuai DATABASE_URL di bawah.

# 3. Install dependency
bun install

# 4. Environment — pakai .env (bukan .env.local: drizzle-kit tidak membacanya)
cp .env.example .env
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
Selanjutnya Super Admin mengundang admin lain lewat **User Management**:
generate **PIN 6 digit** di layar, kirim manual (mis. WhatsApp), lalu calon
admin mendaftar di halaman **/verify-invite** — tanpa email.

## Konfigurasi AI (opsional)

Fitur "Petakan dengan AI" pada Upload butuh provider kompatibel OpenAI
(mis. Groq/OpenAI). Isi Base URL, API Key, dan Model di menu **Settings**.
Tanpa AI, pemetaan kolom heuristik tetap berjalan.

> Email reset password terkirim via **Resend** bila `RESEND_API_KEY` +
> `EMAIL_FROM` di-set (lihat `.env.example`); tanpa key, tautan reset
> dicetak ke konsol server (mode dev).

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

# Sediakan konfigurasi compose (dibaca dari file .env di samping compose)
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env

# Deploy di server: isi URL yang dipakai pengguna mengakses app.
# Port host configurable via APP_PORT (default 3000) — WAJIB sama dengan
# port di BETTER_AUTH_URL, kalau tidak login ditolak "invalid origin".
echo "APP_PORT=3100" >> .env
echo "BETTER_AUTH_URL=http://IP_SERVER:3100" >> .env   # atau https://domain

# Build + jalankan (Postgres + app)
docker compose up --build -d

# Cek status & log
docker compose ps
docker compose logs app -f
```

- App: **http://IP_SERVER:APP_PORT** (lokal: http://localhost:3000) — Postgres di
  service `postgres`, hanya terikat loopback (tidak terjangkau dari LAN).
- Saat start, container app menjalankan `db:push` (membuat tabel) lalu server produksi.
- Data Postgres persist di volume `postgres_data`.
- First setup: klik **Daftar** — user pertama otomatis Super Admin.

> Untuk produksi di balik domain, set `BETTER_AUTH_URL` ke URL publik dan
> jalankan di belakang reverse proxy (HTTPS).

## Arsip

Versi lama (Node.js + Express + SQLite backend, React + Vite frontend) sudah
dihapus dari working tree; bila diperlukan, lihat riwayat git sebelum Jul 2026
(mis. commit `ee917a8` ke belakang, direktori `backend/` dan `frontend/`).
