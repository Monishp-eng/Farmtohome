require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { query } = require('../config/postgres');

const CSV_PATH = path.join(__dirname, '..', 'data', 'agmarknet_prices.csv');

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

// "10 Sep, 2026" -> "2026-09-10"
function parseAgmarknetDate(str) {
  const cleaned = str.replace(',', '').trim(); // "10 Sep 2026"
  const [day, mon, year] = cleaned.split(/\s+/);
  const month = MONTHS[mon.toLowerCase().slice(0, 3)];
  if (!month) return new Date().toISOString().split('T')[0];
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

async function run() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  // This report has 2 title/subtitle rows before the real header row — drop them
  const lines = raw.split(/\r?\n/);
  const csvBody = lines.slice(2).join('\n');

  const rows = parse(csvBody, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`Found ${rows.length} rows in CSV. Importing...`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const commodity = row['Commodity'];
    const mspRaw = row['MSP (Rs./Quintal) 2026-27'];
    const msp = mspRaw && !isNaN(parseFloat(mspRaw)) ? parseFloat(mspRaw) : null;

    // Pick the first "Price on <date>" column — CSV lists most recent date first
    const priceKey = Object.keys(row).find((k) => k.startsWith('Price on'));
    if (!commodity || !priceKey) {
      skipped++;
      continue;
    }

    const modalPrice = parseFloat(row[priceKey]);
    if (Number.isNaN(modalPrice)) {
      skipped++;
      continue;
    }

    const dateStr = priceKey.replace('Price on', '').trim();
    const priceDate = parseAgmarknetDate(dateStr);

    // This report has no state/market/district breakdown — it's a national average.
    // market_name and state are NOT NULL in the schema, so we use explicit placeholders
    // rather than fabricating a specific market/state that isn't in the source data.
    // min_price/max_price are also NOT NULL, but this report has no range — only one
    // price per day — so both fall back to the modal price rather than being left null.
    await query(
      `INSERT INTO market_prices (commodity, market_name, state, district, min_price, max_price, modal_price, msp, price_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [commodity, 'National Average', 'All India', null, modalPrice, modalPrice, modalPrice, msp, priceDate]
    );
    inserted++;
  }

  console.log(`✅ Imported ${inserted} rows. Skipped ${skipped} malformed rows.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Import error:', err);
  process.exit(1);
});
