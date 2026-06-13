const express = require('express');
const router = express.Router();
const db = require('../models/database');
const bcrypt = require('bcryptjs');
const { createNotif } = require('./notifications');

router.get('/', (req, res) => {
  res.json({ success:true, data: db.prepare('SELECT * FROM cabang ORDER BY kode').all() });
});

router.get('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM cabang WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
  const total = db.prepare('SELECT COUNT(*) as total FROM karyawan WHERE cabang_id=?').get(req.params.id);
  res.json({ success:true, data:{ ...c, total_karyawan:total.total } });
});

router.post('/', (req, res) => {
  const { kode, nama } = req.body;
  if (!kode||!nama) return res.status(400).json({ success:false, message:'Kode dan nama wajib diisi' });
  try {
    const r = db.prepare('INSERT INTO cabang (kode,nama) VALUES (?,?)').run(kode.trim(), nama.trim());
    res.json({ success:true, id:r.lastInsertRowid });
  } catch { res.status(400).json({ success:false, message:'Kode cabang sudah digunakan' }); }
});

router.put('/:id', (req, res) => {
  const { kode, nama } = req.body;
  if (!kode||!nama) return res.status(400).json({ success:false, message:'Kode dan nama wajib diisi' });
  try {
    db.prepare('UPDATE cabang SET kode=?,nama=? WHERE id=?').run(kode.trim(), nama.trim(), req.params.id);
    res.json({ success:true });
  } catch { res.status(400).json({ success:false, message:'Kode sudah digunakan' }); }
});

router.delete('/:id', (req, res) => {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ success: false, message: 'Hanya Super Admin yang bisa menghapus cabang' });

  const { password } = req.body;
  if (!password)
    return res.status(400).json({ success: false, message: 'Password wajib diisi' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(password, user.password))
    return res.status(401).json({ success: false, message: 'Password tidak sesuai' });

  const cabang = db.prepare('SELECT * FROM cabang WHERE id = ?').get(req.params.id);
  if (!cabang)
    return res.status(404).json({ success: false, message: 'Cabang tidak ditemukan' });

  const totalKaryawan = db.prepare('SELECT COUNT(*) as c FROM karyawan WHERE cabang_id = ?').get(req.params.id).c;
  const totalGaji     = db.prepare('SELECT COUNT(*) as c FROM gaji WHERE paying_cabang_id = ?').get(req.params.id).c;

  // Cascade delete
  db.prepare('DELETE FROM gaji WHERE paying_cabang_id = ?').run(req.params.id);
  db.prepare('DELETE FROM karyawan WHERE cabang_id = ?').run(req.params.id);
  db.prepare('DELETE FROM cabang WHERE id = ?').run(req.params.id);

  createNotif(
    'delete',
    'Cabang Dihapus',
    `Cabang ${cabang.nama} (${cabang.kode}) dihapus oleh ${user.nama}. ${totalKaryawan} karyawan dan ${totalGaji} record gaji ikut dihapus.`,
    'cabang'
  );

  res.json({ success: true, message: `Cabang ${cabang.nama} berhasil dihapus`, deleted: { karyawan: totalKaryawan, gaji: totalGaji } });
});

module.exports = router;
