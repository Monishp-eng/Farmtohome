require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { query } = require('../config/postgres');

async function run() {
  console.log('🌾 KisanSetu — Postgres seed starting...');

  console.log('Clearing existing data...');
  await query(`TRUNCATE logistics, orders, cart_items, products, market_prices, demand_forecasts, users RESTART IDENTITY CASCADE`);

  // ---------------------------------------------------------------------
  // USERS  (order matters — ids are assigned 1..N in insertion order)
  // Original 8 farmers + 2 FPOs + 3 consumers + 2 buyers + 2 logistics + 1 admin = 18
  // Added: 2 farmers, 2 consumers, 1 logistics(driver) => 10 farmers, 5 consumers, 3 drivers
  // ---------------------------------------------------------------------
  console.log('Seeding users...');
  const hash = await bcrypt.hash('password123', await bcrypt.genSalt(10));

  const users = [
    ['Murugan Farmer', 'murugan@example.com', hash, 'farmer', '7989998568', 'Salem', 'Tamil Nadu', 11.6643, 78.1460],
    ['Anbu Selvan', 'anbu@example.com', hash, 'farmer', '9876543225', 'Thiruvallur', 'Tamil Nadu', 13.1432, 79.9079],
    ['Karthik Raja', 'karthik@example.com', hash, 'farmer', '9876543226', 'Kanchipuram', 'Tamil Nadu', 12.8342, 79.7036],
    ['Ramesh Kumar', 'ramesh@example.com', hash, 'farmer', '9876543210', 'Nashik', 'Maharashtra', 19.9975, 73.7898],
    ['Lakshmi Devi', 'lakshmi@example.com', hash, 'farmer', '9876543211', 'Anantapur', 'Andhra Pradesh', 14.6819, 77.6006],
    ['Gurpreet Singh', 'gurpreet@example.com', hash, 'farmer', '9876543212', 'Ludhiana', 'Punjab', 30.9010, 75.8573],
    ['Kavitha Nair', 'kavitha@example.com', hash, 'farmer', '9876543213', 'Wayanad', 'Kerala', 11.6854, 76.1320],
    ['Rajesh Patel', 'rajesh@example.com', hash, 'farmer', '9876543214', 'Anand', 'Gujarat', 22.5645, 72.9289],
    // -- new farmers (bring total farmers to 10) --
    ['Selvi Farmer', 'selvi@example.com', hash, 'farmer', '9876543230', 'Madurai', 'Tamil Nadu', 9.9252, 78.1198],
    ['Bala Krishnan', 'bala@example.com', hash, 'farmer', '9876543231', 'Coimbatore', 'Tamil Nadu', 11.0168, 76.9558],
    // FPOs
    ['Sahyadri FPO', 'sahyadri@example.com', hash, 'fpo', '9876543215', 'Nashik', 'Maharashtra', 20.0063, 73.7603],
    ['Punjab Agri Collective', 'punjabfpo@example.com', hash, 'fpo', '9876543216', 'Amritsar', 'Punjab', 31.6340, 74.8723],
    // Consumers
    ['Priya Sharma', 'priya@example.com', hash, 'consumer', '9876543217', 'Mumbai', 'Maharashtra', 19.0760, 72.8777],
    ['Arjun Reddy', 'arjun@example.com', hash, 'consumer', '9876543218', 'Hyderabad', 'Telangana', 17.3850, 78.4867],
    ['Meera Iyer', 'meera@example.com', hash, 'consumer', '9876543219', 'Bangalore', 'Karnataka', 12.9716, 77.5946],
    // -- new consumers (bring total consumers to 5) --
    ['Divya Menon', 'divya@example.com', hash, 'consumer', '9876543232', 'Kochi', 'Kerala', 9.9312, 76.2673],
    ['Rahul Verma', 'rahul@example.com', hash, 'consumer', '9876543233', 'Pune', 'Maharashtra', 18.5204, 73.8567],
    // Bulk buyers
    ['FreshMart Retail', 'freshmart@example.com', hash, 'buyer', '9876543220', 'Delhi', 'Delhi', 28.7041, 77.1025],
    ['South India Foods', 'sif@example.com', hash, 'buyer', '9876543221', 'Chennai', 'Tamil Nadu', 13.0827, 80.2707],
    // Logistics / drivers
    ['Kiran Transport', 'kiran@example.com', hash, 'logistics', '9876543222', 'Pune', 'Maharashtra', 18.5204, 73.8567],
    ['SpeedWay Delivery', 'speedway@example.com', hash, 'logistics', '9876543223', 'Bangalore', 'Karnataka', 12.9352, 77.6245],
    // -- new driver (bring total drivers to 3) --
    ['Fast Track Logistics', 'fasttrack@example.com', hash, 'logistics', '9876543234', 'Chennai', 'Tamil Nadu', 13.0827, 80.2707],
    // Admin
    ['Admin User', 'admin@example.com', hash, 'admin', '9876543224', 'Delhi', 'Delhi', 28.6139, 77.2090]
  ];

  for (const u of users) {
    await query(
      `INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      u
    );
  }
  console.log(`✅ ${users.length} users seeded (10 farmers, 2 fpo, 5 consumers, 2 buyers, 3 logistics, 1 admin)`);

  // ---------------------------------------------------------------------
  // PRODUCTS (25 original + 26 new = 51, crosses the 50+ target)
  // ---------------------------------------------------------------------
  console.log('Seeding products...');
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const dStr = (offsetDays) => new Date(nowMs + offsetDays * dayMs).toISOString().split('T')[0];

  const products = [
    [1, 'Tomato', 'vegetables', 'Fresh red farm-picked tomatoes', 200, 25, null, 'A', 1, dStr(0), dStr(4)],
    [1, 'Onion', 'vegetables', 'Nashik red onions direct from farm', 500, 20, null, 'A', 0, dStr(-2), dStr(12)],
    [2, 'Mango Alphonso', 'fruits', 'Sweet alphonso mangoes, natural ripened', 100, 120, null, 'A', 1, dStr(0), dStr(5)],
    [2, 'Pomegranate', 'fruits', 'Anantapur ruby red special', 150, 80, null, 'B', 0, dStr(-1), dStr(7)],
    [3, 'Basmati Rice', 'grains', 'Premium long grain aged rice', 1000, 65, 32, 'A', 0, dStr(-10), dStr(180)],
    [3, 'Wheat', 'grains', 'High quality sharbati wheat', 2000, 28, 22.75, 'A', 0, dStr(-5), dStr(180)],
    [4, 'Black Pepper', 'spices', 'Wayanad high piperine black pepper', 50, 550, null, 'A', 1, dStr(-10), dStr(365)],
    [4, 'Cardamom', 'spices', 'Green aromatic cardamom', 20, 1800, null, 'A', 1, dStr(-5), dStr(365)],
    [5, 'Fresh Milk', 'dairy', 'Pure morning cow milk (Raw & chilled)', 100, 55, null, 'A', 0, dStr(0), dStr(1)],
    [5, 'Paneer', 'dairy', 'Fresh farm cottage paneer', 50, 280, null, 'A', 0, dStr(0), dStr(2)],
    [6, 'Grapes', 'fruits', 'Seedless green crisp grapes', 300, 60, null, 'A', 1, dStr(0), dStr(4)],
    [6, 'Papaya', 'fruits', 'Sweet table papaya (Ready to eat)', 200, 25, null, 'B', 0, dStr(-3), dStr(1)],
    [7, 'Toor Dal', 'pulses', 'Unpolished desi toor dal', 500, 95, 70, 'A', 0, dStr(-15), dStr(180)],
    [7, 'Moong Dal', 'pulses', 'Yellow split moong dal', 400, 110, 77.55, 'A', 0, dStr(-12), dStr(180)],
    [1, 'Mustard Seeds', 'oilseeds', 'Yellow bold mustard seeds', 300, 75, 54.50, 'A', 1, dStr(-20), dStr(180)],
    [2, 'Groundnut', 'oilseeds', 'Quality whole groundnuts', 450, 85, 63.77, 'A', 0, dStr(-10), dStr(90)],
    [3, 'Soybean', 'oilseeds', 'Organic high-protein soybean', 600, 55, 46.00, 'A', 1, dStr(-14), dStr(180)],
    [4, 'Cinnamon', 'spices', 'Premium rolled cinnamon sticks', 30, 800, null, 'A', 1, dStr(-30), dStr(365)],
    [5, 'Ghee', 'dairy', 'Pure bilona cow ghee', 100, 600, null, 'A', 1, dStr(-5), dStr(180)],
    [6, 'Strawberry', 'fruits', 'Fresh red juicy strawberries', 80, 250, null, 'A', 0, dStr(0), dStr(2)],
    [7, 'Chana Dal', 'pulses', 'Organic unpolished chana dal', 400, 80, 53.35, 'A', 1, dStr(-8), dStr(180)],
    [1, 'Cabbage', 'vegetables', 'Fresh green leafy cabbage', 300, 20, null, 'B', 0, dStr(-2), dStr(1)],
    [2, 'Banana', 'fruits', 'Robusta golden bananas', 500, 30, null, 'A', 0, dStr(-1), dStr(3)],
    [3, 'Maize', 'grains', 'Yellow corn grain', 1500, 24, 20.90, 'B', 0, dStr(-10), dStr(180)],
    [4, 'Cloves', 'spices', 'Aromatic fragrant cloves', 40, 1200, null, 'A', 1, dStr(-20), dStr(365)],
    // -- new products (bring total to 51, spread across all 10 farmers) --
    [8, 'Cauliflower', 'vegetables', 'Fresh white cauliflower heads', 250, 22, null, 'A', 0, dStr(-1), dStr(5)],
    [8, 'Brinjal', 'vegetables', 'Purple long brinjal, farm fresh', 180, 18, null, 'B', 0, dStr(0), dStr(4)],
    [9, 'Watermelon', 'fruits', 'Sweet seedless watermelon', 400, 15, null, 'A', 0, dStr(-1), dStr(6)],
    [9, 'Guava', 'fruits', 'Pink flesh guava, orchard fresh', 120, 45, null, 'A', 1, dStr(0), dStr(5)],
    [10, 'Coconut', 'fruits', 'Tender fresh coconuts', 300, 30, null, 'A', 0, dStr(-2), dStr(10)],
    [10, 'Jackfruit', 'fruits', 'Ripe farm jackfruit', 60, 40, null, 'B', 0, dStr(-1), dStr(3)],
    [1, 'Carrot', 'vegetables', 'Orange crunchy carrots', 220, 28, null, 'A', 1, dStr(-1), dStr(8)],
    [2, 'Beetroot', 'vegetables', 'Deep red beetroot', 150, 24, null, 'A', 0, dStr(-1), dStr(9)],
    [3, 'Bajra', 'grains', 'Pearl millet, drought resistant crop', 800, 32, 27.75, 'A', 0, dStr(-6), dStr(180)],
    [4, 'Turmeric', 'spices', 'Erode turmeric fingers, high curcumin', 90, 220, null, 'A', 1, dStr(-15), dStr(365)],
    [5, 'Curd', 'dairy', 'Fresh set curd, farm dairy', 80, 60, null, 'A', 0, dStr(0), dStr(3)],
    [6, 'Pineapple', 'fruits', 'Sweet Kerala pineapple', 140, 35, null, 'A', 0, dStr(-1), dStr(6)],
    [7, 'Urad Dal', 'pulses', 'Black gram, unpolished', 350, 105, 76.00, 'A', 0, dStr(-10), dStr(180)],
    [8, 'Green Chilli', 'vegetables', 'Spicy green chillies', 60, 55, null, 'A', 0, dStr(0), dStr(5)],
    [9, 'Lemon', 'fruits', 'Juicy fresh lemons', 100, 40, null, 'A', 0, dStr(-1), dStr(10)],
    [10, 'Sesame Seeds', 'oilseeds', 'White sesame seeds', 200, 130, 91.50, 'A', 1, dStr(-18), dStr(180)],
    [1, 'Spinach', 'vegetables', 'Fresh leafy spinach bunches', 90, 18, null, 'A', 1, dStr(0), dStr(2)],
    [2, 'Sweet Potato', 'vegetables', 'Orange sweet potatoes', 260, 26, null, 'B', 0, dStr(-2), dStr(15)],
    [3, 'Barley', 'grains', 'Malting quality barley', 700, 26, 21.50, 'B', 0, dStr(-8), dStr(180)],
    [4, 'Coriander Seeds', 'spices', 'Whole dried coriander seeds', 70, 90, null, 'A', 0, dStr(-25), dStr(365)],
    [5, 'Butter', 'dairy', 'Farm-churned white butter', 40, 420, null, 'A', 1, dStr(-2), dStr(30)],
    [6, 'Custard Apple', 'fruits', 'Sitaphal, sweet and creamy', 100, 90, null, 'A', 0, dStr(-1), dStr(4)],
    [7, 'Rajma', 'pulses', 'Red kidney beans', 300, 130, 88.00, 'A', 0, dStr(-14), dStr(180)],
    [8, 'Capsicum', 'vegetables', 'Green bell peppers', 130, 45, null, 'A', 0, dStr(-1), dStr(6)],
    [9, 'Orange', 'fruits', 'Nagpur oranges, tangy sweet', 220, 55, null, 'A', 0, dStr(-1), dStr(8)],
    [10, 'Sunflower Seeds', 'oilseeds', 'Bold sunflower seeds', 180, 78, 72.00, 'A', 0, dStr(-12), dStr(180)]
  ];

  const insertProductText = `
    INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, msp_price, quality_grade, is_organic, harvest_date, expiry_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;
  for (const p of products) {
    await query(insertProductText, p);
  }
  console.log(`✅ ${products.length} products seeded`);

  // ---------------------------------------------------------------------
  // MARKET PRICES  (needs migration 002 applied first — adds district/unit)
  // ---------------------------------------------------------------------
  console.log('Seeding market prices...');
  const today = new Date().toISOString().split('T')[0];
  const marketPrices = [
    ['Tomato', 'Azadpur', 'Delhi', 'Delhi', 1500, 2500, 2000, null, today],
    ['Onion', 'Lasalgaon', 'Maharashtra', 'Nashik', 1200, 1800, 1500, null, today],
    ['Wheat', 'Khanna', 'Punjab', 'Ludhiana', 2200, 2350, 2275, 2275, today],
    ['Rice', 'Karnal', 'Haryana', 'Karnal', 2500, 3500, 3000, 2320, today],
    ['Toor Dal', 'Gulbarga', 'Karnataka', 'Kalaburagi', 8000, 9500, 8500, 7000, today],
    ['Mustard', 'Jaipur', 'Rajasthan', 'Jaipur', 5200, 5800, 5500, 5450, today],
    ['Groundnut', 'Rajkot', 'Gujarat', 'Rajkot', 6000, 6800, 6500, 6377, today],
    ['Soybean', 'Indore', 'Madhya Pradesh', 'Indore', 4400, 4800, 4600, 4600, today],
    ['Moong Dal', 'Jodhpur', 'Rajasthan', 'Jodhpur', 7500, 8200, 7800, 7755, today],
    ['Chana', 'Akola', 'Maharashtra', 'Akola', 5100, 5600, 5400, 5335, today],
    ['Maize', 'Nizamabad', 'Telangana', 'Nizamabad', 1900, 2200, 2100, 2090, today],
    ['Potato', 'Agra', 'Uttar Pradesh', 'Agra', 1000, 1400, 1200, null, today],
    ['Apple', 'Shimla', 'Himachal Pradesh', 'Shimla', 8000, 12000, 10000, null, today],
    ['Cotton', 'Khammam', 'Telangana', 'Khammam', 6500, 7200, 6800, 6620, today],
    ['Turmeric', 'Erode', 'Tamil Nadu', 'Erode', 8500, 9500, 9000, null, today]
  ];
  for (const m of marketPrices) {
    await query(
      `INSERT INTO market_prices (commodity, market_name, state, district, min_price, max_price, modal_price, msp, price_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      m
    );
  }
  console.log(`✅ ${marketPrices.length} market price rows seeded (real APMC data comes in next via import_market_prices.js)`);

  // ---------------------------------------------------------------------
  // ORDERS
  // ---------------------------------------------------------------------
  console.log('Seeding orders...');
  const orders = [
    [13, 1, 1, 10, 250, 5, 245, 'delivered', 'Mumbai'],
    [14, 5, 3, 50, 3250, 65, 3185, 'in_transit', 'Hyderabad'],
    [15, 7, 4, 5, 2750, 55, 2695, 'pending', 'Bangalore'],
    [16, 2, 1, 200, 4000, 80, 3920, 'confirmed', 'Delhi'],
    [17, 15, 1, 50, 3750, 75, 3675, 'dispatched', 'Chennai'],
    [13, 6, 3, 20, 560, 11.2, 548.8, 'delivered', 'Mumbai'],
    [14, 10, 5, 10, 2800, 56, 2744, 'cancelled', 'Hyderabad'],
    [15, 16, 2, 100, 8500, 170, 8330, 'pending', 'Bangalore']
  ];
  for (const o of orders) {
    await query(
      `INSERT INTO orders (buyer_id, product_id, farmer_id, quantity_kg, total_price, platform_fee, farmer_earnings, status, delivery_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      o
    );
  }
  console.log(`✅ ${orders.length} orders seeded`);

  // ---------------------------------------------------------------------
  // DEMAND FORECASTS
  // ---------------------------------------------------------------------
  console.log('Seeding demand forecasts...');
  const forecasts = [
    ['vegetables', 'North', 15000, 0.88, today],
    ['fruits', 'South', 12000, 0.85, today],
    ['grains', 'West', 25000, 0.92, today],
    ['oilseeds', 'Central', 18000, 0.80, today]
  ];
  for (const f of forecasts) {
    await query(
      `INSERT INTO demand_forecasts (product_category, region, predicted_demand_kg, confidence_score, forecast_date)
       VALUES ($1,$2,$3,$4,$5)`,
      f
    );
  }
  console.log(`✅ ${forecasts.length} demand forecasts seeded`);

  // ---------------------------------------------------------------------
  // LOGISTICS  (driver_id references the 3 logistics users: ids 19, 20, 21)
  // ---------------------------------------------------------------------
  // Logistics users (Kiran, SpeedWay, Fast Track) are ids 20, 21, 22 in the users array above
  console.log('Seeding logistics...');
  const logisticsData = [
    [1, 20, 'Nashik, Maharashtra', 'Mumbai, Maharashtra', 'delivered', 165, 4],
    [2, 21, 'Ludhiana, Punjab', 'Hyderabad, Telangana', 'in_transit', 1800, 48],
    [5, 22, 'Nashik, Maharashtra', 'Chennai, Tamil Nadu', 'picked_up', 1300, 36],
    [6, 21, 'Ludhiana, Punjab', 'Mumbai, Maharashtra', 'delivered', 1500, 40]
  ];
  for (const l of logisticsData) {
    await query(
      `INSERT INTO logistics (order_id, driver_id, pickup_location, delivery_location, status, distance_km, estimated_time_hrs)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      l
    );
  }
  console.log(`✅ ${logisticsData.length} logistics rows seeded`);

  console.log('🚀 Postgres seeding complete!');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
