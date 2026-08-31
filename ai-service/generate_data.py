import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_demand_data():
    np.random.seed(42)
    categories = ['vegetables', 'fruits', 'grains', 'pulses', 'dairy', 'spices', 'oilseeds']
    regions = ['Maharashtra', 'Punjab', 'Kerala', 'Gujarat', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Delhi']
    
    start_date = datetime.now() - timedelta(days=730) # 24 months
    dates = [start_date + timedelta(days=i) for i in range(730)]
    
    # Generate around 600 rows randomly sampled
    sampled_dates = np.random.choice(dates, size=600)
    
    data = []
    for d in sampled_dates:
        cat = np.random.choice(categories)
        reg = np.random.choice(regions)
        month = pd.to_datetime(d).month
        
        # Season
        if 6 <= month <= 10:
            season = 'Kharif'
        elif month in [11, 12, 1, 2, 3]:
            season = 'Rabi'
        else:
            season = 'Zaid'
            
        festival_flag = 1 if month in [8, 10, 11] else 0
        
        base_demand = np.random.uniform(500, 2000)
        if festival_flag:
            base_demand *= 1.5
            
        demand_kg = round(base_demand, 2)
        price = round(np.random.uniform(20, 200), 2)
        rainfall = round(np.random.uniform(0, 300) if season == 'Kharif' else np.random.uniform(0, 50), 2)
        temp = round(np.random.uniform(15, 35), 1)
        
        data.append({
            'date': pd.to_datetime(d).strftime('%Y-%m-%d'),
            'category': cat,
            'region': reg,
            'demand_kg': demand_kg,
            'price_per_kg': price,
            'rainfall_mm': rainfall,
            'temperature_c': temp,
            'festival_flag': festival_flag,
            'season': season
        })
        
    df = pd.DataFrame(data)
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/sample_demand.csv', index=False)
    print("Created data/sample_demand.csv")

def generate_price_data():
    np.random.seed(43)
    commodities = ['Wheat', 'Rice', 'Tomato', 'Onion', 'Potato', 'Milk', 'Apple', 'Mango']
    markets = ['Azadpur Mandi', 'Vashi APMC', 'Lasalgaon', 'Keshopur', 'Ghazipur']
    states = ['Delhi', 'Maharashtra', 'Maharashtra', 'Delhi', 'Delhi']
    
    start_date = datetime.now() - timedelta(days=365)
    dates = [start_date + timedelta(days=i) for i in range(365)]
    sampled_dates = np.random.choice(dates, size=250)
    
    data = []
    for d in sampled_dates:
        idx = np.random.randint(0, len(markets))
        market = markets[idx]
        state = states[idx]
        commodity = np.random.choice(commodities)
        
        msp_base = np.random.uniform(1500, 3000)
        msp = round(msp_base, 2)
        
        min_price = round(msp_base * np.random.uniform(0.8, 1.1), 2)
        max_price = round(min_price * np.random.uniform(1.1, 1.5), 2)
        modal_price = round((min_price + max_price) / 2, 2)
        
        arrival = round(np.random.uniform(10, 500), 2)
        
        data.append({
            'date': pd.to_datetime(d).strftime('%Y-%m-%d'),
            'commodity': commodity,
            'market': market,
            'state': state,
            'min_price': min_price,
            'max_price': max_price,
            'modal_price': modal_price,
            'msp': msp,
            'arrival_qty_tonnes': arrival
        })
        
    df = pd.DataFrame(data)
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/sample_prices.csv', index=False)
    print("Created data/sample_prices.csv")

if __name__ == "__main__":
    generate_demand_data()
    generate_price_data()
