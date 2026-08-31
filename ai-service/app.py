import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

from models.demand_forecaster import DemandForecaster
from models.route_optimizer import RouteOptimizer

app = Flask(__name__)
CORS(app)

# Initialize models
try:
    forecaster = DemandForecaster()
except Exception as e:
    print(f"Error initializing DemandForecaster: {e}")
    forecaster = None

try:
    optimizer = RouteOptimizer()
except Exception as e:
    print(f"Error initializing RouteOptimizer: {e}")
    optimizer = None

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/predict-demand', methods=['POST'])
def predict_demand():
    if not forecaster:
        return jsonify({"error": "Forecaster model not initialized"}), 500
        
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON request"}), 400
        
    category = data.get('category')
    region = data.get('region')
    months_ahead = data.get('months_ahead', 3)
    
    if not category or not region:
        return jsonify({"error": "Missing required fields: category, region"}), 400
        
    try:
        predictions = forecaster.predict(category, region, months_ahead)
        return jsonify(predictions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/optimize-route', methods=['POST'])
def optimize_route():
    if not optimizer:
        return jsonify({"error": "Optimizer model not initialized"}), 500
        
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON request"}), 400
        
    origin = data.get('origin')
    destinations = data.get('destinations')
    
    if not origin or not destinations:
        return jsonify({"error": "Missing required fields: origin, destinations"}), 400
        
    try:
        result = optimizer.optimize(origin, destinations)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/price-recommendation', methods=['GET'])
def price_recommendation():
    commodity = request.args.get('commodity')
    
    try:
        current_price = float(request.args.get('current_price'))
        market_price = float(request.args.get('market_price'))
        msp = float(request.args.get('msp'))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid or missing numerical parameters: current_price, market_price, msp"}), 400
        
    if not commodity:
        return jsonify({"error": "Missing required parameter: commodity"}), 400
        
    # Logic for price recommendation
    # Aim to stay competitive with market price while ensuring it's above MSP if possible
    # We want a slight premium for better quality if current price suggests it, but usually close to market price
    
    # Heuristic
    if current_price < msp:
        recommended_price = msp * 1.05  # Recommend selling slightly above MSP
        recommendation_type = "increase"
        reasoning = f"Current price is below the Minimum Support Price (MSP). It is highly recommended to increase the price to at least {recommended_price:.2f} to ensure profitability."
    elif current_price > market_price * 1.2:
        recommended_price = market_price * 1.1  # Keep it premium but closer to market
        recommendation_type = "decrease"
        reasoning = "Current price is significantly higher than the market average. A slight decrease will make the product more competitive while retaining a premium margin."
    elif current_price < market_price * 0.9:
        recommended_price = market_price * 0.95
        recommendation_type = "increase"
        reasoning = "Current price is below the market average. Increasing it slightly will improve margins without losing price competitiveness."
    else:
        recommended_price = current_price
        recommendation_type = "maintain"
        reasoning = "Current price is well-aligned with market dynamics. Maintaining this price is recommended for steady demand."
        
    recommended_price = round(recommended_price, 2)
    
    return jsonify({
        "recommended_price": recommended_price,
        "reasoning": reasoning,
        "price_comparison": {
            "current": current_price,
            "market_avg": market_price,
            "msp": msp,
            "recommended": recommended_price
        },
        "recommendation_type": recommendation_type
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
