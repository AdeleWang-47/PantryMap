const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'pantrymap.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Pantries table
    db.run(`
      CREATE TABLE IF NOT EXISTS pantries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        address TEXT,
        latitude REAL,
        longitude REAL,
        pantry_type TEXT DEFAULT 'shelf',
        accepted_food_types TEXT,
        hours TEXT,
        photos TEXT,
        contact_owner TEXT,
        contact_phone TEXT,
        contact_manager TEXT,
        contact_volunteer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventory table (one-to-many with pantries)
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pantry_id TEXT NOT NULL,
        category_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);

    // Sensors table (one-to-one with pantries)
    db.run(`
      CREATE TABLE IF NOT EXISTS sensors (
        pantry_id TEXT PRIMARY KEY,
        weight_kg REAL DEFAULT 0,
        last_door_event TEXT,
        food_condition TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);

    // Stats table (one-to-one with pantries)
    db.run(`
      CREATE TABLE IF NOT EXISTS stats (
        pantry_id TEXT PRIMARY KEY,
        visits_per_day INTEGER DEFAULT 0,
        visits_per_week INTEGER DEFAULT 0,
        donation_avg_per_day_kg REAL DEFAULT 0,
        donation_avg_per_week_kg REAL DEFAULT 0,
        popular_times TEXT,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);

    // Wishlist table (one-to-many with pantries)
    db.run(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pantry_id TEXT NOT NULL,
        item TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);
    db.run(`ALTER TABLE wishlist ADD COLUMN quantity INTEGER DEFAULT 1`, (err) => {
      if (err && !/duplicate column/i.test(err.message)) console.error(err);
    });
    db.run(`ALTER TABLE wishlist ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
      if (err && !/duplicate column/i.test(err.message)) console.error(err);
    });

    // Messages table (many-to-one with pantries)
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pantry_id TEXT NOT NULL,
        type TEXT DEFAULT 'note',
        user_name TEXT,
        user_avatar TEXT,
        content TEXT NOT NULL,
        photos TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_pantries_location ON pantries(latitude, longitude)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_pantries_status ON pantries(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_messages_pantry ON messages(pantry_id)`);

    // Donations
    db.run(`
      CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pantry_id TEXT NOT NULL,
        items TEXT,
        time DATETIME DEFAULT CURRENT_TIMESTAMP,
        photo_urls TEXT,
        note TEXT,
        donor_name TEXT,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_donations_pantry_time ON donations(pantry_id, time DESC)`);

    // Telemetry
    db.run(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pantry_id TEXT NOT NULL,
        device_id TEXT,
        ts DATETIME NOT NULL,
        metrics TEXT,
        flags TEXT,
        schema_ver INTEGER DEFAULT 1,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_telemetry_pantry_ts ON telemetry(pantry_id, ts DESC)`);
  });
}

// Helper function to run queries with promises
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery
};


