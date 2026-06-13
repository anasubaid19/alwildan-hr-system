const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const db = require('../models/database');
const { getSettings } = require('./settings');
const { createNotif }  = require('./notifications');

// Sheet yang diabaikan saat upload
const IGNORED_SHEETS = ['SIP GAJI', 'SIP GAJI H'];

// Ambil sheet pertama yang valid (bukan SIP GAJI)
const getValidSheet = (workbook) => {
  const validName = workbook.SheetNames.find(n => !IGNORED_SHEETS.includes(n.trim().toUpperCase()));
  return validName ? workbook.Sheets[validName] : null;
};

// Ambil master data HR Pusat sebagai referensi AI
const getMasterContext = () => {
  try {
    const row = db.prepare('SELECT * FROM master_data ORDER BY id DESC LIMIT 1').get();
    if (!row) return null;
    return {
      columns:       JSON.parse(row.columns || '[]'),
      sample_data:   JSON.parse(row.sample_data || '{}'),
      employee_list: JSON.parse(row.employee_list || '[]'),
    };
  } catch { return null; }
};

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const HR_COLUMNS = [
  'NO','NU','NAMA','JABATAN','GENDER','GELAR','THN AKTIF',
  'NO ACC','JUMLAH GAJI','GAPOK','PENDDK','JABATAN_TUNJ',
  'TRANSPORT','BPJS KS','LAINS','LEMBUR',
  'POT THR','POT BPJS TK','Deposit ITBA','Jml Diterima',
  'Punishment','Pinjaman'
];

const BULAN_ID = {
  januari:1, februari:2, maret:3, april:4, mei:5, juni:6,
  juli:7, agustus:8, september:9, oktober:10, november:11, desember:12,
  jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, agt:8, agu:8,
  sep:9, okt:10, nov:11, des:12,
  january:1, february:2, march:3, may:5, june:6, july:7,
  august:8, october:10, december:12,
};

