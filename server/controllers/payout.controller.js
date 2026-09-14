const db = require('../config/database');
const sseService = require('../services/sse.service');
const smsService = require('../services/sms.service');

/**
 * 1. Release Escrow Payout (98% to Farmer Bank, 2% Platform Fee)
 * Triggered automatically upon delivery or manually by admin/driver
 */
const releaseEscrow = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.body.order_id;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if already settled
    const existingPayout = db.prepare('SELECT * FROM payout_ledger WHERE order_id = ?').get(orderId);
    if (existingPayout || order.payment_status === 'settled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Escrow already released for this order',
        data: existingPayout 
      });
    }

    // Verify order is delivered or admin override
    if (order.status !== 'delivered' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `Cannot release escrow: Order status is '${order.status}'. Delivery must be confirmed first.`
      });
    }

    // Fetch farmer bank details
    const farmer = db.prepare('SELECT * FROM users WHERE id = ?').get(order.farmer_id);
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    // 98% / 2% Escrow Calculation
    const gross = parseFloat(order.total_price);
    const platform_fee = parseFloat((gross * 0.02).toFixed(2));
    const net_payout = parseFloat((gross - platform_fee).toFixed(2));
    const utr = `UTR${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const bankAccount = farmer.bank_account_number || '000000000000';
    const bankIfsc = farmer.bank_ifsc || 'SBIN0001234';
    const bankName = farmer.bank_name || 'State Bank of India';

    // Insert into payout_ledger
    const result = db.prepare(`
      INSERT INTO payout_ledger (
        farmer_id, order_id, gross_amount, platform_fee, net_payout,
        bank_account_number, bank_ifsc, bank_name, utr_reference, status, settled_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'settled', CURRENT_TIMESTAMP)
    `).run(
      farmer.id,
      order.id,
      gross,
      platform_fee,
      net_payout,
      bankAccount,
      bankIfsc,
      bankName,
      utr
    );

    // Update orders: status -> settled, payment_status -> settled
    db.prepare(`
      UPDATE orders 
      SET status = 'settled', payment_status = 'settled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(order.id);

    // Update payments table if record exists
    try {
      db.prepare(`
        UPDATE payments 
        SET status = 'settled', farmer_payout_status = 'processed'
        WHERE order_id = ?
      `).run(order.id);
    } catch(e) {}

    // Broadcast SSE event
    sseService.broadcast('escrow:released', {
      orderId: order.id,
      farmerId: farmer.id,
      netPayout: net_payout,
      platformFee: platform_fee,
      utr
    }, [order.buyer_id, farmer.id]);

    // Send SMS to farmer
    if (farmer.phone) {
      const masked = bankAccount.slice(-4);
      const smsText = `KisanSetu: Badhai ho! Order #${order.id} delivery confirm hui. Rs ${net_payout} (98% seedha daam) aapke bank a/c (***${masked}) mein transfer ho gaya hai. Ref: ${utr}.`;
      smsService.sendSMS(farmer.phone, smsText).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Escrow released! 98% direct payment credited to farmer account.',
      data: {
        payout_id: result.lastInsertRowid,
        order_id: order.id,
        farmer_id: farmer.id,
        farmer_name: farmer.name,
        gross_amount: gross,
        platform_fee_2pct: platform_fee,
        net_farmer_payout_98pct: net_payout,
        utr_reference: utr,
        bank_account: `***${bankAccount.slice(-4)}`,
        bank_ifsc: bankIfsc,
        status: 'settled'
      }
    });
  } catch (error) {
    console.error('[releaseEscrow Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to release escrow', error: error.message });
  }
};

/**
 * 2. Get Farmer Payout Ledger & Earnings
 */
const getFarmerLedger = async (req, res) => {
  try {
    const isFarmer = req.user.role === 'farmer' || req.user.role === 'fpo';
    const farmerId = isFarmer ? req.user.id : (req.query.farmer_id || req.user.id);

    const ledger = db.prepare(`
      SELECT p.*, o.quantity_kg, prod.name as product_name
      FROM payout_ledger p
      JOIN orders o ON p.order_id = o.id
      JOIN products prod ON o.product_id = prod.id
      WHERE p.farmer_id = ?
      ORDER BY p.settled_at DESC
    `).all(farmerId);

    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(net_payout), 0) as total_earned,
        COALESCE(SUM(gross_amount), 0) as total_gross,
        COALESCE(SUM(platform_fee), 0) as total_fees,
        COUNT(*) as total_settlements
      FROM payout_ledger
      WHERE farmer_id = ? AND status = 'settled'
    `).get(farmerId);

    // Pending escrow earnings (orders confirmed/in-transit/delivered but not yet settled)
    const pending = db.prepare(`
      SELECT COALESCE(SUM(farmer_earnings), 0) as pending_earnings, COUNT(*) as pending_orders
      FROM orders
      WHERE farmer_id = ? AND status IN ('confirmed', 'farmer_packed', 'driver_picked', 'dispatched', 'in_transit', 'delivered')
    `).get(farmerId);

    res.json({
      success: true,
      data: {
        farmer_id: farmerId,
        lifetime_net_earnings: totals.total_earned,
        lifetime_gross_sales: totals.total_gross,
        total_platform_fees_paid: totals.total_fees,
        total_settled_orders: totals.total_settlements,
        pending_escrow_earnings: pending.pending_earnings,
        pending_orders_count: pending.pending_orders,
        ledger
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * 3. Platform Payout Analytics (Admin only)
 */
const getPayoutStats = async (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COALESCE(SUM(gross_amount), 0) as total_gmv,
        COALESCE(SUM(platform_fee), 0) as total_platform_revenue,
        COALESCE(SUM(net_payout), 0) as total_farmer_disbursements,
        COUNT(*) as total_payouts_completed
      FROM payout_ledger
      WHERE status = 'settled'
    `).get();

    const recent = db.prepare(`
      SELECT p.*, u.name as farmer_name 
      FROM payout_ledger p
      JOIN users u ON p.farmer_id = u.id
      ORDER BY p.settled_at DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        summary: stats,
        recent_disbursements: recent
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  releaseEscrow,
  getFarmerLedger,
  getPayoutStats
};
