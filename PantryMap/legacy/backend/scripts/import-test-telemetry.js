#!/usr/bin/env node

/**
 * Import test CSV telemetry data for "Rainbow Pantry - University Heights Center" (p-260)
 * 
 * Usage:
 *   node scripts/import-test-telemetry.js
 *   node scripts/import-test-telemetry.js --pantry-id p-260
 */

const fs = require('fs');
const path = require('path');
const { getQuery, runQuery } = require('../database/db');

const TEST_PANTRY_ID = 'p-260'; // Rainbow Pantry - University Heights Center
const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data');

function readCsvRows(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    console.warn(`⚠️  CSV file has no data rows: ${filePath}`);
    return [];
  }
  
  const header = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map((l, idx) => {
    const cols = l.split(',').map(c => c.trim());
    const row = {};
    header.forEach((h, i) => {
      row[h] = cols[i] || '';
    });
    row._rowIndex = idx + 2; // For error reporting
    return row;
  });
}

async function importTelemetry(pantryId, source, filePath) {
  console.log(`\n📊 Importing ${source} data from ${path.basename(filePath)}...`);
  const rows = readCsvRows(filePath);
  if (rows.length === 0) {
    console.log(`   ⚠️  No data to import`);
    return 0;
  }
  
  console.log(`   Found ${rows.length} rows`);
  
  let imported = 0;
  let errors = 0;
  
  for (const row of rows) {
    try {
      // Parse timestamp - try common column names (including time_utc)
      const ts = row.time_utc || row.ts || row.time || row.timestamp || row.date || row.datetime;
      if (!ts) {
        console.warn(`   ⚠️  Row ${row._rowIndex}: Missing timestamp, skipping`);
        errors++;
        continue;
      }
      
      // Parse value/event
      let metrics = {};
      let flags = {};
      
      if (source === 'weight') {
        // Support weight_gr (grams) and convert to kg, or use weightKg/weight directly
        const weightGr = row.weight_gr || row.weight_grams;
        const weightKg = row.weightKg || row.weight_kg || row.weight;
        if (weightGr !== undefined && weightGr !== '') {
          metrics = { weightKg: Number(weightGr) / 1000 }; // Convert grams to kg
        } else if (weightKg !== undefined && weightKg !== '') {
          metrics = { weightKg: Number(weightKg) || 0 };
        } else {
          metrics = { weightKg: 0 };
        }
      } else if (source === 'door') {
        // Support value column (e.g., "Door 1 OPEN") or event/state columns
        const event = row.value || row.event || row.state || row.status || row.door || row.doorEvent;
        // Extract just the OPEN/CLOSED part if value is like "Door 1 OPEN"
        const eventStr = String(event || 'unknown');
        const normalized = eventStr.includes('OPEN') ? 'open' : (eventStr.includes('CLOSED') ? 'closed' : eventStr.toLowerCase());
        flags = { door: normalized };
      }
      
      // Insert into telemetry table
      await runQuery(
        'INSERT INTO telemetry (pantry_id, device_id, ts, metrics, flags, schema_ver) VALUES (?, ?, ?, ?, ?, ?)',
        [pantryId, null, ts, JSON.stringify(metrics), JSON.stringify(flags), 1]
      );
      
      imported++;
    } catch (err) {
      console.error(`   ❌ Row ${row._rowIndex}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`   ✅ Imported: ${imported}, Errors: ${errors}`);
  return imported;
}

async function main() {
  const pantryId = process.argv.includes('--pantry-id') 
    ? process.argv[process.argv.indexOf('--pantry-id') + 1]
    : TEST_PANTRY_ID;
  
  console.log(`🚀 Importing test telemetry data for pantry: ${pantryId}`);
  console.log(`📁 Test data directory: ${TEST_DATA_DIR}`);
  
  // Verify pantry exists
  try {
    const pantry = await getQuery('SELECT id, name FROM pantries WHERE id = ?', [pantryId]);
    if (!pantry) {
      console.error(`❌ Pantry ${pantryId} not found in database`);
      process.exit(1);
    }
    console.log(`✅ Found pantry: ${pantry.name} (${pantryId})`);
  } catch (err) {
    console.error(`❌ Error checking pantry: ${err.message}`);
    process.exit(1);
  }
  
  // Import door.csv if exists
  const doorPath = path.join(TEST_DATA_DIR, 'door.csv');
  const weightPath = path.join(TEST_DATA_DIR, 'weight.csv');
  
  let totalImported = 0;
  
  if (fs.existsSync(doorPath)) {
    totalImported += await importTelemetry(pantryId, 'door', doorPath);
  } else {
    console.log(`\n⚠️  door.csv not found at ${doorPath}`);
  }
  
  if (fs.existsSync(weightPath)) {
    totalImported += await importTelemetry(pantryId, 'weight', weightPath);
  } else {
    console.log(`\n⚠️  weight.csv not found at ${weightPath}`);
  }
  
  console.log(`\n✨ Import complete! Total records: ${totalImported}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   - Query latest: GET /api/telemetry?pantryId=${pantryId}&latest=true`);
  console.log(`   - Query history: GET /api/telemetry?pantryId=${pantryId}&from=...&to=...`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

