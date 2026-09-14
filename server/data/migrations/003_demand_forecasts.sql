-- ==============================================================================
-- 🌾 KisanSetu — Migration 003: Add missing demand_forecasts table
-- Present in the SQLite dev schema, missing from the original Postgres migration
-- ==============================================================================

CREATE TABLE IF NOT EXISTS demand_forecasts (
  id SERIAL PRIMARY KEY,
  product_category VARCHAR(40) NOT NULL,
  region VARCHAR(60),
  predicted_demand_kg DOUBLE PRECISION,
  confidence_score DOUBLE PRECISION,
  forecast_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
