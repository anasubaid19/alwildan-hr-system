const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET wajib diisi di .env')

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token)
    return res.status(401).json({ success: false, message: 'Akses ditolak, silakan login' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Sesi habis, silakan login kembali' });
  }
};

auth.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Akses ditolak: hak akses tidak cukup' });
  next();
};

module.exports = auth;
