import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import * as XLSX from "xlsx"

import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { cabang, gaji, karyawan, uploadLog } from "@/lib/db/schema"
import { createNotification } from "@/server/notifications"
import { readAiConfig } from "@/server/settings"

// ── Konstanta & kolom standar HR ──────────────────────────────────────
const IGNORED_SHEETS = ["SIP GAJI", "SIP GAJI H"]

export const HR_COLUMNS = [
  "NO",
  "NU",
  "NAMA",
  "JABATAN",
  "GENDER",
  "GELAR",
  "THN AKTIF",
  "NO ACC",
  "JUMLAH GAJI",
  "GAPOK",
  "PENDDK",
  "JABATAN_TUNJ",
  "TRANSPORT",
  "BPJS KS",
  "LAINS",
  "LEMBUR",
  "POT THR",
  "POT BPJS TK",
  "Deposit ITBA",
  "Jml Diterima",
  "Punishment",
  "Pinjaman",
] as const

type Rec = Record<string, string | number>
type Mapping = Record<string, string | null>

// ── Deteksi periode (YYYY-MM) dari teks ───────────────────────────────
const BULAN_ID: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  agt: 8,
  agu: 8,
  sep: 9,
  okt: 10,
  nov: 11,
  des: 12,
}

export function detectPeriode(text: string): string | null {
  const t = text.toLowerCase()
  let m = t.match(/\b(20\d{2})[-_\s](0?[1-9]|1[0-2])\b/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}`
  m = t.match(/\b(0?[1-9]|1[0-2])[-_\s](20\d{2})\b/)
  if (m) return `${m[2]}-${String(m[1]).padStart(2, "0")}`
  for (const [nama, bulan] of Object.entries(BULAN_ID)) {
    m = t.match(new RegExp(`\\b${nama}\\b[\\s_\\-]*(20\\d{2}|\\d{2})\\b`, "i"))
    if (m) {
      const tahun = m[1].length === 2 ? `20${m[1]}` : m[1]
      return `${tahun}-${String(bulan).padStart(2, "0")}`
    }
    m = t.match(new RegExp(`\\b(20\\d{2})[\\s_\\-]*${nama}\\b`, "i"))
    if (m) return `${m[1]}-${String(bulan).padStart(2, "0")}`
  }
  return null
}

type CabangLite = { id: number; kode: string; nama: string }

export function detectCabang(
  text: string,
  cabangList: CabangLite[]
): CabangLite | null {
  const t = text.toLowerCase()
  for (const c of cabangList) {
    if (c.kode && t.includes(c.kode.toLowerCase())) return c
  }
  for (const c of cabangList) {
    const words = c.nama
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
    if (words.some((w) => t.includes(w))) return c
  }
  return null
}

// ── Pemetaan kolom heuristik (normalisasi + sinonim) ──────────────────
function norm(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

const SYNONYMS: [string, string[]][] = [
  ["NO", ["no", "nomor"]],
  ["NU", ["nu", "no urut", "nomor urut"]],
  ["NAMA", ["nama", "nama karyawan", "nama lengkap", "nama pegawai"]],
  ["JABATAN", ["jabatan"]],
  ["GENDER", ["gender", "jk", "jenis kelamin", "l p"]],
  ["GELAR", ["gelar"]],
  ["THN AKTIF", ["thn aktif", "tahun aktif", "thn", "tmt"]],
  ["NO ACC", ["no acc", "no rekening", "rekening", "no rek", "norek", "acc"]],
  [
    "JUMLAH GAJI",
    ["jumlah gaji", "total gaji", "gaji bruto", "bruto", "jml gaji"],
  ],
  ["GAPOK", ["gapok", "gaji pokok", "pokok"]],
  [
    "PENDDK",
    [
      "penddk",
      "pendidikan",
      "tunj pendidikan",
      "t penddk",
      "tunjangan pendidikan",
    ],
  ],
  [
    "JABATAN_TUNJ",
    ["tunj jabatan", "t jabatan", "tunjangan jabatan", "jabatan tunj"],
  ],
  ["TRANSPORT", ["transport", "transportasi", "tunj transport"]],
  ["BPJS KS", ["bpjs ks", "bpjs kesehatan", "bpjs kes"]],
  ["LAINS", ["lains", "lain", "lain lain", "lainnya"]],
  ["LEMBUR", ["lembur"]],
  ["POT THR", ["pot thr", "potongan thr", "thr"]],
  [
    "POT BPJS TK",
    ["pot bpjs tk", "bpjs tk", "bpjs ketenagakerjaan", "bpjs tenaga kerja"],
  ],
  ["Deposit ITBA", ["deposit itba", "deposit", "itba"]],
  [
    "Jml Diterima",
    [
      "jml diterima",
      "diterima",
      "thp",
      "take home",
      "take home pay",
      "total diterima",
      "nett",
      "netto",
      "gaji bersih",
    ],
  ],
  ["Punishment", ["punishment", "denda", "punish"]],
  ["Pinjaman", ["pinjaman", "kasbon", "hutang"]],
]

const NORM_TO_STD = new Map<string, string>()
for (const [std, variants] of SYNONYMS) {
  NORM_TO_STD.set(norm(std), std)
  for (const v of variants) NORM_TO_STD.set(norm(v), std)
}

export function heuristicMapping(headers: string[]): Mapping {
  const mapping: Mapping = {}
  for (const h of headers) {
    if (!h) continue
    mapping[h] = NORM_TO_STD.get(norm(h)) ?? null
  }
  return mapping
}

// ── Pemetaan kolom via AI (OpenAI-compatible), fallback heuristik ──────
function buildMappingPrompt(headers: string[], sample: Rec[]): string {
  return `Kamu asisten HR yang memetakan kolom data gaji karyawan.

Kolom standar HR Pusat yang dibutuhkan:
${HR_COLUMNS.join(", ")}

Istilah penting:
- NU = Nomor Urut karyawan
- NAMA = nama sesuai gelar (prioritaskan yang mengandung gelar akademik)
- LEMBUR = penambah gaji (bukan potongan), masuk JUMLAH GAJI
- BPJS KS = BPJS Kesehatan, bagian JUMLAH GAJI (bukan potongan)
- POT BPJS TK = BPJS Ketenagakerjaan, ini potongan
- THP / Jml Diterima / TOTAL DITERIMA / TAKE HOME PAY -> Jml Diterima
- JUMLAH GAJI = bruto (GAPOK + PENDDK + JABATAN_TUNJ + TRANSPORT + BPJS KS + LAINS + LEMBUR)

Kolom dari file cabang:
${headers.join(", ")}

Contoh data (maks 3 baris):
${JSON.stringify(sample, null, 2)}

Petakan tiap kolom cabang ke kolom standar yang paling sesuai; null bila tak ada padanan.
Balas HANYA JSON tanpa markdown:
{"mapping": {"kolom_cabang": "KOLOM_STANDAR_atau_null"}}`
}

/** Pemetaan kolom via AI provider (config dari settings). Akses: admin. */
export const aiMapping = createServerFn({ method: "POST" })
  .validator((d: { headers: string[]; sample: Rec[] }) => d)
  .handler(async ({ data }): Promise<Mapping> => {
    await requireRole("admin")
    const { headers, sample } = data
    const { baseUrl, apiKey, model } = await readAiConfig()
    if (!apiKey || !model) {
      throw new Error("AI belum dikonfigurasi — atur di menu Settings.")
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "user", content: buildMappingPrompt(headers, sample) },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    })
    if (!res.ok) throw new Error(`AI error ${res.status}`)

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const text = json.choices?.[0]?.message?.content ?? "{}"

    // Parse; bila gagal, fallback ke heuristik.
    let raw: Record<string, unknown> = {}
    try {
      const clean = text.replace(/```json|```/g, "").trim()
      raw = (JSON.parse(clean).mapping ?? {}) as Record<string, unknown>
    } catch {
      return heuristicMapping(headers)
    }

    const valid = new Set<string>(HR_COLUMNS)
    const result: Mapping = {}
    for (const h of headers) {
      const v = raw[h]
      result[h] = typeof v === "string" && valid.has(v) ? v : null
    }
    return result
  })

// ── Helper ambil nilai kolom standar dari record ──────────────────────
function getVal(rec: Rec, mapping: Mapping, stdCol: string): string {
  const cabangCol = Object.keys(mapping).find((k) => mapping[k] === stdCol)
  if (!cabangCol) return ""
  const v = rec[cabangCol]
  return v === undefined || v === null ? "" : String(v)
}

function toNum(v: string): number {
  const n = Number.parseFloat(v.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function toIntOrNull(v: string): number | null {
  const n = Number.parseInt(v.replace(/[^0-9-]/g, ""), 10)
  return Number.isFinite(n) ? n : null
}

function normGender(v: string): string | null {
  const g = v.trim().toUpperCase()
  return g === "L" || g === "P" ? g : null
}

// ── Tipe hasil ────────────────────────────────────────────────────────
export type AnalyzeResult = {
  filename: string
  headers: string[]
  records: Rec[]
  sample: Rec[]
  mapping: Mapping
  suggestedPeriode: string | null
  suggestedCabangId: number | null
  totalRows: number
  hrColumns: string[]
}

export type DiffRow = {
  nama: string
  jabatan: string
  gender: string
  noAcc: string
  nu: string
}
export type PreviewResult = {
  baru: DiffRow[]
  update: (DiffRow & { changed: string[] })[]
  unchanged: DiffRow[]
}

// ── analyzeUpload: parse Excel + mapping heuristik + deteksi ───────────
export const analyzeUpload = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Input harus FormData")
    return d
  })
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    await requireRole("admin")

    const file = data.get("file")
    if (!(file instanceof File)) throw new Error("File tidak ditemukan")

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array" })
    const sheetName = wb.SheetNames.find(
      (n) => !IGNORED_SHEETS.includes(n.trim().toUpperCase())
    )
    if (!sheetName) {
      throw new Error("Tidak ada sheet valid (sheet SIP GAJI diabaikan)")
    }
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
    })
    if (aoa.length < 2) throw new Error("File kosong atau tidak valid")

    const headers = (aoa[0] as unknown[]).map((h) => String(h ?? "").trim())
    const dataRows = aoa
      .slice(1)
      .filter((r) => (r as unknown[]).some((c) => c !== undefined && c !== ""))
    const records: Rec[] = dataRows.map((r) => {
      const o: Rec = {}
      headers.forEach((h, i) => {
        if (!h) return
        const cell = (r as unknown[])[i]
        o[h] = typeof cell === "number" ? cell : String(cell ?? "")
      })
      return o
    })

    const cabangList = await db
      .select({ id: cabang.id, kode: cabang.kode, nama: cabang.nama })
      .from(cabang)

    const searchTargets = [
      file.name,
      sheetName,
      ...aoa
        .slice(0, 5)
        .flat()
        .map((v) => String(v ?? "")),
    ]
    let suggestedPeriode: string | null = null
    let suggestedCabangId: number | null = null
    for (const t of searchTargets) {
      if (!suggestedPeriode) suggestedPeriode = detectPeriode(t)
      if (!suggestedCabangId) {
        const c = detectCabang(t, cabangList)
        if (c) suggestedCabangId = c.id
      }
      if (suggestedPeriode && suggestedCabangId) break
    }

    return {
      filename: file.name,
      headers: headers.filter(Boolean),
      records,
      sample: records.slice(0, 3),
      mapping: heuristicMapping(headers),
      suggestedPeriode,
      suggestedCabangId,
      totalRows: records.length,
      hrColumns: [...HR_COLUMNS],
    }
  })

// ── previewUpload: diff baru/update/unchanged (by NAMA) ────────────────
export const previewUpload = createServerFn({ method: "POST" })
  .validator((d: { cabangId: number; mapping: Mapping; records: Rec[] }) => d)
  .handler(async ({ data }): Promise<PreviewResult> => {
    await requireRole("admin")
    const { mapping, records } = data

    // Cocokkan karyawan GLOBAL by nama (bukan per cabang) — mendukung beban
    // sharing: 1 orang bisa muncul di beberapa cabang pembayar.
    const existing = await db
      .select({
        nama: karyawan.nama,
        jabatan: karyawan.jabatan,
        gender: karyawan.gender,
        noAcc: karyawan.noAcc,
        nu: karyawan.nu,
      })
      .from(karyawan)
    const byName = new Map(
      existing.map((k) => [k.nama.trim().toLowerCase(), k])
    )

    const baru: DiffRow[] = []
    const update: (DiffRow & { changed: string[] })[] = []
    const unchanged: DiffRow[] = []

    for (const rec of records) {
      const nama = getVal(rec, mapping, "NAMA").trim()
      if (!nama) continue
      const incoming: DiffRow = {
        nama,
        jabatan: getVal(rec, mapping, "JABATAN").trim(),
        gender: normGender(getVal(rec, mapping, "GENDER")) ?? "",
        noAcc: getVal(rec, mapping, "NO ACC").trim(),
        nu: getVal(rec, mapping, "NU").trim(),
      }
      const found = byName.get(nama.toLowerCase())
      if (!found) {
        baru.push(incoming)
        continue
      }
      const changed = (["jabatan", "gender", "noAcc", "nu"] as const).filter(
        (f) => (found[f] ?? "").trim() !== incoming[f].trim()
      )
      if (changed.length > 0) update.push({ ...incoming, changed })
      else unchanged.push(incoming)
    }

    return { baru, update, unchanged }
  })

// ── commitUpload: upsert karyawan + gaji (per karyawan+periode) ────────
export const commitUpload = createServerFn({ method: "POST" })
  .validator(
    (d: {
      cabangId: number
      periode: string
      filename: string
      mapping: Mapping
      records: Rec[]
    }) => {
      if (!d.cabangId) throw new Error("Cabang wajib dipilih")
      if (!/^\d{4}-\d{2}$/.test(d.periode ?? "")) {
        throw new Error("Periode wajib format YYYY-MM")
      }
      return d
    }
  )
  .handler(async ({ data }) => {
    await requireRole("admin")
    const { cabangId, periode, filename, mapping, records } = data

    const result = await db.transaction(async (tx) => {
      // Matching global by nama (beban sharing lintas cabang).
      const existing = await tx
        .select({ id: karyawan.id, nama: karyawan.nama })
        .from(karyawan)
      const byName = new Map(
        existing.map((k) => [k.nama.trim().toLowerCase(), k.id])
      )

      let inserted = 0
      let updated = 0
      let skipped = 0

      for (const rec of records) {
        const nama = getVal(rec, mapping, "NAMA").trim()
        if (!nama) {
          skipped++
          continue
        }
        const key = nama.toLowerCase()
        const kFields = {
          nu: getVal(rec, mapping, "NU").trim() || null,
          jabatan: getVal(rec, mapping, "JABATAN").trim() || null,
          gender: normGender(getVal(rec, mapping, "GENDER")),
          gelar: getVal(rec, mapping, "GELAR").trim() || null,
          thnAktif: toIntOrNull(getVal(rec, mapping, "THN AKTIF")),
          noAcc: getVal(rec, mapping, "NO ACC").trim() || null,
          no: toIntOrNull(getVal(rec, mapping, "NO")),
        }

        const wasExisting = byName.has(key)
        let karyawanId: number
        if (wasExisting) {
          karyawanId = byName.get(key) as number
          await tx
            .update(karyawan)
            .set(kFields)
            .where(eq(karyawan.id, karyawanId))
        } else {
          const [ins] = await tx
            .insert(karyawan)
            .values({ nama, cabangId, status: "aktif", ...kFields })
            .returning({ id: karyawan.id })
          karyawanId = ins.id
          byName.set(key, karyawanId)
        }

        const gapok = toNum(getVal(rec, mapping, "GAPOK"))
        const penddk = toNum(getVal(rec, mapping, "PENDDK"))
        const jabatanTunj = toNum(getVal(rec, mapping, "JABATAN_TUNJ"))
        const transport = toNum(getVal(rec, mapping, "TRANSPORT"))
        const bpjsKs = toNum(getVal(rec, mapping, "BPJS KS"))
        const lains = toNum(getVal(rec, mapping, "LAINS"))
        const lembur = toNum(getVal(rec, mapping, "LEMBUR"))
        const potThr = toNum(getVal(rec, mapping, "POT THR"))
        const potBpjsTk = toNum(getVal(rec, mapping, "POT BPJS TK"))
        const depositItba = toNum(getVal(rec, mapping, "Deposit ITBA"))
        const punishment = toNum(getVal(rec, mapping, "Punishment"))
        const pinjaman = toNum(getVal(rec, mapping, "Pinjaman"))

        const excelJumlah = toNum(getVal(rec, mapping, "JUMLAH GAJI"))
        const jumlahGaji =
          excelJumlah > 0
            ? excelJumlah
            : gapok + penddk + jabatanTunj + transport + bpjsKs + lains + lembur
        const jmlDiterima = jumlahGaji - potThr - potBpjsTk - depositItba

        const money = {
          gapok: String(gapok),
          tunjanganPenddk: String(penddk),
          tunjanganJabatan: String(jabatanTunj),
          transport: String(transport),
          bpjsKs: String(bpjsKs),
          lains: String(lains),
          lembur: String(lembur),
          potThr: String(potThr),
          potBpjsTk: String(potBpjsTk),
          depositItba: String(depositItba),
          punishment: String(punishment),
          pinjaman: String(pinjaman),
          jumlahGaji: String(jumlahGaji),
          jmlDiterima: String(jmlDiterima),
        }

        await tx
          .insert(gaji)
          .values({ karyawanId, periode, payingCabangId: cabangId, ...money })
          .onConflictDoUpdate({
            target: [gaji.karyawanId, gaji.periode, gaji.payingCabangId],
            set: money,
          })

        if (wasExisting) updated++
        else inserted++
      }

      await tx.insert(uploadLog).values({
        cabangId,
        filename: filename || "upload.xlsx",
        periode,
        status: "success",
        errorMessage: `${inserted} baru, ${updated} diperbarui, ${skipped} dilewati`,
      })

      return { inserted, updated, skipped }
    })

    await createNotification({
      type: "success",
      title: "Upload data berhasil",
      message: `${result.inserted} baru, ${result.updated} diperbarui, ${result.skipped} dilewati`,
      linkPage: "/upload",
    })
    return result
  })
