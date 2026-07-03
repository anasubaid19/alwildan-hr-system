# PRD: Rebuild AL-WILDAN HR System

## 1. Executive Summary

**Problem**: Sistem HR AL-WILDAN Islamic School saat ini menggunakan arsitektur monolitik Express + SQLite + Vite SPA yang menyulitkan scaling, maintenance, dan kolaborasi tim. Custom auth rentan terhadap keamanan, SQLite tidak ideal untuk multi-user concurrent, dan inline CSS menyulitkan konsistensi UI.

**Solution**: Rebuild total menggunakan **TanStack Start** (SSR full-stack React), **Neon** (serverless PostgreSQL), **Clerk** (auth enterprise-grade), **shadcn/ui** (component library), **Biome** (toolchain), dan **Bun** (runtime/package manager) — mempertahankan seluruh fitur dan flow bisnis namun dengan arsitektur modern, skalabel, dan maintainable.

**Success Criteria**:
- 100% fitur existing berfungsi identik di sistem baru
- Halaman login/register dialihkan ke Clerk-hosted UI (rute Clerk-managed)
- Database schema PostgreSQL ekuivalen dengan SQLite, tanpa data loss
- Lighthouse Performance >= 90, Accessibility = 100
- Bundle size berkurang 40%+ via TanStack Start code splitting & SSR

---

## 2. User Experience & Functionality

### User Personas

| Persona | Role | Access |
|---|---|---|
| Super Admin | Manajer HR Pusat | Full access + invite keys |
| Admin | Staff HR Cabang | CRUD karyawan & gaji, upload data cabang |
| Pegawai | Karyawan AL-WILDAN | Dashboard read-only, profil sendiri |

### User Stories & Acceptance Criteria

#### Authentication (via Clerk)

| Story | AC |
|---|---|
| Sebagai Super Admin, saya ingin melakukan first setup dengan mendaftarkan akun pertama sehingga sistem siap digunakan | Clerk Application-tier first-user flow via email invitation |
| Sebagai Admin, saya ingin login dengan email & password sehingga saya bisa mengakses sistem | Clerk `<SignIn/>` component, redirect ke `/dashboard` |
| Sebagai Super Admin, saya ingin mengundang user baru via invite link sehingga mereka bisa bergabung | Clerk invitation via Organization API; invite key disimpan di DB sebagai referensi role mapping |
| Sebagai Admin, saya ingin mereset password jika lupa sehingga saya tetap bisa mengakses | Clerk "Forgot Password" flow dengan email reset link |
| Sebagai user, saya ingin role saya (superadmin/admin/pegawai) sinkron dari Clerk metadata ke database sehingga otorisasi RBAC berfungsi | Clerk webhook `user.created` → sync ke DB `users` table |

#### Dashboard

| Story | AC |
|---|---|
| Sebagai user, saya ingin melihat KPI ringkasan (total cabang, total gaji, total diterima) sehingga saya bisa memonitor secara cepat | Server function menghitung summary per periode; shadcn `Card` components |
| Sebagai user, saya ingin melihat grafik gaji per cabang dan trend bulanan sehingga saya bisa menganalisis pola penggajian | Recharts bar chart & area chart; data dari server function SQL aggregation |
| Sebagai user, saya ingin mem-filter dashboard berdasarkan periode (bulan/tahun) dan cabang sehingga saya bisa fokus pada data spesifik | Filter bar dengan shadcn `Select`; server query parameterized |

#### Employee Management (Karyawan)

| Story | AC |
|---|---|
| Sebagai Admin, saya ingin melihat daftar karyawan dengan filter cabang dan pencarian sehingga saya bisa menemukan data dengan cepat | Server function dengan pagination, filter, dan full-text search; shadcn `Table` |
| Sebagai Admin, saya ingin menambah/mengedit/menghapus karyawan sehingga data selalu up-to-date | Form modal; delete memerlukan verifikasi password via Clerk session |
| Sebagai user, saya ingin melihat riwayat gaji lintas cabang seorang karyawan sehingga saya bisa melihat total kompensasi | Server function join gaji per karyawan; shadcn `Dialog` |

#### Branch Management (Cabang)

| Story | AC |
|---|---|
| Sebagai Admin, saya ingin CRUD cabang sehingga struktur organisasi tercermin di sistem | Form modal dengan validasi kode unik; hapus memerlukan verifikasi |
| Sebagai Super Admin, saya ingin menghapus cabang beserta seluruh data karyawan & gaji terkait sehingga data tidak tersisa | Transactional delete di Neon (FK cascade atau explicit transaction) |

