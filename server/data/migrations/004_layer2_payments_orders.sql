-- ==============================================================================
-- 🌾 KisanSetu — Production Migration 004: Layer 2 Payments & Order Lifecycle
-- ==============================================================================

-- 1. ADD BANK_NAME TO USERS (IF NOT EXISTS)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT 'State Bank of India';

-- 2. EXPAND ORDERS TABLE WITH DISPUTE & AUTO-CANCEL TIMERS
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispute_status VARCHAR(30) DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_cancel_at TIMESTAMP WITH TIME ZONE;

-- 3. CREATE PAYOUT LEDGER TABLE (TRACKS 98% FARMER PAYOUTS & 2% PLATFORM FEE)
CREATE TABLE IF NOT EXISTS payout_ledger (
  id SERIAL PRIMARY KEY,
  farmer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gross_amount DOUBLE PRECISION NOT NULL,
  platform_fee DOUBLE PRECISION NOT NULL,
  net_payout DOUBLE PRECISION NOT NULL,
  bank_account_number VARCHAR(50),
  bank_ifsc VARCHAR(20),
  bank_name VARCHAR(100),
  utr_reference VARCHAR(100) UNIQUE,
  status VARCHAR(30) DEFAULT 'settled' CHECK(status IN ('pending','processing','settled','failed')),
  settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payout_farmer ON payout_ledger(farmer_id);
CREATE INDEX IF NOT EXISTS idx_payout_order ON payout_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_ledger(status);
