const PDFDocument = require('pdfkit');

const C = {
  primary: '#1A3B8F',
  primaryRGB: [26, 59, 143],
  accent: '#C8962E',
  accentRGB: [200, 150, 46],
  ink: '#0a0b0d',
  inkRGB: [10, 11, 13],
  muted: '#7c828a',
  mutedRGB: [124, 130, 138],
  hairline: '#dee1e6',
  hairlineRGB: [222, 225, 230],
  surface: '#f7f7f7',
  surfaceRGB: [247, 247, 247],
  white: '#ffffff',
  whiteRGB: [255, 255, 255],
  green: '#059669',
  greenRGB: [5, 150, 105],
  red: '#dc2626',
  redRGB: [220, 38, 38],
  blue: '#2563eb',
  blueRGB: [37, 99, 235],
}

const fmtNum = n => Number(n||0).toLocaleString('id-ID')
const fmtRp  = n => 'Rp ' + fmtNum(n)

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return [r,g,b]
}

function drawRoundedRect(doc, x, y, w, h, r, fillColor) {
  doc.save()
  doc.roundedRect(x, y, w, h, r).fill(fillColor)
  doc.restore()
}

// Summary per cabang dari data
function getSummaryByCabang(data) {
  const map = {}
  data.forEach(r => {
    if (!map[r.kode_cabang]) map[r.kode_cabang] = { nama:r.nama_cabang, kode:r.kode_cabang, total_gaji:0, total_diterima:0, count:0 }
    map[r.kode_cabang].total_gaji     += r.jumlah_gaji||0
    map[r.kode_cabang].total_diterima += r.jml_diterima||0
    map[r.kode_cabang].count++
  })
  return Object.values(map)
}

function drawBarChart(doc, x, y, w, h, cabangData) {
  const maxVal = Math.max(...cabangData.map(c => Math.max(c.total_gaji, c.total_diterima)), 1) * 1.1
  const n      = cabangData.length
  const barW   = Math.min(44, (w / n) * 0.55)
  const slot   = w / n
  const colors = [C.primaryRGB, [41,74,163], [63,98,181], [89,122,199], [115,146,217]]
  const chartH = h - 32 // reserve space for labels below

  // Y axis lines & labels
  for (let i=0; i<=4; i++) {
    const lineY = y + chartH - (i/4)*chartH
    doc.strokeColor(C.hairline).lineWidth(0.4).moveTo(x, lineY).lineTo(x+w, lineY).stroke()
    const val = maxVal/4*i
    doc.fillColor(C.muted).fontSize(6.5).font('Helvetica')
      .text(val>=1000000?(val/1000000).toFixed(1)+'jt':Math.round(val).toString(),
        x-36, lineY-4, { width:34, align:'right' })
  }

  // Bars
  cabangData.forEach((c, i) => {
    const slotX  = x + i*slot + slot/2
    const halfW  = barW/2 - 1
    const bar1X  = slotX - halfW - 1
    const bar2X  = slotX + 1
    const color1 = colors[i%colors.length]
    const hex1   = '#'+color1.map(v=>v.toString(16).padStart(2,'0')).join('')

    const h1 = Math.max(1, (c.total_gaji/maxVal)*chartH)
    const h2 = Math.max(1, (c.total_diterima/maxVal)*chartH)

    // Bar total gaji
    doc.fillColor(hex1).rect(bar1X, y+chartH-h1, halfW, h1).fill()

    // Bar diterima
    doc.fillColor(C.accent).rect(bar2X, y+chartH-h2, halfW, h2).fill()

    // Value label atas bar (hanya jika cukup tinggi)
    // no value label on top

    // Cabang label di bawah — pakai slot penuh agar tidak tabrakan
    doc.fillColor(C.ink).fontSize(7.5).font('Helvetica-Bold')
      .text(c.kode.replace('AL-WILDAN ','AW '), slotX-slot/2+2, y+chartH+6, { width:slot-4, align:'center' })
    doc.fillColor(C.muted).fontSize(6.5).font('Helvetica')
      .text(c.count+' org', slotX-slot/2+2, y+chartH+17, { width:slot-4, align:'center' })
  })
}

