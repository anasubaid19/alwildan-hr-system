const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env dari root project
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)              // absolute (Docker) dipakai apa adanya
  : path.join(__dirname, '../../data/alwildan.db'); // default cwd-independent: backend/data/

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
console.log('DB:', DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS cabang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS karyawan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no TEXT, nu TEXT,
    nama TEXT NOT NULL,
    jabatan TEXT, gender TEXT, gelar TEXT, thn_aktif TEXT, no_acc TEXT,
    cabang_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cabang_id) REFERENCES cabang(id)
  );

  CREATE TABLE IF NOT EXISTS gaji (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    karyawan_id INTEGER NOT NULL,
    periode TEXT NOT NULL,
    jumlah_gaji REAL DEFAULT 0, gapok REAL DEFAULT 0,
    tunjangan_penddk REAL DEFAULT 0, tunjangan_jabatan REAL DEFAULT 0,
    transport REAL DEFAULT 0, bpjs_ks REAL DEFAULT 0, lains REAL DEFAULT 0,
    pot_thr REAL DEFAULT 0, pot_bpjs_tk REAL DEFAULT 0,
    deposit_itba REAL DEFAULT 0, jml_diterima REAL DEFAULT 0,
    punishment REAL DEFAULT 0, pinjaman REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (karyawan_id) REFERENCES karyawan(id)
  );

  CREATE TABLE IF NOT EXISTS upload_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cabang_id INTEGER, filename TEXT, periode TEXT,
    status TEXT DEFAULT 'pending', catatan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cabang_id) REFERENCES cabang(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nama       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    inisial    TEXT,
    role       TEXT DEFAULT 'admin',
    avatar     TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: gaji columns
const gajiColumns = db.prepare("PRAGMA table_info(gaji)").all().map(c => c.name);

if (!gajiColumns.includes('paying_cabang_id')) {
  db.exec('ALTER TABLE gaji ADD COLUMN paying_cabang_id INTEGER');
  db.exec(`
    UPDATE gaji
    SET paying_cabang_id = (
      SELECT cabang_id FROM karyawan WHERE karyawan.id = gaji.karyawan_id
    )
    WHERE paying_cabang_id IS NULL
  `);
  console.log('Migration: kolom paying_cabang_id ditambahkan');
}

if (!gajiColumns.includes('lembur')) {
  db.exec('ALTER TABLE gaji ADD COLUMN lembur REAL DEFAULT 0');
  console.log('Migration: kolom lembur ditambahkan');
}

// Migration: users columns
const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);

if (!userColumns.includes('role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'");
  // First user is superadmin
  db.exec("UPDATE users SET role = 'superadmin' WHERE id = 1");
  console.log('Migration: kolom role ditambahkan, user id=1 dijadikan superadmin');
}

if (!userColumns.includes('avatar')) {
  db.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
  console.log('Migration: kolom avatar ditambahkan');
}

// Migration: create invite_keys table
db.exec(`
  CREATE TABLE IF NOT EXISTS invite_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_by INTEGER,
    used_at DATETIME,
    expired_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

// Migration: create reset_tokens table (lupa password)
db.exec(`
  CREATE TABLE IF NOT EXISTS reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expired_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

module.exports = db;
