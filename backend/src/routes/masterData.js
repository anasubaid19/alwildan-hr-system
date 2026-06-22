const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const XLSX    = require('xlsx');
const path    = require('path');
const fs      = require('fs');
const db      = require('../models/database');
const { createNotif } = require('./notifications');

// Tabel master_data
db.exec(`
  CREATE TABLE IF NOT EXISTS master_data (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT,
    columns     TEXT,
    sample_data TEXT,
    employee_list TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const uploadDir = path.join(__dirname, '../../uploads/master');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `master-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET — ambil master data terakhir
router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM master_data ORDER BY id DESC LIMIT 1').get();
  if (!row) return res.json({ success: true, data: null });
  res.json({
    success: true,
    data: {
      ...row,
      columns:       JSON.parse(row.columns || '[]'),
      sample_data:   JSON.parse(row.sample_data || '{}'),
      employee_list: JSON.parse(row.employee_list || '[]'),
    }
  });
});

// POST — upload file master
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2)
      return res.status(400).json({ success: false, message: 'File kosong atau tidak valid' });

    const headers = rows[0].map(h => String(h || '').trim()).filter(Boolean);
    const dataRows = rows.slice(1).filter(r => r.some(c => c !== undefined && c !== ''));

    // Sample data (3 baris pertama)
    const sampleData = {};
    headers.forEach((h, i) => {
      sampleData[h] = dataRows.slice(0, 3).map(r => String(r[i] ?? '')).filter(Boolean)
    });

    // Employee list — cari kolom nama
    const namaCol = headers.find(h =>
      ['nama','name','nama lengkap','full name','nama_lengkap'].includes(h.toLowerCase())
    ) || headers[2] || headers[0];

    const namaIdx = headers.indexOf(namaCol);
    const employeeList = dataRows
      .map(r => String(r[namaIdx] ?? '').trim())
      .filter(n => n.length > 1)
      .slice(0, 500); // max 500 nama

    // Hapus master sebelumnya, simpan yang baru
    db.prepare('DELETE FROM master_data').run();
    db.prepare(`
      INSERT INTO master_data (filename, columns, sample_data, employee_list)
      VALUES (?, ?, ?, ?)
    `).run(
      req.file.originalname,
      JSON.stringify(headers),
      JSON.stringify(sampleData),
      JSON.stringify(employeeList)
    );

    createNotif(
      'master',
      'Data Utama HR Pusat Diperbarui',
      'File ' + req.file.originalname + ' berhasil diupload · ' + employeeList.length + ' karyawan · ' + headers.length + ' kolom',
      'settings'
    )
    res.json({
      success: true,
      data: {
        filename:      req.file.originalname,
        columns:       headers,
        total_rows:    dataRows.length,
        employee_list: employeeList.slice(0, 10), // preview 10
        total_employees: employeeList.length
      }
    });

    try {
      fs.readdirSync(uploadDir).forEach(f => {
        if (f !== path.basename(req.file.path)) fs.unlinkSync(path.join(uploadDir, f))
      })
      fs.unlinkSync(req.file.path)
    } catch {}

  } catch(e) {
    try { if (req.file) fs.unlinkSync(req.file.path) } catch {}
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE — hapus master data
router.delete('/', (req, res) => {
  db.prepare('DELETE FROM master_data').run();
  res.json({ success: true, message: 'Master data dihapus' });
});

module.exports = router;
