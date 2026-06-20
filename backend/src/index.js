const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3010;
const auth = require('./middleware/auth');

app.use(cors());
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

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
