const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const { generateBlobSasUrl } = require('../utils/sas');

// Simple write-auth middleware (optional in dev)
function requireApiKey(req, res, next) {
  const key = process.env.API_KEY;
  if (!key) return next();
  const provided = req.header('x-api-key');
  if (provided && provided === key) return next();
  return res.status(401).json({ ok: false, code: 'unauthorized' });
}

// GET /api/donations?pantryId=...&page=1&pageSize=20
router.get('/', async (req, res) => {
  try {
    const { pantryId, page = 1, pageSize = 20 } = req.query;
    const limit = Math.min(parseInt(pageSize, 10) || 20, 100);
    const offset = ((parseInt(page, 10) || 1) - 1) * limit;
    let rows;
    if (pantryId) {
      rows = await allQuery('SELECT * FROM donations WHERE pantry_id = ? ORDER BY time DESC LIMIT ? OFFSET ?', [pantryId, limit, offset]);
    } else {
      rows = await allQuery('SELECT * FROM donations ORDER BY time DESC LIMIT ? OFFSET ?', [limit, offset]);
    }
    const items = rows.map(r => ({
      id: r.id,
      pantryId: r.pantry_id,
      items: typeof r.items === 'object' ? r.items : (r.items ? JSON.parse(r.items) : []),
      time: r.time,
      photoUrls: typeof r.photo_urls === 'object' ? r.photo_urls : (r.photo_urls ? JSON.parse(r.photo_urls) : []),
      note: r.note,
      donorName: r.donor_name,
    }));
    res.json({ ok: true, items });
  } catch (err) {
    console.error('Error listing donations:', err);
    res.status(500).json({ ok: false, code: 'server_error', message: err.message });
  }
});

// POST /api/donations  { pantryId, items[], time?, photoUrls[], note, donorName }
router.post('/', requireApiKey, async (req, res) => {
  try {
    const { pantryId, items = [], time = new Date().toISOString(), photoUrls = [], note = '', donorName = '' } = req.body;
    await runQuery(
      'INSERT INTO donations (pantry_id, items, time, photo_urls, note, donor_name) VALUES (?, ?, ?, ?, ?, ?)',
      [pantryId, JSON.stringify(items), time, JSON.stringify(photoUrls), note, donorName]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Error creating donation:', err);
    res.status(500).json({ ok: false, code: 'server_error', message: err.message });
  }
});

// POST /api/donations/sas  { fileName? , contentType? }
router.post('/sas', requireApiKey, async (req, res) => {
  try {
    const { fileName = `${uuidv4()}.jpg`, contentType = 'image/jpeg' } = req.body || {};
    const { uploadUrl, publicUrl } = await generateBlobSasUrl('images', fileName, contentType, 15);
    res.json({ ok: true, uploadUrl, publicUrl, expiresInMinutes: 15 });
  } catch (err) {
    console.error('Error generating SAS:', err);
    res.status(500).json({ ok: false, code: 'server_error', message: err.message });
  }
});

module.exports = router;





