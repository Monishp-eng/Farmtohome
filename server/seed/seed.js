const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { initializeDatabase } = require('../config/database');

const seedData = async () => {
  await initializeDatabase();
  console.log('Starting seed process...');
  // Clear tables
  console.log('Clearing existing data...');
  const tables = ['logistics', 'orders', 'cart_items', 'products', 'users', 'market_prices', 'demand_forecasts'];
  tables.forEach(table => {
    db.prepare(`DELETE FROM ${table}`).run();
    db.prepare(`DELETE FROM sqlite_sequence WHERE name='${table}'`).run();
  });

  // Seed Users
  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);
  
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  const users = [
    ['Ramesh Kumar', 'ramesh@example.com', hash, 'farmer', '9876543210', 'Nashik', 'Maharashtra', 19.9975, 73.7898],
    ['Lakshmi Devi', 'lakshmi@example.com', hash, 'farmer', '9876543211', 'Anantapur', 'Andhra Pradesh', 14.6819, 77.6006],
    ['Gurpreet Singh', 'gurpreet@example.com', hash, 'farmer', '9876543212', 'Ludhiana', 'Punjab', 30.9010, 75.8573],
    ['Kavitha Nair', 'kavitha@example.com', hash, 'farmer', '9876543213', 'Wayanad', 'Kerala', 11.6854, 76.1320],
    ['Rajesh Patel', 'rajesh@example.com', hash, 'farmer', '9876543214', 'Anand', 'Gujarat', 22.5645, 72.9289],
    ['Sahyadri FPO', 'sahyadri@example.com', hash, 'fpo', '9876543215', 'Nashik', 'Maharashtra', 20.0063, 73.7603],
    ['Punjab Agri Collective', 'punjabfpo@example.com', hash, 'fpo', '9876543216', 'Amritsar', 'Punjab', 31.6340, 74.8723],
    ['Priya Sharma', 'priya@example.com', hash, 'consumer', '9876543217', 'Mumbai', 'Maharashtra', 19.0760, 72.8777],
    ['Arjun Reddy', 'arjun@example.com', hash, 'consumer', '9876543218', 'Hyderabad', 'Telangana', 17.3850, 78.4867],
    ['Meera Iyer', 'meera@example.com', hash, 'consumer', '9876543219', 'Bangalore', 'Karnataka', 12.9716, 77.5946],
    ['FreshMart Retail', 'freshmart@example.com', hash, 'buyer', '9876543220', 'Delhi', 'Delhi', 28.7041, 77.1025],
    ['South India Foods', 'sif@example.com', hash, 'buyer', '9876543221', 'Chennai', 'Tamil Nadu', 13.0827, 80.2707],
    ['Kiran Transport', 'kiran@example.com', hash, 'logistics', '9876543222', 'Pune', 'Maharashtra', 18.5204, 73.8567],
    ['SpeedWay Delivery', 'speedway@example.com', hash, 'logistics', '9876543223', 'Bangalore', 'Karnataka', 12.9352, 77.6245],
    ['Admin User', 'admin@example.com', hash, 'admin', '9876543224', 'Delhi', 'Delhi', 28.6139, 77.2090]
  ];

  users.forEach(u => insertUser.run(...u));
  console.log('Users seeded successfully');

  // Seed Products
  console.log('Seeding products...');
  const insertProduct = db.prepare('INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, msp_price, quality_grade, is_organic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  const products = [
    [1, 'Tomato', 'vegetables', 'Fresh red tomatoes', 200, 25, null, 'A', 1],
    [1, 'Onion', 'vegetables', 'Nashik red onions', 500, 20, null, 'A', 0],
    [2, 'Mango Alphonso', 'fruits', 'Sweet alphonso mangoes', 100, 120, null, 'A', 1],
    [2, 'Pomegranate', 'fruits', 'Anantapur special', 150, 80, null, 'B', 0],
    [3, 'Basmati Rice', 'grains', 'Premium long grain rice', 1000, 65, 32, 'A', 0],
    [3, 'Wheat', 'grains', 'High quality wheat', 2000, 28, 22.75, 'A', 0],
    [4, 'Black Pepper', 'spices', 'Wayanad black pepper', 50, 550, null, 'A', 1],
    [4, 'Cardamom', 'spices', 'Green cardamom', 20, 1800, null, 'A', 1],
    [5, 'Fresh Milk', 'dairy', 'Pure cow milk', 100, 55, null, 'A', 0],
    [5, 'Paneer', 'dairy', 'Fresh farm paneer', 50, 280, null, 'A', 0],
    [6, 'Grapes', 'fruits', 'Seedless green grapes', 300, 60, null, 'A', 1],
    [6, 'Papaya', 'fruits', 'Sweet papaya', 200, 25, null, 'B', 0],
    [7, 'Toor Dal', 'pulses', 'Unpolished toor dal', 500, 95, 70, 'A', 0],
    [7, 'Moong Dal', 'pulses', 'Yellow moong dal', 400, 110, 77.55, 'A', 0],
    [1, 'Mustard Seeds', 'oilseeds', 'Yellow mustard seeds', 300, 75, 54.50, 'A', 1],
    [2, 'Groundnut', 'oilseeds', 'Quality groundnuts', 450, 85, 63.77, 'A', 0],
    [3, 'Soybean', 'oilseeds', 'Organic soybean', 600, 55, 46.00, 'A', 1],
    [4, 'Cinnamon', 'spices', 'Premium cinnamon sticks', 30, 800, null, 'A', 1],
    [5, 'Ghee', 'dairy', 'Pure cow ghee', 100, 600, null, 'A', 1],
    [6, 'Strawberry', 'fruits', 'Fresh red strawberries', 80, 250, null, 'A', 0],
    [7, 'Chana Dal', 'pulses', 'Organic chana dal', 400, 80, 53.35, 'A', 1],
    [1, 'Cabbage', 'vegetables', 'Fresh green cabbage', 300, 20, null, 'B', 0],
    [2, 'Banana', 'fruits', 'Robusta banana', 500, 30, null, 'A', 0],
    [3, 'Maize', 'grains', 'Yellow maize', 1500, 24, 20.90, 'B', 0],
    [4, 'Cloves', 'spices', 'Aromatic cloves', 40, 1200, null, 'A', 1]
  ];
  
  products.forEach(p => insertProduct.run(...p));
  console.log('Products seeded successfully');

  // Seed Market Prices
  console.log('Seeding market prices...');
  const insertMarketPrice = db.prepare('INSERT INTO market_prices (commodity, market_name, state, district, min_price, max_price, modal_price, msp, price_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
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
  
  marketPrices.forEach(m => insertMarketPrice.run(...m));
  console.log('Market prices seeded successfully');

  // Seed Orders
  console.log('Seeding orders...');
  const insertOrder = db.prepare('INSERT INTO orders (buyer_id, product_id, farmer_id, quantity_kg, total_price, platform_fee, farmer_earnings, status, delivery_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const orders = [
    [8, 1, 1, 10, 250, 5, 245, 'delivered', 'Mumbai'],
    [9, 5, 3, 50, 3250, 65, 3185, 'in_transit', 'Hyderabad'],
    [10, 7, 4, 5, 2750, 55, 2695, 'pending', 'Bangalore'],
    [11, 2, 1, 200, 4000, 80, 3920, 'confirmed', 'Delhi'],
    [12, 15, 1, 50, 3750, 75, 3675, 'dispatched', 'Chennai'],
    [8, 6, 3, 20, 560, 11.2, 548.8, 'delivered', 'Mumbai'],
    [9, 10, 5, 10, 2800, 56, 2744, 'cancelled', 'Hyderabad'],
    [10, 16, 2, 100, 8500, 170, 8330, 'pending', 'Bangalore']
  ];
  orders.forEach(o => insertOrder.run(...o));
  console.log('Orders seeded successfully');

  // Seed Demand Forecasts
  console.log('Seeding demand forecasts...');
  const insertForecast = db.prepare('INSERT INTO demand_forecasts (product_category, region, predicted_demand_kg, confidence_score, forecast_date) VALUES (?, ?, ?, ?, ?)');
  const forecasts = [
    ['vegetables', 'North', 15000, 0.88, today],
    ['fruits', 'South', 12000, 0.85, today],
    ['grains', 'West', 25000, 0.92, today],
    ['oilseeds', 'Central', 18000, 0.80, today]
  ];
  forecasts.forEach(f => insertForecast.run(...f));
  console.log('Demand forecasts seeded successfully');

  // Seed Logistics
  console.log('Seeding logistics...');
  const insertLogistics = db.prepare('INSERT INTO logistics (order_id, driver_id, pickup_location, delivery_location, status, distance_km, estimated_time_hrs) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const logisticsData = [
    [1, 13, 'Nashik, Maharashtra', 'Mumbai, Maharashtra', 'delivered', 165, 4],
    [2, 14, 'Ludhiana, Punjab', 'Hyderabad, Telangana', 'in_transit', 1800, 48],
    [5, 13, 'Nashik, Maharashtra', 'Chennai, Tamil Nadu', 'picked_up', 1300, 36],
    [6, 14, 'Ludhiana, Punjab', 'Mumbai, Maharashtra', 'delivered', 1500, 40]
  ];
  logisticsData.forEach(l => insertLogistics.run(...l));
  console.log('Logistics seeded successfully');

  console.log('Seeding complete!');
};

seedData().catch(console.error);
