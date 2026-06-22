const express = require('express');
const router = express.Router();
const db = require('../models/database');
const XLSX = require('xlsx');
const { generatePDF } = require('../utils/pdfLaporan');

const getData = (params) => {
  const { periode, tahun, cabang_id, page, limit } = params;
  let where = 'WHERE 1=1';
  const p = [];
  if (periode)   { where += ' AND g.periode=?'; p.push(periode); }
  else if (tahun){ where += ' AND g.periode LIKE ?'; p.push(`${tahun}-%`); }
  if (cabang_id) { where += ' AND g.paying_cabang_id=?'; p.push(cabang_id); }
  let sql = `
    SELECT k.nu, k.nama, k.jabatan, k.gender, k.no_acc,
           cp.kode as kode_cabang, cp.nama as nama_cabang,
           g.periode, g.gapok, g.tunjangan_penddk, g.tunjangan_jabatan,
           g.transport, g.bpjs_ks, g.lains, g.lembur,
           g.pot_thr, g.pot_bpjs_tk,
           g.deposit_itba, g.punishment, g.pinjaman,
           g.jumlah_gaji, g.jml_diterima
    FROM gaji g
    JOIN karyawan k ON g.karyawan_id=k.id
    LEFT JOIN cabang cp ON g.paying_cabang_id=cp.id
    ${where} ORDER BY cp.kode, k.nu
  `;
  if (page !== undefined || limit !== undefined) {
    const lim = parseInt(limit) || 50;
    const off = ((parseInt(page) || 1) - 1) * lim;
    sql += ' LIMIT ? OFFSET ?';
    p.push(lim, off);
  }
  return db.prepare(sql).all(...p);
};

const getCount = (params) => {
  const { periode, tahun, cabang_id } = params;
  let where = 'WHERE 1=1';
  const p = [];
  if (periode)   { where += ' AND g.periode=?'; p.push(periode); }
  else if (tahun){ where += ' AND g.periode LIKE ?'; p.push(`${tahun}-%`); }
  if (cabang_id) { where += ' AND g.paying_cabang_id=?'; p.push(cabang_id); }
  return db.prepare(`
    SELECT COUNT(*) as c
    FROM gaji g
    JOIN karyawan k ON g.karyawan_id=k.id
    LEFT JOIN cabang cp ON g.paying_cabang_id=cp.id
    ${where}
  `).get(...p).c;
};

// Rekap: 1 row per karyawan, kolom per paying cabang
const getRekapData = (params) => {
  const { periode, tahun, cabang_id } = params;
  let where = 'WHERE 1=1';
  const p = [];
  if (periode)   { where += ' AND g.periode=?'; p.push(periode); }
  else if (tahun){ where += ' AND g.periode LIKE ?'; p.push(`${tahun}-%`); }
  if (cabang_id) { where += ' AND g.paying_cabang_id=?'; p.push(cabang_id); }

  const rows = db.prepare(`
    SELECT k.id as karyawan_id, k.nama, k.jabatan,
           cp.kode as kode_cabang,
           SUM(g.jml_diterima) as jml_diterima
    FROM gaji g
    JOIN karyawan k ON g.karyawan_id=k.id
    LEFT JOIN cabang cp ON g.paying_cabang_id=cp.id
    ${where}
    GROUP BY k.id, g.paying_cabang_id
    ORDER BY k.nama, cp.kode
  `).all(...p);

  // Pivot: { nama, jabatan, [cabang_kode]: jml_diterima, total }
  const byKaryawan = {};
  const cabangSet = new Set();
  rows.forEach(r => {
    cabangSet.add(r.kode_cabang);
    if (!byKaryawan[r.karyawan_id]) {
      byKaryawan[r.karyawan_id] = { nama: r.nama, jabatan: r.jabatan };
    }
    byKaryawan[r.karyawan_id][r.kode_cabang] = (byKaryawan[r.karyawan_id][r.kode_cabang] || 0) + r.jml_diterima;
  });

  const cabangCols = [...cabangSet].sort();
  const data = Object.values(byKaryawan).map(row => {
    const total = cabangCols.reduce((s, k) => s + (row[k] || 0), 0);
    return { ...row, total };
  });

  return { data, cabangCols };
};

