// Template slip gaji — hasil render HTML dipakai untuk Preview (iframe di
// dialog) dan input Puppeteer PDF (server/slip.ts). Client-safe: tanpa import
// server. Layout mengikuti template cetak HR AL-WILDAN (A4).

export type SlipBaris = { label: string; nilai: number }

export type SlipData = {
  nama: string
  jabatan: string
  noAcc: string
  periode: string // YYYY-MM
  // Baris bernomor: Gaji Pokok, Tunjangan, lalu variabel custom pendapatan.
  pendapatan: SlipBaris[]
  // Sub-baris Tunjangan (Pendidikan, Jabatan, Transportasi, BPJS KS, Lainnya, …)
  tunjanganDetail: SlipBaris[]
  jumlah: number
  potongan: SlipBaris[]
  diterima: number
}

const BULAN = [
  "JANUARI",
  "FEBRUARI",
  "MARET",
  "APRIL",
  "MEI",
  "JUNI",
  "JULI",
  "AGUSTUS",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DESEMBER",
]
const BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
]

const nf = new Intl.NumberFormat("id-ID")
function fmt(n: number): string {
  return n ? nf.format(n) : "-"
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** "RINCIAN GAJI BULAN JULI 2026" dari periode YYYY-MM. */
export function judulPeriode(periode: string): string {
  const [y, m] = periode.split("-")
  const idx = Number(m) - 1
  return `RINCIAN GAJI BULAN ${BULAN[idx] ?? m} ${y}`
}

/** Tanda tangan: "Tangerang, 03-Aug-26" (tanggal cetak). */
function tanggalCetak(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, "0")
  return `${dd}-${BULAN_SINGKAT[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`
}

function barisNum(i: number, b: SlipBaris): string {
  return `<tr>
      <td class="num">${i}</td>
      <td class="desc">${escapeHtml(b.label)}</td>
      <td class="amount"><span class="rp">Rp</span><span class="val">${fmt(b.nilai)}</span></td>
    </tr>`
}

function barisSub(b: SlipBaris): string {
  return `<tr class="subrow"><td></td><td class="indent">- ${escapeHtml(b.label)}</td><td class="amount"><span class="rp">Rp</span><span class="val">${fmt(b.nilai)}</span></td></tr>`
}

