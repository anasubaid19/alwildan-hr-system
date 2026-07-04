// Deteksi error Postgres berdasar SQLSTATE (dilempar driver pg via Drizzle).

function pgCode(err: unknown): string | null {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code: unknown }).code)
    : null
}

/** 23503 — foreign_key_violation. */
export function isForeignKeyViolation(err: unknown): boolean {
  return pgCode(err) === "23503"
}

/** 23505 — unique_violation. */
export function isUniqueViolation(err: unknown): boolean {
  return pgCode(err) === "23505"
}