// Deteksi periode (YYYY-MM) dari string teks
const detectPeriode = (text) => {
  const t = text.toLowerCase();

  // Pola YYYY-MM atau YYYY_MM atau YYYY MM
  let m = t.match(/\b(20\d{2})[-_\s](0?[1-9]|1[0-2])\b/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}`;

  // Pola MM-YYYY atau MM_YYYY atau MM YYYY
  m = t.match(/\b(0?[1-9]|1[0-2])[-_\s](20\d{2})\b/);
  if (m) return `${m[2]}-${String(m[1]).padStart(2,'0')}`;

  // Nama bulan + tahun: "Januari 2026", "Jan-2026", "Des_25"
  for (const [nama, bulan] of Object.entries(BULAN_ID)) {
    const re = new RegExp(`\\b${nama}\\b[\\s_\\-]*(20\\d{2}|\\d{2})\\b`, 'i');
    m = t.match(re);
    if (m) {
      const tahun = m[1].length === 2 ? `20${m[1]}` : m[1];
      return `${tahun}-${String(bulan).padStart(2,'0')}`;
    }
    // Tahun dulu: "2026 Januari"
    const re2 = new RegExp(`\\b(20\\d{2})[\\s_\\-]*${nama}\\b`, 'i');
    m = t.match(re2);
    if (m) return `${m[1]}-${String(bulan).padStart(2,'0')}`;
  }

  return null;
};

// Deteksi cabang dari string teks, cocokkan ke daftar cabang di DB
const detectCabang = (text, cabangList) => {
  const t = text.toLowerCase();
  // Coba cocokkan kode cabang dulu (lebih presisi)
  for (const c of cabangList) {
    if (c.kode && t.includes(c.kode.toLowerCase())) return c;
  }
  // Lalu cocokkan nama cabang (partial)
  for (const c of cabangList) {
    const words = c.nama.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.some(w => t.includes(w))) return c;
  }
  return null;
};

// POST /api/upload/analyze — upload & analisis kolom via AI
router.post('/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });

  try {
    const workbook = XLSX.readFile(req.file.path);
    const validSheetName = workbook.SheetNames.find(n => !IGNORED_SHEETS.includes(n.trim().toUpperCase()));
    const sheet = validSheetName ? workbook.Sheets[validSheetName] : null;
    if (!sheet) return res.status(400).json({ success: false, message: 'Tidak ada sheet valid (sheet SIP GAJI diabaikan)' });

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length < 2) return res.status(400).json({ success: false, message: 'File kosong atau tidak valid' });

    const headers = rows[0].map(h => String(h || '').trim()).filter(Boolean);
    const sampleRows = rows.slice(1, 4).map(r =>
      headers.reduce((obj, h, i) => { obj[h] = r[i] ?? ''; return obj; }, {})
    );

    const base_url = getSettings('ai_base_url');
    const api_key  = getSettings('ai_api_key');
    const model    = getSettings('ai_model');

    const master = getMasterContext();
    const masterContext = master ? [
      '\nKolom yang digunakan HR Pusat (dari data master):',
      master.columns.join(', '),
      '\nContoh isi data HR Pusat per kolom:',
      Object.entries(master.sample_data).slice(0,8)
        .map(([k,v]) => k + ': ' + v.slice(0,2).join(', ')).join('\n')
    ].join('\n') : '';

    const prompt = `Kamu adalah asisten HR yang membantu memetakan kolom data karyawan.

Kolom standar HR Pusat yang dibutuhkan:
${HR_COLUMNS.join(', ')}
${masterContext}

Istilah penting:
- NU = Nomor Urut (urutan karyawan dalam daftar)
- NAMA = gunakan nama sesuai gelar (bukan nama KTP), prioritaskan kolom yang berisi gelar akademik
- LEMBUR = penambahan gaji positif (bukan potongan), masuk ke JUMLAH GAJI
- BPJS KS = BPJS Kesehatan, bagian dari JUMLAH GAJI (bukan potongan)
- POT BPJS TK = BPJS Ketenagakerjaan, ini potongan
- THP / Jml Diterima / TOTAL DITERIMA / TAKE HOME PAY = jumlah nett yang diterima karyawan → petakan ke Jml Diterima
- JUMLAH GAJI = total bruto (GAPOK + T.PENDIDIKAN + T.JABATAN + TRANSPORT + BPJS KS + LAINS + LEMBUR)

Kolom dari file cabang yang diupload:
${headers.join(', ')}

Contoh data (3 baris pertama):
${JSON.stringify(sampleRows, null, 2)}

Tugasmu: petakan setiap kolom cabang ke kolom standar HR Pusat yang paling sesuai.
Gunakan konteks dari data master HR Pusat di atas sebagai referensi.
Jika tidak ada padanannya, gunakan null.

Balas HANYA dengan JSON object seperti ini (tanpa penjelasan, tanpa markdown):
{
  "mapping": {
    "kolom_cabang": "KOLOM_STANDAR_atau_null",
    ...
  }
}`;

    const aiRes = await fetch(`${base_url}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const aiData = await aiRes.json();
    const aiText = aiData.choices?.[0]?.message?.content || '{}';

    let mapping = {};
    try {
      const clean = aiText.replace(/```json|```/g, '').trim();
      mapping = JSON.parse(clean).mapping || {};
    } catch {
      headers.forEach(h => {
        const match = HR_COLUMNS.find(c => c.toLowerCase() === h.toLowerCase());
        mapping[h] = match || null;
      });
    }

    // ── Auto-detect periode & cabang ──────────────────────────────
    const cabangList = db.prepare('SELECT id, kode, nama FROM cabang').all();

    // Cari di: nama file → nama sheet → 5 baris pertama data
    const searchTargets = [
      req.file.originalname,
      validSheetName || '',
      ...rows.slice(0, 5).flat().map(v => String(v || '')),
    ];

    let suggestedPeriode = null;
    let suggestedCabang  = null;

    for (const target of searchTargets) {
      if (!suggestedPeriode) suggestedPeriode = detectPeriode(target);
      if (!suggestedCabang)  suggestedCabang  = detectCabang(target, cabangList);
      if (suggestedPeriode && suggestedCabang) break;
    }
    // ──────────────────────────────────────────────────────────────

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        filepath: req.file.path,
        headers,
        sample: sampleRows,
        mapping,
        total_rows: rows.length - 1,
        hr_columns: HR_COLUMNS,
        suggested_periode: suggestedPeriode,
        suggested_cabang: suggestedCabang || null,
      }
    });

  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/upload/check-diff — preview perubahan sebelum konfirmasi
