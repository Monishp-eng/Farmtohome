const db = require('../config/database');
const fetch = require('node-fetch');
const matchingService = require('../services/matching.service');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

const getDemandForecast = async (req, res) => {
  try {
    const { category, region } = req.query;
    let query = 'SELECT * FROM demand_forecasts WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND product_category = ?';
      params.push(category);
    }
    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }
    
    query += ' ORDER BY forecast_date DESC';

    const forecasts = db.prepare(query).all(...params);
    res.json({ success: true, data: forecasts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const predictDemand = async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/v1/predict-demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      // Fallback to legacy endpoint if /v1 fails
      const fallback = await fetch(`${AI_SERVICE_URL}/api/predict-demand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      if (fallback.ok) {
        return res.json(await fallback.json());
      }
      const errText = await response.text();
      return res.status(response.status).json({ success: false, message: 'AI service error', error: errText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, message: 'AI service is not running. Start it with: python app.py (in ai-service/)' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const optimizeRouteProxy = async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/v1/route-optimizer/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const fallback = await fetch(`${AI_SERVICE_URL}/api/optimize-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      if (fallback.ok) {
        return res.json(await fallback.json());
      }
      const errText = await response.text();
      return res.status(response.status).json({ success: false, message: 'AI service error', error: errText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, message: 'AI service is not running. Start it with: python app.py (in ai-service/)' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Crop Doctor AI - ResNet50 Transfer Learning Leaf Disease Diagnosis
 * Accepts image file upload (multipart) or base64 image
 */
const diagnoseCrop = async (req, res) => {
  try {
    let imageBase64 = null;

    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
    } else if (req.body.image) {
      imageBase64 = req.body.image;
    } else if (req.body.image_base64) {
      imageBase64 = req.body.image_base64;
    }

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Leaf image is required (either as multipart file upload or base64 string in image field)'
      });
    }

    const cropName = req.body.crop || req.body.cropName || null;

    const response = await fetch(`${AI_SERVICE_URL}/v1/crop-doctor/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, crop: cropName })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, message: 'Crop Doctor AI error', error: errText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, message: 'AI service is not running. Start it with: python app.py (in ai-service/)' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get AI Model Version Metadata & Auto-Retrain Status
 */
const getModelInfo = async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/v1/model-info`);
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Unable to retrieve model info' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, message: 'AI service is offline' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Trigger Weekly Auto-Retrain on Demand
 */
const triggerRetrain = async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/v1/demand-forecast/retrain`, {
      method: 'POST'
    });
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Retrain failed' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Bulk Buyer Preference Learning Engine
 */
const getBuyerPreferences = async (req, res) => {
  try {
    const { buyerId } = req.params;
    const preferences = await matchingService.getBulkBuyerPreferences(buyerId);
    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getPriceRecommendation = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = db.prepare('SELECT name, category, msp_price, price_per_kg FROM products WHERE id = ?').get(productId);
    
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const marketPrice = db.prepare('SELECT AVG(modal_price) as avg_market_price, MAX(msp) as market_msp FROM market_prices WHERE commodity LIKE ?').get(`%${product.name}%`);
    
    let rawMsp = product.msp_price || (marketPrice && marketPrice.market_msp) || 0;
    let rawAvgMarket = (marketPrice && marketPrice.avg_market_price) ? marketPrice.avg_market_price : product.price_per_kg;

    let msp_kg = rawMsp > 100 ? (rawMsp / 100) : rawMsp;
    let avg_market_kg = rawAvgMarket > 100 ? (rawAvgMarket / 100) : rawAvgMarket;

    let baseBenchmark = Math.max(msp_kg, avg_market_kg);
    let recommendedPrice = baseBenchmark > 0 ? (baseBenchmark * 1.05) : (product.price_per_kg * 1.05);

    res.json({ 
      success: true, 
      data: {
        current_price: product.price_per_kg,
        recommended_price: parseFloat(recommendedPrice.toFixed(2)),
        market_average: parseFloat(avg_market_kg.toFixed(2)),
        msp: parseFloat(msp_kg.toFixed(2)),
        reasoning: "Calculated dynamically based on real-time APMC Mandi modal benchmarks and MSP, with a 5% fair-trade margin."
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDemandForecast,
  predictDemand,
  optimizeRouteProxy,
  diagnoseCrop,
  getModelInfo,
  triggerRetrain,
  getBuyerPreferences,
  getPriceRecommendation
};
