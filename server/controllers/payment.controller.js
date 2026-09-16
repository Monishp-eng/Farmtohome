const db = require('../config/database');
const paymentService = require('../services/payment.service');
const sseService = require('../services/sse.service');
const { notifyOrderEvent } = require('../services/notification.service');

/**
 * 1. Create Razorpay Payment Order for an existing KisanSetu Order
 */
const createOrder = async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.payment_status === 'paid' || order.payment_status === 'settled' || order.payment_status === 'escrow') {
      return res.status(400).json({ success: false, message: `Order already paid (Status: ${order.payment_status})` });
    }

    // Call payment service
    const rzpOrder = await paymentService.createRazorpayOrder(order.id, order.total_price);

    // Save pending payment record into payments table
    try {
      db.prepare(`
        INSERT INTO payments (
          order_id, user_id, payment_gateway, gateway_order_id, 
          amount, currency, status, farmer_payout_status
        )
        VALUES (?, ?, 'razorpay_test', ?, ?, 'INR', 'pending', 'pending')
      `).run(order.id, req.user.id, rzpOrder.id, order.total_price);
    } catch (e) {
      // Update if record exists
      db.prepare(`
        UPDATE payments 
        SET gateway_order_id = ?, status = 'pending', amount = ?
        WHERE order_id = ?
      `).run(rzpOrder.id, order.total_price, order.id);
    }

    res.status(201).json({
      success: true,
      message: 'Razorpay order created successfully (Test Mode)',
      data: {
        razorpay_order: rzpOrder,
        order_id: order.id,
        amount: order.total_price,
        currency: 'INR',
        key_id: rzpOrder.key_id
      }
    });
  } catch (error) {
    console.error('[createOrder Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order', error: error.message });
  }
};

/**
 * 2. Verify Razorpay Payment Signature & Lock in Escrow
 */
const verifyPayment = async (req, res) => {
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'order_id, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
      });
    }

    const isValid = paymentService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Lock funds in Escrow: payments.status -> captured
    try {
      db.prepare(`
        UPDATE payments 
        SET gateway_payment_id = ?, gateway_signature = ?, status = 'captured', 
            escrow_release_date = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `).run(razorpay_payment_id, razorpay_signature, order_id);
    } catch (e) {
      console.warn('[Payments table update note]:', e.message);
    }

    // Move order to confirmed with payment held in escrow
    db.prepare(`
      UPDATE orders 
      SET status = 'confirmed', payment_status = 'escrow', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(order_id);

    // Notify real-time subscribers via SSE
    sseService.broadcast('payment:captured', {
      orderId: order.id,
      paymentId: razorpay_payment_id,
      status: 'escrow',
      amount: order.total_price
    }, [order.buyer_id, order.farmer_id]);

    sseService.broadcast('order:status_changed', {
      orderId: order.id,
      status: 'confirmed',
      payment_status: 'escrow'
    }, [order.buyer_id, order.farmer_id]);

    // M4 Layer 2: payment-received notification after successful verification.
    try {
      const buyer = db.prepare(
        'SELECT phone, name, fcm_token, notification_language FROM users WHERE id = ?'
      ).get(order.buyer_id);
      const farmer = db.prepare(
        'SELECT phone, name, fcm_token, notification_language FROM users WHERE id = ?'
      ).get(order.farmer_id);
      [buyer, farmer].forEach(person => {
        if (person?.phone || person?.fcm_token) {
          notifyOrderEvent({
            event: 'payment_received',
            phone: person.phone,
            pushToken: person.fcm_token,
            language: person.notification_language || 'en',
            orderId: order.id,
            customerName: person.name,
            amount: order.total_price
          }).catch(err => console.warn('[M4 Notification] payment_received:', err.message));
        }
      });
    } catch (notificationErr) {
      console.warn('[M4 Payment Notification Error]:', notificationErr.message);
    }

    res.json({
      success: true,
      message: 'Payment verified and held in escrow. Order confirmed.',
      data: {
        order_id: order.id,
        payment_id: razorpay_payment_id,
        escrow_status: 'captured',
        order_status: 'confirmed'
      }
    });
  } catch (error) {
    console.error('[verifyPayment Error]:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
  }
};

/**
 * 3. Razorpay Webhook Handler (Idempotent)
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature if configured
    if (signature && !paymentService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload?.payment?.entity;

    if (payload && payload.order_id) {
      const paymentRecord = db.prepare('SELECT * FROM payments WHERE gateway_order_id = ?').get(payload.order_id);
      
      if (paymentRecord) {
        if (event === 'payment.captured' && paymentRecord.status !== 'captured' && paymentRecord.status !== 'settled') {
          db.prepare(`
            UPDATE payments 
            SET status = 'captured', gateway_payment_id = ?, escrow_release_date = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(payload.id, paymentRecord.id);

          db.prepare(`
            UPDATE orders 
            SET status = 'confirmed', payment_status = 'escrow', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(paymentRecord.order_id);
        } else if (event === 'payment.failed') {
          db.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").run(paymentRecord.id);
        }
      }
    }

    res.json({ success: true, received: true, event });
  } catch (error) {
    console.error('[handleWebhook Error]:', error);
    res.status(500).json({ success: false, message: 'Webhook processing error', error: error.message });
  }
};

/**
 * 4. Get Payment & Escrow Record for an Order
 */
const getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(orderId);
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found for this order' });
    }

    const order = db.prepare('SELECT status, payment_status, total_price, farmer_earnings, platform_fee FROM orders WHERE id = ?').get(orderId);

    res.json({
      success: true,
      data: {
        ...payment,
        order_details: order
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentByOrder
};
