const dbObj = require('./config/database');

async function seedWarehouses() {
  await dbObj.initializeDatabase();
  
  const existing = dbObj.prepare('SELECT COUNT(*) as c FROM warehouses').get();
  if (!existing || existing.c === 0) {
    dbObj.prepare(`
      INSERT INTO warehouses (name, code, city, address, latitude, longitude, capacity_tonnes, current_occupancy_kg, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Chennai Central Agri-Hub (Koyambedu)',
      'MAA-CENTRAL-01',
      'Chennai',
      'Koyambedu Wholesale Complex, Chennai, Tamil Nadu 600092',
      13.0694,
      80.1948,
      100,
      4500,
      '+91-44-2479-1100'
    );

    dbObj.prepare(`
      INSERT INTO warehouses (name, code, city, address, latitude, longitude, capacity_tonnes, current_occupancy_kg, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Chennai South Cold-Chain Hub (Guindy)',
      'MAA-SOUTH-02',
      'Chennai',
      'SIDCO Industrial Estate, Guindy, Chennai, Tamil Nadu 600032',
      13.0067,
      80.2025,
      60,
      2800,
      '+91-44-2250-2200'
    );

    dbObj.prepare(`
      INSERT INTO warehouses (name, code, city, address, latitude, longitude, capacity_tonnes, current_occupancy_kg, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Chennai North Aggregation Hub (Madhavaram)',
      'MAA-NORTH-03',
      'Chennai',
      'Madhavaram Logistics Park, Chennai, Tamil Nadu 600060',
      13.1487,
      80.2312,
      80,
      3100,
      '+91-44-2553-3300'
    );
  }

  const list = dbObj.prepare('SELECT * FROM warehouses').all();
  console.table(list);
}

seedWarehouses();