function drawPieChart(doc, cx, cy, r, data) {
  const total = data.reduce((a,b)=>a+b.value,0)
  const colors = [C.primaryRGB, C.accentRGB, C.blueRGB, C.greenRGB, [107,114,128]]
  let angle = -Math.PI/2

  data.forEach((d, i) => {
    const slice = (d.value/total) * Math.PI * 2
    const mid   = angle + slice/2
    const color = colors[i%colors.length]
    const hex   = '#'+color.map(v=>v.toString(16).padStart(2,'0')).join('')

    // Draw slice (approximate with polygon)
    const steps = Math.max(8, Math.round(slice*20))
    const pts   = [[cx, cy]]
    for (let s=0; s<=steps; s++) {
      const a = angle + (slice/steps)*s
      pts.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r])
    }
    doc.save().fillColor(hex)
    doc.moveTo(pts[0][0], pts[0][1])
    pts.slice(1).forEach(p => doc.lineTo(p[0], p[1]))
    doc.closePath().fill()
    doc.restore()

    // Label line
    const lx = cx + Math.cos(mid)*(r+12)
    const ly = cy + Math.sin(mid)*(r+12)
    const pct = Math.round((d.value/total)*100)
    if (pct > 5) {
      doc.fillColor(C.ink).fontSize(7).font('Helvetica-Bold')
        .text(`${d.name}\n${pct}%`, lx-18, ly-8, { width:36, align:'center' })
    }

    angle += slice
  })

  // Center hole
  doc.save().fillColor(C.white).circle(cx, cy, r*0.5).fill().restore()
}

