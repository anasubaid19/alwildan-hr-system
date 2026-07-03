import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

// Bun memuat .env otomatis. Koneksi ke PostgreSQL (Docker) via node-postgres.
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const db = drizzle(pool, { schema })

export type Database = typeof db
export { schema }
