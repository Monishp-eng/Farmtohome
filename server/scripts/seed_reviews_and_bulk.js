const db = require('../config/database');

async function seed() {
  await db.ensureInitialized();

  // Clear existing reviews
  try { db.prepare('DELETE FROM reviews').run(); } catch(e) {}

  // Seed sample reviews
  const insertReview = db.prepare('INSERT INTO reviews (order_id, user_id, product_id, rating, comment) VALUES (?, ?, ?, ?, ?)');
  const sampleReviews = [
    [1, 14, 1, 5, 'Super fresh tomatoes! Delivered directly from Nashik farm in prime condition.'],
    [2, 15, 5, 5, 'Exceptional basmati rice aroma and quality.'],
    [6, 14, 2, 4, 'Great onion batch, very uniform size.'],
    [5, 15, 1, 5, 'Highest quality grade A produce. Will buy weekly.']
  ];

  sampleReviews.forEach(r => {
    try { insertReview.run(...r); } catch(e) {}
  });

  // Seed recurrent weekly orders for FreshMart Retail
  const buyer = db.prepare("SELECT id FROM users WHERE email = 'freshmart@example.com'").get();
  if (buyer) {
    const buyerId = buyer.id;
    const insertOrder = db.prepare('INSERT INTO orders (buyer_id, product_id, farmer_id, quantity_kg, total_price, platform_fee, farmer_earnings, status, delivery_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    const weeks = [
      '2026-08-18 10:00:00', // Tuesday
      '2026-08-25 10:00:00', // Tuesday
      '2026-09-01 10:00:00', // Tuesday
      '2026-09-08 10:00:00'  // Tuesday
    ];

    weeks.forEach(dt => {
      insertOrder.run(buyerId, 1, 1, 100, 2500, 50, 2450, 'delivered', 'FreshMart Central Hub, Delhi', dt);
      insertOrder.run(buyerId, 2, 1, 150, 3000, 60, 2940, 'delivered', 'FreshMart Central Hub, Delhi', dt);
    });
    console.log('Seeded recurrent weekly bulk orders for FreshMart Retail (ID:', buyerId, ')');
  }

  console.log('Reviews and recurrent bulk orders successfully populated!');
}

seed().catch(console.error);
