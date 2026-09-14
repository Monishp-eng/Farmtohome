const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const postgres = require('./postgres');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'marketplace.db');

// Wrapper class to mimic better-sqlite3's synchronous API using sql.js
class DatabaseWrapper {
  constructor() {
    this.db = null;
    this.dbPath = dbPath;
    this._ready = false;
    this._initPromise = null;
  }

  async ensureInitialized() {
    if (!this._ready) {
      if (!this._initPromise) {
        this._initPromise = this.initialize();
      }
      await this._initPromise;
    }
  }

  async initialize() {
    if (this._ready) return this;
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }
    
    // Enable WAL mode equivalent
    this.db.run("PRAGMA journal_mode=WAL;");
    
    this._initSchema();
    this._ready = true;
    this._save();
    console.log('Database initialized successfully at', this.dbPath);
    return this;
  }

  _save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  _initSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'consumer' CHECK(role IN ('farmer','consumer','buyer','fpo','logistics','admin')),
        phone TEXT,
        location TEXT,
        state TEXT,
        latitude REAL,
        longitude REAL,
        bank_account_number TEXT,
        bank_ifsc TEXT,
        bank_verified INTEGER DEFAULT 0,
        phone_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safe column migrations for existing SQLite databases
    try { this.db.run("ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0;"); } catch(e) {}
    try { this.db.run("ALTER TABLE users ADD COLUMN bank_verified INTEGER DEFAULT 0;"); } catch(e) {}
    try { this.db.run("ALTER TABLE users ADD COLUMN bank_account_number TEXT;"); } catch(e) {}
    try { this.db.run("ALTER TABLE users ADD COLUMN bank_ifsc TEXT;"); } catch(e) {}
    try { this.db.run("ALTER TABLE users ADD COLUMN bank_name TEXT DEFAULT 'State Bank of India';"); } catch(e) {}
    try { this.db.run("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;"); } catch(e) {}
    try { this.db.run("ALTER TABLE orders ADD COLUMN dispute_reason TEXT;"); } catch(e) {}
    try { this.db.run("ALTER TABLE orders ADD COLUMN dispute_status TEXT DEFAULT 'none';"); } catch(e) {}
    try { this.db.run("ALTER TABLE orders ADD COLUMN auto_cancel_at DATETIME;"); } catch(e) {}

    // Safe migration: check if orders table allows 'placed' status, if not recreate with expanded constraint
    try {
      this.db.run("INSERT INTO orders (id, buyer_id, product_id, farmer_id, quantity_kg, total_price, farmer_earnings, status) VALUES (-999, 1, 1, 1, 1, 1, 1, 'placed')");
      this.db.run("DELETE FROM orders WHERE id = -999");
    } catch(e) {
      try {
        this.db.run("ALTER TABLE orders RENAME TO orders_old");
        this.db.run(`
          CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            buyer_id INTEGER REFERENCES users(id),
            product_id INTEGER REFERENCES products(id),
            farmer_id INTEGER REFERENCES users(id),
            quantity_kg REAL NOT NULL,
            total_price REAL NOT NULL,
            platform_fee REAL DEFAULT 0,
            farmer_earnings REAL NOT NULL,
            status TEXT DEFAULT 'placed' CHECK(status IN ('placed','pending','confirmed','farmer_packed','driver_picked','dispatched','in_transit','delivered','settled','disputed','cancelled')),
            payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','escrow','settled','refunded')),
            delivery_address TEXT,
            dispute_reason TEXT,
            dispute_status TEXT DEFAULT 'none',
            auto_cancel_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        this.db.run(`
          INSERT INTO orders (id, buyer_id, product_id, farmer_id, quantity_kg, total_price, platform_fee, farmer_earnings, status, payment_status, delivery_address, created_at, updated_at)
          SELECT id, buyer_id, product_id, farmer_id, quantity_kg, total_price, platform_fee, farmer_earnings, status, payment_status, delivery_address, created_at, updated_at
          FROM orders_old
        `);
        this.db.run("DROP TABLE orders_old");
      } catch(migErr) {
        console.warn('[Orders table migration note]:', migErr.message);
      }
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farmer_id INTEGER REFERENCES users(id),
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('vegetables','fruits','grains','pulses','dairy','spices','oilseeds')),
        description TEXT,
        quantity_kg REAL NOT NULL,
        price_per_kg REAL NOT NULL,
        msp_price REAL,
        quality_grade TEXT DEFAULT 'A' CHECK(quality_grade IN ('A','B','C')),
        image_url TEXT,
        is_organic INTEGER DEFAULT 0,
        harvest_date TEXT,
        expiry_date TEXT,
        status TEXT DEFAULT 'available' CHECK(status IN ('available','sold','expired')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        buyer_id INTEGER REFERENCES users(id),
        product_id INTEGER REFERENCES products(id),
        farmer_id INTEGER REFERENCES users(id),
        quantity_kg REAL NOT NULL,
        total_price REAL NOT NULL,
        platform_fee REAL DEFAULT 0,
        farmer_earnings REAL NOT NULL,
        status TEXT DEFAULT 'placed' CHECK(status IN ('placed','pending','confirmed','farmer_packed','driver_picked','dispatched','in_transit','delivered','settled','disputed','cancelled')),
        payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','escrow','settled','refunded')),
        delivery_address TEXT,
        dispute_reason TEXT,
        dispute_status TEXT DEFAULT 'none',
        auto_cancel_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS logistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        driver_id INTEGER REFERENCES users(id),
        pickup_location TEXT,
        pickup_lat REAL,
        pickup_lng REAL,
        delivery_location TEXT,
        delivery_lat REAL,
        delivery_lng REAL,
        distance_km REAL,
        estimated_time_hrs REAL,
        optimized_route TEXT,
        vehicle_type TEXT DEFAULT 'mini_truck',
        status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned','picked_up','in_transit','delivered')),
        pickup_time DATETIME,
        delivery_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS market_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commodity TEXT NOT NULL,
        market_name TEXT,
        state TEXT,
        district TEXT,
        min_price REAL,
        max_price REAL,
        modal_price REAL,
        msp REAL,
        unit TEXT DEFAULT 'per_quintal',
        price_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS demand_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_category TEXT NOT NULL,
        region TEXT,
        predicted_demand_kg REAL,
        confidence_score REAL,
        forecast_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        product_id INTEGER REFERENCES products(id),
        quantity_kg REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id),
        user_id INTEGER REFERENCES users(id),
        payment_gateway TEXT DEFAULT 'razorpay_test',
        gateway_order_id TEXT,
        gateway_payment_id TEXT,
        gateway_signature TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','captured','settled','refunded','failed')),
        escrow_release_date DATETIME,
        farmer_payout_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS payout_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farmer_id INTEGER REFERENCES users(id),
        order_id INTEGER REFERENCES orders(id),
        gross_amount REAL NOT NULL,
        platform_fee REAL NOT NULL,
        net_payout REAL NOT NULL,
        bank_account_number TEXT,
        bank_ifsc TEXT,
        bank_name TEXT,
        utr_reference TEXT UNIQUE,
        status TEXT DEFAULT 'settled' CHECK(status IN ('pending','processing','settled','failed')),
        settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS ivr_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        call_sid TEXT,
        caller_phone TEXT NOT NULL,
        language TEXT DEFAULT 'ta',
        step TEXT,
        transcription TEXT,
        detected_crop TEXT,
        detected_quantity REAL,
        detected_price REAL,
        detected_location TEXT,
        listing_created_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id),
        user_id INTEGER REFERENCES users(id),
        product_id INTEGER REFERENCES products(id),
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Mimic better-sqlite3's prepare() API
  prepare(sql) {
    const self = this;
    const sanitize = (params) => params.map(p => (p === undefined ? null : p));
    return {
      run(...params) {
        try {
          const cleanParams = sanitize(params);
          self.db.run(sql, cleanParams);
          // Return info object similar to better-sqlite3
          const res = self.db.exec("SELECT last_insert_rowid() as id");
          const lastId = res && res[0] && res[0].values && res[0].values[0] ? res[0].values[0][0] : 0;
          const changes = self.db.getRowsModified();
          self._save();
          return { lastInsertRowid: lastId, changes };
        } catch (err) {
          throw err;
        }
      },
      get(...params) {
        try {
          const cleanParams = sanitize(params);
          const stmt = self.db.prepare(sql);
          stmt.bind(cleanParams);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((col, i) => { row[col] = vals[i]; });
            return row;
          }
          stmt.free();
          return undefined;
        } catch (err) {
          throw err;
        }
      },
      all(...params) {
        try {
          const cleanParams = sanitize(params);
          const results = [];
          const stmt = self.db.prepare(sql);
          stmt.bind(cleanParams);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((col, i) => { row[col] = vals[i]; });
            results.push(row);
          }
          stmt.free();
          return results;
        } catch (err) {
          throw err;
        }
      }
    };
  }

  // Direct exec for multi-statement SQL
  exec(sql) {
    this.db.run(sql);
    this._save();
  }

  // Check if PostgreSQL engine is enabled via DATABASE_URL
  isPostgres() {
    return Boolean(process.env.DATABASE_URL);
  }

  // Unified asynchronous query for PostgreSQL with SQLite fallback
  async query(sql, params = []) {
    if (this.isPostgres()) {
      let index = 1;
      const pgSql = sql.replace(/\?/g, () => `$${index++}`);
      return await postgres.query(pgSql, params);
    }
    await this.ensureInitialized();
    const isSelect = /^\s*SELECT/i.test(sql);
    if (isSelect) {
      const rows = this.prepare(sql).all(...params);
      return { rows, rowCount: rows.length };
    } else {
      const result = this.prepare(sql).run(...params);
      return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  }

  async get(sql, params = []) {
    if (this.isPostgres()) {
      let index = 1;
      const pgSql = sql.replace(/\?/g, () => `$${index++}`);
      const res = await postgres.query(pgSql, params);
      return res.rows[0] || null;
    }
    await this.ensureInitialized();
    return this.prepare(sql).get(...params) || null;
  }

  async all(sql, params = []) {
    if (this.isPostgres()) {
      let index = 1;
      const pgSql = sql.replace(/\?/g, () => `$${index++}`);
      const res = await postgres.query(pgSql, params);
      return res.rows;
    }
    await this.ensureInitialized();
    return this.prepare(sql).all(...params);
  }

  async run(sql, params = []) {
    if (this.isPostgres()) {
      let index = 1;
      let pgSql = sql.replace(/\?/g, () => `$${index++}`);
      if (/^\s*INSERT/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
        pgSql += ' RETURNING id';
      }
      const res = await postgres.query(pgSql, params);
      return {
        lastInsertRowid: res.rows[0]?.id || null,
        changes: res.rowCount
      };
    }
    await this.ensureInitialized();
    return this.prepare(sql).run(...params);
  }

  // Close database
  close() {
    if (this.db) {
      this._save();
      this.db.close();
    }
  }
}

// Create singleton instance
const dbWrapper = new DatabaseWrapper();

// Export the promise that resolves to the initialized wrapper
module.exports = dbWrapper;
module.exports.initializeDatabase = () => dbWrapper.initialize();
