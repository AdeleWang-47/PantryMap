const express = require('express');
const router = express.Router();
const { allQuery, runQuery, getQuery } = require('../database/db');

const DB_TYPE = process.env.DB_TYPE || (process.env.DATABASE_URL ? 'postgres' : 'sqlite');
const IS_POSTGRES = DB_TYPE === 'postgres';

function requireApiKey(req, res, next) {
  const key = process.env.API_KEY;
  if (!key) return next();
  const provided = req.header('x-api-key');
  if (provided && provided === key) return next();
  return res.status(401).json({ ok: false, code: 'unauthorized' });
}

function buildWishlistQuery(pantryId) {
  if (IS_POSTGRES) {
    return {
      sql: `SELECT id, item, quantity, created_at
            FROM wishlist
            WHERE pantry_id = $1
              AND created_at >= NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC`,
      params: [pantryId]
    };
  }
  return {
    sql: `SELECT id, item, quantity, created_at
          FROM wishlist
          WHERE pantry_id = ?
            AND datetime(created_at) >= datetime('now', '-7 days')
          ORDER BY datetime(created_at) DESC`,
    params: [pantryId]
  };
}

// GET /api/wishlist?pantryId=...
router.get('/', async (req, res) => {
  try {
    const { pantryId } = req.query;
    if (!pantryId) {
      return res.status(400).json({ ok: false, code: 'bad_request', message: 'Missing pantryId' });
    }
    const { sql, params } = buildWishlistQuery(pantryId);
    const rows = await allQuery(sql, params);
    const items = rows.map(r => ({
      id: r.id,
      item: r.item,
      quantity: r.quantity || 1,
      createdAt: r.created_at
    }));
    res.json({ ok: true, items });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ ok: false, code: 'server_error', message: error.message });
  }
});

// POST /api/wishlist
router.post('/', requireApiKey, async (req, res) => {
  try {
    const { pantryId, item, quantity = 1 } = req.body || {};
    if (!pantryId || !item) {
      return res.status(400).json({ ok: false, code: 'bad_request', message: 'Missing pantryId or item' });
    }
    const qtyNumber = Number(quantity);
    const qty = Number.isFinite(qtyNumber) && qtyNumber > 0 ? Math.round(qtyNumber) : 1;
    let newlyCreated;

    if (IS_POSTGRES) {
      newlyCreated = await getQuery(
        'INSERT INTO wishlist (pantry_id, item, quantity) VALUES ($1, $2, $3) RETURNING id, item, quantity, created_at',
        [pantryId, item.trim(), qty]
      );
    } else {
      const result = await runQuery(
        'INSERT INTO wishlist (pantry_id, item, quantity) VALUES (?, ?, ?)',
        [pantryId, item.trim(), qty]
      );
      newlyCreated = result?.id
        ? await getQuery('SELECT id, item, quantity, created_at FROM wishlist WHERE id = ?', [result.id])
        : null;
    }

    if (!newlyCreated) {
      return res.status(500).json({ ok: false, code: 'server_error', message: 'Failed to insert wishlist item' });
    }

    res.status(201).json({
      ok: true,
      item: {
        id: newlyCreated.id,
        item: newlyCreated.item,
        quantity: newlyCreated.quantity || 1,
        createdAt: newlyCreated.created_at
      }
    });
  } catch (error) {
    console.error('Error creating wishlist item:', error);
    res.status(500).json({ ok: false, code: 'server_error', message: error.message });
  }
});

module.exports = router;

