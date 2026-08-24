import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import puppeteer from "puppeteer-core"

import { requireRole, requireUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { cabang, gaji, gajiVariable, karyawan } from "@/lib/db/schema"
import {
  renderSlipHtml,
  type SlipBaris,
  type SlipData,
} from "@/lib/slip-template"

function num(v: string | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Data slip 1 karyawan utk 1 periode — TOTAL gabungan semua cabang pembayar
 * (slip tidak memuat rincian per cabang; itu ada di menu Laporan).
 */
async function buildSlipData(
  karyawanId: number,
  periode: string
): Promise<SlipData | null> {
  const [k] = await db
    .select({
      nama: karyawan.nama,
      jabatan: karyawan.jabatan,
      noAcc: karyawan.noAcc,
    })
    .from(karyawan)
    .where(eq(karyawan.id, karyawanId))
    .limit(1)
  if (!k) return null

  const rows = await db
    .select({ gaji: gaji, kode: cabang.kode })
    .from(gaji)
    .leftJoin(cabang, eq(gaji.payingCabangId, cabang.id))
    .where(and(eq(gaji.karyawanId, karyawanId), eq(gaji.periode, periode)))
  if (rows.length === 0) return null

  const vars = await db
    .select({
      key: gajiVariable.key,
      label: gajiVariable.label,
      tipe: gajiVariable.tipe,
    })
    .from(gajiVariable)

  // Agregasi tiap kolom uang lintas cabang.
  const sum = (f: keyof typeof gaji.$inferSelect) =>
    rows.reduce((a, r) => a + num(r.gaji[f] as string), 0)

  const tunjanganDetail: SlipBaris[] = [
    { label: "Pendidikan", nilai: sum("tunjanganPenddk") },
    { label: "Jabatan", nilai: sum("tunjanganJabatan") },
    { label: "Transportasi", nilai: sum("transport") },
    { label: "BPJS Kesehatan", nilai: sum("bpjsKs") },
    // Template memuat "BPJS Tenaga Kerja" sbg tunjangan — skema tak punya
    // kolom itu (yang ada potBpjsTk sbg potongan) → tampil "-".
    { label: "BPJS Tenaga Kerja", nilai: 0 },
    { label: "Lainnya", nilai: sum("lains") },
  ].filter((b) => b.nilai !== 0 || b.label === "BPJS Tenaga Kerja")

  const pendapatan: SlipBaris[] = [
    { label: "Gaji Pokok", nilai: sum("gapok") },
    {
      label: "Tunjangan",
      nilai: tunjanganDetail.reduce((a, b) => a + b.nilai, 0),
    },
  ]
  if (sum("lembur") !== 0)
    pendapatan.push({ label: "Lembur", nilai: sum("lembur") })

  // Variabel custom pendapatan → baris bernomor lanjutan.
  const customPendapatan: SlipBaris[] = []
  const customPotongan: SlipBaris[] = []
  for (const v of vars) {
    const nilai = rows.reduce((a, r) => a + (r.gaji.customs?.[v.key] ?? 0), 0)
    if (nilai === 0) continue
    const baris = { label: v.label, nilai }
    if (v.tipe === "potongan") customPotongan.push(baris)
    else customPendapatan.push(baris)
  }
  pendapatan.push(...customPendapatan)

  const potongan: SlipBaris[] = [
    { label: "Potongan Pinjaman", nilai: sum("pinjaman") },
    { label: "Potongan BPJS Tenaga Kerja", nilai: sum("potBpjsTk") },
    { label: "Potongan THR", nilai: sum("potThr") },
    { label: "Deposit ITBA", nilai: sum("depositItba") },
    { label: "Punishment", nilai: sum("punishment") },
    ...customPotongan,
  ].filter((b) => b.nilai !== 0)

  return {
    nama: k.nama,
    jabatan: k.jabatan ?? "",
    noAcc: k.noAcc ?? "",
    periode,
    pendapatan,
    tunjanganDetail,
    jumlah: sum("jumlahGaji"),
    potongan,
    diterima: sum("jmlDiterima"),
  }
}

/** HTML slip utk Preview. Akses: semua user login. */
export const getSlipHtml = createServerFn()
  .validator((d: { karyawanId: number; periode: string }) => ({
    karyawanId: Number(d.karyawanId),
    periode: String(d.periode),
  }))
  .handler(async ({ data }): Promise<{ html: string; filename: string }> => {
    await requireUserId()
    const slip = await buildSlipData(data.karyawanId, data.periode)
    if (!slip) throw new Error("Data slip tidak ditemukan")
    return {
      html: renderSlipHtml(slip),
      filename: `slip-${slip.nama.replace(/\s+/g, "-")}-${data.periode}`,
    }
  })

// ── Chromium: cari executable ─────────────────────────────────────────
import { accessSync, readdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/** Chrome/Chrome-headless-shell hasil `bunx @puppeteer/browsers install`. */
function findInPuppeteerCache(): string | null {
  const base = join(homedir(), ".cache", "puppeteer")
  for (const kind of ["chrome-headless-shell", "chrome"]) {
    let vers: string[] = []
    try {
      vers = readdirSync(join(base, kind))
    } catch {
      continue
    }
    for (const v of vers.sort().reverse()) {
      let platforms: string[] = []
      try {
        platforms = readdirSync(join(base, kind, v))
      } catch {
        continue
      }
      for (const platform of platforms) {
        const binDir = join(base, kind, v, platform)
        const candidates = [
          join(binDir, kind), // linux / headless-shell
          join(
            binDir,
            "Google Chrome for Testing.app",
            "Contents",
            "MacOS",
            "Google Chrome for Testing"
          ),
        ]
        for (const c of candidates) {
          try {
            accessSync(c)
            return c
          } catch {
            // kandidat berikutnya
          }
        }
      }
    }
  }
  return null
}

function findChrome(): string {
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/usr/bin/chromium", // Debian (Docker)
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS
    findInPuppeteerCache(),
  ].filter(Boolean) as string[]
  for (const p of candidates) {
    try {
      accessSync(p)
      return p
    } catch {
      // lanjut kandidat berikutnya
    }
  }
  throw new Error(
    "Chromium tidak ditemukan — set env CHROMIUM_PATH, install chromium, atau bunx @puppeteer/browsers install chrome-headless-shell@stable"
  )
}

/** PDF slip (base64) via Puppeteer. Akses: admin ke atas. */
export const exportSlipPdf = createServerFn({ method: "POST" })
  .validator((d: { karyawanId: number; periode: string }) => ({
    karyawanId: Number(d.karyawanId),
    periode: String(d.periode),
  }))
  .handler(async ({ data }): Promise<{ pdf: string; filename: string }> => {
    await requireRole("admin")
    const slip = await buildSlipData(data.karyawanId, data.periode)
    if (!slip) throw new Error("Data slip tidak ditemukan")

    const browser = await puppeteer.launch({
      executablePath: findChrome(),
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    })
    try {
      const page = await browser.newPage()
      await page.setContent(renderSlipHtml(slip), { waitUntil: "load" })
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      })
      return {
        pdf: Buffer.from(pdf).toString("base64"),
        filename: `slip-${slip.nama.replace(/\s+/g, "-")}-${data.periode}.pdf`,
      }
    } finally {
      await browser.close()
    }
  })
