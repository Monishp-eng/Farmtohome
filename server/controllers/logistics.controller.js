const db = require('../config/database');
const mapsService = require('../services/maps.service');
const smsService = require('../services/sms.service');
const sseService = require('../services/sse.service');

/**
 * Get all deliveries for the logged-in driver (or all if admin)
 * Supports Direct Farmer to Consumer Deliveries
 */
const getMyDeliveries = async (req, res) => {
  try {
    const isDriver = req.user.role === 'logistics' || req.user.role === 'driver';
    const driverId = req.user.id;

    let query = `
      SELECT 
        l.*,
        o.total_price,
        o.quantity_kg as order_quantity,
        p.name as product_name,
        p.category as product_category,
        u_farmer.name as farmer_name,
        u_farmer.phone as farmer_phone,
        u_farmer.location as farmer_farm_location,
        u_farmer.bank_account_number as farmer_bank_account,
        u_farmer.bank_ifsc as farmer_ifsc_code,
        u_farmer.bank_name as farmer_bank_name,
        u_farmer.bank_verified as farmer_bank_verified,
        u_buyer.name as buyer_name,
        u_buyer.phone as buyer_phone
      FROM logistics l
      LEFT JOIN orders o ON l.order_id = o.id
      LEFT JOIN products p ON (l.product_id = p.id OR o.product_id = p.id)
      LEFT JOIN users u_farmer ON p.farmer_id = u_farmer.id
      LEFT JOIN users u_buyer ON o.buyer_id = u_buyer.id
    `;

    let deliveries;
    if (isDriver) {
      query += ` WHERE l.driver_id = ? ORDER BY l.created_at DESC`;
      deliveries = db.prepare(query).all(driverId);
    } else {
      query += ` ORDER BY l.created_at DESC`;
      deliveries = db.prepare(query).all();
    }

    res.json({ success: true, data: deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Assign or Update Delivery Task
 */
const assignDelivery = async (req, res) => {
  try {
    const { 
      order_id, 
      product_id,
      driver_id, 
      pickup_location, 
      pickup_lat, 
      pickup_lng, 
      delivery_location, 
      delivery_lat, 
      delivery_lng, 
      distance_km,
      vehicle_type = 'mini_truck'
    } = req.body;
    
    const estimated_time_hrs = distance_km ? parseFloat((distance_km / 40).toFixed(1)) : 2;

    const stmt = db.prepare(`
      INSERT INTO logistics (
        order_id, product_id, driver_id, 
        pickup_location, pickup_lat, pickup_lng, 
        delivery_location, delivery_lat, delivery_lng, 
        distance_km, estimated_time_hrs, vehicle_type, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned')
    `);

    const result = stmt.run(
      order_id || null, 
      product_id || null, 
      driver_id || req.user.id, 
      pickup_location, 
      pickup_lat, 
      pickup_lng, 
      delivery_location, 
      delivery_lat, 
      delivery_lng, 
      distance_km || 25, 
      estimated_time_hrs,
      vehicle_type
    );
    
    if (order_id) {
      db.prepare('UPDATE orders SET status = "dispatched" WHERE id = ?').run(order_id);
    }

    res.status(201).json({
      success: true,
      message: 'Delivery assigned successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Method 4: Farm-Gate Passbook & Bank Verification by Logistics Driver
 */
const verifyFarmerBank = async (req, res) => {
  try {
    const { farmer_phone, bank_account, ifsc_code, bank_name } = req.body;
    const cleanPhone = (farmer_phone || '').replace(/[^0-9]/g, '').slice(-10);

    const farmer = db.prepare("SELECT * FROM users WHERE phone = ? AND role = 'farmer'").get(cleanPhone);
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer account not found' });
    }

    db.prepare(`
      UPDATE users 
      SET bank_account_number = ?, bank_ifsc = ?, bank_name = ?, bank_verified = 1
      WHERE id = ?
    `).run(bank_account, ifsc_code, bank_name || 'State Bank of India', farmer.id);

    // Send instant SMS confirmation to farmer
    const masked = bank_account.slice(-4);
    const smsText = `KisanSetu: Driver Kiran ungal Bank Passbook-ai verify seidhar. Ungal ${bank_name || 'Bank'} A/c (***${masked}) payout-kku linked aagi verified aagiyullathu.`;
    smsService.sendSMS(cleanPhone, smsText).catch(() => {});

    res.json({
      success: true,
      message: 'Farmer bank details verified & linked for instant payouts!',
      data: {
        farmer_name: farmer.name,
        bank_account: `***${masked}`,
        ifsc_code,
        bank_name: bank_name || 'State Bank of India',
        verified: true
      }
    });
  } catch(error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Update Delivery Progress Status
 * Stages: assigned -> picked_up -> in_transit -> delivered
 */
const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const delivery_id = req.params.id;
    
    const delivery = db.prepare('SELECT * FROM logistics WHERE id = ?').get(delivery_id);
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    
    if (delivery.driver_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this delivery' });
    }

    const validTransitions = {
      'assigned': ['picked_up'],
      'picked_up': ['in_transit'],
      'in_transit': ['delivered'],
      'delivered': []
    };

    if (!validTransitions[delivery.status] || !validTransitions[delivery.status].includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid transition from ${delivery.status} to ${status}` });
    }

    let query = `UPDATE logistics SET status = ?`;
    const params = [status];

    if (status === 'picked_up') {
      query += `, pickup_time = CURRENT_TIMESTAMP`;
    } else if (status === 'delivered') {
      query += `, delivery_time = CURRENT_TIMESTAMP`;
    }

    query += ` WHERE id = ?`;
    params.push(delivery_id);

    db.prepare(query).run(...params);

    if (delivery.order_id && status === 'delivered') {
      db.prepare('UPDATE orders SET status = "delivered", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(delivery.order_id);
    } else if (delivery.order_id && status === 'in_transit') {
      db.prepare('UPDATE orders SET status = "in_transit", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(delivery.order_id);
    } else if (delivery.order_id && status === 'picked_up') {
      db.prepare('UPDATE orders SET status = "driver_picked", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(delivery.order_id);
    }

    // Broadcast SSE to buyer/farmer dashboards for real-time tracking
    if (delivery.order_id) {
      try {
        const order = db.prepare('SELECT buyer_id, farmer_id, quantity_kg FROM orders WHERE id = ?').get(delivery.order_id);
        if (order) {
          const orderStatus = status === 'picked_up' ? 'driver_picked' : status;
          sseService.broadcast('delivery:progressed', {
            deliveryId: delivery_id,
            orderId: delivery.order_id,
            status: orderStatus,
            timestamp: new Date().toISOString()
          }, [order.buyer_id, order.farmer_id]);

          // SMS to buyer on key delivery milestones
          const buyer = db.prepare('SELECT phone FROM users WHERE id = ?').get(order.buyer_id);
          if (buyer?.phone) {
            const msgs = {
              'picked_up': `KisanSetu: Your order #${delivery.order_id} has been picked up by driver! On its way.`,
              'in_transit': `KisanSetu: Your order #${delivery.order_id} is in transit. Arriving soon!`,
              'delivered': `KisanSetu: Your order #${delivery.order_id} has been delivered! Thank you.`
            };
            if (msgs[status]) smsService.sendSMS(buyer.phone, msgs[status]).catch(() => {});
          }
        }
      } catch(e) {}
    }

    res.json({ success: true, message: `Delivery updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Proxy Route Optimization to Python 2-Opt TSP Microservice
 */
const optimizeRoute = async (req, res) => {
  try {
    const { origin, destinations } = req.body;

    if (!origin || !destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return res.status(400).json({ success: false, message: 'Origin and destinations array are required' });
    }

    const response = await globalThis.fetch('http://127.0.0.1:5001/api/optimize-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destinations })
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Route optimization service error' });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to connect to Python AI route optimizer', error: error.message });
  }
};

module.exports = {
  getMyDeliveries,
  assignDelivery,
  verifyFarmerBank,
  updateDeliveryStatus,
  optimizeRoute
};
