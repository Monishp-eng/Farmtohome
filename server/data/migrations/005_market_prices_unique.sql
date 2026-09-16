-- ==============================================================================
-- 🌾 KisanSetu — Migration 005: Market prices scraper unique constraint
-- ==============================================================================

ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS market VARCHAR(150);
UPDATE market_prices SET market = market_name WHERE market IS NULL AND market_name IS NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_commodity_market_date'
    ) THEN
        ALTER TABLE market_prices ADD CONSTRAINT unique_commodity_market_date UNIQUE (commodity, market, price_date);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_market_prices_commodity_date ON market_prices(commodity, price_date);