#### Salary (Gaji)

| Story | AC |
|---|---|
| Sebagai Admin, saya ingin melihat data gaji per periode & cabang sehingga saya bisa memverifikasi penggajian | Server function join payroll data; pagination |
| Sebagai Admin, saya ingin menghapus seluruh data gaji satu cabang per periode sehingga saya bisa koreksi massal | Delete dengan password confirmation; preview count sebelum eksekusi |

#### File Upload with AI Mapping

| Story | AC |
|---|---|
| Sebagai Admin, saya ingin upload file Excel cabang untuk mengimpor data gaji, sehingga tidak perlu input manual | Dropzone (shadcn-inspired) → `/api/upload/analyze` → AI column mapping |
| Sebagai Admin, saya ingin melihat diff preview sebelum data disimpan sehingga saya bisa mengoreksi mapping | Tableside-by-side diff (baru vs update vs unchanged) |
| Sebagai Admin, saya ingin AI otomatis mendeteksi periode & cabang dari nama/isi file sehingga workflow lebih cepat | Regex-based detection (sama seperti existing) |
| AI mapping harus mencapai >= 85% Precision@10 dalam mencocokkan kolom standar HR | Evaluasi dengan 20 sample file cabang |

#### Reports (Laporan)

| Story | AC |
|---|---|
| Sebagai Admin, saya ingin melihat preview laporan penggajian per periode sehingga saya bisa verifikasi sebelum export | Server function query; shadcn `Table` |
| Sebagai Admin, saya ingin export laporan ke XLSX, CSV, dan PDF sehingga bisa dibagikan ke stakeholder | Server function generate file; download via link |
| Sebagai Admin, saya ingin melihat rekap per karyawan (pivot per cabang) sehingga saya tahu total diterima lintas cabang | Query dengan pivot aggregation; export rekap-xlsx |

#### Search

| Story | AC |
|---|---|
| Sebagai user, saya ingin mencari karyawan atau cabang dari manapun di sistem (⌘K) sehingga saya bisa navigasi cepat | Search modal dengan debounce; shadcn `Command` (cmdk-style) |

#### Notifications

| Story | AC |
|---|---|
| Sebagai user, saya ingin menerima notifikasi saat ada upload atau penghapusan data sehingga saya tahu aktivitas sistem | Server-side insert; polling via TanStack Query every 15s |
| Sebagai user, saya ingin menandai notifikasi sudah dibaca sehingga saya fokus pada yang baru | Mark-read API; unread badge di bell icon |

#### Settings

| Story | AC |
|---|---|
| Sebagai Admin, saya ingin mengkonfigurasi AI provider (base URL, API key, model) sehingga upload mapping berfungsi | Settings form via server function; test connection & fetch models |
| Sebagai Super Admin, saya ingin upload master data HR Pusat sebagai referensi AI mapping | File upload → parse Excel → simpan JSON columns/sample/employees |

#### User Management

| Story | AC |
|---|---|
| Sebagai Super Admin, saya ingin melihat daftar semua user dan role mereka sehingga saya bisa manage akses | Server function list users |
| Sebagai Super Admin, saya ingin generate invite key untuk user baru sehingga mereka bisa mendaftar | Clerk invitation API; referensi role di metadata |

### Non-Goals
- Email notification system (tetap log-based seperti existing untuk reset password)
- Mobile native app (responsive web cukup)
- Real-time WebSocket (polling cukup)
- Role/permission matrix engine (RBAC sederhana via Clerk metadata)
- Integration with external payroll/banking APIs

---

## 3. Technical Specifications

### Architecture Overview

```
┌─────────────┐     ┌──────────────────────────────────────┐
│   Client    │     │          TanStack Start App           │
│  (Browser)  │────▶│  ┌────────────┐  ┌────────────────┐  │
│             │     │  │ Clerk      │  │ TanStack SSR   │  │
│  Clerk      │◀────│  │ <SignIn/>  │  │ Server Fn's    │  │
│  Hosted UI  │     │  │ <UserBtn/> │  │ (API routes)   │  │
└─────────────┘     │  └────────────┘  └────────────────┘  │
                    │         │               │             │
                    │         ▼               ▼             │
                    │  ┌──────────────────────────────────┐ │
                    │  │        Drizzle ORM + Neon         │ │
                    │  └──────────────────────────────────┘ │
                    └──────────────────────────────────────┘
```

### Stack

