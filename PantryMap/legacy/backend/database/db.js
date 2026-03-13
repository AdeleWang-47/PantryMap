// Database adapter - supports both SQLite (local) and PostgreSQL (production)
const DB_TYPE = process.env.DB_TYPE || (process.env.DATABASE_URL ? 'postgres' : 'sqlite');

let dbModule;

if (DB_TYPE === 'postgres') {
  console.log('📊 Using PostgreSQL database');
  dbModule = require('./db-pg');
} else {
  console.log('📊 Using SQLite database');
  dbModule = require('./db-sqlite');
}

module.exports = dbModule;
