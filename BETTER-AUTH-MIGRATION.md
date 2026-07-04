# Rencana Migrasi Auth: Clerk → Better Auth

Status: **RENCANA (belum dieksekusi)** — untuk menilai cakupan sebelum memutuskan.
Konteks: alat HR internal AL-WILDAN, single-tenant, self-hosted (Docker + Postgres),
stack TanStack Start + Drizzle + Bun.

## Kenapa (ringkas)
Menyelaraskan auth dengan keputusan self-hosting: data auth (user/sesi/password)
pindah ke Postgres sendiri; hapus ketergantungan cloud, webhook sync, bootstrap
super_admin manual di dashboard Clerk, dan dev-role-bypass. Trade-off: perlu tulis
ulang lapisan auth + siapkan email sender (invite/reset) + amankan sendiri.

## Prinsip kunci yang menekan risiko
**Pertahankan API publik `src/lib/auth/index.ts` identik** (`requireClerkUserId` →
kembalikan userId, `requireRole(min)` → `{ user, role }`, `getCurrentUser()`).
Reimplementasi internalnya pakai Better Auth session. Dengan begitu SEMUA server
function domain (cabang/karyawan/gaji/dashboard/upload/laporan/notifications/search/
users) **hampir tak berubah** — mereka cuma memanggil helper itu.

`src/lib/auth/roles.ts` (model super_admin/admin/staff) **dipertahankan apa adanya**.

---

## Pemetaan Clerk → Better Auth

| Sekarang (Clerk) | Jadi (Better Auth) |
|---|---|
| `.env.local` `CLERK_*` | `BETTER_AUTH_SECRET` (32+ char), `BETTER_AUTH_URL`, kredensial email (SMTP/Resend) |
| `ClerkProvider` di `__root.tsx` | Dihapus (Better Auth pakai hook, tak perlu provider) |
| `start.ts` `clerkMiddleware()` | Dihapus |
| `<SignIn/>` `<SignUp/>` (sign-in.$/sign-up.$) | Form kustom shadcn + `authClient.signIn.email` / `signUp.email` |
| `_app.tsx` `useAuth()` + `RedirectToSignIn` | `authClient.useSession()` → redirect `/sign-in` bila null |
| `use-app-role.ts` (Clerk publicMetadata) | Ambil `role` dari `useSession()` |
| `lib/auth/index.ts` `auth()` (Clerk) | `auth.api.getSession({ headers })` — API publik dijaga sama |
| **Webhook** `api/clerk-webhook.ts` + `server/user-sync.ts` | **DIHAPUS** (tabel user = sumber kebenaran) |
| `server/users.ts` (Clerk invitations/updateUserMetadata) | Plugin `admin`: `listUsers`, `setRole`, `createUser` (undang) |
| Tabel `users` (mirror, kosong) | Tabel Better Auth (`user`,`session`,`account`,`verification`) + `role` via plugin admin |
| Bootstrap super_admin di Clerk Dashboard | Signup pertama → super_admin (hook) atau skrip seed |
| Bot-challenge Cloudflare | Tak ada; pakai rate-limit bawaan Better Auth (invite-only, aman) |

## Skema DB
- Better Auth CLI `generate` → tabel `user/session/account/verification` (Drizzle) → `db:push`.
- Plugin `admin` menambah kolom `role` + `banned` di `user`. Tambah `inisial`,`cabangId`
  via `user.additionalFields` bila perlu.
- `karyawan/gaji/cabang/settings/notifications/...` **TIDAK tersentuh** (tak mereferensi users).
- `invite_keys` (sudah tak dipakai) → dihapus, atau dibiarkan.
- Tak ada migrasi data user (tabel users saat ini kosong).

---

## Langkah (berurutan, dengan checkpoint verifikasi)

**Fase 0 — Prep**
1. `bun add better-auth`; hapus `@clerk/tanstack-react-start` nanti di Fase 6.
2. Set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) + `BETTER_AUTH_URL=http://localhost:3000` di `.env.local`.

**Fase 1 — Server auth**
3. `src/lib/auth/server.ts`: `betterAuth({ database: drizzleAdapter(db,{provider:"pg"}), emailAndPassword:{ enabled:true, sendResetPassword }, plugins:[ admin({ defaultRole:"staff", adminRoles:["super_admin"] }) ] })`.
4. `sendResetPassword`/invite email: DEV → `console.log(url)` (seperti sistem lama); PROD → SMTP/Resend.
5. `better-auth generate` → `db:push`. Verifikasi `GET /api/auth/ok` → `{status:"ok"}`.
6. Route handler: `src/routes/api/auth/$.ts` mount `auth.handler` (GET+POST).

**Fase 2 — Server helpers (jaga API sama)**
7. Rewrite `lib/auth/index.ts` pakai `auth.api.getSession`. `requireRole` baca role dari session. **Hapus DEV super_admin bypass** (login asli sekarang).

**Fase 3 — Client**
8. `src/lib/auth/client.ts`: `createAuthClient()` (better-auth/react).
9. `_app.tsx`: `useSession()` guard. `use-app-role.ts`: role dari session. Hapus `ClerkProvider` di `__root.tsx`.

**Fase 4 — Halaman auth**
10. Form Sign-in / Sign-up / Forgot / Reset (shadcn + authClient). Sederhana, invite-only.

**Fase 5 — User Management**
11. Rewrite `server/users.ts` pakai admin plugin: list users, set role, `createUser` (undang admin → kirim email set-password). Sesuaikan halaman.

**Fase 6 — Buang Clerk**
12. Hapus `api/clerk-webhook.ts`, `server/user-sync.ts`, `start.ts` clerkMiddleware, ClerkProvider, `CLERK_*` env, dependency `@clerk/*`.

**Fase 7 — Bootstrap**
13. Hook `databaseHooks.user.create.before`: user pertama → `role: super_admin`. Atau skrip seed.

**Fase 8 — Verifikasi (browser)**
14. Sign-up → login → cek role gating (staff tak bisa write, dsb), CRUD, upload, laporan, notifikasi. Rate-limit login.

---

## Perkiraan & risiko
- **Effort**: ~1–2 hari (setara membangun lapisan Clerk yang sudah ada).
- **Risiko utama**: auth = jalur kritis; wajib uji end-to-end (login/sesi/role) di browser.
- **Prasyarat prod**: email sender untuk invite/reset (dev cukup log). Tambah plugin `twoFactor` bila mau MFA untuk data gaji.
- **Yang TIDAK berubah**: seluruh domain (cabang/karyawan/gaji/dashboard/upload/laporan/notifications/search) karena API `lib/auth` dijaga identik.

## Rollback
Migrasi di branch terpisah (`feat/better-auth`). Clerk yang sekarang tetap utuh di
`feat/rebuild-web-tanstack` sampai Better Auth terverifikasi.
