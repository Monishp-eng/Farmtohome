CREATE TABLE IF NOT EXISTS market_prices (
    id SERIAL PRIMARY KEY,
    commodity VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    district VARCHAR(100),
    market VARCHAR(150),
    min_price NUMERIC(10,2),
    max_price NUMERIC(10,2),
    modal_price NUMERIC(10,2),
    price_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(commodity, market, price_date)
);
CREATE INDEX idx_market_prices_commodity_date ON market_prices(commodity, price_date);