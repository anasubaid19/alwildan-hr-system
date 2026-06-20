const express      = require('express')
const { createNotif } = require('./notifications');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'alwildan-hr-secret-2026';

// Proteksi brute force: maks 10 percobaan login per IP tiap 15 menit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user)
    return res.status(401).json({ success: false, message: 'Email tidak ditemukan' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid)
    return res.status(401).json({ success: false, message: 'Password salah' });

  const token = jwt.sign(
    { id: user.id, email: user.email, nama: user.nama, inisial: user.inisial, role: user.role || 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const now = new Date().toLocaleString('id-ID', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})
  createNotif('login', user.nama + ' masuk ke sistem', 'Login pada ' + now, null)
  res.json({
    success: true,
    token,
    user: { id: user.id, nama: user.nama, email: user.email, inisial: user.inisial, avatar: user.avatar||null, role: user.role || 'admin' }
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token tidak ada' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch {
    res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
});

// GET /api/auth/setup-status — cek apakah sudah ada user (public)
router.get('/setup-status', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  res.json({ needsSetup: count === 0 });
});

// POST /api/auth/setup — buat Super Admin pertama (hanya jika belum ada user)
router.post('/setup', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0)
    return res.status(403).json({ success: false, message: 'Setup sudah dilakukan' });

  const { nama, email, password } = req.body;
  if (!nama || !email || !password)
    return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing)
    return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });

  const hashed = bcrypt.hashSync(password, 10);
  const inisial = nama.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const result = db.prepare(
    "INSERT INTO users (nama, email, password, inisial, role) VALUES (?, ?, ?, ?, 'superadmin')"
  ).run(nama, email, hashed, inisial);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, nama, inisial, role: 'superadmin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ success: true, token, user: { id: result.lastInsertRowid, nama, email, inisial, role: 'superadmin' } });
});

// POST /api/auth/signup — signup dengan invite key
router.post('/signup', (req, res) => {
  const { nama, email, password, invite_key } = req.body;
  if (!nama || !email || !password || !invite_key)
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });

  const key = db.prepare('SELECT * FROM invite_keys WHERE key = ?').get(invite_key);
  if (!key)
    return res.status(400).json({ success: false, message: 'Invite key tidak valid' });
  if (key.used_at)
    return res.status(400).json({ success: false, message: 'Invite key sudah digunakan' });
  if (key.expired_at && new Date(key.expired_at) < new Date())
    return res.status(400).json({ success: false, message: 'Invite key sudah kadaluarsa' });
  if (key.email.toLowerCase() !== email.toLowerCase())
    return res.status(400).json({ success: false, message: 'Email tidak sesuai dengan invite key' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing)
    return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });

  const hashed = bcrypt.hashSync(password, 10);
  const inisial = nama.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const result = db.prepare(
    'INSERT INTO users (nama, email, password, inisial, role) VALUES (?, ?, ?, ?, ?)'
  ).run(nama, email, hashed, inisial, key.role);

  db.prepare("UPDATE invite_keys SET used_at = datetime('now') WHERE id = ?").run(key.id);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, nama, inisial, role: key.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ success: true, token, user: { id: result.lastInsertRowid, nama, email, inisial, role: key.role } });
});

// POST /api/auth/forgot-password — minta token reset password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ success: false, message: 'Email wajib diisi' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Selalu balas sukses generik untuk mencegah email enumeration
  const genericResponse = { success: true, message: 'Jika email terdaftar, link reset password telah dibuat.' };

  if (!user)
    return res.json(genericResponse);

  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 jam

  db.prepare(
    'INSERT INTO reset_tokens (user_id, token, expired_at) VALUES (?, ?, ?)'
  ).run(user.id, token, expiredAt);

  // Tidak ada mailer: log token ke console (MVP). Di production, kirim via email.
  console.log(`Reset password untuk ${email}: token=${token} (expired ${expiredAt})`);

  // Sistem internal HR tanpa mailer — kembalikan token agar user bisa lanjut reset.
  res.json({ ...genericResponse, resetToken: token, expired_at: expiredAt });
});

