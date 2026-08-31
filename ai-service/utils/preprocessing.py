import pandas as pd
import numpy as np
import math

def load_demand_data(filepath):
    try:
        df = pd.read_csv(filepath)
        df['date'] = pd.to_datetime(df['date'])
        return df
    except Exception as e:
        print(f"Error loading demand data: {e}")
        return pd.DataFrame()

def load_price_data(filepath):
    try:
        df = pd.read_csv(filepath)
        df['date'] = pd.to_datetime(df['date'])
        return df
    except Exception as e:
        print(f"Error loading price data: {e}")
        return pd.DataFrame()

def encode_season(month):
    # Indian agricultural seasons:
    # Kharif: Jun-Oct (6-10) -> 1
    # Rabi: Nov-Mar (11, 12, 1, 2, 3) -> 2
    # Zaid: Mar-Jun (4, 5) -> 3 (Treating 3 as overlap, mapping 4-5 specifically)
    if 6 <= month <= 10:
        return 'Kharif', 1
    elif month in [11, 12, 1, 2, 3]:
        return 'Rabi', 2
    else:
        return 'Zaid', 3

def get_festival_index(month):
    # Rough estimation based on major Indian festivals
    # Oct-Nov (Navratri, Diwali) -> High (0.9 - 1.0)
    # Aug (Shravan) -> Mod-High (0.7)
    # Jan (Makar Sankranti/Pongal) -> Mod (0.6)
    # Others -> Base (0.2 - 0.4)
    festival_weights = {
        1: 0.6, 2: 0.3, 3: 0.4, 4: 0.3, 5: 0.3,
        6: 0.2, 7: 0.5, 8: 0.7, 9: 0.6, 10: 1.0,
        11: 0.9, 12: 0.5
    }
    return festival_weights.get(month, 0.2)

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in kilometers

    lat1_rad = math.radians(float(lat1))
    lon1_rad = math.radians(float(lon1))
    lat2_rad = math.radians(float(lat2))
    lon2_rad = math.radians(float(lon2))

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return distance

def prepare_features(df):
    if df.empty:
        return df
    
    df['month'] = df['date'].dt.month
    df['quarter'] = df['date'].dt.quarter
    
    # Apply season encoding
    season_info = df['month'].apply(encode_season)
    df['season_name'] = [x[0] for x in season_info]
    df['season'] = [x[1] for x in season_info]
    
    # Apply festival index
    df['festival_index'] = df['month'].apply(get_festival_index)
    
    # Handle missing rainfall or set defaults if missing
    if 'rainfall_mm' not in df.columns:
        df['rainfall_mm'] = np.random.uniform(10, 200, size=len(df))
        
    df['rainfall_index'] = df['rainfall_mm'] / df['rainfall_mm'].max() if df['rainfall_mm'].max() > 0 else 0
    
    return df
