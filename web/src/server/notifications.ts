import { createServerFn } from "@tanstack/react-start"
import { count, desc, eq } from "drizzle-orm"

import { requireClerkUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema"

export type NotificationRow = {
  id: number
  type: string | null
  title: string
  message: string | null
  linkPage: string | null
  isRead: boolean
  createdAt: Date
}
export type NotificationsResult = {
  items: NotificationRow[]
  unread: number
}

/** Buat notifikasi in-app. Server-only, dipanggil server fn lain saat event. */
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

/** 30 notifikasi terbaru + jumlah belum dibaca. */
export const listNotifications = createServerFn().handler(
  async (): Promise<NotificationsResult> => {
    await requireClerkUserId()
    const [items, unreadRes] = await Promise.all([
      db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit(30),
      db
        .select({ value: count() })
        .from(notifications)
        .where(eq(notifications.isRead, false)),
    ])
    return { items, unread: unreadRes[0]?.value ?? 0 }
  }
)

/** Tandai satu notifikasi terbaca. */
export const markNotificationRead = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: d.id }))
  .handler(async ({ data }) => {
    await requireClerkUserId()
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, data.id))
    return { ok: true }
  })

/** Tandai semua terbaca. */
export const markAllNotificationsRead = createServerFn({
  method: "POST",
}).handler(async () => {
  await requireClerkUserId()
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.isRead, false))
  return { ok: true }
})

/** Hapus satu notifikasi. */
export const deleteNotification = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: d.id }))
  .handler(async ({ data }) => {
    await requireClerkUserId()
    await db.delete(notifications).where(eq(notifications.id, data.id))
    return { ok: true }
  })

/** Hapus semua notifikasi yang sudah dibaca. */
export const clearReadNotifications = createServerFn({
  method: "POST",
}).handler(async () => {
  await requireClerkUserId()
  await db.delete(notifications).where(eq(notifications.isRead, true))
  return { ok: true }
})
