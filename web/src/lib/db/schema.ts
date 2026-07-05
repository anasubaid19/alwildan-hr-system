import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

// Tabel auth Better Auth: user, session, account, verification.
export * from "./auth-schema"

import { user } from "./auth-schema"

// invite — undangan admin via PIN 6 digit (disampaikan manual, mis. WhatsApp).
// Tanpa FK ke user: user baru dibuat saat PIN diterima (acceptInvite).
export const invite = pgTable("invite", {
  id: serial().primaryKey(),
  email: text().notNull(),
  name: text().notNull(),
  role: text().default("admin").notNull(),
  pin: text().notNull(),
  attempts: integer().default(0).notNull(), // percobaan verifikasi gagal; ≥3 → expired
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: text().default("pending").notNull(), // pending | used | expired
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// cabang — unit/cabang sekolah
export const cabang = pgTable("cabang", {
  id: serial().primaryKey(),
  nama: text().notNull(),
  kode: text().unique().notNull(), // AW01, AW02, …
  alamat: text(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// karyawan — data pegawai per cabang
export const karyawan = pgTable("karyawan", {
  id: serial().primaryKey(),
  no: integer(), // nomor urut tampilan
  nu: text(), // Nomor Urut (bukan Nomor Unik)
  nama: text().notNull(),
  jabatan: text(),
  gender: text(), // L / P
  gelar: text(),
  thnAktif: integer("thn_aktif"),
  noAcc: text("no_acc"),
  cabangId: integer("cabang_id").references(() => cabang.id),
  status: text().default("aktif").notNull(), // aktif / nonaktif
  thnKeluar: integer("thn_keluar"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// gaji — slip gaji bulanan per karyawan
export const gaji = pgTable(
  "gaji",
  {
    id: serial().primaryKey(),
    karyawanId: integer("karyawan_id")
      .notNull()
      .references(() => karyawan.id, { onDelete: "cascade" }),
    periode: text().notNull(), // YYYY-MM
    jumlahGaji: numeric("jumlah_gaji").default("0").notNull(),
    gapok: numeric().default("0").notNull(),
    tunjanganPenddk: numeric("tunjangan_penddk").default("0").notNull(),
    tunjanganJabatan: numeric("tunjangan_jabatan").default("0").notNull(),
    transport: numeric().default("0").notNull(),
    bpjsKs: numeric("bpjs_ks").default("0").notNull(),
    lains: numeric().default("0").notNull(),
    potThr: numeric("pot_thr").default("0").notNull(),
    potBpjsTk: numeric("pot_bpjs_tk").default("0").notNull(),
    depositItba: numeric("deposit_itba").default("0").notNull(),
    jmlDiterima: numeric("jml_diterima").default("0").notNull(), // take-home
    punishment: numeric().default("0").notNull(),
    pinjaman: numeric().default("0").notNull(),
    lembur: numeric().default("0").notNull(),
    // Cabang yang menanggung porsi gaji ini (beban sharing lintas cabang).
    // NOT NULL: kolom ini bagian unique constraint di bawah — bila nullable,
    // Postgres menganggap NULL unik sehingga slip tanpa cabang bisa duplikat.
    payingCabangId: integer("paying_cabang_id")
      .notNull()
      .references(() => cabang.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // Satu slip per karyawan per periode PER cabang pembayar → target upsert impor.
    unique("gaji_karyawan_periode_cabang_uniq").on(
      t.karyawanId,
      t.periode,
      t.payingCabangId
    ),
  ]
)

// settings — konfigurasi sistem (AI provider, dll)
export const settings = pgTable("settings", {
  id: serial().primaryKey(),
  key: text().unique().notNull(),
  value: text(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// master_data — file Excel referensi HR Pusat
export const masterData = pgTable("master_data", {
  id: serial().primaryKey(),
  filename: text().notNull(),
  columns: jsonb(),
  sampleData: jsonb("sample_data"),
  employeeList: jsonb("employee_list"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// notifications — notifikasi in-app, per user (pemilik satu-satunya yang boleh baca/hapus)
export const notifications = pgTable("notifications", {
  id: serial().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text(), // info / success / warning / error
  title: text().notNull(),
  message: text(),
  linkPage: text("link_page"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// upload_log — riwayat upload Excel cabang
export const uploadLog = pgTable("upload_log", {
  id: serial().primaryKey(),
  filename: text().notNull(),
  cabangId: integer("cabang_id").references(() => cabang.id),
  periode: text(), // YYYY-MM
  status: text(), // success / failed / pending
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})
