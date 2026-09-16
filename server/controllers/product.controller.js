const db = require('../config/database');
const mapsService = require('../services/maps.service');
const matchingService = require('../services/matching.service');

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

const defaultShelfLifeDays = {
  vegetables: 4,
  fruits: 6,
  dairy: 2,
  grains: 180,
  pulses: 180,
  spices: 365,
  oilseeds: 180
};

/**
 * Compute real-time freshness, shelf-life countdown and urgency status
 */
function computeFreshness(product) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  let harvestDate = product.harvest_date || (product.created_at ? product.created_at.split(' ')[0] : todayStr);
  let shelfDays = defaultShelfLifeDays[product.category?.toLowerCase()] || 4;
  
  let expiryDate = product.expiry_date;
  if (!expiryDate) {
    const hDate = new Date(harvestDate);
    const expDateObj = new Date(hDate.getTime() + shelfDays * 24 * 60 * 60 * 1000);
    expiryDate = expDateObj.toISOString().split('T')[0];
  }

  const expTime = new Date(expiryDate + 'T23:59:59').getTime();
  const remainingMs = expTime - now.getTime();
  const hoursRemaining = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60)));
  const daysRemaining = Math.max(0, Math.ceil(hoursRemaining / 24));
  
  const isHarvestedToday = harvestDate === todayStr;
  const isExpired = remainingMs <= 0;
  const isUrgentDeal = !isExpired && hoursRemaining > 0 && hoursRemaining <= 36; // <= 36 hours remaining

  let freshnessTier = 'fresh';
  let badgeText = `⏳ Fresh for ${daysRemaining} days`;
  let badgeColor = 'emerald';

  if (isExpired) {
    freshnessTier = 'expired';
    badgeText = 'Expired';
    badgeColor = 'red';
  } else if (isHarvestedToday) {
    freshnessTier = 'harvested_today';
    badgeText = '🌿 Harvested Today (Ultra Fresh)';
    badgeColor = 'green';
  } else if (isUrgentDeal) {
    freshnessTier = 'urgent_deal';
    badgeText = `⚡ Urgent Fresh Deal (${hoursRemaining}h left)`;
    badgeColor = 'amber';
  } else if (daysRemaining <= 2) {
    freshnessTier = 'ending_soon';
    badgeText = `⏳ ${daysRemaining} days left`;
    badgeColor = 'orange';
  } else if (daysRemaining > 30) {
    freshnessTier = 'stable';
    badgeText = `🌾 Long Shelf Life (${daysRemaining} days)`;
    badgeColor = 'blue';
  }

  return {
    harvest_date: harvestDate,
    expiry_date: expiryDate,
    shelf_life_days: shelfDays,
    hours_remaining: hoursRemaining,
    days_remaining: daysRemaining,
    is_harvested_today: isHarvestedToday,
    is_urgent_deal: isUrgentDeal,
    is_expired: isExpired,
    freshness_tier: freshnessTier,
    badge_text: badgeText,
    badge_color: badgeColor
  };
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
      freshnessFilter, // 'today', 'urgent', 'all'
      maxDistance, // in km (e.g. 50, 100)
      sortBy = 'smart_match', 
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
      const searchObj = matchingService.buildSearchClause(search);
      query += searchObj.clause;
      params.push(...searchObj.params);
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

    // Raw initial query
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

    // Fetch farmer review ratings map
    const farmerRatings = matchingService.getFarmerRatingsMap();

    // Reference user lat/lng (defaults to Bangalore/Chennai if not passed)
    const effectiveUserLat = user_lat ? parseFloat(user_lat) : 12.9716;
    const effectiveUserLng = user_lng ? parseFloat(user_lng) : 77.5946;

    // Attach distance, freshness, and market benchmarks to each product
    let enrichedProducts = products.map(prod => {
      let distance_km = null;
      if (prod.farmer_lat && prod.farmer_lng) {
        distance_km = calculateDistance(effectiveUserLat, effectiveUserLng, prod.farmer_lat, prod.farmer_lng);
      }

      // Real-Time Freshness & Shelf-Life Calculation
      const freshness = computeFreshness(prod);

      // Estimated Direct Transit Time (Farm -> Doorstep @ ~35km/h rural/suburban speed)
      const transitHours = distance_km ? Math.max(1, parseFloat((distance_km / 35).toFixed(1))) : 2;

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

      // 4-Factor Smart Matching Engine: Distance (40%), Price Competitiveness (25%), Freshness (20%), Farmer Rating (15%)
      const fRating = farmerRatings[prod.farmer_id] !== undefined ? farmerRatings[prod.farmer_id] : 4.5;
      const matchResult = matchingService.calculateSmartMatchScore(
        { ...prod, freshness },
        { userLat: effectiveUserLat, userLng: effectiveUserLng, mandiModalPrice: mandiPrice, farmerRating: fRating }
      );
      const smartMatchScore = matchResult.smart_match_score;

      // Minimum Order Quantity (MOQ) logic
      const isBulkAvailable = prod.quantity_kg >= 50;
      const bulkMoq = isBulkAvailable ? 50 : 1;

      return {
        ...prod,
        distance_km,
        estimated_transit_hours: transitHours,
        freshness,
        smart_match_score: smartMatchScore,
        smart_match_breakdown: matchResult.score_breakdown,
        farmer_rating: fRating,
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

    // Exclude strictly expired items from active marketplace view
    enrichedProducts = enrichedProducts.filter(p => !p.freshness.is_expired);

    // Apply Freshness Filter
    if (freshnessFilter === 'today') {
      enrichedProducts = enrichedProducts.filter(p => p.freshness.is_harvested_today);
    } else if (freshnessFilter === 'urgent') {
      enrichedProducts = enrichedProducts.filter(p => p.freshness.is_urgent_deal);
    }

    // Apply Distance Filter
    if (maxDistance) {
      const maxDistVal = parseFloat(maxDistance);
      enrichedProducts = enrichedProducts.filter(p => p.distance_km !== null && p.distance_km <= maxDistVal);
    }

    // Dynamic Multi-Factor Sorting
    if (sortBy === 'smart_match' || sortBy === 'nearest_freshest') {
      enrichedProducts.sort((a, b) => (b.smart_match_score || 0) - (a.smart_match_score || 0));
    } else if (sortBy === 'nearest') {
      enrichedProducts.sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
    } else if (sortBy === 'freshest') {
      enrichedProducts.sort((a, b) => (b.freshness.days_remaining || 0) - (a.freshness.days_remaining || 0));
    } else if (sortBy === 'urgent') {
      enrichedProducts.sort((a, b) => (a.freshness.hours_remaining || 999) - (b.freshness.hours_remaining || 999));
    } else if (sortBy === 'price_asc') {
      enrichedProducts.sort((a, b) => a.price_per_kg - b.price_per_kg);
    } else if (sortBy === 'price_desc') {
      enrichedProducts.sort((a, b) => b.price_per_kg - a.price_per_kg);
    } else if (sortBy === 'quantity_desc') {
      enrichedProducts.sort((a, b) => b.quantity_kg - a.quantity_kg);
    } else {
      // newest
      enrichedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Paginate in memory
    const totalCount = enrichedProducts.length;
    const paginated = enrichedProducts.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({ 
      success: true, 
      count: totalCount, 
      data: paginated,
      meta: {
        nearest_farm_distance_km: enrichedProducts[0]?.distance_km || null,
        urgent_fresh_deals_count: enrichedProducts.filter(p => p.freshness.is_urgent_deal).length,
        harvested_today_count: enrichedProducts.filter(p => p.freshness.is_harvested_today).length
      }
    });
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

    const { user_lat, user_lng } = req.query;
    const effectiveUserLat = user_lat ? parseFloat(user_lat) : 12.9716;
    const effectiveUserLng = user_lng ? parseFloat(user_lng) : 77.5946;

    let distance_km = null;
    if (product.farmer_lat && product.farmer_lng) {
      distance_km = calculateDistance(effectiveUserLat, effectiveUserLng, product.farmer_lat, product.farmer_lng);
    }

    const freshness = computeFreshness(product);
    const transitHours = distance_km ? Math.max(1, parseFloat((distance_km / 35).toFixed(1))) : 2;

    // Benchmark comparison
    const marketBench = db.prepare('SELECT AVG(modal_price) as avg_modal, MAX(msp) as msp FROM market_prices WHERE commodity LIKE ? COLLATE NOCASE').get(`%${product.name}%`);
    const mandiPrice = marketBench?.avg_modal ? parseFloat((marketBench.avg_modal / 100).toFixed(1)) : parseFloat((product.price_per_kg * 1.08).toFixed(1));
    const mspPrice = marketBench?.msp ? parseFloat((marketBench.msp / 100).toFixed(1)) : product.msp_price || parseFloat((product.price_per_kg * 0.9).toFixed(1));
    const supermarketPrice = parseFloat((product.price_per_kg * 1.35).toFixed(1));

    const enriched = {
      ...product,
      distance_km,
      estimated_transit_hours: transitHours,
      freshness,
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

    const todayStr = new Date().toISOString().split('T')[0];
    const effectiveHarvestDate = harvest_date || todayStr;

    let effectiveExpiryDate = expiry_date;
    if (!effectiveExpiryDate) {
      const shelfDays = defaultShelfLifeDays[category?.toLowerCase()] || 4;
      const hDate = new Date(effectiveHarvestDate);
      effectiveExpiryDate = new Date(hDate.getTime() + shelfDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const stmt = db.prepare(`
      INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, msp_price, quality_grade, image_url, is_organic, harvest_date, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      farmer_id, 
      name, 
      category, 
      description, 
      quantity_kg, 
      price_per_kg, 
      msp_price, 
      quality_grade || 'A', 
      image_url, 
      is_organic ? 1 : 0, 
      effectiveHarvestDate, 
      effectiveExpiryDate
    );
    
    res.status(201).json({
      success: true,
      message: 'Product listing published with freshness guarantee',
      data: { id: result.lastInsertRowid, harvest_date: effectiveHarvestDate, expiry_date: effectiveExpiryDate }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, category, description, quantity_kg, price_per_kg, quality_grade, status, is_organic, harvest_date, expiry_date } = req.body;
    const product_id = req.params.id;
    
    const product = db.prepare('SELECT farmer_id FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (req.user.role !== 'admin' && product.farmer_id !== req.user.id) {
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
          is_organic = COALESCE(?, is_organic),
          harvest_date = COALESCE(?, harvest_date),
          expiry_date = COALESCE(?, expiry_date)
      WHERE id = ?
    `);

    stmt.run(
      name, 
      category, 
      description, 
      quantity_kg, 
      price_per_kg, 
      quality_grade, 
      status, 
      is_organic !== undefined ? (is_organic ? 1 : 0) : null,
      harvest_date,
      expiry_date,
      product_id
    );

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product_id = req.params.id;
    const product = db.prepare('SELECT farmer_id FROM products WHERE id = ?').get(product_id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (req.user.role !== 'admin' && product.farmer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(product_id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getFarmerProducts = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const products = db.prepare('SELECT * FROM products WHERE farmer_id = ? ORDER BY created_at DESC').all(farmer_id);
    
    const enriched = products.map(p => ({
      ...p,
      freshness: computeFreshness(p)
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getCategorySummary = async (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(quantity_kg) as total_quantity_kg
      FROM products
      WHERE status = 'available'
      GROUP BY category
    `).all();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getSmartMatchProducts = async (req, res) => {
  req.query.sortBy = 'smart_match';
  return getAllProducts(req, res);
};

module.exports = {
  getAllProducts,
  getSmartMatchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFarmerProducts,
  getMyProducts: getFarmerProducts,
  getCategorySummary
};
