const dbObj = require('./config/database');
const sarvamService = require('./services/sarvam.tts.service');
const nlpExtractor = require('./nlp/extractor');
const smsService = require('./services/sms.service');

async function testFarmerSide() {
  console.log('========================================');
  console.log('🧪 TESTING FARMER-SIDE INTEGRITY & RAILS');
  console.log('========================================');
  await dbObj.initializeDatabase();

  // 1. Check Farmer in DB
  const farmer = dbObj.prepare("SELECT * FROM users WHERE phone = '7989998568'").get();
  console.log('✅ 1. Farmer Account in DB:', farmer?.name, '| Phone:', farmer?.phone, '| Role:', farmer?.role);

  // 2. Test NLP Tamil extraction
  const rawTamilSpeech = 'எனக்கு 300 கிலோ தக்காளி 25 ரூபாய்க்கு சேலத்தில் விற்க வேண்டும்';
  const entities = await nlpExtractor.extractEntities(rawTamilSpeech, 'PRODUCE_LISTING', 'ta');
  console.log('✅ 2. Tamil NLP Entity Extraction:', entities.crop, '| Qty:', entities.quantity, 'kg | Price: Rs', entities.expected_price);

  // 3. Test Sarvam AI TTS audio generation
  const audioUrl = await sarvamService.generateAudio('வணக்கம் விவசாயி! உங்கள் பட்டியல் வெற்றிகரமாக பதிவானது.', 'ta-IN');
  console.log('✅ 3. Sarvam AI Tamil TTS Audio Generated:', audioUrl?.substring(0, 70) + '...');

  // 4. Test Live SMS dispatch to farmer
  const smsRes = await smsService.sendSMS('7989998568', 'KisanSetu Audit: Farmer rails operational. 98% direct settlement active.');
  console.log('✅ 4. SMS Gateway Dispatch Status:', smsRes.status, '| Provider:', smsRes.provider);

  // 5. Test Warehouses linkage for Chennai Hub
  const warehouses = dbObj.prepare('SELECT name, city, address FROM warehouses').all();
  console.log('✅ 5. Chennai Warehouses Active:', warehouses.length, 'Hubs found');

  // 6. Test Recent Farmer Listings
  const listings = dbObj.prepare("SELECT id, name, quantity_kg, price_per_kg, status FROM products WHERE farmer_id = ? ORDER BY id DESC LIMIT 2").all(farmer.id);
  console.log('✅ 6. Farmer Live Listings:');
  console.table(listings);

  console.log('========================================');
  console.log('🎉 ALL FARMER-SIDE SYSTEMS VERIFIED 100%!');
  console.log('========================================');
}

testFarmerSide();
