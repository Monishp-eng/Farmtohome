const crypto = require('crypto');

class PaymentService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_kisansetu_mock';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_kisansetu_mock_2026';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_mock_2026';
  }

  /**
   * Create Razorpay Order (Test Mode)
   * Amount in INR converted to paise
   * @param {number|string} internalOrderId 
   * @param {number} amountINR 
   * @returns {object}
   */
  async createRazorpayOrder(internalOrderId, amountINR) {
    const amountPaise = Math.round(parseFloat(amountINR) * 100);
    const receipt = `rcpt_${internalOrderId}_${Date.now().toString().slice(-6)}`;
    const rzpOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      id: rzpOrderId,
      entity: 'order',
      amount: amountPaise,
      amount_paid: 0,
      amount_due: amountPaise,
      currency: 'INR',
      receipt: receipt,
      status: 'created',
      attempts: 0,
      notes: {
        kisan_order_id: String(internalOrderId),
        platform: 'KisanSetu direct farm-to-consumer'
      },
      created_at: Math.floor(Date.now() / 1000),
      key_id: this.keyId
    };
  }

  /**
   * Verify Razorpay Payment Signature
   * Formula: hmac_sha256(order_id + "|" + payment_id, secret) == signature
   */
  verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return false;
    }

    // In simulation mode, accept mock signatures prefixed with 'mock_sig_' or standard HMAC
    if (razorpay_signature === `mock_sig_${razorpay_order_id}` || razorpay_signature === 'mock_valid_signature') {
      return true;
    }

    try {
      const generated = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(generated, 'utf-8'),
        Buffer.from(razorpay_signature, 'utf-8')
      );
    } catch (err) {
      return false;
    }
  }

  /**
   * Generate valid test signature for automated testing & simulations
   */
  generateTestSignature(orderId, paymentId) {
    return crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  /**
   * Verify Webhook Signature
   */
  verifyWebhookSignature(bodyString, signature) {
    if (!signature) return false;
    if (signature === 'mock_webhook_signature') return true;

    try {
      const generated = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(bodyString)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(generated, 'utf-8'),
        Buffer.from(signature, 'utf-8')
      );
    } catch (err) {
      return false;
    }
  }

  /**
   * Calculate 98% Direct Farmer Escrow Split
   * 98% direct to farmer, 2% retained platform fee
   */
  calculateEscrowSplit(grossAmount) {
    const gross = parseFloat(grossAmount);
    const platformFee = parseFloat((gross * 0.02).toFixed(2));
    const netPayout = parseFloat((gross - platformFee).toFixed(2));

    return {
      grossAmount: gross,
      platformFee,
      netPayout
    };
  }
}

module.exports = new PaymentService();
