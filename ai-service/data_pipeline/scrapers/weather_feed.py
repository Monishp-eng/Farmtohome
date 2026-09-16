import os
import requests
import psycopg2
from datetime import date, timedelta
from psycopg2.extras import execute_values

DATABASE_URL = os.environ["DATABASE_URL"]

LOCATIONS = [
    {"district": "Coimbatore", "lat": 11.0168, "lon": 76.9558},
    {"district": "Cuddalore", "lat": 11.7480, "lon": 79.7714},
    {"district": "Dharmapuri", "lat": 12.1211, "lon": 78.1582},
    {"district": "Dindigul", "lat": 10.3673, "lon": 77.9803},
    {"district": "Erode", "lat": 11.3410, "lon": 77.7172},
    {"district": "Kallakuruchi", "lat": 11.7401, "lon": 78.9597},
    {"district": "Kancheepuram", "lat": 12.8342, "lon": 79.7036},
    {"district": "Karur", "lat": 10.9601, "lon": 78.0766},
    {"district": "Krishnagiri", "lat": 12.5266, "lon": 78.2150},
    {"district": "Madurai", "lat": 9.9252, "lon": 78.1198},
    {"district": "Nagapattinam", "lat": 10.7672, "lon": 79.8449},
    {"district": "Namakkal", "lat": 11.2189, "lon": 78.1677},
    {"district": "Perambalur", "lat": 11.2342, "lon": 78.8807},
    {"district": "Pudukkottai", "lat": 10.3813, "lon": 78.8213},
    {"district": "Ranipet", "lat": 12.9249, "lon": 79.3308},
    {"district": "Salem", "lat": 11.6643, "lon": 78.1460},
    {"district": "Sivaganga", "lat": 9.8433, "lon": 78.4809},
    {"district": "Thanjavur", "lat": 10.7870, "lon": 79.1378},
    {"district": "Theni", "lat": 10.0104, "lon": 77.4977},
    {"district": "Thiruchirappalli", "lat": 10.7905, "lon": 78.7047},
    {"district": "Thirunelveli", "lat": 8.7139, "lon": 77.7567},
    {"district": "Thirupur", "lat": 11.1085, "lon": 77.3411},
    {"district": "Thiruvannamalai", "lat": 12.2253, "lon": 79.0747},
    {"district": "Thiruvarur", "lat": 10.7661, "lon": 79.6345},
]

def fetch_historical_weather(lat, lon, start_date, end_date):
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat, "longitude": lon,
        "start_date": start_date, "end_date": end_date,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "timezone": "Asia/Kolkata"
    }
    r = requests.get(url, params=params, timeout=60,
                      headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    return r.json()["daily"]

def save_historical_weather(years_back=3):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS weather_data (
            id SERIAL PRIMARY KEY,
            district VARCHAR(100),
            record_date DATE,
            temp_max NUMERIC(5,2),
            temp_min NUMERIC(5,2),
            rainfall_mm NUMERIC(6,2),
            UNIQUE(district, record_date)
        )
    """)
    conn.commit()

    end_date = date.today() - timedelta(days=1)
    start_date = end_date - timedelta(days=365 * years_back)

    for loc in LOCATIONS:
        print(f"Fetching {years_back} years of weather for {loc['district']}...")
        d = fetch_historical_weather(
            loc["lat"], loc["lon"],
            start_date.isoformat(), end_date.isoformat()
        )
        rows = list(zip(
            [loc["district"]] * len(d["time"]),
            d["time"],
            d["temperature_2m_max"],
            d["temperature_2m_min"],
            d["precipitation_sum"]
        ))
        execute_values(cur, """
            INSERT INTO weather_data (district, record_date, temp_max, temp_min, rainfall_mm)
            VALUES %s
            ON CONFLICT (district, record_date) DO UPDATE
            SET temp_max = EXCLUDED.temp_max, temp_min = EXCLUDED.temp_min, rainfall_mm = EXCLUDED.rainfall_mm
        """, rows)
        conn.commit()
        print(f"  -> {len(rows)} days saved")

    cur.close()
    conn.close()
    print("Historical weather data updated for", len(LOCATIONS), "districts")

if __name__ == "__main__":
    save_historical_weather()