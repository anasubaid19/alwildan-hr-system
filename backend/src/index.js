const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pino = require('pino')
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

if (!process.env.JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET tidak diset di environment')
  process.exit(1)
}

const app = express();
const PORT = process.env.PORT || 3010;
const auth = require('./middleware/auth');

app.use(require('pino-http')({ logger }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',') : false }));
app.use(express.json());

// Di belakang nginx (Docker): percayai 1 proxy hop agar rate limiter melihat IP client asli
app.set('trust proxy', 1);

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/settings', auth, require('./routes/settings'));
app.use('/api/cabang',   auth, require('./routes/cabang'));
app.use('/api/karyawan', auth, require('./routes/karyawan'));
app.use('/api/gaji',     auth, require('./routes/gaji'));
app.use('/api/upload',   auth, require('./routes/upload'));
app.use('/api/master',   auth, require('./routes/masterData'));
app.use('/api/search',        auth, require('./routes/search'));
app.use('/api/notifications', auth, require('./routes/notifications'));
app.use('/api/laporan',  auth, require('./routes/laporan'));

app.get('/api/health', (req, res) => {
  res.json({ status:'ok', message:'AL-WILDAN HR System Running' });
});

app.use((err, req, res, next) => {
  (req.log || logger).error(err, 'Unhandled error')
  res.status(500).json({ success: false, message: 'Terjadi kesalahan server' })
})

app.listen(PORT, () => logger.info(`Backend running on http://localhost:${PORT}`));
