import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"

// Server-only (dipisah dari server/settings agar db/pg tak bocor ke client).
export const AI_KEYS = {
  baseUrl: "ai_base_url",
  apiKey: "ai_api_key",
  model: "ai_model",
} as const

// --- SSRF guard: URL validation --------------------------------------------------
const ALLOWED_AI_HOSTS = new Set([
  "api.groq.com",
  "api.openai.com",
  "api.anthropic.com",
  "api.mistral.ai",
  "api.deepseek.com",
  "openrouter.ai",
  "generativelanguage.googleapis.com",
  "opencode.ai",
  "ollama.com",
  "localhost",
  "127.0.0.1",
  "[::1]",
])

for (const h of (process.env.AI_ALLOWED_EXTRA_HOSTS ?? "").split(",")) {
  const host = h.trim().toLowerCase()
  if (host) ALLOWED_AI_HOSTS.add(host)
}

export function validateBaseUrl(raw: string): string {
  const url = raw.trim()
  if (!url) return url
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new Error("AI base URL tidak valid")
  }
  if (!ALLOWED_AI_HOSTS.has(hostname)) {
    throw new Error(`Provider AI tidak diizinkan: ${hostname}`)
  }
  return url
}

// --- API key encryption at rest ---------------------------------------------------
const ENC_PREFIX = "enc:"
const ALGORITHM = "aes-256-gcm"

let _encKey: Buffer | null = null
function getEncryptionKey(): Buffer {
  if (_encKey) return _encKey
  const secret = process.env.BETTER_AUTH_SECRET || ""
  _encKey = createHash("sha256").update(secret).digest()
  return _encKey
}

function encryptApiKey(text: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv(12) + tag(16) + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted])
  return ENC_PREFIX + combined.toString("base64")
}

function decryptApiKey(value: string): string {
  // Strip prefix; return as-is jika belum terenkripsi (backward compat).
  if (!value.startsWith(ENC_PREFIX)) return value
  const encData = value.slice(ENC_PREFIX.length)
  try {
    const key = getEncryptionKey()
    const data = Buffer.from(encData, "base64")
    const iv = data.subarray(0, 12)
    const tag = data.subarray(12, 28)
    const ciphertext = data.subarray(28)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    // Gagal dekripsi (rotation BETTER_AUTH_SECRET) → kosong agar tak pakai key rusak.
    return ""
  }
}

export function encryptKey(text: string): string {
  return encryptApiKey(text)
}

export function decryptKey(text: string): string {
  return decryptApiKey(text)
}

// --- Generic settings CRUD --------------------------------------------------------

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

// --- AI config resolver (validates + decrypts) ------------------------------------

export async function readAiConfig() {
  const [baseUrl, apiKey, model] = await Promise.all([
    getSetting(AI_KEYS.baseUrl),
    getSetting(AI_KEYS.apiKey),
    getSetting(AI_KEYS.model),
  ])
  return {
    // Normalisasi trailing slash agar `${baseUrl}/chat/completions` tak jadi double-slash.
    baseUrl: validateBaseUrl(
      baseUrl || process.env.AI_BASE_URL || "https://api.groq.com/openai/v1"
    ).replace(/\/+$/, ""),
    apiKey: apiKey ? decryptApiKey(apiKey) : process.env.AI_API_KEY || "",
    model: model || process.env.AI_MODEL || "",
  }
}
