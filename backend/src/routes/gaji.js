const express = require('express');
const router = express.Router();
const db = require('../models/database');
const bcrypt = require('bcryptjs');
const { createNotif } = require('./notifications');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', (req, res) => {
  const { periode, cabang_id } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (periode) { where += ' AND g.periode = ?'; params.push(periode); }
  if (cabang_id) { where += ' AND g.paying_cabang_id = ?'; params.push(cabang_id); }

  const paginate = req.query.page !== undefined || req.query.limit !== undefined;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const total = db.prepare(`
    SELECT COUNT(*) as c
    FROM gaji g
    JOIN karyawan k ON g.karyawan_id = k.id
    ${where}
  `).get(...params).c;

  let query = `
    SELECT g.*, k.nama, k.nu, k.jabatan, k.no_acc,
           c.nama as nama_cabang, c.kode as kode_cabang,
           cp.nama as nama_paying_cabang, cp.kode as kode_paying_cabang
    FROM gaji g
    JOIN karyawan k ON g.karyawan_id = k.id
    LEFT JOIN cabang c ON k.cabang_id = c.id
    LEFT JOIN cabang cp ON g.paying_cabang_id = cp.id
    ${where}
    ORDER BY cp.kode, k.nu
  `;
  const dataParams = [...params];
  if (paginate) { query += ' LIMIT ? OFFSET ?'; dataParams.push(limit, offset); }

  res.json({
    success: true,
    data: db.prepare(query).all(...dataParams),
    pagination: {
      page: paginate ? page : 1,
      limit: paginate ? limit : total,
      total,
      totalPages: paginate ? Math.ceil(total / limit) : 1,
    },
  });
});

router.get('/summary', (req, res) => {
  const { periode, tahun, cabang_id } = req.query;
  const params = [];
  let whereClause = 'WHERE 1=1';

  if (periode) {
    whereClause += ' AND g.periode = ?'; params.push(periode);
  } else if (tahun) {
    whereClause += ' AND g.periode LIKE ?'; params.push(`${tahun}-%`);
  }
  if (cabang_id) {
    whereClause += ' AND g.paying_cabang_id = ?'; params.push(cabang_id);
  }

  const query = `
    SELECT c.kode, c.nama, c.id,
           COUNT(DISTINCT g.karyawan_id) as total_karyawan,
           SUM(g.jumlah_gaji) as total_gaji,
           SUM(g.jml_diterima) as total_diterima
    FROM gaji g
    JOIN cabang c ON g.paying_cabang_id = c.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.kode
  `;
  res.json({ success: true, data: db.prepare(query).all(...params) });
});

router.get('/trend', (req, res) => {
  const { tahun, cabang_id } = req.query;
  const year = tahun || new Date().getFullYear();

  let query = `
    SELECT
      g.periode,
      g.paying_cabang_id,
      c.kode as kode_cabang,
      SUM(g.jumlah_gaji)  AS total_gaji,
      SUM(g.jml_diterima) AS total_diterima,
      COUNT(DISTINCT g.karyawan_id) AS total_karyawan
    FROM gaji g
    LEFT JOIN cabang c ON g.paying_cabang_id = c.id
    WHERE g.periode LIKE ?
  `;
  const params = [year + '-%'];

  if (cabang_id) {
    query += ' AND g.paying_cabang_id = ?';
    params.push(cabang_id);
  }

  query += ' GROUP BY g.periode, g.paying_cabang_id ORDER BY g.periode ASC';

  const rows = db.prepare(query).all(...params);
  res.json({ success: true, data: rows });
});

// Rekap semua pembayaran untuk 1 karyawan lintas cabang
router.get('/karyawan/:id', (req, res) => {
  const karyawanId = req.params.id;

  const karyawan = db.prepare(`
    SELECT k.*, c.nama as nama_cabang, c.kode as kode_cabang
    FROM karyawan k
    LEFT JOIN cabang c ON k.cabang_id = c.id
    WHERE k.id = ?
  `).get(karyawanId);

  if (!karyawan) {
    return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
  }

  const pembayaran = db.prepare(`
    SELECT g.periode, g.jumlah_gaji, g.jml_diterima, g.lembur,
           g.gapok, g.tunjangan_penddk, g.tunjangan_jabatan,
           g.transport, g.bpjs_ks, g.lains,
           g.pot_thr, g.pot_bpjs_tk, g.deposit_itba,
           g.punishment, g.pinjaman,
           c.id as cabang_id, c.nama as nama_cabang, c.kode as kode_cabang
    FROM gaji g
    LEFT JOIN cabang c ON g.paying_cabang_id = c.id
    WHERE g.karyawan_id = ?
    ORDER BY g.periode DESC, c.kode
  `).all(karyawanId);

  const total = pembayaran.reduce((sum, p) => sum + (p.jml_diterima || 0), 0);

  res.json({
    success: true,
    karyawan,
    pembayaran,
    total,
  });
});

// GET /api/gaji/preview-hapus?cabang_id=X&periode=Y — preview jumlah record yang akan dihapus
router.get('/preview-hapus', (req, res) => {
  const { cabang_id, periode } = req.query;
  if (!cabang_id || !periode)
    return res.status(400).json({ success: false, message: 'cabang_id dan periode wajib diisi' });

  const count = db.prepare(
    'SELECT COUNT(*) as c FROM gaji WHERE paying_cabang_id = ? AND periode = ?'
  ).get(cabang_id, periode);

  const cabang = db.prepare('SELECT nama, kode FROM cabang WHERE id = ?').get(cabang_id);

  res.json({ success: true, count: count.c, cabang });
});

// DELETE /api/gaji/periode — hapus semua gaji pada cabang+periode tertentu
router.delete('/periode', asyncHandler(async (req, res) => {
  const { cabang_id, periode, password } = req.body;
  if (!cabang_id || !periode || !password)
    return res.status(400).json({ success: false, message: 'cabang_id, periode, dan password wajib diisi' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ success: false, message: 'Password tidak sesuai' });

  const cabang = db.prepare('SELECT nama, kode FROM cabang WHERE id = ?').get(cabang_id);
  const count = db.prepare(
    'SELECT COUNT(*) as c FROM gaji WHERE paying_cabang_id = ? AND periode = ?'
  ).get(cabang_id, periode).c;

  if (count === 0)
    return res.status(404).json({ success: false, message: 'Tidak ada data gaji untuk cabang dan periode tersebut' });

  db.prepare('DELETE FROM gaji WHERE paying_cabang_id = ? AND periode = ?').run(cabang_id, periode);

  createNotif(
    'delete',
    'Data Gaji Dihapus',
    `${count} record gaji ${cabang?.nama || ''} periode ${periode} dihapus oleh ${user.nama}`,
    'upload'
  );

  res.json({ success: true, message: `${count} record gaji berhasil dihapus`, deleted: count });
}));

module.exports = router;
