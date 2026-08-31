const dbObj = require('./config/database');

async function migrate() {
  await dbObj.initializeDatabase();
  
  const cols = [
    "ALTER TABLE logistics ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id)",
    "ALTER TABLE logistics ADD COLUMN stage TEXT DEFAULT 'farm_to_warehouse'",
    "ALTER TABLE logistics ADD COLUMN product_id INTEGER REFERENCES products(id)"
  ];

  for (const col of cols) {
    try {
      dbObj.prepare(col).run();
      console.log('Executed:', col);
    } catch(err) {
      console.log('Note / Skipped:', err.message);
    }
  }

  // Update existing entries to have warehouse_id and stage
  try {
    dbObj.prepare("UPDATE logistics SET warehouse_id = 1 WHERE warehouse_id IS NULL").run();
    dbObj.prepare("UPDATE logistics SET stage = 'warehouse_to_consumer' WHERE stage IS NULL").run();
    console.log('Updated existing records.');
  } catch(e) {
    console.log('Update error:', e.message);
  }

  console.log('Migration complete.');
}

migrate();
