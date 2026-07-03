import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema"

/** Buat notifikasi in-app. Server-only (dipisah dari modul yang di-import client
 * agar `db`/pg tidak bocor ke bundle browser). */
export async function createNotification(n: {
  type?: string
  title: string
  message?: string
  linkPage?: string
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      type: n.type ?? "info",
      title: n.title,
      message: n.message ?? null,
      linkPage: n.linkPage ?? null,
    })
  } catch (err) {
    console.error("Gagal membuat notifikasi:", err)
  }
}
