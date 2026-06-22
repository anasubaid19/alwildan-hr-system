const express = require('express')
const router  = express.Router()
const db      = require('../models/database')
const pino    = require('pino')
const logger  = pino({ level: process.env.LOG_LEVEL || 'info' })

// Buat tabel
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    link_page  TEXT,
    is_read    INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// GET semua notifikasi
router.get('/', (req, res) => {
  const notifs = db.prepare(`
    SELECT * FROM notifications
    ORDER BY created_at DESC LIMIT 30
  `).all()
  const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get()
  res.json({ success:true, data: notifs, unread: unread.count })
})

// PUT — mark as read
router.put('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id)
  res.json({ success:true })
})

// PUT — mark all as read
router.put('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1').run()
  res.json({ success:true })
})

// DELETE — hapus satu notifikasi
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id)
  res.json({ success:true })
})

// DELETE — hapus semua yang sudah dibaca
router.delete('/clear/read', (req, res) => {
  db.prepare('DELETE FROM notifications WHERE is_read = 1').run()
  res.json({ success:true })
})

// DELETE — hapus semua notifikasi
router.delete('/clear/all', (req, res) => {
  db.prepare('DELETE FROM notifications').run()
  res.json({ success:true })
})

// Helper untuk buat notifikasi (dipakai route lain)
const createNotif = (type, title, message, link_page=null) => {
  try {
    db.prepare(`
      INSERT INTO notifications (type, title, message, link_page)
      VALUES (?, ?, ?, ?)
    `).run(type, title, message, link_page)
  } catch(e) { logger.error('Notif error: ' + e.message) }
}

module.exports = router
module.exports.createNotif = createNotif