| Layer | Technology | Justification |
|---|---|---|
| Runtime | Bun 1.2+ | 5x faster than Node.js, built-in test runner, TS-native |
| Framework | TanStack Start | SSR/SSG, file-based routing, server functions, RPC |
| Database | Neon (PostgreSQL) | Serverless, branching for dev, Drizzle ORM |
| Auth | Clerk | Enterprise auth, MFA, social login, org management |
| UI | shadcn/ui + Tailwind CSS v4 | Accessible, composable, design-system approach |
| Charts | Recharts (sama seperti existing) | Already proven di existing system |
| Linter/Formatter | Biome | Unified toolchain, faster than ESLint+Prettier |
| ORM | Drizzle | Type-safe, SQL-like, lightweight |
| CSS | Tailwind CSS v4 | Utility-first, CSS-first config |
| Package | Bun | npm-compatible, lockfile, workspace support |

### Database Schema (Neon / PostgreSQL via Drizzle)

```sql
-- Ekivalen dari SQLite existing, dengan tipe PostgreSQL yang sesuai
-- Semua tabel dan kolom identik dengan schema existing di database.js

-- Users (auth disediakan Clerk, table untuk role mapping & metadata)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  inisial TEXT,
  role TEXT DEFAULT 'admin', -- superadmin, admin, pegawai
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cabang (Branch)
CREATE TABLE cabang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Karyawan (Employee)
CREATE TABLE karyawan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no TEXT, nu TEXT,
  nama TEXT NOT NULL,
  jabatan TEXT, gender TEXT, gelar TEXT, thn_aktif TEXT, no_acc TEXT,
  cabang_id UUID REFERENCES cabang(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'aktif',
  thn_keluar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gaji (Salary)
CREATE TABLE gaji (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  karyawan_id UUID NOT NULL REFERENCES karyawan(id) ON DELETE CASCADE,
  periode TEXT NOT NULL,
  jumlah_gaji REAL DEFAULT 0, gapok REAL DEFAULT 0,
  tunjangan_penddk REAL DEFAULT 0, tunjangan_jabatan REAL DEFAULT 0,
  transport REAL DEFAULT 0, bpjs_ks REAL DEFAULT 0, lains REAL DEFAULT 0,
  pot_thr REAL DEFAULT 0, pot_bpjs_tk REAL DEFAULT 0,
  deposit_itba REAL DEFAULT 0, jml_diterima REAL DEFAULT 0,
  punishment REAL DEFAULT 0, pinjaman REAL DEFAULT 0,
  paying_cabang_id UUID REFERENCES cabang(id),
  lembur REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite keys (masih diperlukan untuk role mapping, meski invite via Clerk)
CREATE TABLE invite_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_by UUID REFERENCES users(id),
  used_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_page TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master Data (AI reference)
CREATE TABLE master_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT,
  columns JSONB,
  sample_data JSONB,
  employee_list JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upload Log
CREATE TABLE upload_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabang_id UUID REFERENCES cabang(id),
  filename TEXT, periode TEXT,
  status TEXT DEFAULT 'pending', catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration Points

| Integration | Method | Details |
|---|---|---|
| Clerk Auth | Clerk React SDK | `<SignIn/>`, `<SignUp/>`, `<UserButton/>`, `useAuth()`, `useUser()` |
| Clerk Webhook | Clerk Webhooks | `user.created` → sync to `users` table; `user.deleted` → cleanup |
| Neon DB | Drizzle ORM via `@neondatabase/serverless` | Server functions query via HTTP connection pool |
| AI Provider | OpenAI-compatible API | Mapping analysis via server function `fetch()` |
| File Upload | TanStack Start `serverFn` + `multipart/form-data` | Parse dengan `xlsx` library |

### Security & Privacy

| Concern | Mitigation |
|---|---|
| Auth | Clerk handles hashing, sessions, MFA. No custom JWT or bcrypt. |
| Role-based access | Clerk metadata `role` field; middleware check di setiap server function |
| Session management | Clerk session tokens, auto-refresh, `useAuth()` hook |
| File upload | Validasi tipe & size (10MB max); path traversal protection; cleanup file setelah diproses |
| Password confirmation | Verifikasi via Clerk session (re-authenticate) untuk aksi kritis (delete cabang, hapus gaji) |
| API key | Disimpan di `settings` table, tidak diexpose ke client |
| SQL Injection | Drizzle prepared statements (parameterized queries) |

### Project Structure

```
alwildan-hr-system/
├── app/                          # TanStack Start app router
│   ├── routes/
│   │   ├── index.tsx             # Redirect ke dashboard atau login
│   │   ├── dashboard.tsx
│   │   ├── karyawan.tsx
│   │   ├── cabang.tsx
│   │   ├── laporan.tsx
│   │   ├── upload.tsx
│   │   ├── settings.tsx
│   │   ├── profile.tsx
│   │   └── sign-up/              # Clerk invite signup
│   │       └── $token.tsx
│   ├── components/               # shadcn/ui components
│   │   ├── ui/                   # Button, Card, Dialog, Table, Select, etc.
│   │   ├── search-modal.tsx
│   │   ├── notification-panel.tsx
│   │   └── layout.tsx            # Sidebar + Topbar shell
│   ├── lib/
│   │   ├── db.ts                 # Drizzle client (Neon)
│   │   ├── schema.ts             # Drizzle schema definition
│   │   └── auth.ts               # Server function auth helpers
│   ├── server/
│   │   └── functions/            # TanStack Server Functions
│   │       ├── auth.ts           # Clerk webhook handler
│   │       ├── cabang.ts
│   │       ├── karyawan.ts
│   │       ├── gaji.ts
│   │       ├── upload.ts
│   │       ├── laporan.ts
│   │       ├── notifications.ts
│   │       ├── search.ts
│   │       └── settings.ts
│   └── styles/
│       └── globals.css           # Tailwind CSS v4
├── biome.json                    # Biome config
├── package.json
├── bun.lock
├── tsconfig.json
├── .env.example
└── agent.md
```

---

## 4. Migrasi Clerk (Auth Flow)

### Current Auth (Express/Custom)
```
POST /api/auth/login        → bcrypt compare → JWT sign
POST /api/auth/setup         → First user = superadmin
POST /api/auth/signup        → Invite key verification
POST /api/auth/forgot-pass   → Token generation (log only)
POST /api/auth/reset-pass    → Token verification
Middleware auth()            → JWT verify → req.user
```

### Target Auth (Clerk)
```
<SignIn/> component           → Clerk handles login UI & session
<SignUp/> component            → Clerk handles registration
Clerk Webhook user.created     → Sync user to DB (role dari invite key)
Clerk Webhook user.deleted     → Remove from DB
useAuth() + authMiddleware()   → Protect routes & server functions
auth().userId                  → Get current user ID di server functions
```

### Invite Flow
1. Super Admin generate invite via Clerk Organization invitation API
2. Atau generate invite key seperti existing (`AW-xxx`) → disimpan di `invite_keys`
3. User klik link → Clerk signup → webhook `user.created` → lookup invite key → assign role
4. Flow ini bisa menggunakan **Clerk Organization** invitations dengan public metadata berisi role

### Role Mapping to Clerk
Clerk user public metadata:
```json
{
  "role": "admin",
  "inisial": "AB"
}
```

---

## 5. Risks & Roadmap

### Phased Rollout

| Phase | Scope | Timeline |
|---|---|---|
| **MVP** | Setup Bun + TanStack Start + Drizzle + Neon schema + Clerk auth + Dashboard + Employee list | Minggu 1-2 |
| **v1.1** | Branch CRUD, Salary management, Upload with AI mapping, Reports & Export | Minggu 3-4 |
| **v1.2** | Search modal, Notifications, Settings, Profile, User management | Minggu 5-6 |
| **v2.0** | Data migration from SQLite → Neon, parallel run, cutover | Minggu 7-8 |

### Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| TanStack Start masih beta | API instability, fewer community examples | Pin to specific version; monitor TanStack releases |
| Clerk webhook latency on user.created | User can access system before role synced | Use Clerk session metadata as fallback; implement retry |
| Neon cold starts | Latency on first query after idle | Use connection pooling; enable Neon pooler; Drizzle `{ connectionString: "postgres://..." }` |
| AI API cost (upload mapping) | Cost per file upload | Cache mapping results; support Ollama lokal |
| SQLite → PostgreSQL migration | Data type mismatch (INTEGER vs UUID, REAL vs numeric) | Cast carefully; use Drizzle `$default` for UUID gen |
| File system filepath di existing (path traversal check) | Security issue | Gunakan temporary file dengan random name, cleanup setelah diproses |

### Migration Strategy

1. **Export SQLite → JSON**: `db.prepare("SELECT * FROM ...").all()` → JSON dump per tabel
2. **Import to Neon**: Script Bun + Drizzle untuk insert batch via transaction
3. **Verifikasi**: Count rows, sample data comparison, hash sum
4. **Cutover**: Update environment variables, deploy, test parallel
5. **Rollback plan**: Keep SQLite data intact selama 30 hari
