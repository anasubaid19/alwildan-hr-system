import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"

// Server-only (dipisah dari server/settings agar db/pg tak bocor ke client).
export const AI_KEYS = {
  baseUrl: "ai_base_url",
  apiKey: "ai_api_key",
  model: "ai_model",
} as const

export async function getSetting(key: string): Promise<string> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)
  return row?.value ?? ""
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    })
}

/** Config AI efektif (settings DB → fallback env). */
export async function readAiConfig() {
  const [baseUrl, apiKey, model] = await Promise.all([
    getSetting(AI_KEYS.baseUrl),
    getSetting(AI_KEYS.apiKey),
    getSetting(AI_KEYS.model),
  ])
  return {
    baseUrl:
      baseUrl || process.env.AI_BASE_URL || "https://api.groq.com/openai/v1",
    apiKey: apiKey || process.env.AI_API_KEY || "",
    model: model || process.env.AI_MODEL || "",
  }
}