router.post('/check-diff', (req, res) => {
  const { filepath, mapping, cabang_id, periode } = req.body
  if (!filepath || !mapping || !cabang_id || !periode)
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' })

  try {
    const workbook = XLSX.readFile(filepath)
    const sheet = getValidSheet(workbook)
    if (!sheet) return res.status(400).json({ success: false, message: 'Tidak ada sheet valid' })

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    const headers = rows[0].map(h => String(h || '').trim())
    const dataRows = rows.slice(1).filter(r => r.some(c => c !== undefined && c !== ''))

    const getVal = (row, stdCol) => {
      const cabangCol = Object.keys(mapping).find(k => mapping[k] === stdCol)
      if (!cabangCol) return ''
      const idx = headers.indexOf(cabangCol)
      return idx >= 0 ? (row[idx] ?? '') : ''
    }

    const newRows = [], updateRows = [], unchangedRows = []

    dataRows.forEach(row => {
      const nama = String(getVal(row, 'NAMA') || '').trim()
      if (!nama) return

      const incoming = {
        nama,
        jabatan: String(getVal(row, 'JABATAN') || ''),
        gender:  String(getVal(row, 'GENDER')  || ''),
        no_acc:  String(getVal(row, 'NO ACC')  || ''),
        nu:      String(getVal(row, 'NU')      || ''),
      }

      const existing = db.prepare(
        'SELECT id, nama, jabatan, gender, no_acc, nu FROM karyawan WHERE nama = ? AND cabang_id = ?'
      ).get(nama, cabang_id)

      if (!existing) {
        newRows.push(incoming)
      } else {
        const changed = ['jabatan','gender','no_acc','nu'].filter(f =>
          (existing[f]||'').trim() !== (incoming[f]||'').trim()
        )
        if (changed.length > 0) {
          updateRows.push({ ...incoming, old: { jabatan: existing.jabatan, gender: existing.gender, no_acc: existing.no_acc, nu: existing.nu }, changed })
        } else {
          unchangedRows.push(incoming)
        }
      }
    })

    res.json({ success: true, new: newRows, update: updateRows, unchanged: unchangedRows })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /api/upload/confirm — simpan data setelah HR konfirmasi mapping
router.post('/confirm', async (req, res) => {
  const { filepath, mapping, cabang_id, periode } = req.body;

  if (!filepath || !mapping || !cabang_id || !periode)
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });

  try {
    const workbook = XLSX.readFile(filepath);
    const sheet = getValidSheet(workbook);
    if (!sheet) return res.status(400).json({ success: false, message: 'Tidak ada sheet valid' });

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = rows[0].map(h => String(h || '').trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => c !== undefined && c !== ''));

    // Upsert: insert baru atau update jika nama+cabang_id sudah ada
    const upsertKaryawan = (nu, nama, jabatan, gender, gelar, thn_aktif, no_acc, cabang_id) => {
      const existing = db.prepare('SELECT id FROM karyawan WHERE nama = ? AND cabang_id = ?').get(nama, cabang_id)
      if (existing) {
        db.prepare('UPDATE karyawan SET nu=?, jabatan=?, gender=?, gelar=?, thn_aktif=?, no_acc=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .run(nu, jabatan, gender, gelar, thn_aktif, no_acc, existing.id)
      } else {
        db.prepare('INSERT INTO karyawan (nu, nama, jabatan, gender, gelar, thn_aktif, no_acc, cabang_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(nu, nama, jabatan, gender, gelar, thn_aktif, no_acc, cabang_id)
      }
    };

    const insertGaji = db.prepare(`
      INSERT OR REPLACE INTO gaji
        (karyawan_id, periode, paying_cabang_id,
         gapok, tunjangan_penddk, tunjangan_jabatan, transport,
         bpjs_ks, lains, lembur,
         pot_thr, pot_bpjs_tk, deposit_itba,
         punishment, pinjaman,
         jumlah_gaji, jml_diterima)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const getVal = (row, stdCol) => {
      const cabangCol = Object.keys(mapping).find(k => mapping[k] === stdCol);
      if (!cabangCol) return '';
      const idx = headers.indexOf(cabangCol);
      return idx >= 0 ? (row[idx] ?? '') : '';
    };

    const toNum = (v) => parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;

    let inserted = 0, updated = 0, skipped = 0;

    dataRows.forEach(row => {
      const nu   = String(getVal(row, 'NU') || '').trim();
      const nama = String(getVal(row, 'NAMA') || '').trim();
      if (!nama) { skipped++; return; }

      const wasExisting = !!db.prepare('SELECT id FROM karyawan WHERE nama = ? AND cabang_id = ?').get(nama, cabang_id)

      upsertKaryawan(
        nu, nama,
        String(getVal(row, 'JABATAN') || ''),
        String(getVal(row, 'GENDER') || ''),
        String(getVal(row, 'GELAR') || ''),
        String(getVal(row, 'THN AKTIF') || ''),
        String(getVal(row, 'NO ACC') || ''),
        cabang_id
      );

      const karyawanRow = db.prepare('SELECT id FROM karyawan WHERE nama = ? AND cabang_id = ?').get(nama, cabang_id)
      if (!karyawanRow) { skipped++; return; }

      const gapok              = toNum(getVal(row, 'GAPOK'));
      const tunjangan_penddk   = toNum(getVal(row, 'PENDDK'));
      const tunjangan_jabatan  = toNum(getVal(row, 'JABATAN_TUNJ'));
      const transport          = toNum(getVal(row, 'TRANSPORT'));
      const bpjs_ks            = toNum(getVal(row, 'BPJS KS'));
      const lains              = toNum(getVal(row, 'LAINS'));
      const lembur             = toNum(getVal(row, 'LEMBUR'));
      const pot_thr            = toNum(getVal(row, 'POT THR'));
      const pot_bpjs_tk        = toNum(getVal(row, 'POT BPJS TK'));
      const deposit_itba       = toNum(getVal(row, 'Deposit ITBA'));
      const punishment         = toNum(getVal(row, 'Punishment'));
      const pinjaman           = toNum(getVal(row, 'Pinjaman'));

      const excelJumlahGaji = toNum(getVal(row, 'JUMLAH GAJI'));
      const jumlah_gaji = excelJumlahGaji > 0
        ? excelJumlahGaji
        : gapok + tunjangan_penddk + tunjangan_jabatan + transport + bpjs_ks + lains + lembur;

      const jml_diterima = jumlah_gaji - pot_thr - pot_bpjs_tk - deposit_itba;

      insertGaji.run(
        karyawanRow.id, periode, cabang_id,
        gapok, tunjangan_penddk, tunjangan_jabatan, transport,
        bpjs_ks, lains, lembur,
        pot_thr, pot_bpjs_tk, deposit_itba,
        punishment, pinjaman,
        jumlah_gaji, jml_diterima
      );

      if (wasExisting) updated++; else inserted++;
    });

    const totalProses = inserted + updated;
    db.prepare(`
      INSERT INTO upload_log (cabang_id, filename, periode, status, catatan)
      VALUES (?, ?, ?, 'success', ?)
    `).run(cabang_id, path.basename(filepath), periode, `${inserted} baru, ${updated} diperbarui, ${skipped} dilewati`);

    const cabang = db.prepare('SELECT nama FROM cabang WHERE id = ?').get(cabang_id);
    createNotif(
      'upload',
      'Upload Data Berhasil',
      `${totalProses} karyawan dari ${cabang?.nama || 'cabang'} diproses (${inserted} baru, ${updated} diperbarui)`,
      '/upload'
    );

    res.json({ success: true, inserted, updated, skipped, message: `${totalProses} karyawan diproses (${inserted} baru, ${updated} diperbarui)` });

  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
