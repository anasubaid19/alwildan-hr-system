import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

// Bun memuat .env otomatis. Koneksi ke PostgreSQL (Docker) via node-postgres.
// ponytail: timeout koneksi 5s — kalau DB mati, gagal cepat dgn error jelas,
// bukan menggantung tanpa batas (default pg = 0/infinite).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
})

export const db = drizzle(pool, { schema })

export type Database = typeof db
export { schema }
