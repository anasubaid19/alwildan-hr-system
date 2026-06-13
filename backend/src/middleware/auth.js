const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'alwildan-hr-secret-2026';

module.exports = (req, res, next) => {
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
