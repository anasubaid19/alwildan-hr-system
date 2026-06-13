const express = require('express');
const router = express.Router();
const db = require('../models/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const defaults = [
  { key: 'ai_provider', value: 'groq' },
  { key: 'ai_base_url', value: 'https://api.groq.com/openai/v1' },
  { key: 'ai_api_key',  value: '' },
  { key: 'ai_model',    value: '' },
];
const upsert = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
defaults.forEach(d => upsert.run(d.key, d.value));

const get = (key) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || '';

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const data = {};
  rows.forEach(r => {
    data[r.key] = r.key === 'ai_api_key' ? (r.value ? '••••••••' : '') : r.value;
  });
  res.json({ success: true, data });
});

router.put('/', (req, res) => {
  const allowed = ['ai_provider', 'ai_base_url', 'ai_api_key', 'ai_model'];
  const update = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
  `);
  allowed.forEach(key => {
    if (req.body[key] !== undefined) {
      if (key === 'ai_api_key' && req.body[key] === '••••••••') return;
      update.run(key, req.body[key]);
    }
  });
  res.json({ success: true, message: 'Settings disimpan' });
});

// POST test koneksi — pakai nilai dari body (form)
router.post('/test-ai', async (req, res) => {
  const base_url = req.body.ai_base_url || get('ai_base_url');
  const api_key  = req.body.ai_api_key === '••••••••' ? get('ai_api_key') : (req.body.ai_api_key || get('ai_api_key'));
  const model    = req.body.ai_model || get('ai_model');

  try {
    const response = await fetch(`${base_url}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with one word: OK' }],
        max_tokens: 10
      })
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(400).json({ success: false, message: `Error ${response.status}: ${text.slice(0,150)}` });
    }
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';
    res.json({ success: true, message: `Koneksi berhasil! Model: ${model} → "${reply.trim()}"` });
  } catch (e) {
    res.status(500).json({ success: false, message: `Gagal terhubung: ${e.message}` });
  }
});

// POST fetch models — pakai nilai dari body (form)
router.post('/models', async (req, res) => {
  const base_url = req.body.ai_base_url || get('ai_base_url');
  const api_key  = req.body.ai_api_key === '••••••••' ? get('ai_api_key') : (req.body.ai_api_key || get('ai_api_key'));
  try {
    const response = await fetch(`${base_url}/models`, {
      headers: { 'Authorization': `Bearer ${api_key}` }
    });
    const data = await response.json();
    const models = data.data?.map(m => m.id).sort() || [];
    res.json({ success: true, data: models });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
module.exports.getSettings = get;
