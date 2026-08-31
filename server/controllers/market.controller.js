const db = require('../config/database');

const getMarketPrices = async (req, res) => {
  try {
    const { commodity, state, date } = req.query;
    
    let query = 'SELECT * FROM market_prices WHERE 1=1';
    const params = [];

    if (commodity) {
      query += ' AND commodity = ?';
      params.push(commodity);
    }
    if (state) {
      query += ' AND state = ?';
      params.push(state);
    }
    if (date) {
      query += ' AND price_date = ?';
      params.push(date);
    }
    
    query += ' ORDER BY price_date DESC LIMIT 100';

    const prices = db.prepare(query).all(...params);
    res.json({ success: true, data: prices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getMspData = async (req, res) => {
  try {
    const mspData = db.prepare('SELECT DISTINCT commodity, msp FROM market_prices WHERE msp IS NOT NULL').all();
    res.json({ success: true, data: mspData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const comparePrice = async (req, res) => {
  try {
    const { productName } = req.params;
    
    const marketPrice = db.prepare(`
      SELECT AVG(modal_price) as avg_market_price, 
             MIN(min_price) as min_market_price, 
             MAX(max_price) as max_market_price, 
             MAX(msp) as msp 
      FROM market_prices 
      WHERE commodity LIKE ? COLLATE NOCASE
    `).get(`%${productName}%`);

    const rawModal = marketPrice?.avg_market_price || 2200;
    const rawMsp = marketPrice?.msp || Math.round(rawModal * 0.85);

    const modalKg = parseFloat((rawModal / 100).toFixed(1));
    const mspKg = parseFloat((rawMsp / 100).toFixed(1));
    const suggestedFairPrice = parseFloat((Math.max(mspKg, modalKg) * 1.05).toFixed(1));
    const minViablePrice = parseFloat((mspKg * 0.95).toFixed(1));

    res.json({ 
      success: true, 
      data: {
        commodity: productName,
        modal_price_quintal: rawModal,
        msp_quintal: rawMsp,
        modal_price_kg: modalKg,
        msp_kg: mspKg,
        suggested_fair_price_kg: suggestedFairPrice,
        min_viable_price_kg: minViablePrice
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getPriceTrends = async (req, res) => {
  try {
    const { commodity } = req.params;
    const trends = db.prepare('SELECT price_date, AVG(modal_price) as avg_price FROM market_prices WHERE commodity = ? GROUP BY price_date ORDER BY price_date ASC').all(commodity);
    
    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getMarketPrices,
  getMspData,
  comparePrice,
  getPriceTrends
};
