import type { WebhookEvent } from "@clerk/tanstack-react-start/webhooks"
import { eq } from "drizzle-orm"

import { normalizeRole } from "@/lib/auth/roles"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

function fullName(first?: string | null, last?: string | null): string {
  return `${first ?? ""} ${last ?? ""}`.trim()
}

/** Inisial dari nama (maks 2 huruf) untuk fallback avatar. */
function initialsFrom(name: string): string | null {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)
  const ini = parts.map((w) => w[0]?.toUpperCase() ?? "").join("")
  return ini || null
}

/**
 * Sinkronisasi user Clerk → tabel `users` (sumber kebenaran role =
 * Clerk publicMetadata.role). Idempotent: create & update sama-sama upsert.
 * Dipisah dari verifikasi signature agar bisa diuji langsung ke DB.
 */
export async function syncUserFromWebhook(evt: WebhookEvent) {
  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      const d = evt.data
      const email =
        d.email_addresses?.find((e) => e.id === d.primary_email_address_id)
          ?.email_address ??
        d.email_addresses?.[0]?.email_address ??
        ""
      const nama = fullName(d.first_name, d.last_name) || email || d.id
      const meta = d.public_metadata as
        | { role?: unknown; inisial?: unknown }
        | undefined
      const role = normalizeRole(meta?.role)
      const inisial =
        typeof meta?.inisial === "string" && meta.inisial
          ? meta.inisial
          : initialsFrom(nama)
      const avatar = d.image_url ?? null

      await db
        .insert(users)
        .values({ id: d.id, nama, email, inisial, avatar, role })
        .onConflictDoUpdate({
          target: users.id,
          set: { nama, email, inisial, avatar, role },
        })
      return { action: evt.type, id: d.id }
    }

    case "user.deleted": {
      const id = evt.data.id
      if (id) await db.delete(users).where(eq(users.id, id))
      return { action: "user.deleted" as const, id }
    }

    default:
      return { action: "ignored" as const, type: evt.type }
  }
}
