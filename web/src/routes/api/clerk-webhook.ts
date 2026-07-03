import {
  verifyWebhook,
  type WebhookEvent,
} from "@clerk/tanstack-react-start/webhooks"
import { createFileRoute } from "@tanstack/react-router"

import { syncUserFromWebhook } from "@/server/user-sync"

// Endpoint publik dipanggil Clerk (Svix). Verifikasi signature via
// CLERK_WEBHOOK_SIGNING_SECRET, lalu sinkronkan user ke DB.
// Daftarkan URL ".../api/clerk-webhook" di Clerk Dashboard → Webhooks
// dengan event user.created, user.updated, user.deleted.
export const Route = createFileRoute("/api/clerk-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let evt: WebhookEvent
        try {
          evt = await verifyWebhook(request)
        } catch (err) {
          console.error("Clerk webhook verification failed:", err)
          return new Response("Verification failed", { status: 400 })
        }

        try {
          await syncUserFromWebhook(evt)
        } catch (err) {
          // 500 → Svix akan retry sesuai jadwal.
          console.error("Clerk webhook sync error:", err)
          return new Response("Sync failed", { status: 500 })
        }

        return new Response("OK", { status: 200 })
      },
    },
  },
})
