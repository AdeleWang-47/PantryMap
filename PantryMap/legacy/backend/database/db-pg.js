const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    initializeDatabase();
  }
});

// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Pantries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pantries (
        id VARCHAR(50) PRIMARY KEY,
        name TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open',
        address TEXT,
        latitude REAL,
        longitude REAL,
        pantry_type VARCHAR(20) DEFAULT 'shelf',
        accepted_food_types JSONB,
        hours JSONB,
        photos JSONB,
        contact_owner TEXT,
        contact_phone TEXT,
        contact_manager TEXT,
        contact_volunteer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        pantry_id VARCHAR(50) NOT NULL,
        category_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);

    // Sensors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sensors (
        pantry_id VARCHAR(50) PRIMARY KEY,
        weight_kg REAL DEFAULT 0,
        last_door_event TEXT,
        food_condition TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);

    // Stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats (
        pantry_id VARCHAR(50) PRIMARY KEY,
        visits_per_day INTEGER DEFAULT 0,
        visits_per_week INTEGER DEFAULT 0,
        donation_avg_per_day_kg REAL DEFAULT 0,
        donation_avg_per_week_kg REAL DEFAULT 0,
        popular_times JSONB,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);

    // Wishlist table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id SERIAL PRIMARY KEY,
        pantry_id VARCHAR(50) NOT NULL,
        item TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);
    await client.query(`ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);

    // Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        pantry_id VARCHAR(50) NOT NULL,
        type TEXT DEFAULT 'note',
        user_name TEXT,
        user_avatar TEXT,
        content TEXT NOT NULL,
        photos JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_pantries_location ON pantries(latitude, longitude)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pantries_status ON pantries(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_pantry ON messages(pantry_id)');

    // Donations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        pantry_id VARCHAR(50) NOT NULL,
        items JSONB,
        time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        photo_urls JSONB,
        note TEXT,
        donor_name TEXT,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_donations_pantry_time ON donations(pantry_id, time DESC)');

    // Telemetry table
    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id BIGSERIAL PRIMARY KEY,
        pantry_id VARCHAR(50) NOT NULL,
        device_id TEXT,
        ts TIMESTAMP NOT NULL,
        metrics JSONB,
        flags JSONB,
        schema_ver INT DEFAULT 1,
        FOREIGN KEY (pantry_id) REFERENCES pantries(id) ON DELETE CASCADE
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_telemetry_pantry_ts ON telemetry(pantry_id, ts DESC)');

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}

// Helper functions
async function runQuery(query, params = []) {
  const result = await pool.query(query, params);
  // PostgreSQL returns rowCount and rows, not insertId
  // For INSERT, use RETURNING id to get the inserted ID
  const insertedId = result.rows && result.rows[0] && result.rows[0].id 
    ? result.rows[0].id 
    : null;
  return { id: insertedId, changes: result.rowCount || 0 };
}

async function getQuery(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

async function allQuery(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows;
}

// Close pool on shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

module.exports = {
  pool,
  runQuery,
  getQuery,
  allQuery
};