const HEADERS = ['NO','NU','NAMA','JABATAN','GENDER','NO ACC','CABANG','PERIODE',
  'GAPOK','PENDDK','T.JABATAN','TRANSPORT','BPJS KS','LAINS','LEMBUR',
  'POT THR','POT BPJS TK','DEPOSIT ITBA','PUNISHMENT','PINJAMAN','JUMLAH GAJI','JML DITERIMA'];

const toRow = (r,i) => [i+1,r.nu,r.nama,r.jabatan,r.gender,r.no_acc,r.nama_cabang,r.periode,
  r.gapok,r.tunjangan_penddk,r.tunjangan_jabatan,r.transport,r.bpjs_ks,r.lains,r.lembur,
  r.pot_thr,r.pot_bpjs_tk,r.deposit_itba,r.punishment,r.pinjaman,r.jumlah_gaji,r.jml_diterima];

router.get('/preview', (req, res) => {
  const paginate = req.query.page !== undefined || req.query.limit !== undefined;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const total = getCount(req.query);
  res.json({
    success: true,
    data: getData(req.query),
    pagination: {
      page: paginate ? page : 1,
      limit: paginate ? limit : total,
      total,
      totalPages: paginate ? Math.ceil(total / limit) : 1,
    },
  });
});

router.get('/rekap', (req, res) => {
  const { data, cabangCols } = getRekapData(req.query);
  res.json({ success:true, data, cabangCols });
});

router.get('/export/xlsx', (req, res) => {
  const data  = getData(req.query);
  const label = req.query.periode || req.query.tahun || 'semua';
  const ws = XLSX.utils.aoa_to_sheet([
    ['LAPORAN PENGGAJIAN - AL-WILDAN ISLAMIC SCHOOL'],
    [`Periode: ${label}`],[],HEADERS,...data.map(toRow)
  ]);
  ws['!cols'] = HEADERS.map((_,i) => ({ wch:i<2?6:i===2?25:i===6?22:14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Gaji');
  const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
  res.setHeader('Content-Disposition',`attachment; filename="laporan-gaji-${label}.xlsx"`);
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

router.get('/export/rekap-xlsx', (req, res) => {
  const { data, cabangCols } = getRekapData(req.query);
  const label = req.query.periode || req.query.tahun || 'semua';
  const headers = ['NO','NAMA','JABATAN',...cabangCols,'TOTAL'];
  const rows = data.map((r,i) => [
    i+1, r.nama, r.jabatan,
    ...cabangCols.map(k => r[k] || 0),
    r.total
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    ['REKAP GAJI PER KARYAWAN - AL-WILDAN ISLAMIC SCHOOL'],
    [`Periode: ${label}`],[],headers,...rows
  ]);
  ws['!cols'] = headers.map((_,i) => ({ wch: i===1?28:i===2?20:16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Per Karyawan');
  const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
  res.setHeader('Content-Disposition',`attachment; filename="rekap-karyawan-${label}.xlsx"`);
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

router.get('/export/csv', (req, res) => {
  const data  = getData(req.query);
  const label = req.query.periode || req.query.tahun || 'semua';
  const csv   = [HEADERS,...data.map(toRow)].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  res.setHeader('Content-Disposition',`attachment; filename="laporan-gaji-${label}.csv"`);
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.send('﻿'+csv);
});

router.get('/export/pdf', (req, res) => {
  const data       = getData(req.query);
  const label      = req.query.periode || req.query.tahun || 'Semua Periode';
  const cabangNama = req.query.cabang_nama || 'Semua Cabang';
  generatePDF(data, label, cabangNama, res);
});

module.exports = router;
