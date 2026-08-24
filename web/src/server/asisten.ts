import { createServerFn } from "@tanstack/react-start"
import { asc, count, desc, eq, ilike, or, sum } from "drizzle-orm"

import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { cabang, gaji, karyawan } from "@/lib/db/schema"
import { readAiConfig } from "@/server/ai-config"

function num(v: string | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// ponytail: no rate limiting — internal admin tool; add token bucket if abused
export const askAi = createServerFn({ method: "POST" })
  .validator(
    (d: {
      question?: string
      history?: { role: string; content: string }[]
    }) => ({
      question:
        typeof d.question === "string" ? d.question.trim().slice(0, 1000) : "",
      // Cap tiap pesan history agar reasoning lama yang panjang tak meracuni konteks.
      history: Array.isArray(d.history)
        ? d.history
            .slice(-6)
            .map((m) => ({
              role: m.role,
              content: String(m.content ?? "").slice(0, 500),
            }))
            .filter((m) => m.role === "user" || m.role === "assistant")
        : [],
    })
  )
  .handler(async ({ data }): Promise<{ answer: string }> => {
    await requireRole("admin")
    const { question, history } = data
    if (!question) throw new Error("Pertanyaan kosong")

    const { baseUrl, apiKey, model } = await readAiConfig()
    if (!apiKey || !model) {
      throw new Error("AI belum dikonfigurasi — atur di menu Pengaturan.")
    }

    // --- Build konteks ringkas dari DB ---
    const [
      cabangList,
      periodeRows,
      karyawanByStatus,
      karyawanPerCabang,
      perJabatan,
    ] = await Promise.all([
      db
        .select({ id: cabang.id, kode: cabang.kode, nama: cabang.nama })
        .from(cabang)
        .orderBy(asc(cabang.kode)),
      db
        .selectDistinct({ periode: gaji.periode })
        .from(gaji)
        .orderBy(desc(gaji.periode)),
      db
        .select({ status: karyawan.status, c: count() })
        .from(karyawan)
        .groupBy(karyawan.status),
      db
        .select({
          kode: cabang.kode,
          nama: cabang.nama,
          jml: count(karyawan.id),
        })
        .from(karyawan)
        .innerJoin(cabang, eq(karyawan.cabangId, cabang.id))
        .groupBy(cabang.id, cabang.kode, cabang.nama)
        .orderBy(asc(cabang.kode)),
      db
        .select({ jabatan: karyawan.jabatan, c: count() })
        .from(karyawan)
        .groupBy(karyawan.jabatan)
        .orderBy(desc(count()))
        .limit(15),
    ])

    const daftarPeriode = periodeRows.map((r) => r.periode)
    const periodeTerbaru = daftarPeriode[0] ?? null

    let totalBruto = 0
    let totalDiterima = 0
    let totalSlip = 0
    let perCabangGaji: { kode: string; nama: string; total: number }[] = []

    if (periodeTerbaru) {
      const [sums, slipCnt, per] = await Promise.all([
        db
          .select({
            gaji: sum(gaji.jumlahGaji),
            diterima: sum(gaji.jmlDiterima),
          })
          .from(gaji)
          .where(eq(gaji.periode, periodeTerbaru)),
        db
          .select({ v: count() })
          .from(gaji)
          .where(eq(gaji.periode, periodeTerbaru)),
        db
          .select({
            kode: cabang.kode,
            nama: cabang.nama,
            total: sum(gaji.jmlDiterima),
          })
          .from(gaji)
          .innerJoin(karyawan, eq(gaji.karyawanId, karyawan.id))
          .innerJoin(cabang, eq(karyawan.cabangId, cabang.id))
          .where(eq(gaji.periode, periodeTerbaru))
          .groupBy(cabang.id, cabang.kode, cabang.nama)
          .orderBy(desc(sum(gaji.jmlDiterima))),
      ])
      totalBruto = num(sums[0]?.gaji)
      totalDiterima = num(sums[0]?.diterima)
      totalSlip = slipCnt[0]?.v ?? 0
      perCabangGaji = per.map((r) => ({
        kode: r.kode,
        nama: r.nama,
        total: num(r.total),
      }))
    }

    const totalKaryawan = karyawanByStatus.reduce((a, r) => a + r.c, 0)
    const aktif = karyawanByStatus.find((r) => r.status === "aktif")?.c ?? 0
    const nonaktif = totalKaryawan - aktif

    // Deteksi nama karyawan disebut
    let karyawanDisebut: {
      nama: string
      jabatan: string | null
      cabang: string | null
      status: string
      riwayat: { periode: string; bruto: number; diterima: number }[]
    }[] = []

    // Kata umum Indonesia/domain yang tak layak jadi kunci pencarian nama/jabatan.
    const STOPWORDS = new Set([
      "yang",
      "apa",
      "siapa",
      "berapa",
      "mana",
      "dengan",
      "atas",
      "nama",
      "ada",
      "dari",
      "cabang",
      "bulan",
      "periode",
      "total",
      "gaji",
      "semua",
      "saja",
      "dan",
      "untuk",
      "terbesar",
      "terkecil",
      "tertinggi",
      "terendah",
      "bruto",
      "netto",
      "diterima",
      "karyawan",
      "aktif",
      "nonaktif",
      "bulan",
      "jabatan",
      "finance",
      "paling",
      "besar",
      "kecil",
    ])
    const tokens = question
      .toLowerCase()
      .split(/[^a-z0-9\u00C0-\u024F]+/i)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .slice(0, 4)

    if (tokens.length > 0 && cabangList.length > 0) {
      // Cocokkan ke nama ATAU jabatan (mis. "jabatan finance").
      const conds = tokens.flatMap((t) => [
        ilike(karyawan.nama, `%${t}%`),
        ilike(karyawan.jabatan, `%${t}%`),
      ])
      try {
        const matched = await db
          .select({
            id: karyawan.id,
            nama: karyawan.nama,
            jabatan: karyawan.jabatan,
            status: karyawan.status,
            cabangKode: cabang.kode,
            cabangNama: cabang.nama,
          })
          .from(karyawan)
          .leftJoin(cabang, eq(karyawan.cabangId, cabang.id))
          .where(or(...conds))
          .limit(10)

        karyawanDisebut = await Promise.all(
          matched.map(async (m) => {
            const slips = await db
              .select({
                periode: gaji.periode,
                bruto: gaji.jumlahGaji,
                diterima: gaji.jmlDiterima,
              })
              .from(gaji)
              .where(eq(gaji.karyawanId, m.id))
              .orderBy(desc(gaji.periode))
              .limit(6)
            return {
              nama: m.nama,
              jabatan: m.jabatan,
              cabang: m.cabangKode ? `${m.cabangKode} - ${m.cabangNama}` : null,
              status: m.status,
              riwayat: slips.map((s) => ({
                periode: s.periode,
                bruto: num(s.bruto),
                diterima: num(s.diterima),
              })),
            }
          })
        )
      } catch {
        // pencarian nama gagal → lanjut tanpa detail karyawan
      }
    }

    const konteks = {
      ringkasan: {
        totalCabang: cabangList.length,
        totalKaryawan,
        karyawanAktif: aktif,
        karyawanNonaktif: nonaktif,
        daftarPeriode: daftarPeriode.slice(0, 6),
        periodeTerbaru,
        totalGajiBrutoTerbaru: totalBruto,
        totalDiterimaTerbaru: totalDiterima,
        potonganTerbaru: totalBruto - totalDiterima,
        totalSlipTerbaru: totalSlip,
        perCabangKaryawan: karyawanPerCabang.map((r) => ({
          kode: r.kode,
          nama: r.nama,
          jml: Number(r.jml),
        })),
        perJabatan: perJabatan.map((r) => ({
          jabatan: r.jabatan ?? "(kosong)",
          jml: Number(r.c),
        })),
        perCabangGaji,
      },
      karyawanDisebut,
    }

    const systemPrompt = `Kamu adalah Asisten AI HR AL-WILDAN, asisten data karyawan dan gaji.
ATURAN WAJIB:
- Data JSON berikut adalah SATU-SATUNYA sumber kebenaran. Jangan mengarang angka, nama, atau periode di luar data ini.
- Jika data tidak ada / tidak cukup, jawab jujur: "Data tidak tersedia untuk pertanyaan tersebut."
- Jawab singkat, jelas, dalam Bahasa Indonesia.
- Format nominal uang sebagai "Rp 1.234.567" (titik ribuan).
- Jika ditanya total gaji, bedakan bruto (jumlahGaji) vs diterima (jmlDiterima) vs potongan.
- Jangan tampilkan JSON mentah; rangkum dengan kalimat natural. Boleh pakai bullet list singkat bila membantu.
- JANGAN PERNAH tampilkan proses berpikir, reasoning, atau analisis internal (mis. "Here's a thinking process"). Langsung jawaban final saja.
- Bungkus jawaban final HANYA di dalam tag <jawaban>...</jawaban>. Isi di luar tag tidak akan ditampilkan.
DATA:
${JSON.stringify(konteks, null, 2)}`

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-6),
      { role: "user", content: question },
    ]

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1500,
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`)
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    let answer =
      json.choices?.[0]?.message?.content?.trim() ||
      "Maaf, tidak ada jawaban dari AI."
    // Strip reasoning leakage
    answer = answer
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<think>[\s\S]*/gi, "")
      .trim()
    const jw = answer.match(/<jawaban>([\s\S]*?)<\/jawaban>/i)
    if (jw) answer = jw[1].trim()
    // Markdown bold mentah (**teks**) → teks polos (bubble chat tak render markdown)
    answer = answer.replace(/\*\*([^*]*)\*\*/g, "$1")
    if (!answer || /^[\s.…-]+$/.test(answer)) {
      // ponytail: log mentah utk diagnosis output degenerate (mis. model balas "…")
      console.warn(
        "[asisten] output AI degenerate:",
        JSON.stringify(json.choices?.[0]?.message)
      )
      answer =
        "Maaf, model AI tidak memberikan jawaban yang valid. Silakan coba ulangi pertanyaan Anda."
    }
    return { answer }
  })
