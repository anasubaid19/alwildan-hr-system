import { expect, test } from "bun:test"

import {
  judulPeriode,
  renderSlipHtml,
  type SlipData,
} from "../src/lib/slip-template"

const data: SlipData = {
  nama: "Yulina <S.E>",
  jabatan: "Karyawan",
  noAcc: "1234567890",
  periode: "2026-07",
  pendapatan: [
    { label: "Gaji Pokok", nilai: 2000000 },
    { label: "Tunjangan", nilai: 3300000 },
    { label: "Adjustment Gaji", nilai: 500000 },
  ],
  tunjanganDetail: [
    { label: "Transportasi", nilai: 500000 },
    { label: "BPJS Kesehatan", nilai: 42000 },
  ],
  jumlah: 5300000,
  potongan: [
    { label: "Potongan Pinjaman", nilai: 0 },
    { label: "Potongan BPJS Tenaga Kerja", nilai: 100000 },
  ],
  diterima: 5200000,
}

test("judul periode dari YYYY-MM", () => {
  expect(judulPeriode("2026-07")).toBe("RINCIAN GAJI BULAN JULI 2026")
  expect(judulPeriode("2026-01")).toBe("RINCIAN GAJI BULAN JANUARI 2026")
})

test("urutan baris: 1 Gapok, 2 Tunjangan + sub, custom bernomor lanjutan", () => {
  const html = renderSlipHtml(data)
  const iGapok = html.indexOf("Gaji Pokok")
  const iTunjangan = html.indexOf(">Tunjangan<")
  const iTransport = html.indexOf("- Transportasi")
  const iAdjustment = html.indexOf("Adjustment Gaji")
  expect(iGapok).toBeGreaterThan(-1)
  expect(iTunjangan).toBeGreaterThan(iGapok)
  expect(iTransport).toBeGreaterThan(iTunjangan)
  expect(iAdjustment).toBeGreaterThan(iTransport)
  // custom = baris ke-3
  expect(html).toContain('<td class="num">3</td>')
})

test("format nominal id-ID & nol jadi strip", () => {
  const html = renderSlipHtml(data)
  expect(html).toContain("2.000.000")
  expect(html).toContain("5.300.000")
  expect(html).toContain("5.200.000")
  // potongan pinjaman 0 → "-"
  expect(html).toMatch(
    /Potongan Pinjaman<\/td><td class="amount"><span class="rp">Rp<\/span><span class="val">-<\/span>/
  )
})

test("nama di-escape & noAcc dimask", () => {
  const html = renderSlipHtml(data)
  expect(html).toContain("Yulina &lt;S.E&gt;")
  expect(html).toContain("••••••••••")
  expect(html).not.toContain("1234567890")
})

test("total potongan = jumlah potongan sub-baris", () => {
  const html = renderSlipHtml(data)
  // Potongan total 100.000 (hanya BPJS TK yang non-nol)
  expect(html).toMatch(
    /<td>Potongan<\/td>\s*<td class="amount"><span class="rp"><\/span><span class="val">100\.000<\/span>/
  )
})
