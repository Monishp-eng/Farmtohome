-- ==============================================================================
-- 🌾 KisanSetu — Migration 002: Add missing market_prices columns
-- Brings Postgres schema in line with the SQLite dev schema
-- ==============================================================================

ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS district VARCHAR(80);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'per_quintal';