// POST /api/auth/reset-password/:token — reset password pakai token
router.post('/reset-password/:token', (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password)
    return res.status(400).json({ success: false, message: 'Password baru wajib diisi' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });

  const row = db.prepare('SELECT * FROM reset_tokens WHERE token = ?').get(token);
  if (!row)
    return res.status(400).json({ success: false, message: 'Token tidak valid' });
  if (row.used_at)
    return res.status(400).json({ success: false, message: 'Token sudah digunakan' });
  if (new Date(row.expired_at) < new Date())
    return res.status(400).json({ success: false, message: 'Token sudah kadaluarsa' });

  const hashed = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, row.user_id);
  db.prepare("UPDATE reset_tokens SET used_at = datetime('now') WHERE id = ?").run(row.id);

  res.json({ success: true, message: 'Password berhasil direset. Silakan login dengan password baru.' });
});

// POST /api/auth/invite — Super Admin generate invite key
router.post('/invite', require('../middleware/auth'), (req, res) => {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ success: false, message: 'Hanya Super Admin yang bisa generate invite key' });

  const { email, role } = req.body;
  if (!email || !role)
    return res.status(400).json({ success: false, message: 'Email dan role wajib diisi' });
  if (!['admin', 'pegawai'].includes(role))
    return res.status(400).json({ success: false, message: 'Role tidak valid' });

  const crypto = require('crypto');
  const key = 'AW-' + crypto.randomBytes(12).toString('hex').toUpperCase();
  const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO invite_keys (key, email, role, created_by, expired_at) VALUES (?, ?, ?, ?, ?)'
  ).run(key, email.toLowerCase(), role, req.user.id, expiredAt);

  res.json({ success: true, key, email, role, expired_at: expiredAt });
});

// GET /api/auth/users — daftar semua user (Super Admin only)
router.get('/users', require('../middleware/auth'), (req, res) => {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ success: false, message: 'Hanya Super Admin yang bisa melihat daftar user' });

  const users = db.prepare('SELECT id, nama, email, inisial, role, created_at FROM users ORDER BY id ASC').all();
  res.json({ success: true, data: users });
});

// GET /api/auth/invites — daftar invite key (Super Admin only)
router.get('/invites', require('../middleware/auth'), (req, res) => {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ success: false, message: 'Hanya Super Admin yang bisa melihat invite key' });

  const keys = db.prepare(`
    SELECT ik.*, u.nama as created_by_nama
    FROM invite_keys ik
    LEFT JOIN users u ON u.id = ik.created_by
    ORDER BY ik.created_at DESC
  `).all();
  res.json({ success: true, data: keys });
});

// GET profile
router.get('/profile', require('../middleware/auth'), (req, res) => {
  const user = db.prepare('SELECT id, nama, email, inisial, avatar, role FROM users WHERE id = ?').get(req.user.id)
  res.json({ success:true, data: user })
})

// PUT profile (update nama + avatar)
router.put('/profile', require('../middleware/auth'), (req, res) => {
  const { nama, avatar } = req.body
  db.prepare('UPDATE users SET nama = ?, avatar = ? WHERE id = ?').run(nama, avatar||null, req.user.id)
  const updated = db.prepare('SELECT id, nama, email, inisial, avatar, role FROM users WHERE id = ?').get(req.user.id)
  res.json({ success:true, data: updated })
})

// Ganti password
router.post('/change-password', require('../middleware/auth'), (req, res) => {
  const { password_lama, password_baru } = req.body
  if (!password_lama || !password_baru)
    return res.status(400).json({ success:false, message:'Semua field wajib diisi' })
  if (password_baru.length < 6)
    return res.status(400).json({ success:false, message:'Password minimal 6 karakter' })

  const bcrypt = require('bcryptjs')
  const db     = require('../models/database')
  const user   = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ success:false, message:'User tidak ditemukan' })

  const valid = bcrypt.compareSync(password_lama, user.password)
  if (!valid) return res.status(400).json({ success:false, message:'Password lama tidak sesuai' })

  const hashed = bcrypt.hashSync(password_baru, 10)
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id)
  res.json({ success:true, message:'Password berhasil diubah' })
})

// POST — verifikasi password tanpa mengubahnya (untuk konfirmasi aksi kritis)
router.post('/verify-password', require('../middleware/auth'), (req, res) => {
  const { password } = req.body
  if (!password) return res.status(400).json({ success:false, message:'Password wajib diisi' })
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ success:false, message:'User tidak ditemukan' })
  const valid = bcrypt.compareSync(password, user.password)
  if (!valid) return res.status(401).json({ success:false, message:'Password tidak sesuai' })
  res.json({ success:true })
})

module.exports = router;
