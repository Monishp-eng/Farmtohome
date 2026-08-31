const db = require('../config/database');
const mapsService = require('../services/maps.service');

/**
 * Calculate distance in km between two GPS coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

const getAllProducts = async (req, res) => {
  try {
    const { 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      organic, 
      qualityGrade,
      location,
      buyer_type = 'all', // 'consumer', 'bulk', 'all'
      minQuantity,
      user_lat,
      user_lng,
      sortBy = 'newest',
      limit = 100, 
      offset = 0 
    } = req.query;
    
    let query = `
      SELECT p.*, 
             u.name as farmer_name, 
             u.location as farmer_location, 
             u.state as farmer_state,
             u.phone as farmer_phone,
             u.latitude as farmer_lat,
             u.longitude as farmer_lng
      FROM products p 
      JOIN users u ON p.farmer_id = u.id 
      WHERE p.status = 'available'
    `;
    const params = [];

    if (category && category !== 'all') {
      query += ' AND LOWER(p.category) = ?';
      params.push(category.toLowerCase());
    }
    
    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ? OR u.location LIKE ? OR u.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (minPrice) {
      query += ' AND p.price_per_kg >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ' AND p.price_per_kg <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (organic !== undefined && organic !== 'all') {
      query += ' AND p.is_organic = ?';
      params.push(organic === 'true' || organic === true || organic === '1' ? 1 : 0);
    }

    if (qualityGrade && qualityGrade !== 'all' && qualityGrade !== 'All') {
      query += ' AND p.quality_grade = ?';
      params.push(qualityGrade.toUpperCase());
    }

    if (location && location !== 'all') {
      query += ' AND (u.location LIKE ? OR u.state LIKE ?)';
      params.push(`%${location}%`, `%${location}%`);
    }

    // Bulk Buyer Filter (MOQ: minimum available quantity >= 50kg)
    if (buyer_type === 'bulk' || minQuantity) {
      const minQtyVal = minQuantity ? parseFloat(minQuantity) : 50;
      query += ' AND p.quantity_kg >= ?';
      params.push(minQtyVal);
    }

    // Sorting
    if (sortBy === 'price_asc') {
      query += ' ORDER BY p.price_per_kg ASC';
    } else if (sortBy === 'price_desc') {
      query += ' ORDER BY p.price_per_kg DESC';
    } else if (sortBy === 'quantity_desc') {
      query += ' ORDER BY p.quantity_kg DESC';
    } else {
      query += ' ORDER BY p.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const products = db.prepare(query).all(...params);

    // Fetch Mandi and MSP benchmark data for price transparency
    const marketPrices = db.prepare('SELECT commodity, AVG(modal_price) as avg_modal, MAX(msp) as msp FROM market_prices GROUP BY commodity').all();
    const priceMap = {};
    marketPrices.forEach(m => {
      priceMap[m.commodity.toLowerCase()] = {
        mandi_per_kg: m.avg_modal ? parseFloat((m.avg_modal / 100).toFixed(1)) : null,
        msp_per_kg: m.msp ? parseFloat((m.msp / 100).toFixed(1)) : null
      };
    });

    // Attach distance and market benchmarks to each product
    const enrichedProducts = products.map(prod => {
      let distance_km = null;
      if (user_lat && user_lng && prod.farmer_lat && prod.farmer_lng) {
        distance_km = calculateDistance(parseFloat(user_lat), parseFloat(user_lng), prod.farmer_lat, prod.farmer_lng);
      }

      // Look up commodity benchmark
      const prodNameClean = prod.name.toLowerCase();
      let benchmark = null;
      for (const [comm, bmark] of Object.entries(priceMap)) {
        if (prodNameClean.includes(comm) || comm.includes(prodNameClean)) {
          benchmark = bmark;
          break;
        }
      }

      const mandiPrice = benchmark?.mandi_per_kg || parseFloat((prod.price_per_kg * 1.08).toFixed(1));
      const mspPrice = benchmark?.msp_per_kg || prod.msp_price || parseFloat((prod.price_per_kg * 0.9).toFixed(1));
      const supermarketPrice = parseFloat((prod.price_per_kg * 1.35).toFixed(1));

      // Minimum Order Quantity (MOQ) logic
      const isBulkAvailable = prod.quantity_kg >= 50;
      const bulkMoq = isBulkAvailable ? 50 : 5;

      return {
        ...prod,
        distance_km,
        benchmarks: {
          mandi_modal_price: mandiPrice,
          msp_price: mspPrice,
          supermarket_retail_price: supermarketPrice,
          consumer_savings_per_kg: parseFloat((supermarketPrice - prod.price_per_kg).toFixed(1)),
          farmer_share_pct: 98
        },
        bulk_details: {
          is_bulk_eligible: isBulkAvailable,
          moq_kg: bulkMoq,
          tiers: [
            { min_kg: 1, discount_pct: 0, price_per_kg: prod.price_per_kg },
            { min_kg: 50, discount_pct: 5, price_per_kg: parseFloat((prod.price_per_kg * 0.95).toFixed(1)) },
            { min_kg: 200, discount_pct: 10, price_per_kg: parseFloat((prod.price_per_kg * 0.90).toFixed(1)) },
            { min_kg: 1000, discount_pct: 15, price_per_kg: parseFloat((prod.price_per_kg * 0.85).toFixed(1)) }
          ]
        }
      };
    });

    // If sorting by distance
    if (sortBy === 'distance' && user_lat && user_lng) {
      enrichedProducts.sort((a, b) => (a.distance_km || 9999) - (b.distance_km || 9999));
    }

    res.json({ success: true, count: enrichedProducts.length, data: enrichedProducts });
  } catch (error) {
    console.error('[getAllProducts Error]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, 
             u.name as farmer_name, 
             u.location as farmer_location, 
             u.state as farmer_state,
             u.phone as farmer_phone,
             u.latitude as farmer_lat,
             u.longitude as farmer_lng
      FROM products p 
      JOIN users u ON p.farmer_id = u.id 
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Benchmark comparison
    const marketBench = db.prepare('SELECT AVG(modal_price) as avg_modal, MAX(msp) as msp FROM market_prices WHERE commodity LIKE ? COLLATE NOCASE').get(`%${product.name}%`);
    const mandiPrice = marketBench?.avg_modal ? parseFloat((marketBench.avg_modal / 100).toFixed(1)) : parseFloat((product.price_per_kg * 1.08).toFixed(1));
    const mspPrice = marketBench?.msp ? parseFloat((marketBench.msp / 100).toFixed(1)) : product.msp_price || parseFloat((product.price_per_kg * 0.9).toFixed(1));
    const supermarketPrice = parseFloat((product.price_per_kg * 1.35).toFixed(1));

    const enriched = {
      ...product,
      benchmarks: {
        mandi_modal_price: mandiPrice,
        msp_price: mspPrice,
        supermarket_retail_price: supermarketPrice,
        consumer_savings_per_kg: parseFloat((supermarketPrice - product.price_per_kg).toFixed(1)),
        farmer_share_pct: 98
      },
      bulk_details: {
        is_bulk_eligible: product.quantity_kg >= 50,
        moq_kg: product.quantity_kg >= 50 ? 50 : 1,
        tiers: [
          { min_kg: 1, discount_pct: 0, price_per_kg: product.price_per_kg },
          { min_kg: 50, discount_pct: 5, price_per_kg: parseFloat((product.price_per_kg * 0.95).toFixed(1)) },
          { min_kg: 200, discount_pct: 10, price_per_kg: parseFloat((product.price_per_kg * 0.90).toFixed(1)) },
          { min_kg: 1000, discount_pct: 15, price_per_kg: parseFloat((product.price_per_kg * 0.85).toFixed(1)) }
        ]
      }
    };

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, category, description, quantity_kg, price_per_kg, msp_price, quality_grade, image_url, is_organic, harvest_date, expiry_date } = req.body;
    const farmer_id = req.user.id;

    const stmt = db.prepare(`
      INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, msp_price, quality_grade, image_url, is_organic, harvest_date, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(farmer_id, name, category, description, quantity_kg, price_per_kg, msp_price, quality_grade || 'A', image_url, is_organic ? 1 : 0, harvest_date, expiry_date);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, category, description, quantity_kg, price_per_kg, quality_grade, status, is_organic } = req.body;
    const product_id = req.params.id;
    
    const product = db.prepare('SELECT farmer_id FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    if (product.farmer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }

    const stmt = db.prepare(`
      UPDATE products 
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          description = COALESCE(?, description),
          quantity_kg = COALESCE(?, quantity_kg),
          price_per_kg = COALESCE(?, price_per_kg),
          quality_grade = COALESCE(?, quality_grade),
          status = COALESCE(?, status),
          is_organic = COALESCE(?, is_organic)
      WHERE id = ?
    `);
    
    stmt.run(name, category, description, quantity_kg, price_per_kg, quality_grade, status, is_organic !== undefined ? (is_organic ? 1 : 0) : null, product_id);
    
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product_id = req.params.id;
    const product = db.prepare('SELECT farmer_id FROM products WHERE id = ?').get(product_id);
    
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    if (product.farmer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(product_id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getMyProducts = async (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE farmer_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getCategorySummary = async (req, res) => {
  try {
    const summary = db.prepare('SELECT category, COUNT(*) as count, SUM(quantity_kg) as total_kg FROM products WHERE status = "available" GROUP BY category').all();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getCategorySummary
};