export function renderSlipHtml(d: SlipData): string {
  // Urutan template: 1 Gaji Pokok, 2 Tunjangan (+sub-baris), lalu custom
  // pendapatan bernomor lanjutan.
  const [gapok, tunjangan, ...customPendapatan] = d.pendapatan
  const rows: string[] = []
  if (gapok) rows.push(barisNum(1, gapok))
  if (tunjangan) rows.push(barisNum(2, tunjangan))
  rows.push(...d.tunjanganDetail.map(barisSub))
  customPendapatan.forEach((b, i) => {
    rows.push(barisNum(3 + i, b))
  })
  const pendapatanRows = rows.join("\n    ")
  const potonganRows = d.potongan.map(barisSub).join("\n")
  const potonganTotal = d.potongan.reduce((a, b) => a + b.nilai, 0)

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(judulPeriode(d.periode))} — ${escapeHtml(d.nama)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #e9e9e9;
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
  }
  .page {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    margin: 20px auto;
    padding: 14mm 14mm 12mm;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0,0,0,.18);
    overflow: hidden;
  }
  .header {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding-bottom: 5px;
    border-bottom: 3px double #111;
  }
  .logo {
    width: 47px;
    height: 47px;
    border: 3px solid #356a9a;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 8px;
    font-weight: 700;
    text-align: center;
    color: #356a9a;
    line-height: 1.05;
  }
  .school { line-height: 1.05; }
  .school .name { font-size: 20px; font-weight: 800; color: #245d45; }
  .school .sub { margin-top: 2px; font-size: 10px; font-weight: 700; color: #ad5537; }
  .school .type { margin-top: 4px; font-size: 15px; font-weight: 800; color: #274d73; }
  .school .levels { font-size: 10px; font-weight: 700; color: #274d73; }
  .title { text-align: center; font-size: 16px; font-weight: 800; margin: 7px 0 10px; }
  .identity {
    width: 74%;
    margin: 0 auto 9px;
    font-size: 14px;
    line-height: 1.55;
  }
  .identity .row { display: grid; grid-template-columns: 115px 15px 1fr; }
  .identity .label { text-align: right; padding-right: 12px; }
  .rule { border-top: 2px solid #111; margin: 4px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  td { padding: 2.3px 4px; vertical-align: top; }
  .num { width: 24px; }
  .desc { width: auto; }
  .amount { width: 245px; text-align: right; white-space: nowrap; }
  .amount .rp { display: inline-block; width: 28px; text-align: left; }
  .amount .val { display: inline-block; min-width: 115px; text-align: right; }
  .subrow td { padding-top: 1.5px; padding-bottom: 1.5px; }
  .indent { padding-left: 20px; }
  .section-total { border-top: 2px solid #111; border-bottom: 0; font-weight: 700; }
  .spacer { height: 17px; }
  .received { border-top: 3px double #111; padding-top: 7px; font-weight: 700; }
  .signature {
    width: 39%;
    margin-left: auto;
    margin-top: 31px;
    text-align: center;
    font-size: 13px;
  }
  .signature .date { margin-bottom: 3px; }
  .stamp {
    width: 78px;
    height: 78px;
    margin: 4px auto 0;
    border: 2px solid rgba(40,105,150,.48);
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: rgba(40,105,150,.55);
    font-size: 9px;
    font-weight: 800;
    transform: rotate(-8deg);
  }
  .note {
    position: absolute;
    left: 14mm;
    right: 14mm;
    bottom: 34mm;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.45;
  }
  @media print {
    body { background: #fff; }
    .page { margin: 0; box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">

  <header class="header">
    <div class="logo">AL-WILDAN<br>ISLAMIC<br>SCHOOL</div>
    <div class="school">
      <div class="name">AL-WILDAN ISLAMIC SCHOOL</div>
      <div class="sub">TAHFIZH AL-QUR'AN INTERNATIONAL CURRICULUM (TIC)</div>
      <div class="type">BOARDING &amp; FULLDAY SCHOOL</div>
      <div class="levels">PG-TK-SD-SMP-SMA</div>
    </div>
  </header>

  <div class="title">${escapeHtml(judulPeriode(d.periode))}</div>

  <section class="identity">
    <div class="row"><div class="label">Nama</div><div>:</div><div>${escapeHtml(d.nama)}</div></div>
    <div class="row"><div class="label">Jabatan</div><div>:</div><div>${escapeHtml(d.jabatan || "-")}</div></div>
    <div class="row"><div class="label">Nomor Acc</div><div>:</div><div>${d.noAcc ? "••••••••••" : "-"}</div></div>
  </section>

  <div class="rule"></div>

  <table>
    ${pendapatanRows}

    <tr><td colspan="3" style="height:9px"></td></tr>
    <tr class="section-total">
      <td></td><td>Jumlah</td>
      <td class="amount"><span class="rp">Rp</span><span class="val">${fmt(d.jumlah)}</span></td>
    </tr>

    <tr><td colspan="3" class="spacer"></td></tr>

    <tr>
      <td></td><td>Potongan</td>
      <td class="amount"><span class="rp"></span><span class="val">${fmt(potonganTotal)}</span></td>
    </tr>
    ${potonganRows}

    <tr><td colspan="3" style="height:3px"></td></tr>
    <tr class="received">
      <td></td><td>Jumlah yang diterima</td>
      <td class="amount"><span class="rp">Rp</span><span class="val">${fmt(d.diterima)}</span></td>
    </tr>
  </table>

  <div class="signature">
    <div class="date">Tangerang, &nbsp;${tanggalCetak()}</div>
    <div>KSP/HRD</div>
    <div class="stamp">AL-WILDAN<br>ISLAMIC SCHOOL</div>
  </div>

  <div class="note">
    Sesuai dengan ketentuan Lembaga bahwa :<br>
    Slip gaji ini dilarang untuk dipergunakan sebagai kelengkapan administrasi pinjaman di lembaga keuangan ribawi
  </div>
</div>
</body>
</html>`
}
