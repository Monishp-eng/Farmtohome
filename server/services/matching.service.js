const db = require('../config/database');

/**
 * Calculate Haversine distance in km
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

class MatchingService {
  /**
   * Proximity-Weighted Scoring:
   * - Distance: 40%
   * - Price Competitiveness: 25%
   * - Freshness: 20%
   * - Farmer Rating: 15%
   */
  calculateSmartMatchScore(product, options = {}) {
    const { userLat, userLng, mandiModalPrice, farmerRating } = options;

    // 1. Distance Score (40%)
    let distanceScore = 70; // default when coordinates are missing
    let distanceKm = null;
    if (userLat && userLng && product.farmer_lat && product.farmer_lng) {
      distanceKm = calculateDistance(userLat, userLng, product.farmer_lat, product.farmer_lng);
      if (distanceKm <= 10) {
        distanceScore = 100;
      } else if (distanceKm <= 25) {
        distanceScore = 90;
      } else if (distanceKm <= 50) {
        distanceScore = 80;
      } else if (distanceKm <= 100) {
        distanceScore = 65;
      } else if (distanceKm <= 250) {
        distanceScore = 45;
      } else {
        distanceScore = Math.max(10, Math.round(100 - (distanceKm * 0.25)));
      }
    }

    // 2. Price Competitiveness Score (25%)
    let priceScore = 75;
    const benchmark = mandiModalPrice || (product.price_per_kg * 1.05);
    if (benchmark > 0) {
      const priceRatio = product.price_per_kg / benchmark;
      if (priceRatio <= 0.90) {
        priceScore = 100; // 10%+ cheaper than Mandi
      } else if (priceRatio <= 1.05) {
        priceScore = 85;  // Fair trade Mandi alignment
      } else if (priceRatio <= 1.20) {
        priceScore = 70;  // Modest organic/farm-gate premium
      } else if (priceRatio <= 1.40) {
        priceScore = 50;
      } else {
        priceScore = 30;
      }
    }

    // 3. Freshness Score (20%)
    let freshnessScore = 70;
    const freshness = product.freshness || {};
    if (freshness.is_harvested_today) {
      freshnessScore = 100;
    } else if (freshness.days_remaining >= 4) {
      freshnessScore = 85;
    } else if (freshness.days_remaining >= 2) {
      freshnessScore = 70;
    } else if (freshness.is_urgent_deal) {
      freshnessScore = 65;
    } else if (freshness.is_expired) {
      freshnessScore = 0;
    }

    // 4. Farmer Rating Score (15%)
    const effectiveRating = farmerRating !== undefined && farmerRating !== null ? farmerRating : 4.5;
    const ratingScore = Math.min(100, Math.round((effectiveRating / 5.0) * 100));

    // Weighted Formula: 40% Distance + 25% Price + 20% Freshness + 15% Rating
    const weightedScore = Math.round(
      (distanceScore * 0.40) +
      (priceScore * 0.25) +
      (freshnessScore * 0.20) +
      (ratingScore * 0.15)
    );

    return {
      smart_match_score: Math.min(100, Math.max(0, weightedScore)),
      score_breakdown: {
        distance_score: distanceScore,
        distance_weight: '40%',
        price_score: priceScore,
        price_weight: '25%',
        freshness_score: freshnessScore,
        freshness_weight: '20%',
        rating_score: ratingScore,
        rating_weight: '15%'
      },
      distance_km: distanceKm,
      farmer_rating: effectiveRating
    };
  }

  /**
   * Get Farmer Ratings Map from Reviews Table
   */
  getFarmerRatingsMap() {
    try {
      const rows = db.prepare(`
        SELECT p.farmer_id, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        GROUP BY p.farmer_id
      `).all();

      const map = {};
      rows.forEach(r => {
        map[r.farmer_id] = parseFloat(Number(r.avg_rating).toFixed(1));
      });
      return map;
    } catch (e) {
      return {};
    }
  }

  /**
   * Build PostgreSQL Full-Text Search / SQLite Ranked Keyword Search Clause
   */
  buildSearchClause(searchQuery) {
    if (!searchQuery || !searchQuery.trim()) {
      return { clause: '', params: [] };
    }

    const clean = searchQuery.trim();
    if (db.isPostgres()) {
      return {
        clause: ` AND to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.category, '') || ' ' || u.name || ' ' || COALESCE(u.location, '')) @@ plainto_tsquery('english', ?)`,
        params: [clean]
      };
    } else {
      return {
        clause: ` AND (p.name LIKE ? OR p.description LIKE ? OR p.category LIKE ? OR u.name LIKE ? OR u.location LIKE ?)`,
        params: [`%${clean}%`, `%${clean}%`, `%${clean}%`, `%${clean}%`, `%${clean}%`]
      };
    }
  }

  /**
   * Bulk Buyer Preference Learning Engine
   * Learns weekly recurring order cycles (e.g. Restaurants, Hostels, Messes)
   * "What does this restaurant order every week?"
   */
  async getBulkBuyerPreferences(buyerId) {
    try {
      const query = `
        SELECT o.id, o.quantity_kg, o.total_price, o.created_at, o.status,
               p.id as product_id, p.name as product_name, p.category as product_category,
               p.price_per_kg
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.buyer_id = ? AND o.status NOT IN ('cancelled', 'disputed')
        ORDER BY o.created_at ASC
      `;

      const orders = db.prepare(query).all(buyerId);

      if (!orders || orders.length === 0) {
        return {
          buyer_id: buyerId,
          has_history: false,
          summary: "No prior bulk order history found for this account.",
          recurring_items: [],
          recommended_weekly_basket: []
        };
      }

      // Group orders by product name/category
      const grouped = {};
      const dayOfWeekCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      orders.forEach(ord => {
        const key = ord.product_name.toLowerCase();
        if (!grouped[key]) {
          grouped[key] = {
            product_name: ord.product_name,
            category: ord.product_category,
            order_count: 0,
            total_quantity_kg: 0,
            dates: [],
            quantities: [],
            avg_price_per_kg: 0
          };
        }
        grouped[key].order_count += 1;
        grouped[key].total_quantity_kg += ord.quantity_kg;
        grouped[key].quantities.push(ord.quantity_kg);
        grouped[key].dates.push(new Date(ord.created_at));

        const dObj = new Date(ord.created_at);
        if (!isNaN(dObj.getTime())) {
          dayOfWeekCounts[dObj.getDay()] += 1;
        }
      });

      // Find preferred reordering day of the week
      let bestDayIdx = 1; // default Monday
      let maxDayCount = -1;
      for (const [dayIdx, cnt] of Object.entries(dayOfWeekCounts)) {
        if (cnt > maxDayCount) {
          maxDayCount = cnt;
          bestDayIdx = parseInt(dayIdx);
        }
      }
      const preferredDay = dayNames[bestDayIdx];

      // Calculate reorder intervals and predictability for each recurring item
      const recurringItems = [];
      const recommendedBasket = [];

      for (const [pName, data] of Object.entries(grouped)) {
        const avgQty = Math.round(data.total_quantity_kg / data.order_count);
        let avgIntervalDays = 7; // default weekly cycle

        if (data.dates.length > 1) {
          let intervals = [];
          for (let i = 1; i < data.dates.length; i++) {
            const diffDays = Math.round((data.dates[i] - data.dates[i-1]) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) intervals.push(diffDays);
          }
          if (intervals.length > 0) {
            avgIntervalDays = Math.max(1, Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length));
          }
        }

        const frequencyType = avgIntervalDays <= 4 ? 'bi-weekly' : (avgIntervalDays <= 9 ? 'weekly' : 'monthly');
        const confidence = Math.min(95, Math.round(50 + (data.order_count * 12)));

        const itemAnalysis = {
          product_name: data.product_name,
          category: data.category,
          total_orders: data.order_count,
          total_volume_kg: data.total_quantity_kg,
          typical_weekly_qty_kg: avgQty,
          order_frequency: frequencyType,
          cycle_interval_days: avgIntervalDays,
          preferred_replenishment_day: preferredDay,
          recurrence_confidence_pct: confidence
        };
        recurringItems.push(itemAnalysis);

        // Fetch matching active farmer listings for this recurring crop
        const matchingListings = db.prepare(`
          SELECT p.id, p.name, p.category, p.quantity_kg, p.price_per_kg, u.name as farmer_name, u.location
          FROM products p
          JOIN users u ON p.farmer_id = u.id
          WHERE p.status = 'available' AND LOWER(p.name) LIKE ?
          ORDER BY p.price_per_kg ASC
          LIMIT 2
        `).all(`%${data.product_name.toLowerCase()}%`);

        recommendedBasket.push({
          crop: data.product_name,
          suggested_reorder_qty_kg: avgQty,
          next_scheduled_reorder_day: preferredDay,
          reasoning: `Purchased ${data.order_count} times; regular ${frequencyType} restocking schedule.`,
          available_suppliers: matchingListings
        });
      }

      return {
        buyer_id: buyerId,
        has_history: true,
        total_orders_analyzed: orders.length,
        preferred_weekly_order_day: preferredDay,
        recurring_items: recurringItems,
        recommended_weekly_basket: recommendedBasket,
        ai_insight: `Learned pattern: Buyer replenishes stock primarily every ${preferredDay} with average bulk basket size of ${recurringItems.reduce((acc, x) => acc + x.typical_weekly_qty_kg, 0)} kg.`
      };
    } catch (error) {
      console.error('[Bulk Buyer Preference Error]:', error);
      return { buyer_id: buyerId, error: error.message };
    }
  }
}

module.exports = new MatchingService();
