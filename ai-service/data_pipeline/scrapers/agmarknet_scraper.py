import os
import requests
import psycopg2
from datetime import datetime
from datetime import date
from psycopg2.extras import execute_values

AGMARKNET_API_KEY = os.environ["DATA_GOV_IN_API_KEY"]
RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
DATABASE_URL = os.environ["DATABASE_URL"]

def fetch_agmarknet(commodity=None, state="Tamil Nadu", limit=500, retries=3):
    url = f"https://api.data.gov.in/resource/{RESOURCE_ID}"
    params = {
        "api-key": AGMARKNET_API_KEY,
        "format": "json",
        "limit": limit,
        "filters[state]": state,
    }
    if commodity:
        params["filters[commodity]"] = commodity

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    import time
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=60)
            resp.raise_for_status()
            return resp.json().get("records", [])
        except requests.exceptions.ReadTimeout:
            print(f"Attempt {attempt}/{retries} timed out, retrying...")
            time.sleep(5)
    raise Exception("Agmarknet API not responding after retries — check network/key")
def upsert_prices(records):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    rows = []
    for r in records:
        try:
            price_date = datetime.strptime(r["arrival_date"], "%d/%m/%Y").date()
            rows.append((
                r["commodity"], r["market"], r["market"], r["state"], r["district"],
                float(r["min_price"] or 0), float(r["max_price"] or 0),
                float(r["modal_price"] or 0), price_date
            ))
        except (KeyError, ValueError) as e:
            print(f"Skipping row due to error: {e} -> {r}")
            continue

    query = """
        INSERT INTO market_prices
        (commodity, market, market_name, state, district, min_price, max_price, modal_price, price_date)
        VALUES %s
        ON CONFLICT (commodity, market, price_date)
        DO UPDATE SET min_price = EXCLUDED.min_price,
                      max_price = EXCLUDED.max_price,
                      modal_price = EXCLUDED.modal_price
    """
    execute_values(cur, query, rows)
    conn.commit()
    cur.close()
    conn.close()
    print(f"[{date.today()}] Upserted {len(rows)} price rows")
if __name__ == "__main__":
    records = fetch_agmarknet()
    upsert_prices(records)