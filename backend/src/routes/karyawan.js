const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/', (req, res) => {
  const { cabang_id, status } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (cabang_id) { where += ' AND k.cabang_id=?'; params.push(cabang_id); }
  if (status)    { where += ' AND k.status=?'; params.push(status); }
  const data = db.prepare(`
    SELECT k.*, c.nama as nama_cabang, c.kode as kode_cabang
    FROM karyawan k LEFT JOIN cabang c ON k.cabang_id=c.id
    ${where} ORDER BY k.nu
  `).all(...params);
  res.json({ success:true, data });
});

// GET statistik karyawan masuk & keluar
router.get('/stats', (req, res) => {
  const { tahun } = req.query;
  const y = tahun || new Date().getFullYear();
  const masuk  = db.prepare("SELECT COUNT(*) as c FROM karyawan WHERE thn_aktif=? AND status='aktif'").get(String(y));
  const keluar = db.prepare("SELECT COUNT(*) as c FROM karyawan WHERE thn_keluar=?").get(String(y));
  const aktif  = db.prepare("SELECT COUNT(*) as c FROM karyawan WHERE status='aktif'").get();
  const nonaktif = db.prepare("SELECT COUNT(*) as c FROM karyawan WHERE status='nonaktif'").get();
  res.json({ success:true, data:{ masuk:masuk.c, keluar:keluar.c, aktif:aktif.c, nonaktif:nonaktif.c } });
});

router.get('/:id', (req, res) => {
  const data = db.prepare(`
    SELECT k.*, c.nama as nama_cabang, c.kode as kode_cabang
    FROM karyawan k LEFT JOIN cabang c ON k.cabang_id=c.id WHERE k.id=?
  `).get(req.params.id);
  if (!data) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
  res.json({ success:true, data });
});

router.post('/', (req, res) => {
  const { no,nu,nama,jabatan,gender,gelar,thn_aktif,no_acc,cabang_id,status } = req.body;
  if (!nama) return res.status(400).json({ success:false, message:'Nama wajib diisi' });
  const r = db.prepare(`
    INSERT INTO karyawan (no,nu,nama,jabatan,gender,gelar,thn_aktif,no_acc,cabang_id,status)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(no,nu,nama,jabatan,gender,gelar,thn_aktif,no_acc,cabang_id||null,status||'aktif');
  res.json({ success:true, id:r.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { no,nu,nama,jabatan,gender,gelar,thn_aktif,thn_keluar,no_acc,cabang_id,status } = req.body;
  db.prepare(`
    UPDATE karyawan SET no=?,nu=?,nama=?,jabatan=?,gender=?,gelar=?,
    thn_aktif=?,thn_keluar=?,no_acc=?,cabang_id=?,status=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(no,nu,nama,jabatan,gender,gelar,thn_aktif,thn_keluar||null,no_acc,cabang_id||null,status||'aktif',req.params.id);
  res.json({ success:true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM karyawan WHERE id=?').run(req.params.id);
  res.json({ success:true });
});

module.exports = router;
