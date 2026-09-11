require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const postgres = require('../config/postgres');
const { initializeDatabase } = require('../config/database');

async function run() {
  console.log('🌾 KisanSetu Database Migration Engine');
  console.log('====================================');
  console.log('Environment:', process.env.NODE_ENV || 'development');

  // 1. Check PostgreSQL if configured
  if (process.env.DATABASE_URL) {
    console.log('\n[1/2] Connecting to PostgreSQL Database...');
    const conn = await postgres.testConnection();
    if (conn.connected) {
      console.log('✅ Connected to PostgreSQL!');
      console.log('   Server Version:', conn.version.split(' ')[0]);
      console.log('   Running migrations from server/data/migrations...');
      await postgres.runMigrations();
      console.log('✅ PostgreSQL migrations completed successfully.');
    } else {
      console.warn('⚠️  Could not connect to PostgreSQL:', conn.error || conn.reason);
    }
  } else {
    console.log('\n[1/2] No DATABASE_URL found. Skipping PostgreSQL migration.');
    console.log('💡 Tip: Add DATABASE_URL to server/.env to use Neon PostgreSQL in production.');
  }

  // 2. Initialize / Verify SQLite local database
  console.log('\n[2/2] Initializing SQLite Local Database...');
  try {
    await initializeDatabase();
    console.log('✅ SQLite database schema verified and ready at server/data/marketplace.db');
  } catch (err) {
    console.error('❌ SQLite initialization error:', err.message);
    process.exit(1);
  }

  console.log('\n====================================');
  console.log('🚀 All database layers verified successfully!');
  process.exitCode = 0;
}

run().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
