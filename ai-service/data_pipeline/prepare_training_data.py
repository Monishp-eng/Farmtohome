import os
import pandas as pd
import psycopg2

DATABASE_URL = os.environ["DATABASE_URL"]

def build_dataset(output_path="ai-service/data_pipeline/training_data.csv"):
    conn = psycopg2.connect(DATABASE_URL)

    prices = pd.read_sql("""
        SELECT commodity, district, market, price_date, modal_price
        FROM market_prices
        WHERE price_date >= CURRENT_DATE - INTERVAL '3 years'
          AND state = 'Tamil Nadu'
        ORDER BY price_date
    """, conn)

    weather = pd.read_sql("""
        SELECT district, record_date, temp_max, temp_min, rainfall_mm
        FROM weather_data
    """, conn)

    conn.close()

    prices["price_date"] = pd.to_datetime(prices["price_date"])
    weather["record_date"] = pd.to_datetime(weather["record_date"])

    df = prices.merge(
        weather,
        left_on=["district", "price_date"],
        right_on=["district", "record_date"],
        how="left"
    )

    df["month"] = df["price_date"].dt.month
    df["season"] = df["month"].map(
        lambda m: "kharif" if m in [6, 7, 8, 9, 10]
        else "rabi" if m in [11, 12, 1, 2, 3]
        else "zaid"
    )

    df = df.drop(columns=["record_date"], errors="ignore")
    df = df.sort_values("price_date")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Wrote {len(df)} rows -> {output_path}")
    print(df.head())

if __name__ == "__main__":
    build_dataset()