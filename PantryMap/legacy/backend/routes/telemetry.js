const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../database/db');
const fs = require('fs');
const path = require('path');

function requireApiKey(req, res, next) {
  const key = process.env.API_KEY;
  if (!key) return next();
  const provided = req.header('x-api-key');
  if (provided && provided === key) return next();
  return res.status(401).json({ ok: false, code: 'unauthorized' });
}

// POST /api/telemetry
// { deviceId, pantryId, ts, metrics, flags, schemaVer }
router.post('/', requireApiKey, async (req, res) => {
  try {
    const { deviceId, pantryId, ts, metrics = {}, flags = {}, schemaVer = 1 } = req.body || {};
    if (!pantryId || !ts) return res.status(400).json({ ok: false, code: 'bad_request' });
    await runQuery(
      'INSERT INTO telemetry (pantry_id, device_id, ts, metrics, flags, schema_ver) VALUES (?, ?, ?, ?, ?, ?)',
      [pantryId, deviceId || null, ts, JSON.stringify(metrics), JSON.stringify(flags), schemaVer]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Error writing telemetry:', err);
    res.status(500).json({ ok: false, code: 'server_error', message: err.message });
  }
});

// GET /api/telemetry?pantryId=...&latest=true
// GET /api/telemetry?pantryId=...&from=...&to=...
router.get('/', async (req, res) => {
  try {
    const { pantryId, latest, from, to } = req.query;
    if (!pantryId) return res.status(400).json({ ok: false, code: 'bad_request' });

    if (latest === 'true') {
      const row = await getQuery(
        'SELECT * FROM telemetry WHERE pantry_id = ? ORDER BY ts DESC LIMIT 1',
        [pantryId]
      );
      const data = row ? {
        id: row.id,
        pantryId: row.pantry_id,
        deviceId: row.device_id,
        ts: row.ts,
        metrics: row.metrics ? JSON.parse(row.metrics) : {},
        flags: row.flags ? JSON.parse(row.flags) : {},
        schemaVer: row.schema_ver
      } : null;
      return res.json({ ok: true, latest: data });
    }

    const params = [pantryId];
    let sql = 'SELECT * FROM telemetry WHERE pantry_id = ?';
    if (from) { sql += ' AND ts >= ?'; params.push(from); }
    if (to) { sql += ' AND ts <= ?'; params.push(to); }
    sql += ' ORDER BY ts DESC LIMIT 500';
    const rows = await allQuery(sql, params);
    const items = rows.map(r => ({
      id: r.id,
      pantryId: r.pantry_id,
      deviceId: r.device_id,
      ts: r.ts,
      metrics: r.metrics ? JSON.parse(r.metrics) : {},
      flags: r.flags ? JSON.parse(r.flags) : {},
      schemaVer: r.schema_ver
    }));
    res.json({ ok: true, items });
  } catch (err) {
    console.error('Error querying telemetry:', err);
    res.status(500).json({ ok: false, code: 'server_error', message: err.message });
  }
});

module.exports = router;

// ---- Test helpers: read CSV from backend/test-data/ ----
function readCsvRows(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  // simple CSV: ts,value or ts,event
  const header = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(l => {
    const cols = l.split(',');
    const row = {};
    header.forEach((h, i) => row[h] = cols[i]);
    return row;
  });
}

router.get('/test/door', (req, res) => {
  try {
    const p = path.join(__dirname, '..', 'test-data', 'door.csv');
    if (!fs.existsSync(p)) return res.status(404).json({ ok: false, code: 'not_found' });
    const rows = readCsvRows(p);
    res.json({ ok: true, items: rows });
  } catch (e) {
    res.status(500).json({ ok: false, code: 'server_error', message: e.message });
  }
});

router.get('/test/weight', (req, res) => {
  try {
    const p = path.join(__dirname, '..', 'test-data', 'weight.csv');
    if (!fs.existsSync(p)) return res.status(404).json({ ok: false, code: 'not_found' });
    const rows = readCsvRows(p);
    res.json({ ok: true, items: rows });
  } catch (e) {
    res.status(500).json({ ok: false, code: 'server_error', message: e.message });
  }
});

// Import CSV into telemetry for a pantry
// Supports: pantryId=p-260 OR pantryName="Rainbow Pantry - University Heights Center"
router.post('/import-csv', requireApiKey, async (req, res) => {
  try {
    let { pantryId, pantryName, source } = req.query; // source: door|weight
    if (!source) return res.status(400).json({ ok: false, code: 'bad_request', message: 'Missing source parameter (door|weight)' });
    
    // If pantryName provided, lookup pantryId
    if (pantryName && !pantryId) {
      const pantry = await getQuery('SELECT id FROM pantries WHERE name LIKE ? LIMIT 1', [`%${pantryName}%`]);
      if (!pantry) {
        return res.status(404).json({ ok: false, code: 'not_found', message: `Pantry not found: ${pantryName}` });
      }
      pantryId = pantry.id;
    }
    
    if (!pantryId) return res.status(400).json({ ok: false, code: 'bad_request', message: 'Missing pantryId or pantryName' });
    
    const filename = source === 'door' ? 'door.csv' : 'weight.csv';
    const p = path.join(__dirname, '..', 'test-data', filename);
    if (!fs.existsSync(p)) return res.status(404).json({ ok: false, code: 'not_found', message: `CSV file not found: ${filename}` });
    
    const rows = readCsvRows(p);
    if (rows.length === 0) {
      return res.json({ ok: true, imported: 0, message: 'No data rows in CSV' });
    }
    
    let imported = 0;
    let errors = 0;
    
    for (const r of rows) {
      try {
        const ts = r.time_utc || r.ts || r.time || r.timestamp || r.date || r.datetime;
        if (!ts) {
          errors++;
          continue;
        }
        
        let metrics = {};
        if (source === 'weight') {
          // Support weight_gr (grams) and convert to kg
          const weightGr = r.weight_gr || r.weight_grams;
          const weightKg = r.weightKg || r.weight_kg || r.weight;
          if (weightGr !== undefined && weightGr !== '') {
            metrics = { weightKg: Number(weightGr) / 1000 }; // Convert grams to kg
          } else if (weightKg !== undefined && weightKg !== '') {
            metrics = { weightKg: Number(weightKg) || 0 };
          } else {
            metrics = { weightKg: 0 };
          }
        }
        
        let flags = {};
        if (source === 'door') {
          // Support value column (e.g., "Door 1 OPEN") or event/state columns
          const event = r.value || r.event || r.state || r.status || r.door || '';
          const eventStr = String(event);
          const normalized = eventStr.includes('OPEN') ? 'open' : (eventStr.includes('CLOSED') ? 'closed' : eventStr.toLowerCase());
          flags = { door: normalized };
        }
        
        await runQuery(
          'INSERT INTO telemetry (pantry_id, device_id, ts, metrics, flags, schema_ver) VALUES (?, ?, ?, ?, ?, ?)',
          [pantryId, null, ts, JSON.stringify(metrics), JSON.stringify(flags), 1]
        );
        imported++;
      } catch (rowErr) {
        errors++;
        console.error(`Error importing row:`, rowErr);
      }
    }
    
    res.json({ ok: true, imported, errors, pantryId });
  } catch (e) {
    res.status(500).json({ ok: false, code: 'server_error', message: e.message });
  }
});


