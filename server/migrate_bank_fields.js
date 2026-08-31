const dbObj = require('./config/database');

async function migrateBankFields() {
  await dbObj.initializeDatabase();
  
  const cols = [
    "ALTER TABLE users ADD COLUMN bank_account TEXT",
    "ALTER TABLE users ADD COLUMN ifsc_code TEXT",
    "ALTER TABLE users ADD COLUMN bank_name TEXT",
    "ALTER TABLE users ADD COLUMN bank_verified INTEGER DEFAULT 0"
  ];

  for (const col of cols) {
    try {
      dbObj.prepare(col).run();
      console.log('Executed:', col);
    } catch(err) {
      console.log('Note / Exists:', err.message);
    }
  }

  // Set default verified bank details for seed farmer
  try {
    dbObj.prepare(`
      UPDATE users 
      SET bank_account = '30894726194', 
          ifsc_code = 'SBIN0001234', 
          bank_name = 'State Bank of India (Salem)', 
          bank_verified = 1 
      WHERE phone = '7989998568'
    `).run();
    console.log('Updated farmer bank fields for phone 7989998568.');
  } catch(e) {
    console.log('Update error:', e.message);
  }

  console.log('Bank fields migration complete.');
}

migrateBankFields();
