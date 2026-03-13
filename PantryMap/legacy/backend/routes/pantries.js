const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../database/db');

// Helper: Build complete pantry object from database
async function buildPantryObject(pantryRow) {
  const pantryId = pantryRow.id;
  
  // Get related data
  const [inventory, sensors, stats, wishlist] = await Promise.all([
    allQuery('SELECT category_name as name, quantity FROM inventory WHERE pantry_id = ?', [pantryId]),
    getQuery('SELECT * FROM sensors WHERE pantry_id = ?', [pantryId]),
    getQuery('SELECT * FROM stats WHERE pantry_id = ?', [pantryId]),
    allQuery('SELECT item, quantity FROM wishlist WHERE pantry_id = ?', [pantryId])
  ]);

  // Parse JSON fields (handle both PostgreSQL JSONB and SQLite TEXT)
  const parseJson = (field) => {
    if (!field) return null;
    if (typeof field === 'object') return field; // Already parsed (PostgreSQL JSONB)
    try {
      return JSON.parse(field); // SQLite TEXT
    } catch {
      return null;
    }
  };
  
  const acceptedFoodTypes = parseJson(pantryRow.accepted_food_types) || [];
  const hours = parseJson(pantryRow.hours) || {};
  const photos = parseJson(pantryRow.photos) || [];

  return {
    id: pantryRow.id,
    name: pantryRow.name,
    status: pantryRow.status,
    address: pantryRow.address,
    location: {
      lat: pantryRow.latitude,
      lng: pantryRow.longitude
    },
    pantryType: pantryRow.pantry_type,
    acceptedFoodTypes,
    hours,
    photos,
    inventory: {
      categories: inventory.map(i => ({ name: i.name, quantity: i.quantity }))
    },
    sensors: sensors ? {
      weightKg: sensors.weight_kg || sensors.weightKg || 0,
      lastDoorEvent: sensors.last_door_event || sensors.lastDoorEvent || '',
      foodCondition: sensors.food_condition || sensors.foodCondition || '',
      updatedAt: sensors.updated_at || sensors.updatedAt || new Date().toISOString()
    } : {
      weightKg: 0,
      lastDoorEvent: '',
      foodCondition: '',
      updatedAt: new Date().toISOString()
    },
    contact: {
      owner: pantryRow.contact_owner || '',
      phone: pantryRow.contact_phone || '',
      manager: pantryRow.contact_manager || '',
      volunteer: pantryRow.contact_volunteer || ''
    },
    stats: stats ? {
      visitsPerDay: stats.visits_per_day,
      visitsPerWeek: stats.visits_per_week,
      donationAvgPerDayKg: stats.donation_avg_per_day_kg,
      donationAvgPerWeekKg: stats.donation_avg_per_week_kg,
      popularTimes: stats.popular_times ? (typeof stats.popular_times === 'object' ? stats.popular_times : JSON.parse(stats.popular_times)) : []
    } : {
      visitsPerDay: 0,
      visitsPerWeek: 0,
      donationAvgPerDayKg: 0,
      donationAvgPerWeekKg: 0,
      popularTimes: []
    },
    wishlist: wishlist.map(w => w.item),
    latestActivity: null,
    createdAt: pantryRow.created_at,
    updatedAt: pantryRow.updated_at
  };
}

// GET /api/pantries - Get all pantries (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { status, type, bounds, page = 1, pageSize = 100 } = req.query;
    const limit = Math.min(parseInt(pageSize, 10) || 100, 500);
    const offset = ((parseInt(page, 10) || 1) - 1) * limit;
    
    let query = 'SELECT * FROM pantries WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type && type !== 'all') {
      query += ' AND pantry_type = ?';
      params.push(type);
    }

    // Bounds filter (minLat, maxLat, minLng, maxLng)
    if (bounds) {
      const [minLat, maxLat, minLng, maxLng] = bounds.split(',').map(Number);
      if (!isNaN(minLat) && !isNaN(maxLat) && !isNaN(minLng) && !isNaN(maxLng)) {
        query += ' AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?';
        params.push(minLat, maxLat, minLng, maxLng);
      }
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const rows = await allQuery(query, params);
    const pantries = await Promise.all(rows.map(buildPantryObject));
    
    res.json(pantries);
  } catch (error) {
    console.error('Error fetching pantries:', error);
    res.status(500).json({ error: 'Failed to fetch pantries', message: error.message });
  }
});

// GET /api/pantries/:id - Get single pantry by ID
router.get('/:id', async (req, res) => {
  try {
    const pantryRow = await getQuery('SELECT * FROM pantries WHERE id = ?', [req.params.id]);
    
    if (!pantryRow) {
      return res.status(404).json({ error: 'Pantry not found' });
    }

    const pantry = await buildPantryObject(pantryRow);
    res.json(pantry);
  } catch (error) {
    console.error('Error fetching pantry:', error);
    res.status(500).json({ error: 'Failed to fetch pantry', message: error.message });
  }
});

