const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    const isProduction = process.env.NODE_ENV === 'production';
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction || process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 15000,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]:', err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error('PostgreSQL pool not initialized. DATABASE_URL is required.');
  const start = Date.now();
  const res = await p.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[PostgreSQL Executed Query]', { text, duration, rows: res.rowCount });
  }
  return res;
}

async function testConnection() {
  const p = getPool();
  if (!p) return { connected: false, reason: 'No DATABASE_URL provided' };
  try {
    const res = await p.query('SELECT NOW() as server_time, version() as version');
    return {
      connected: true,
      serverTime: res.rows[0].server_time,
      version: res.rows[0].version
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

async function runMigrations() {
  const p = getPool();
  if (!p) {
    console.log('[Migrations] Skipping PostgreSQL migrations: No DATABASE_URL configured.');
    return;
  }

  const client = await p.connect();
  try {
    console.log('[Migrations] Checking migrations table in PostgreSQL...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, '..', 'data', 'migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const exists = await client.query('SELECT id FROM schema_migrations WHERE filename = $1', [file]);
      if (exists.rows.length === 0) {
        console.log(`[Migrations] Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Migrations] Successfully applied: ${file}`);
      } else {
        console.log(`[Migrations] Migration already applied: ${file}`);
      }
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migrations Error]:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getPool,
  query,
  testConnection,
  runMigrations
};
