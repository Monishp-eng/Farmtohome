const db = require('../config/database');
const { dispatchFarmerSMS } = require('./ivr.controller');
const mapsService = require('../services/maps.service');

const placeOrder = async (req, res) => {
  try {
    const { 
      product_id, 
      quantity_kg, 
      delivery_address, 
      order_type = 'individual', // 'individual' or 'bulk_contract'
      recurring_frequency = 'none', // 'none', 'weekly', 'bi_weekly', 'monthly'
      delivery_window = 'standard' // 'express', 'standard', 'scheduled'
    } = req.body;

    const buyer_id = req.user.id;
    const qty = parseFloat(quantity_kg);

    const product = db.prepare(`
      SELECT p.*, p.quantity_kg as available_qty, 
             u.name as farmer_name, u.phone as farmer_phone, u.location as farmer_location,
             u.latitude as farmer_lat, u.longitude as farmer_lng
      FROM products p 
      JOIN users u ON p.farmer_id = u.id 
      WHERE p.id = ?
    `).get(product_id);

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    if (product.available_qty < qty) {
      return res.status(400).json({ success: false, message: `Insufficient stock. Only ${product.available_qty}kg available.` });
    }

    // Bulk tiered volume discounts
    let unitPrice = product.price_per_kg;
    let discountPct = 0;
    if (qty >= 1000) {
      discountPct = 15;
      unitPrice = parseFloat((unitPrice * 0.85).toFixed(2));
    } else if (qty >= 200) {
      discountPct = 10;
      unitPrice = parseFloat((unitPrice * 0.90).toFixed(2));
    } else if (qty >= 50) {
      discountPct = 5;
      unitPrice = parseFloat((unitPrice * 0.95).toFixed(2));
    }

    const total_price = parseFloat((unitPrice * qty).toFixed(2));
    const platform_fee = parseFloat((total_price * 0.02).toFixed(2));
    const farmer_earnings = parseFloat((total_price - platform_fee).toFixed(2));

    const result = db.prepare(`
      INSERT INTO orders (buyer_id, product_id, farmer_id, quantity_kg, total_price, platform_fee, farmer_earnings, delivery_address, status, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'paid')
    `).run(buyer_id, product_id, product.farmer_id, qty, total_price, platform_fee, farmer_earnings, delivery_address || 'T. Nagar, Chennai, Tamil Nadu');

    const orderId = result.lastInsertRowid;

    // Deduct stock
    db.prepare('UPDATE products SET quantity_kg = quantity_kg - ? WHERE id = ?').run(qty, product_id);

    // Auto-create Direct Farmer to Consumer Logistics Task
    try {
      // Find default logistics driver (Kiran)
      const driver = db.prepare("SELECT id, name, phone FROM users WHERE role = 'logistics' LIMIT 1").get();
      const driver_id = driver?.id || 13;

      const farmer = db.prepare('SELECT * FROM users WHERE id = ?').get(product.farmer_id);
      
      const buyerUser = db.prepare('SELECT location, latitude, longitude FROM users WHERE id = ?').get(buyer_id);
      const buyerLoc = delivery_address || buyerUser?.location || 'T. Nagar, Chennai, Tamil Nadu';
      const buyerGeo = await mapsService.geocode(buyerLoc);

      const pickupLat = farmer.latitude || product.farmer_lat || 13.0694;
      const pickupLng = farmer.longitude || product.farmer_lng || 80.1948;
      const pickupLoc = farmer.location || product.farmer_location || 'Farmer Location';

      const deliveryLat = buyerGeo.lat || 13.0418; // Default T. Nagar Chennai
      const deliveryLng = buyerGeo.lng || 80.2341;

      const distanceKm = mapsService.calculateDistanceKm(pickupLat, pickupLng, deliveryLat, deliveryLng) || 8.5;
      const estTimeHrs = parseFloat((distanceKm / 25).toFixed(1)); // urban speed ~25 km/h

      db.prepare(`
        INSERT INTO logistics (
          order_id, product_id, driver_id, 
          pickup_location, pickup_lat, pickup_lng, 
          delivery_location, delivery_lat, delivery_lng, 
          distance_km, estimated_time_hrs, vehicle_type, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned')
      `).run(
        orderId, 
        product_id,
        driver_id, 
        pickupLoc, 
        pickupLat, 
        pickupLng, 
        buyerLoc, 
        deliveryLat, 
        deliveryLng, 
        distanceKm, 
        estTimeHrs, 
        qty >= 100 ? 'mini_truck' : 'ev_3wheeler'
      );
    } catch (logErr) {
      console.warn('[Logistics Auto-Sync Warning]:', logErr.message);
    }

    // AUTONOMOUS STEP: Instant SMS notification to Farmer
    if (product.farmer_phone) {
      const farmerSMS = `KisanSetu: Naya Order #${orderId} confirm hua! (${qty}kg ${product.name}). Kul kamai: Rs ${farmer_earnings}. Direct pickup from your farm has been scheduled.`;
      dispatchFarmerSMS(product.farmer_phone, farmerSMS);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully and synchronized with Logistics & Farmer SMS',
      data: { 
        orderId, 
        product_name: product.name,
        quantity_kg: qty,
        unitPrice,
        discountPct,
        total_price, 
        platform_fee, 
        farmer_earnings, 
        order_type,
        recurring_frequency,
        status: 'pending' 
      }
    });
  } catch (error) {
    console.error('[placeOrder Error]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const { role, id } = req.user;
    let orders;
    
    if (role === 'admin') {
      const query = `
        SELECT o.*, p.name as product_name, p.category as product_category, p.image_url,
               u.name as buyer_name, u.phone as buyer_phone,
               f.name as farmer_name, f.phone as farmer_phone, f.location as farmer_location,
               l.status as logistics_status, l.distance_km, l.estimated_time_hrs
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        JOIN users u ON o.buyer_id = u.id 
        JOIN users f ON o.farmer_id = f.id 
        LEFT JOIN logistics l ON o.id = l.order_id
        ORDER BY o.created_at DESC
      `;
      orders = db.prepare(query).all();
    } else if (role === 'farmer' || role === 'fpo') {
      const query = `
        SELECT o.*, p.name as product_name, p.category as product_category, p.image_url,
               u.name as buyer_name, u.phone as buyer_phone,
               l.status as logistics_status, l.distance_km
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        JOIN users u ON o.buyer_id = u.id 
        LEFT JOIN logistics l ON o.id = l.order_id
        WHERE o.farmer_id = ? 
        ORDER BY o.created_at DESC
      `;
      orders = db.prepare(query).all(id);
    } else {
      const query = `
        SELECT o.*, p.name as product_name, p.category as product_category, p.image_url,
               u.name as farmer_name, u.phone as farmer_phone, u.location as farmer_location,
               l.status as logistics_status, l.distance_km, l.estimated_time_hrs
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        JOIN users u ON o.farmer_id = u.id 
        LEFT JOIN logistics l ON o.id = l.order_id
        WHERE o.buyer_id = ? 
        ORDER BY o.created_at DESC
      `;
      orders = db.prepare(query).all(id);
    }
    
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, p.name as product_name, p.image_url, p.category as product_category,
             b.name as buyer_name, b.phone as buyer_phone, b.location as buyer_location,
             f.name as farmer_name, f.phone as farmer_phone, f.location as farmer_location
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users b ON o.buyer_id = b.id
      JOIN users f ON o.farmer_id = f.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    // Auth check
    if (order.buyer_id !== req.user.id && order.farmer_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'logistics') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    const logistics = db.prepare('SELECT * FROM logistics WHERE order_id = ?').get(order.id);
    order.logistics = logistics || null;

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order_id = req.params.id;
    
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['dispatched', 'cancelled'],
      'dispatched': ['in_transit'],
      'in_transit': ['delivered'],
      'delivered': [],
      'cancelled': []
    };
    
    const order = db.prepare('SELECT farmer_id, buyer_id, status FROM orders WHERE id = ?').get(order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    if (order.farmer_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'logistics') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }
    
    if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status transition from ${order.status} to ${status}` });
    }

    if (status === 'confirmed') {
      db.prepare("UPDATE orders SET status = ?, payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, order_id);
    } else {
      db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, order_id);
    }

    // Mirror to Logistics table
    const logStatusMap = {
      'dispatched': 'picked_up',
      'in_transit': 'in_transit',
      'delivered': 'delivered'
    };
    if (logStatusMap[status]) {
      db.prepare('UPDATE logistics SET status = ? WHERE order_id = ?').run(logStatusMap[status], order_id);
    }
    
    res.json({ success: true, message: `Order status updated to ${status} and mirrored to logistics` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getOrderStats = async (req, res) => {
  try {
    const totalOrdersRow = db.prepare('SELECT COUNT(*) as count, SUM(total_price) as revenue FROM orders').get();
    const statusCounts = db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all();
    const recentOrders = db.prepare('SELECT id, status, total_price, created_at FROM orders ORDER BY created_at DESC LIMIT 5').all();
    
    res.json({ 
      success: true, 
      data: {
        totalOrders: totalOrdersRow.count,
        totalRevenue: totalOrdersRow.revenue || 0,
        ordersByStatus: statusCounts,
        recentOrders: recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats
};
