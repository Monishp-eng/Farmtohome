import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime
from dateutil.relativedelta import relativedelta
import warnings

# Suppress sklearn warnings
warnings.filterwarnings('ignore')

from utils.preprocessing import load_demand_data, prepare_features, encode_season, get_festival_index

class DemandForecaster:
    def __init__(self, data_path=None):
        if data_path is None:
            # Default to the expected relative path
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_path = os.path.join(base_dir, 'data', 'sample_demand.csv')
            
        self.models = {}
        self.category_data = {}
        
        # Load and prepare data
        raw_df = load_demand_data(data_path)
        if not raw_df.empty:
            self.df = prepare_features(raw_df)
            self._train_models()
        else:
            self.df = pd.DataFrame()
            print("Warning: Demand data could not be loaded. Model will be untrained.")

    def _train_models(self):
        # Features to use for training
        features = ['month', 'quarter', 'season', 'festival_index', 'rainfall_index']
        
        # Train a separate model for each category
        categories = self.df['category'].unique()
        for cat in categories:
            cat_df = self.df[self.df['category'] == cat]
            if len(cat_df) > 10:  # Need minimum data to train
                X = cat_df[features]
                y = cat_df['demand_kg']
                
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                model.fit(X, y)
                
                self.models[cat] = model
                self.category_data[cat] = cat_df

    def predict(self, category, region, months_ahead):
        results = []
        category = str(category).lower() if category else ''
        region = str(region) if region else 'Maharashtra'
        try:
            months_ahead = int(months_ahead)
        except Exception:
            months_ahead = 3
            
        if category not in self.models:
            # Fallback for unknown category
            return [{
                "month": (datetime.now() + relativedelta(months=i+1)).month,
                "year": (datetime.now() + relativedelta(months=i+1)).year,
                "predicted_demand_kg": 0,
                "confidence_score": 0.0,
                "trend": "stable",
                "factors": ["Insufficient data for category"]
            } for i in range(months_ahead)]
            
        model = self.models[category]
        cat_df = self.category_data[category]
        
        current_date = datetime.now()
        base_demand = cat_df['demand_kg'].mean() if not cat_df.empty else 1000
        
        prev_pred = None
        
        for i in range(months_ahead):
            target_date = current_date + relativedelta(months=i+1)
            target_month = target_date.month
            target_quarter = (target_month - 1) // 3 + 1
            
            season_name, season_idx = encode_season(target_month)
            fest_idx = get_festival_index(target_month)
            
            # Historical avg rainfall for the month as proxy
            hist_rainfall = cat_df[cat_df['month'] == target_month]['rainfall_index'].mean()
            if pd.isna(hist_rainfall):
                hist_rainfall = 0.5
                
            X_pred = pd.DataFrame([{
                'month': target_month,
                'quarter': target_quarter,
                'season': season_idx,
                'festival_index': fest_idx,
                'rainfall_index': hist_rainfall
            }])
            
            pred_val = float(model.predict(X_pred)[0])
            
            # Add regional variance (mock logic)
            region_modifier = 1.0
            if region.lower() in ['maharashtra', 'punjab']:
                region_modifier = 1.2
            elif region.lower() in ['kerala', 'tamil nadu']:
                region_modifier = 1.1
                
            final_pred = max(0, pred_val * region_modifier)
            
            # Confidence decreases over time
            base_confidence = 0.85
            confidence = max(0.4, base_confidence - (i * 0.05))
            
            # Determine trend
            if prev_pred is None:
                trend = "stable"
            else:
                diff = (final_pred - prev_pred) / prev_pred
                if diff > 0.05:
                    trend = "increasing"
                elif diff < -0.05:
                    trend = "decreasing"
                else:
                    trend = "stable"
                    
            prev_pred = final_pred
            
            # Determine factors
            factors = []
            if fest_idx >= 0.7:
                factors.append("festival_demand")
            if season_idx == 1:
                factors.append("kharif_season")
            elif season_idx == 2:
                factors.append("rabi_season")
            else:
                factors.append("zaid_season")
                
            results.append({
                "month": target_month,
                "year": target_date.year,
                "predicted_demand_kg": round(final_pred, 2),
                "confidence_score": round(confidence, 2),
                "trend": trend,
                "factors": factors
            })
            
        return results
