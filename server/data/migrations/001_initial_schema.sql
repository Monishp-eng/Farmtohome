-- ==============================================================================
-- 🌾 KisanSetu — Production Migration 001: Initial Schema
-- PostgreSQL 16 & SQLite Compatible Schema
-- ==============================================================================

-- 1. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'consumer' CHECK(role IN ('farmer','consumer','buyer','fpo','logistics','admin')),
  phone VARCHAR(20),
  location TEXT,
  state VARCHAR(60) DEFAULT 'Tamil Nadu',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  bank_account_number VARCHAR(50),
  bank_ifsc VARCHAR(20),
  bank_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. PRODUCTS / HARVEST LISTINGS TABLE
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  farmer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(40) NOT NULL CHECK(category IN ('vegetables','fruits','grains','pulses','dairy','spices','oilseeds')),
  description TEXT,
  quantity_kg DOUBLE PRECISION NOT NULL CHECK(quantity_kg >= 0),
  price_per_kg DOUBLE PRECISION NOT NULL CHECK(price_per_kg > 0),
  msp_price DOUBLE PRECISION,
  quality_grade VARCHAR(5) DEFAULT 'A' CHECK(quality_grade IN ('A','B','C')),
  image_url TEXT,
  is_organic INTEGER DEFAULT 0,
  harvest_date DATE,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'available' CHECK(status IN ('available','sold','expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_farmer ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price_per_kg);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  farmer_id INTEGER NOT NULL REFERENCES users(id),
  quantity_kg DOUBLE PRECISION NOT NULL CHECK(quantity_kg > 0),
  total_price DOUBLE PRECISION NOT NULL CHECK(total_price >= 0),
  platform_fee DOUBLE PRECISION DEFAULT 0,
  farmer_earnings DOUBLE PRECISION NOT NULL,
  status VARCHAR(30) DEFAULT 'pending' CHECK(status IN ('pending','confirmed','dispatched','in_transit','delivered','cancelled')),
  payment_status VARCHAR(30) DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','refunded','escrow')),
  delivery_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- 4. CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_kg DOUBLE PRECISION NOT NULL DEFAULT 1 CHECK(quantity_kg > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_product_cart UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

-- 5. LOGISTICS & DIRECT DELIVERY DISPATCH TABLE
CREATE TABLE IF NOT EXISTS logistics (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES users(id),
  pickup_location TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  delivery_location TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  estimated_time_hrs DOUBLE PRECISION,
  status VARCHAR(30) DEFAULT 'assigned' CHECK(status IN ('assigned','picked_up','in_transit','delivered','failed')),
  proof_notes TEXT,
  proof_lat DOUBLE PRECISION,
  proof_lng DOUBLE PRECISION,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logistics_order ON logistics(order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_driver ON logistics(driver_id);
CREATE INDEX IF NOT EXISTS idx_logistics_status ON logistics(status);

-- 6. PAYMENTS & ESCROW LEDGER TABLE
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  payment_gateway VARCHAR(40) DEFAULT 'razorpay_test',
  gateway_order_id VARCHAR(120),
  gateway_payment_id VARCHAR(120),
  gateway_signature VARCHAR(255),
  amount DOUBLE PRECISION NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(30) DEFAULT 'pending' CHECK(status IN ('pending','captured','settled','refunded','failed')),
  escrow_release_date TIMESTAMP WITH TIME ZONE,
  farmer_payout_status VARCHAR(30) DEFAULT 'pending' CHECK(farmer_payout_status IN ('pending','processed','failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 7. IVR & VOICE CALL TELEPHONY LOGS
CREATE TABLE IF NOT EXISTS ivr_logs (
  id SERIAL PRIMARY KEY,
  call_sid VARCHAR(100),
  caller_phone VARCHAR(20) NOT NULL,
  language VARCHAR(10) DEFAULT 'ta',
  step VARCHAR(50),
  transcription TEXT,
  detected_crop VARCHAR(80),
  detected_quantity DOUBLE PRECISION,
  detected_price DOUBLE PRECISION,
  detected_location TEXT,
  listing_created_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ivr_phone ON ivr_logs(caller_phone);
CREATE INDEX IF NOT EXISTS idx_ivr_created ON ivr_logs(created_at DESC);

-- 8. APMC MARKET PRICES & BENCHMARKS TABLE
CREATE TABLE IF NOT EXISTS market_prices (
  id SERIAL PRIMARY KEY,
  commodity VARCHAR(100) NOT NULL,
  market_name VARCHAR(120) NOT NULL,
  state VARCHAR(60) NOT NULL,
  min_price DOUBLE PRECISION NOT NULL,
  max_price DOUBLE PRECISION NOT NULL,
  modal_price DOUBLE PRECISION NOT NULL,
  msp DOUBLE PRECISION,
  price_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_commodity ON market_prices(commodity);
CREATE INDEX IF NOT EXISTS idx_market_state ON market_prices(state);
CREATE INDEX IF NOT EXISTS idx_market_date ON market_prices(price_date DESC);

-- 9. REVIEWS & RATINGS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- 10. REFRESH TOKENS TABLE (For Secure Token Rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_val ON refresh_tokens(token);
