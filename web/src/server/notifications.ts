import { createServerFn } from "@tanstack/react-start"
import { and, count, desc, eq } from "drizzle-orm"

import { requireUserId } from "@/lib/auth"
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

/** 30 notifikasi terbaru milik user aktif + jumlah belum dibaca. */
export const listNotifications = createServerFn().handler(
  async (): Promise<NotificationsResult> => {
    const userId = await requireUserId()
    const [items, unreadRes] = await Promise.all([
      db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          linkPage: notifications.linkPage,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(30),
      db
        .select({ value: count() })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), eq(notifications.isRead, false))
        ),
    ])
    return { items, unread: unreadRes[0]?.value ?? 0 }
  }
)

/** Tandai satu notifikasi milik user aktif terbaca. */
export const markNotificationRead = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: d.id }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.id, data.id), eq(notifications.userId, userId))
      )
    return { ok: true }
  })

/** Tandai semua notifikasi user aktif terbaca. */
export const markAllNotificationsRead = createServerFn({
  method: "POST",
}).handler(async () => {
  const userId = await requireUserId()
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    )
  return { ok: true }
})

/** Hapus semua notifikasi user aktif yang sudah dibaca. */
export const clearReadNotifications = createServerFn({
  method: "POST",
}).handler(async () => {
  const userId = await requireUserId()
  await db
    .delete(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, true))
    )
  return { ok: true }
})
