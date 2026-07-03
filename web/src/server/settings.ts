import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"

export const API_KEY_MASK = "••••••••"

const KEYS = {
  baseUrl: "ai_base_url",
  apiKey: "ai_api_key",
  model: "ai_model",
} as const

async function getSetting(key: string): Promise<string> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)
  return row?.value ?? ""
}

async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    })
}

/** Config AI efektif (settings DB → fallback env). Server-only. */
export async function readAiConfig() {
  const [baseUrl, apiKey, model] = await Promise.all([
    getSetting(KEYS.baseUrl),
    getSetting(KEYS.apiKey),
    getSetting(KEYS.model),
  ])
  return {
    baseUrl:
      baseUrl || process.env.AI_BASE_URL || "https://api.groq.com/openai/v1",
    apiKey: apiKey || process.env.AI_API_KEY || "",
    model: model || process.env.AI_MODEL || "",
  }
}

export type AiSettings = { baseUrl: string; model: string; hasApiKey: boolean }

/** Baca setting AI untuk form (API key disamarkan). Akses: admin. */
export const getAiSettings = createServerFn().handler(
  async (): Promise<AiSettings> => {
    await requireRole("admin")
    const [baseUrl, apiKey, model] = await Promise.all([
      getSetting(KEYS.baseUrl),
      getSetting(KEYS.apiKey),
      getSetting(KEYS.model),
    ])
    return {
      baseUrl: baseUrl || "https://api.groq.com/openai/v1",
      model,
      hasApiKey: Boolean(apiKey),
    }
  }
)

/** Simpan setting AI. API key tak ditimpa bila nilai mask/kosong. Akses: admin. */
export const saveAiSettings = createServerFn({ method: "POST" })
  .validator((d: { baseUrl?: string; apiKey?: string; model?: string }) => ({
    baseUrl: (d.baseUrl ?? "").trim(),
    apiKey: d.apiKey ?? "",
    model: (d.model ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    await requireRole("admin")
    await setSetting(KEYS.baseUrl, data.baseUrl)
    await setSetting(KEYS.model, data.model)
    if (data.apiKey && data.apiKey !== API_KEY_MASK) {
      await setSetting(KEYS.apiKey, data.apiKey.trim())
    }
    return { ok: true }
  })

/** Resolusi config dari input form (fallback ke tersimpan). */
async function resolveConfig(input: {
  baseUrl?: string
  apiKey?: string
  model?: string
}) {
  const stored = await readAiConfig()
  const baseUrl = (input.baseUrl || stored.baseUrl).trim()
  const apiKey =
    input.apiKey && input.apiKey !== API_KEY_MASK
      ? input.apiKey.trim()
      : stored.apiKey
  const model = (input.model || stored.model).trim()
  return { baseUrl, apiKey, model }
}

/** Uji koneksi ke provider AI. Akses: admin. */
export const testAiConnection = createServerFn({ method: "POST" })
  .validator((d: { baseUrl?: string; apiKey?: string; model?: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    await requireRole("admin")
    const { baseUrl, apiKey, model } = await resolveConfig(data)
    if (!apiKey) return { ok: false, message: "API key belum diisi" }
    if (!model) return { ok: false, message: "Model belum diisi" }
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply with one word: OK" }],
          max_tokens: 10,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        return {
          ok: false,
          message: `Error ${res.status}: ${text.slice(0, 150)}`,
        }
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const reply = json.choices?.[0]?.message?.content?.trim() || "(kosong)"
      return { ok: true, message: `Koneksi berhasil! ${model} → "${reply}"` }
    } catch {
      return { ok: false, message: "Gagal terhubung. Cek URL & API key." }
    }
  })

/** Ambil daftar model dari provider. Akses: admin. */
export const fetchAiModels = createServerFn({ method: "POST" })
  .validator((d: { baseUrl?: string; apiKey?: string }) => d)
  .handler(async ({ data }): Promise<string[]> => {
    await requireRole("admin")
    const { baseUrl, apiKey } = await resolveConfig(data)
    if (!apiKey) throw new Error("API key belum diisi")
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error(`Gagal ambil model (${res.status})`)
    const json = (await res.json()) as { data?: { id: string }[] }
    return (json.data?.map((m) => m.id) ?? []).sort()
  })
