const dbObj = require('./config/database');

async function updateFarmerPhones() {
  await dbObj.initializeDatabase();
  dbObj.prepare("UPDATE users SET phone = '7989998568' WHERE role = 'farmer'").run();
  console.log('Successfully updated all farmer accounts to phone +91 7989998568');
  
  const sample = dbObj.prepare("SELECT id, name, phone, role FROM users WHERE role = 'farmer' LIMIT 5").all();
  console.table(sample);
}

updateFarmerPhones();
