import os
import psycopg2

DATABASE_URL = os.environ["DATABASE_URL"]

def check_drift(threshold=15.0):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT model_name, AVG(ABS(error_pct)) as avg_error, COUNT(*)
        FROM model_predictions_log
        WHERE predicted_at >= NOW() - INTERVAL '7 days'
          AND actual_value IS NOT NULL
        GROUP BY model_name
    """)
    rows = cur.fetchall()
    if not rows:
        print("No predictions logged yet in the last 7 days.")
    for name, avg_error, n in rows:
        status = "DRIFT DETECTED" if avg_error and avg_error > threshold else "OK"
        print(f"{name}: avg_error={avg_error:.2f}% over {n} predictions -> {status}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_drift()