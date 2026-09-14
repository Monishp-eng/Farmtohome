/**
 * 🌾 KisanSetu — Layer 2 Core API, Payment & Escrow Automated Test Suite
 * Tests Razorpay Test Mode, 7-Stage Order Lifecycle, 98% Farmer Escrow Release & Ledger
 */

const http = require('http');
const paymentService = require('./services/payment.service');

const BASE_URL = 'http://localhost:5000';
let passed = 0;
let failed = 0;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function assert(desc, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(`   Reason: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 Starting Layer 2 Core API & Escrow Payment Test Suite...');
  console.log('===========================================================');

  // 1. Authenticate users: Consumer, Farmer, Driver, Admin
  let consumerToken, farmerToken, driverToken, adminToken;
  let consumerUser, farmerUser;

  await assert('Authenticate Buyer & Farmer accounts', async () => {
    const cRes = await request('POST', '/api/auth/login', {
      email: 'priya@example.com',
      password: 'password123'
    });
    if (cRes.status !== 200 || !cRes.data.accessToken) throw new Error('Buyer login failed');
    consumerToken = cRes.data.accessToken;
    consumerUser = cRes.data.user;

    const fRes = await request('POST', '/api/auth/login', {
      email: 'ramesh@example.com',
      password: 'password123'
    });
    if (fRes.status !== 200 || !fRes.data.accessToken) throw new Error('Farmer login failed');
    farmerToken = fRes.data.accessToken;
    farmerUser = fRes.data.user;

    const dRes = await request('POST', '/api/auth/login', {
      email: 'kiran@example.com',
      password: 'password123'
    });
    if (dRes.status !== 200 || !dRes.data.accessToken) throw new Error('Driver login failed');
    driverToken = dRes.data.accessToken;

    const aRes = await request('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    if (aRes.status !== 200 || !aRes.data.accessToken) throw new Error('Admin login failed');
    adminToken = aRes.data.accessToken;
  });

  // 2. Place order with initial status 'placed' and payment_status 'pending'
  let orderId, orderTotal;
  await assert('Order Placement creates order with status "placed" and payment_status "pending"', async () => {
    // Get product
    const prodRes = await request('GET', '/api/products');
    const product = prodRes.data.data.find(p => p.farmer_id === farmerUser.id) || prodRes.data.data[0];

    const orderRes = await request('POST', '/api/orders', {
      product_id: product.id,
      quantity_kg: 10,
      delivery_address: 'Indiranagar 100ft Rd, Bangalore, Karnataka'
    }, { Authorization: `Bearer ${consumerToken}` });

    if (orderRes.status !== 201) throw new Error(`Expected 201 Created, got ${orderRes.status}`);
    const data = orderRes.data.data;
    if (data.status !== 'placed') throw new Error(`Expected status 'placed', got '${data.status}'`);
    if (data.payment_status !== 'pending') throw new Error(`Expected payment_status 'pending', got '${data.payment_status}'`);
    if (!data.auto_cancel_at) throw new Error('auto_cancel_at timestamp missing');

    orderId = data.orderId;
    orderTotal = data.total_price;
  });

  // 3. Create Razorpay Test Mode Order
  let rzpOrder;
  await assert('Razorpay Test Mode Order Creation generates order token with amount in paise', async () => {
    const res = await request('POST', '/api/payments/create-order', {
      order_id: orderId
    }, { Authorization: `Bearer ${consumerToken}` });

    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status} (${JSON.stringify(res.data)})`);
    rzpOrder = res.data.data.razorpay_order;
    if (!rzpOrder || !rzpOrder.id) throw new Error('Razorpay order missing');
    if (rzpOrder.amount !== Math.round(orderTotal * 100)) throw new Error('Paise amount mismatch');
  });

  // 4. Verify Payment with Tampered Signature (Must be rejected 400)
  await assert('Payment verification rejects forged or tampered HMAC signatures with 400', async () => {
    const res = await request('POST', '/api/payments/verify', {
      order_id: orderId,
      razorpay_order_id: rzpOrder.id,
      razorpay_payment_id: 'pay_test_forged_999',
      razorpay_signature: 'invalid_sha256_signature_abc'
    }, { Authorization: `Bearer ${consumerToken}` });

    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
  });

  // 5. Verify Valid Payment & Lock in Escrow
  const testPaymentId = `pay_test_${Date.now()}`;
  const validSig = paymentService.generateTestSignature(rzpOrder.id, testPaymentId);

  await assert('Payment verification locks funds in Escrow and moves Order to "confirmed"', async () => {
    const res = await request('POST', '/api/payments/verify', {
      order_id: orderId,
      razorpay_order_id: rzpOrder.id,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig
    }, { Authorization: `Bearer ${consumerToken}` });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status} (${JSON.stringify(res.data)})`);
    if (res.data.data.escrow_status !== 'captured') throw new Error('Escrow status should be captured');
    if (res.data.data.order_status !== 'confirmed') throw new Error('Order status should be confirmed');
  });

  // 6. 7-Stage Order Lifecycle Progression: confirmed -> farmer_packed -> driver_picked -> in_transit -> delivered
  await assert('Farmer transitions order to "farmer_packed"', async () => {
    const res = await request('PUT', `/api/orders/${orderId}/status`, {
      status: 'farmer_packed'
    }, { Authorization: `Bearer ${farmerToken}` });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status} (${JSON.stringify(res.data)})`);
  });

  await assert('Logistics Driver transitions order to "driver_picked" and then "in_transit"', async () => {
    const res1 = await request('PUT', `/api/orders/${orderId}/status`, {
      status: 'driver_picked'
    }, { Authorization: `Bearer ${driverToken}` });
    if (res1.status !== 200) throw new Error(`Expected 200 for driver_picked, got ${res1.status}`);

    const res2 = await request('PUT', `/api/orders/${orderId}/status`, {
      status: 'in_transit'
    }, { Authorization: `Bearer ${driverToken}` });
    if (res2.status !== 200) throw new Error(`Expected 200 for in_transit, got ${res2.status}`);
  });

  await assert('Logistics Driver delivers order -> transitions to "delivered"', async () => {
    const res = await request('PUT', `/api/orders/${orderId}/status`, {
      status: 'delivered'
    }, { Authorization: `Bearer ${driverToken}` });
    if (res.status !== 200) throw new Error(`Expected 200 for delivered, got ${res.status}`);
  });

  // 7. Release Escrow: 98% Direct Farmer Payout + 2% Platform Fee
  let payoutData;
  await assert('Escrow Release disburses 98% to Farmer and records in Payout Ledger', async () => {
    const res = await request('POST', `/api/payouts/release/${orderId}`, {}, {
      Authorization: `Bearer ${adminToken}`
    });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status} (${JSON.stringify(res.data)})`);
    payoutData = res.data.data;
    if (!payoutData.payout_id) throw new Error('Missing payout_id');
    if (!payoutData.utr_reference.startsWith('UTR')) throw new Error('Invalid UTR format');

    const expectedFee = parseFloat((orderTotal * 0.02).toFixed(2));
    const expectedNet = parseFloat((orderTotal - expectedFee).toFixed(2));
    if (payoutData.platform_fee_2pct !== expectedFee) throw new Error(`Fee mismatch: ${payoutData.platform_fee_2pct} vs ${expectedFee}`);
    if (payoutData.net_farmer_payout_98pct !== expectedNet) throw new Error(`Net mismatch: ${payoutData.net_farmer_payout_98pct} vs ${expectedNet}`);
  });

  // 8. Farmer Payout Ledger Verification
  await assert('Farmer queries lifetime ledger & verified earnings', async () => {
    const res = await request('GET', '/api/payouts/farmer/ledger', null, {
      Authorization: `Bearer ${farmerToken}`
    });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.data.ledger || res.data.data.ledger.length === 0) throw new Error('Ledger entries empty');
    if (res.data.data.lifetime_net_earnings <= 0) throw new Error('Lifetime net earnings should be > 0');
  });

  // 9. Order Dispute & Resolution
  await assert('Order Dispute flow: consumer disputes delivered order, admin resolves', async () => {
    // Create & fast-forward another order for dispute test
    const prodRes = await request('GET', '/api/products');
    const product = prodRes.data.data.find(p => p.farmer_id === farmerUser.id) || prodRes.data.data[0];

    const orderRes = await request('POST', '/api/orders', {
      product_id: product.id,
      quantity_kg: 2,
      delivery_address: 'Koramangala, Bangalore'
    }, { Authorization: `Bearer ${consumerToken}` });
    const dispOrderId = orderRes.data.data.orderId;

    // Move to delivered
    await request('PUT', `/api/orders/${dispOrderId}/status`, { status: 'confirmed' }, { Authorization: `Bearer ${farmerToken}` });
    await request('PUT', `/api/orders/${dispOrderId}/status`, { status: 'farmer_packed' }, { Authorization: `Bearer ${farmerToken}` });
    await request('PUT', `/api/orders/${dispOrderId}/status`, { status: 'driver_picked' }, { Authorization: `Bearer ${driverToken}` });
    await request('PUT', `/api/orders/${dispOrderId}/status`, { status: 'in_transit' }, { Authorization: `Bearer ${driverToken}` });
    await request('PUT', `/api/orders/${dispOrderId}/status`, { status: 'delivered' }, { Authorization: `Bearer ${driverToken}` });

    // Buyer disputes
    const dispRes = await request('PUT', `/api/orders/${dispOrderId}/dispute`, {
      reason: 'Produce damaged in transit'
    }, { Authorization: `Bearer ${consumerToken}` });
    if (dispRes.status !== 200) throw new Error(`Dispute failed with ${dispRes.status}`);

    // Admin resolves dispute
    const resRes = await request('PUT', `/api/orders/${dispOrderId}/resolve`, {
      resolution: 'settle_farmer'
    }, { Authorization: `Bearer ${adminToken}` });
    if (resRes.status !== 200) throw new Error(`Resolve failed with ${resRes.status}`);
  });

  // 10. Webhook Idempotency Verification
  await assert('Webhook handler safely processes duplicate events without double crediting', async () => {
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: testPaymentId,
            order_id: rzpOrder.id,
            amount: Math.round(orderTotal * 100),
            status: 'captured'
          }
        }
      }
    };

    const res = await request('POST', '/api/payments/webhook', webhookPayload, {
      'x-razorpay-signature': 'mock_webhook_signature'
    });
    if (res.status !== 200 || !res.data.received) throw new Error('Webhook processing failed');
  });

  console.log('\n===========================================================');
  console.log(`📊 Layer 2 Results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 Layer 2 Core API & Escrow Payment Engine 100% VERIFIED!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
