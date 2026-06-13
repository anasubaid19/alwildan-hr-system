const express = require('express')
const router  = express.Router()
const db      = require('../models/database')

router.get('/', (req, res) => {
  const { q } = req.query
  if (!q || q.trim().length < 2)
    return res.json({ success:true, data: { karyawan:[], cabang:[] } })

  const keyword = `%${q.trim()}%`

  const karyawan = db.prepare(`
    SELECT k.id, k.nama, k.nu, k.jabatan, k.status,
           c.nama AS nama_cabang, c.kode AS kode_cabang
    FROM karyawan k
    LEFT JOIN cabang c ON k.cabang_id = c.id
    WHERE k.nama LIKE ? OR k.nu LIKE ? OR k.jabatan LIKE ? OR c.nama LIKE ?
    LIMIT 6
  `).all(keyword, keyword, keyword, keyword)

  const cabang = db.prepare(`
    SELECT c.id, c.nama, c.kode,
           COUNT(k.id) AS total_karyawan
    FROM cabang c
    LEFT JOIN karyawan k ON k.cabang_id = c.id
    WHERE c.nama LIKE ? OR c.kode LIKE ?
    GROUP BY c.id
    LIMIT 4
  `).all(keyword, keyword)

  res.json({ success:true, data: { karyawan, cabang } })
})

module.exports = router