// POST /api/pantries - Create new pantry
router.post('/', async (req, res) => {
  try {
    const {
      id, name, status, address, location, pantryType, acceptedFoodTypes,
      hours, photos, contact
    } = req.body;

    const pantryId = id || `p-${Date.now()}`;

    await runQuery(`
      INSERT INTO pantries (
        id, name, status, address, latitude, longitude, pantry_type,
        accepted_food_types, hours, photos,
        contact_owner, contact_phone, contact_manager, contact_volunteer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pantryId, name, status || 'open', address,
      location?.lat, location?.lng, pantryType || 'shelf',
      JSON.stringify(acceptedFoodTypes || []),
      JSON.stringify(hours || {}),
      JSON.stringify(photos || []),
      contact?.owner || '', contact?.phone || '',
      contact?.manager || '', contact?.volunteer || ''
    ]);

    // Initialize related tables
    await runQuery('INSERT OR IGNORE INTO sensors (pantry_id) VALUES (?)', [pantryId]);
    await runQuery('INSERT OR IGNORE INTO stats (pantry_id) VALUES (?)', [pantryId]);

    const pantry = await buildPantryObject(await getQuery('SELECT * FROM pantries WHERE id = ?', [pantryId]));
    res.status(201).json(pantry);
  } catch (error) {
    console.error('Error creating pantry:', error);
    res.status(500).json({ error: 'Failed to create pantry', message: error.message });
  }
});

// PUT /api/pantries/:id - Update pantry
router.put('/:id', async (req, res) => {
  try {
    const { name, status, address, location, pantryType, acceptedFoodTypes, hours, photos, contact } = req.body;

    await runQuery(`
      UPDATE pantries SET
        name = COALESCE(?, name),
        status = COALESCE(?, status),
        address = COALESCE(?, address),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        pantry_type = COALESCE(?, pantry_type),
        accepted_food_types = COALESCE(?, accepted_food_types),
        hours = COALESCE(?, hours),
        photos = COALESCE(?, photos),
        contact_owner = COALESCE(?, contact_owner),
        contact_phone = COALESCE(?, contact_phone),
        contact_manager = COALESCE(?, contact_manager),
        contact_volunteer = COALESCE(?, contact_volunteer),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name, status, address, location?.lat, location?.lng, pantryType,
      acceptedFoodTypes ? JSON.stringify(acceptedFoodTypes) : null,
      hours ? JSON.stringify(hours) : null,
      photos ? JSON.stringify(photos) : null,
      contact?.owner, contact?.phone, contact?.manager, contact?.volunteer,
      req.params.id
    ]);

    const pantry = await buildPantryObject(await getQuery('SELECT * FROM pantries WHERE id = ?', [req.params.id]));
    res.json(pantry);
  } catch (error) {
    console.error('Error updating pantry:', error);
    res.status(500).json({ error: 'Failed to update pantry', message: error.message });
  }
});

// PUT /api/pantries/:id/inventory - Update inventory
router.put('/:id/inventory', async (req, res) => {
  try {
    const { categories } = req.body;

    // Delete existing inventory
    await runQuery('DELETE FROM inventory WHERE pantry_id = ?', [req.params.id]);

    // Insert new inventory
    for (const cat of categories || []) {
      await runQuery(
        'INSERT INTO inventory (pantry_id, category_name, quantity) VALUES (?, ?, ?)',
        [req.params.id, cat.name, cat.quantity || 0]
      );
    }

    const pantry = await buildPantryObject(await getQuery('SELECT * FROM pantries WHERE id = ?', [req.params.id]));
    res.json(pantry);
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Failed to update inventory', message: error.message });
  }
});

// PUT /api/pantries/:id/sensors - Update sensor data
router.put('/:id/sensors', async (req, res) => {
  try {
    const { weightKg, lastDoorEvent, foodCondition } = req.body;

    await runQuery(`
      INSERT INTO sensors (pantry_id, weight_kg, last_door_event, food_condition, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(pantry_id) DO UPDATE SET
        weight_kg = COALESCE(?, weight_kg),
        last_door_event = COALESCE(?, last_door_event),
        food_condition = COALESCE(?, food_condition),
        updated_at = CURRENT_TIMESTAMP
    `, [req.params.id, weightKg, lastDoorEvent, foodCondition, weightKg, lastDoorEvent, foodCondition]);

    const pantry = await buildPantryObject(await getQuery('SELECT * FROM pantries WHERE id = ?', [req.params.id]));
    res.json(pantry);
  } catch (error) {
    console.error('Error updating sensors:', error);
    res.status(500).json({ error: 'Failed to update sensors', message: error.message });
  }
});

module.exports = router;