function generatePDF(data, label, cabangNama, res) {
  const doc = new PDFDocument({ margin:0, size:'A4', layout:'landscape' })
  res.setHeader('Content-Disposition', `attachment; filename="laporan-gaji-${label}.pdf"`)
  res.setHeader('Content-Type', 'application/pdf')
  doc.pipe(res)

  const PW = 841.89  // A4 landscape width
  const PH = 595.28  // A4 landscape height
  const M  = 32      // margin

  const cabangSummary = getSummaryByCabang(data)
  const totalGaji     = data.reduce((a,b)=>a+(b.jumlah_gaji||0),0)
  const totalDiterima = data.reduce((a,b)=>a+(b.jml_diterima||0),0)
  const totalPotongan = Math.abs(totalGaji - totalDiterima)

  // ── PAGE 1: Cover + Infografis ──────────────────────────────────────────

  // Header band
  doc.rect(0, 0, PW, 90).fill(C.primary)

  // Logo image
  const logoPath = require('path').join(__dirname, '../assets/logo.png')
  try {
    doc.image(logoPath, M+6, 8, { width:72, height:72 })
  } catch(e) {
    doc.save().fillColor(C.accent).circle(M+28, 45, 22).fill().restore()
    doc.fillColor(C.white).fontSize(10).font('Helvetica-Bold')
      .text('AW', M+17, 40, { width:22, align:'center' })
  }

  // Title
  doc.fillColor(C.white).fontSize(20).font('Helvetica-Bold')
    .text('LAPORAN PENGGAJIAN', M+86, 14)
  doc.fillColor(C.white).fontSize(11).font('Helvetica-Bold')
    .text('AL-WILDAN ISLAMIC SCHOOL', M+86, 38)
  doc.fillColor([200,210,240]).fontSize(9)
    .text(`Periode: ${label}  ·  Cabang: ${cabangNama}  ·  ${data.length} Karyawan`, M+86, 58)

  // Date generated
  doc.fillColor([180,200,230]).fontSize(8)
    .text(`Digenerate: ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}`,
      PW-M-150, 62, { width:150, align:'right' })

  // ── Summary Cards ──────────────────────────────────────────────────────
  const cardY = 106
  const cardH = 72
  const cardW = (PW - M*2 - 24) / 3

  const cards = [
    { label:'Total Penggajian', value:fmtRp(totalGaji),     sub:'Sebelum potongan', color:C.primary,  colorRGB:C.primaryRGB,  icon:'💰' },
    { label:'Total Potongan',   value:fmtRp(totalPotongan), sub:'BPJS, THR, dll',   color:C.red,       colorRGB:C.redRGB,      icon:'✂️' },
    { label:'Total Diterima',   value:fmtRp(totalDiterima), sub:'Nett karyawan',    color:C.green,     colorRGB:C.greenRGB,    icon:'✅' },
  ]

  cards.forEach((card, i) => {
    const cx = M + i*(cardW+12)
    // Card bg
    doc.save().roundedRect(cx, cardY, cardW, cardH, 10).fill(C.surface).restore()
    // Left accent bar
    doc.save().roundedRect(cx, cardY, 4, cardH, 2).fill(card.color).restore()
    // Label
    doc.fillColor(C.muted).fontSize(8).font('Helvetica')
      .text(card.label.toUpperCase(), cx+14, cardY+12, { width:cardW-20, characterSpacing:0.5 })
    // Value
    doc.fillColor(card.color).fontSize(15).font('Helvetica-Bold')
      .text(card.value, cx+14, cardY+26, { width:cardW-20 })
    // Sub
    doc.fillColor(C.muted).fontSize(8).font('Helvetica')
      .text(card.sub, cx+14, cardY+50)
    // Karyawan count for last card
    if (i===2) {
      doc.fillColor(C.green).fontSize(8).font('Helvetica-Bold')
        .text(`${data.length} karyawan`, cx+cardW-80, cardY+50, { width:70, align:'right' })
    }
  })

  // ── Charts Section ─────────────────────────────────────────────────────
  const chartY = cardY + cardH + 20

  // Section title
  doc.fillColor(C.ink).fontSize(10).font('Helvetica-Bold')
    .text('Analisis per Cabang', M, chartY)
  doc.strokeColor(C.hairline).lineWidth(1)
    .moveTo(M, chartY+16).lineTo(PW-M, chartY+16).stroke()

  const chartAreaY = chartY + 32
  const chartH     = 130

  // Bar chart
  const barChartW = (PW - M*2) * 0.60
  doc.fillColor(C.muted).fontSize(8).font('Helvetica')
    .text('Perbandingan Gaji per Cabang (Rp)', M, chartAreaY, { width:barChartW, align:'center' })

  drawBarChart(doc, M+40, chartAreaY+14, barChartW-50, chartH-30, cabangSummary)

  // Bar chart legend
  const legY = chartAreaY + chartH - 10
  doc.save().rect(M+40, legY, 10, 8).fill(C.primary).restore()
  doc.fillColor(C.muted).fontSize(7).text('Total Gaji', M+54, legY+1)
  doc.save().rect(M+110, legY, 10, 8).fill(C.accent).restore()
  doc.fillColor(C.muted).fontSize(7).text('Diterima', M+124, legY+1)

  // Pie chart
  const pieX = M + barChartW + 40
  const pieW = PW - M - pieX
  doc.fillColor(C.muted).fontSize(8).font('Helvetica')
    .text('Proporsi Gaji Diterima', pieX, chartAreaY, { width:pieW, align:'center' })

  const pieCX = pieX + pieW/2
  const pieCY = chartAreaY + chartH/2 + 8
  const pieR  = Math.min(pieW/2-30, chartH/2-16)

  const pieData = cabangSummary.map(c => ({ name:c.kode.replace('AL-WILDAN ','AW '), value:c.total_diterima }))
  drawPieChart(doc, pieCX, pieCY, pieR, pieData)

  // Per-cabang mini stats
  const statsY = chartAreaY + chartH + 10
  const statW  = (PW - M*2 - (cabangSummary.length-1)*10) / Math.max(cabangSummary.length,1)

  cabangSummary.forEach((c, i) => {
    const sx = M + i*(statW+10)
    const pct = totalDiterima>0 ? Math.round((c.total_diterima/totalDiterima)*100) : 0
    doc.save().roundedRect(sx, statsY, statW, 52, 8).fill(C.surface).restore()
    doc.fillColor(C.primary).fontSize(8).font('Helvetica-Bold')
      .text(c.kode.replace('AL-WILDAN ','AW '), sx+8, statsY+8, { width:statW-16, align:'center' })
    doc.fillColor(C.ink).fontSize(9).font('Helvetica-Bold')
      .text(fmtRp(c.total_diterima), sx+8, statsY+22, { width:statW-16, align:'center' })
    doc.fillColor(C.muted).fontSize(7)
      .text(`${c.count} karyawan · ${pct}%`, sx+8, statsY+38, { width:statW-16, align:'center' })
    // Progress bar
    const barMaxW = statW-16
    doc.save().roundedRect(sx+8, statsY+48, barMaxW, 3, 2).fill(C.hairline).restore()
    doc.save().roundedRect(sx+8, statsY+48, barMaxW*(pct/100), 3, 2).fill(C.primary).restore()
  })

  // ── PAGE 2: Detail Table ───────────────────────────────────────────────
  doc.addPage({ size:'A4', layout:'landscape', margin:0 })

  // Header band page 2
  doc.rect(0, 0, PW, 44).fill(C.primary)
  doc.fillColor(C.white).fontSize(12).font('Helvetica-Bold')
    .text('DETAIL DATA KARYAWAN', M, 16)
  doc.fillColor(C.accentRGB).fontSize(8).font('Helvetica')
    .text(`${label}  ·  ${cabangNama}  ·  ${data.length} karyawan`, M, 32)

  // Table
  const tY   = 56
  const cols = [
    { key:'no',          label:'NO',       w:24,  align:'center' },
    { key:'nu',          label:'NU',       w:38,  align:'center', mono:true },
    { key:'nama',        label:'NAMA',     w:118, align:'left' },
    { key:'jabatan',     label:'JABATAN',  w:80,  align:'left' },
    { key:'kode_cabang', label:'CABANG',   w:42,  align:'center' },
    { key:'periode',     label:'PERIODE',  w:52,  align:'center', mono:true },
    { key:'gapok',       label:'GAPOK',    w:74,  align:'right',  num:true },
    { key:'transport',   label:'TRANSP.',  w:58,  align:'right',  num:true },
    { key:'bpjs_ks',     label:'BPJS KS', w:54,  align:'right',  num:true },
    { key:'pot_bpjs_tk', label:'POT BPJSTK',w:58,align:'right',  num:true },
    { key:'lains',       label:'LAINS',   w:52,  align:'right',  num:true },
    { key:'jumlah_gaji', label:'TOTAL',   w:78,  align:'right',  num:true },
    { key:'jml_diterima',label:'DITERIMA',w:78,  align:'right',  num:true, accent:true },
  ]
  const totalW = cols.reduce((a,c)=>a+c.w,0)
  const offsetX = (PW - totalW) / 2

  // Header row
  doc.rect(offsetX, tY, totalW, 20).fill(C.primary)
  let cx2 = offsetX
  cols.forEach(col => {
    doc.fillColor(C.white).fontSize(6.5).font('Helvetica-Bold')
      .text(col.label, cx2+3, tY+6, { width:col.w-6, align:col.align||'left' })
    cx2 += col.w
  })

  // Data rows
  let rowY = tY + 20
  const rowH2 = 16

  data.forEach((r, i) => {
    if (rowY + rowH2 > PH - 40) {
      doc.addPage({ size:'A4', layout:'landscape', margin:0 })
      doc.rect(0,0,PW,44).fill(C.primary)
      doc.fillColor(C.white).fontSize(12).font('Helvetica-Bold').text('DETAIL (lanjutan)', M, 16)
      rowY = 56
      // Repeat header
      doc.rect(offsetX, rowY-20, totalW, 20).fill(C.primary)
      cx2 = offsetX
      cols.forEach(col => {
        doc.fillColor(C.white).fontSize(6.5).font('Helvetica-Bold')
          .text(col.label, cx2+3, rowY-14, { width:col.w-6, align:col.align||'left' })
        cx2 += col.w
      })
    }

    const bg = i%2===0 ? C.surface : C.white
    doc.rect(offsetX, rowY, totalW, rowH2).fill(bg)

    cx2 = offsetX
    cols.forEach(col => {
      let val = col.key==='no' ? String(i+1) : String(r[col.key]||'-')
      if (col.num) val = fmtNum(r[col.key])

      const txtColor = col.accent ? C.primary : C.ink
      doc.fillColor(txtColor).fontSize(col.num?7:7.5)
        .font(col.accent ? 'Helvetica-Bold' : 'Helvetica')
        .text(val, cx2+3, rowY+4, { width:col.w-6, align:col.align||'left', ellipsis:true })
      cx2 += col.w
    })
    rowY += rowH2
  })

  // Total row
  doc.rect(offsetX, rowY, totalW, 20).fill(C.primary)
  doc.fillColor(C.white).fontSize(7.5).font('Helvetica-Bold')
    .text('TOTAL', offsetX+3, rowY+6, { width:cols.slice(0,-2).reduce((a,c)=>a+c.w,0)-6 })
  cx2 = offsetX + cols.slice(0,-2).reduce((a,c)=>a+c.w,0)
  doc.fillColor(C.white).fontSize(7.5).font('Helvetica-Bold')
    .text(fmtNum(totalGaji), cx2+3, rowY+6, { width:cols[cols.length-2].w-6, align:'right' })
  cx2 += cols[cols.length-2].w
  doc.fillColor(C.accent).fontSize(7.5).font('Helvetica-Bold')
    .text(fmtNum(totalDiterima), cx2+3, rowY+6, { width:cols[cols.length-1].w-6, align:'right' })

  // Footer
  doc.fillColor(C.muted).fontSize(7)
    .text(`AL-WILDAN HR System  ·  Digenerate otomatis pada ${new Date().toLocaleString('id-ID')}`,
      M, PH-18, { width:PW-M*2, align:'center' })

  doc.end()
}

module.exports = { generatePDF }
