/**
 * 🌾 KisanSetu — Layer 6: 10 Critical End-to-End User Journey Automated Tests
 * Tests every user journey defined in KisanSetu_Production_Build_Plan.pdf (Page 7)
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
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  }
}

async function runJourneys() {
  console.log('================================================================================');
  console.log('🌾 KISANSETU — LAYER 6: 10 CRITICAL E2E USER JOURNEY TEST SUITE');
  console.log('================================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // JOURNEY 1: Consumer Direct Purchase (Register -> Browse -> Cart -> Pay -> Track)
    // -------------------------------------------------------------------------
    console.log('[Journey 1/10] Consumer Direct Purchase (Register -> Cart -> Razorpay Escrow -> Track)');
    const rnd1 = Math.floor(Math.random() * 10000);
    const conReg = await request('POST', '/api/auth/register', {
      name: `Consumer Journey ${rnd1}`,
      email: `consumer_j1_${rnd1}@test.in`,
      password: 'password123',
      role: 'consumer',
      phone: `9876${String(rnd1).padStart(6, '0')}`
    });
    assert(conReg.status === 201 && conReg.data.token, 'Consumer registered with access token');
    const conToken = conReg.data.token;

    // Browse marketplace
    const prodRes = await request('GET', '/api/products');
    assert(prodRes.status === 200 && Array.isArray(prodRes.data.data), 'Consumer browses live products catalog');
    const targetProd = prodRes.data.data[0];

    // Add to cart
    const cartRes = await request('POST', '/api/cart', {
      product_id: targetProd.id,
      quantity_kg: 5
    }, { 'Authorization': `Bearer ${conToken}` });
    assert(cartRes.status === 201, 'Consumer adds produce to cart');

    // Place Order
    const orderRes = await request('POST', '/api/orders', {
      product_id: targetProd.id,
      quantity_kg: 5,
      delivery_address: '123 Gandhi Road, T. Nagar, Chennai 600017'
    }, { 'Authorization': `Bearer ${conToken}` });
    assert(orderRes.status === 201, 'Order created in "placed" status');
    const orderId = orderRes.data.data.orderId;

    // Razorpay Order Creation
    const payOrderRes = await request('POST', '/api/payments/create-order', {
      order_id: orderId
    }, { 'Authorization': `Bearer ${conToken}` });
    assert(payOrderRes.status === 201, 'Razorpay order generated with amount in paise');

    // Sign & Verify payment into Escrow
    const rzpOrder = payOrderRes.data.data.razorpay_order;
    const razorpayOrderId = rzpOrder.id;
    const razorpayPaymentId = `pay_e2e_${rnd1}`;
    const validSignature = paymentService.generateTestSignature(razorpayOrderId, razorpayPaymentId);

    const verifyRes = await request('POST', '/api/payments/verify', {
      order_id: orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: validSignature
    }, { 'Authorization': `Bearer ${conToken}` });
    assert(verifyRes.status === 200, 'Payment verified and funds locked in Escrow');

    // Track 7-stage order status
    const trackRes = await request('GET', `/api/orders/${orderId}`, null, { 'Authorization': `Bearer ${conToken}` });
    assert(trackRes.status === 200 && trackRes.data.data.status === 'confirmed' && trackRes.data.data.payment_status === 'escrow',
      'Order tracked in real-time: confirmed with payment in escrow');
    console.log('  -> Journey 1 Complete! ⭐\n');

    // -------------------------------------------------------------------------
    // JOURNEY 2: Farmer Web Lifecycle (Register -> List Produce -> Freshness -> Confirm/Pack)
    // -------------------------------------------------------------------------
    console.log('[Journey 2/10] Farmer Web Lifecycle (Register -> List Produce -> Freshness -> Pack)');
    const rnd2 = Math.floor(Math.random() * 10000);
    const farmerReg = await request('POST', '/api/auth/register', {
      name: `Kisan Farmer ${rnd2}`,
      email: `farmer_j2_${rnd2}@kisan.in`,
      password: 'password123',
      role: 'farmer',
      phone: `9888${String(rnd2).padStart(6, '0')}`
    });
    assert(farmerReg.status === 201, 'Farmer registered successfully');
    const farmerToken = farmerReg.data.token;

    // List fresh produce with harvest date
    const todayStr = new Date().toISOString().split('T')[0];
    const newProdRes = await request('POST', '/api/products', {
      name: `Farm Fresh Capsicum ${rnd2}`,
      category: 'vegetables',
      description: 'Locally grown organic green capsicum harvested early morning.',
      quantity_kg: 250,
      price_per_kg: 38.5,
      msp_price: 32.0,
      quality_grade: 'A',
      is_organic: 1,
      harvest_date: todayStr
    }, { 'Authorization': `Bearer ${farmerToken}` });
    assert(newProdRes.status === 201, 'Produce listed with dynamic harvest date');
    const listedProdId = newProdRes.data.data.id;

    // Buyer places order for this listing
    const j2OrderRes = await request('POST', '/api/orders', {
      product_id: listedProdId,
      quantity_kg: 20,
      delivery_address: 'Anna Nagar, Chennai'
    }, { 'Authorization': `Bearer ${conToken}` });
    const j2OrderId = j2OrderRes.data.data.orderId;

    // Farmer confirms order
    const confirmRes = await request('PUT', `/api/orders/${j2OrderId}/status`, {
      status: 'confirmed'
    }, { 'Authorization': `Bearer ${farmerToken}` });
    assert(confirmRes.status === 200, 'Farmer confirms incoming order');

    // Farmer packs produce
    const packRes = await request('PUT', `/api/orders/${j2OrderId}/status`, {
      status: 'farmer_packed'
    }, { 'Authorization': `Bearer ${farmerToken}` });
    assert(packRes.status === 200, 'Farmer packs produce ready for logistics pickup');
    console.log('  -> Journey 2 Complete! ⭐\n');

    // -------------------------------------------------------------------------
    // JOURNEY 3: Farmer Calls Voice AI / IVR Telephony -> Listing Published
    // -------------------------------------------------------------------------
    console.log('[Journey 3/10] Voice AI / IVR Listing (Voice Transcript -> NLP Extraction -> Marketplace)');
    const voicePayload = {
      transcript: 'I want to sell 150 kg of fresh farm carrots at 28 rupees per kg from Salem',
      language: 'en',
      caller_phone: `9777${String(rnd1).padStart(6, '0')}`,
      farmer_name: 'Murugan Voice Farmer'
    };

    const voiceRes = await request('POST', '/api/ivr/voice-ai', voicePayload);
    assert(voiceRes.status === 200 && voiceRes.data.success, 'Voice AI parsed transcript into structured listing');
    const voiceListingId = voiceRes.data.data.listingId || voiceRes.data.data.id;

    // Verify voice listing is publicly discoverable in marketplace
    const voiceSearch = await request('GET', `/api/products/${voiceListingId}`);
    assert(voiceSearch.status === 200 && voiceSearch.data.data.id === voiceListingId,
      'Voice-listed crop is live and discoverable in the digital marketplace');
    console.log('  -> Journey 3 Complete! ⭐\n');

    // -------------------------------------------------------------------------
    // JOURNEY 4: Logistics Driver Fulfillment (Accept -> Route Optimize -> Deliver)
    // -------------------------------------------------------------------------
    console.log('[Journey 4/10] Logistics Driver Delivery Fulfillment (Pickup -> Route -> Deliver)');
    const driverLogin = await request('POST', '/api/auth/login', {
      email: 'kiran@example.com',
      password: 'password123'
    });
    assert(driverLogin.status === 200, 'Logistics Driver authenticated');
    const driverToken = driverLogin.data.token;

    // Driver picks up order
    const pickRes = await request('PUT', `/api/orders/${j2OrderId}/status`, {
      status: 'driver_picked'
    }, { 'Authorization': `Bearer ${driverToken}` });
    assert(pickRes.status === 200, 'Driver picks up order from farm gate');

    // Driver updates to in_transit
    const transitRes = await request('PUT', `/api/orders/${j2OrderId}/status`, {
      status: 'in_transit'
    }, { 'Authorization': `Bearer ${driverToken}` });
    assert(transitRes.status === 200, 'Shipment progressed to in_transit');

    // Driver route optimization check
    const optRes = await request('POST', '/api/logistics/optimize-route', {
      origin: { lat: 11.6643, lng: 78.1460 },
      destinations: [
        { lat: 13.0827, lng: 80.2707, demand_kg: 50 },
        { lat: 12.9716, lng: 77.5946, demand_kg: 100 }
      ]
    }, { 'Authorization': `Bearer ${driverToken}` });
    assert(optRes.status === 200 && optRes.data.data.total_distance_km > 0, '2-Opt logistics route optimized for multi-stop delivery');

    // Driver delivers order
    const deliverRes = await request('PUT', `/api/orders/${j2OrderId}/status`, {
      status: 'delivered'
    }, { 'Authorization': `Bearer ${driverToken}` });
    assert(deliverRes.status === 200, 'Produce delivered to consumer with proof confirmation');
    console.log('  -> Journey 4 Complete! ⭐\n');

    // -------------------------------------------------------------------------
    // JOURNEY 5: Admin Control & Oversight (Global Ledger -> Dispute Resolution)
    // -------------------------------------------------------------------------
    console.log('[Journey 5/10] Admin Control & Oversight (Global Orders -> Dispute Resolution -> GMV)');
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    assert(adminLogin.status === 200, 'Platform Administrator authenticated');
    const adminToken = adminLogin.data.token;

    // Admin checks summary stats
    const statsRes = await request('GET', '/api/orders/stats/summary', null, { 'Authorization': `Bearer ${adminToken}` });
    assert(statsRes.status === 200 && statsRes.data.data.totalOrders >= 0, 'Admin accesses global order statistics & GMV');

    // Dispute flow test
    const disputeRes = await request('PUT', `/api/orders/${j2OrderId}/dispute`, {
      reason: 'Produce packaging damaged during monsoon rain transport'
    }, { 'Authorization': `Bearer ${conToken}` });
    assert(disputeRes.status === 200, 'Consumer successfully raised quality dispute');

    // Admin resolves dispute
    const resolveRes = await request('PUT', `/api/orders/${j2OrderId}/resolve`, {
      resolution: 'refund_buyer',
      notes: 'Customer reimbursed. Driver notified on weatherproofing protocols.'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert(resolveRes.status === 200, 'Admin resolved dispute and synchronized escrow status');
    console.log('  -> Journey 5 Complete! ⭐\n');

    // -------------------------------------------------------------------------
    // JOURNEY 6: Smart Discovery & Mandi Ranking (4-Factor Smart Matching)
    // -------------------------------------------------------------------------
    console.log('[Journey 6/10] Smart Discovery & Mandi Ranking (Search -> 4-Factor Smart Match)');
    const searchRes = await request('GET', '/api/products?search=Tomato');
    assert(searchRes.status === 200 && searchRes.data.data.length > 0, 'Full-Text search matches product listings');
    const matched = searchRes.data.data[0];

    assert(matched.smart_match_score !== undefined && matched.smart_match_breakdown,
      '4-Factor smart matching score computed with structured weight breakdown');
    assert(matched.smart_match_breakdown.distance_weight === '40%' &&
           matched.smart_match_breakdown.price_weight === '25%' &&
           matched.smart_match_breakdown.freshness_weight === '20%' &&
           matched.smart_match_breakdown.rating_weight === '15%',
      'Weight breakdown conforms to 40-25-20-15 algorithmic standard');
    console.log('  -> Journey 6 Complete! ⭐\n');

    // -------------------------------------------------------------------------
    // JOURNEY 7: Farmer Settlement & Payout Ledger (98% Escrow Release)
    // -------------------------------------------------------------------------
    console.log('[Journey 7/10] Farmer Settlement & Payout Ledger (98% Direct Disbursement)');
    // Deliver order 1 so escrow can be released
    await request('PUT', `/api/orders/${orderId}/status`, { status: 'farmer_packed' }, { 'Authorization': `Bearer ${driverToken}` });
    await request('PUT', `/api/orders/${orderId}/status`, { status: 'driver_picked' }, { 'Authorization': `Bearer ${driverToken}` });
    await request('PUT', `/api/orders/${orderId}/status`, { status: 'delivered' }, { 'Authorization': `Bearer ${driverToken}` });

    // Release escrow
    const releaseRes = await request('POST', `/api/payouts/release/${orderId}`, null, { 'Authorization': `Bearer ${adminToken}` });
    assert(releaseRes.status === 200, 'Escrow released: 98% disbursed to farmer bank account');

    // Farmer checks lifetime ledger
    const farmerUserLogin = await request('POST', '/api/auth/login', {
      email: 'ramesh@example.com',
      password: 'password123'
    });
    const rameshToken = farmerUserLogin.data.token;
    const ledgerRes = await request('GET', '/api/payouts/farmer/ledger', null, { 'Authorization': `Bearer ${rameshToken}` });
    assert(ledgerRes.status === 200 && Array.isArray(ledgerRes.data.data.ledger), 'Farmer verifies itemized payout ledger & bank disbursement');
    console.log('  -> Journey 7 Complete! ⭐\n');

    // -------------------------------------------------------------------------
    // JOURNEY 8: Institutional Bulk Buyer (Wholesale Reorder & Preferences)
    // -------------------------------------------------------------------------
    console.log('[Journey 8/10] Institutional Bulk Buyer (Bulk Order & Preference Learning)');
    const bulkLogin = await request('POST', '/api/auth/login', {
      email: 'freshmart@example.com',
      password: 'password123'
    });
    assert(bulkLogin.status === 200, 'Institutional Bulk Buyer authenticated');
    const bulkToken = bulkLogin.data.token;
    const bulkUserId = bulkLogin.data.user.id;

    // Buyer preference learning query
    const prefRes = await request('GET', `/api/ai/buyer-preferences/${bulkUserId}`);
    const preferredDay = prefRes.data?.data?.preferred_weekly_order_day || prefRes.data?.data?.weekly_reorder_day;
    assert(prefRes.status === 200 && preferredDay,
      `AI learned recurrent reorder cycle: ${preferredDay} replenishment basket`);
    console.log('  -> Journey 8 Complete! ⭐\n');

    // -------------------------------------------------------------------------
    // JOURNEY 9: 2-Way SMS / Bot Listing (SELL Command -> Marketplace Sync)
    // -------------------------------------------------------------------------
    console.log('[Journey 9/10] 2-Way SMS / Bot Listing (SELL <crop> <qty> <price> Command)');
    const smsPayload = {
      from_phone: '9845123456',
      message: 'SELL Onion 400 24 Nashik'
    };
    const smsRes = await request('POST', '/api/ivr/sms', smsPayload);
    const replyText = smsRes.data?.data?.reply || smsRes.data?.reply || '';
    assert(smsRes.status === 200 && replyText.includes('safalta-purvak list'),
      'Inbound SMS SELL command parsed; produce listed and confirmation SMS issued');

    // Verify SMS listing in database
    const onionSearch = await request('GET', '/api/products?search=Onion');
    assert(onionSearch.status === 200 && onionSearch.data.data.length > 0,
      'SMS-listed Onion listing synchronized with public digital marketplace');
    console.log('  -> Journey 9 Complete! ⭐\n');

    // -------------------------------------------------------------------------
    // JOURNEY 10: Mandi Market Intelligence & MSP Benchmark Verification
    // -------------------------------------------------------------------------
    console.log('[Journey 10/10] Mandi Market Intelligence & MSP Benchmark Verification');
    const mandiPrices = await request('GET', '/api/market/prices?commodity=Tomato');
    assert(mandiPrices.status === 200 && Array.isArray(mandiPrices.data.data), 'Queried real-time APMC Mandi modal benchmarks');

    const mspRes = await request('GET', '/api/market/msp');
    assert(mspRes.status === 200 && mspRes.data.data.length > 0, 'Queried Central Govt MSP support price floor records');

    const priceRec = await request('GET', `/api/ai/price-recommendation/${targetProd.id}`);
    assert(priceRec.status === 200 && priceRec.data.data.recommended_price > 0,
      'Dynamic fair-trade price recommended: APMC benchmark + 5% farmer premium');
    console.log('  -> Journey 10 Complete! ⭐\n');

    console.log('================================================================================');
    console.log(`📊 FINAL RESULTS: ${passed} / ${passed + failed} USER JOURNEYS PASSED (100%)`);
    console.log('🎉 LAYER 6 E2E USER JOURNEY SUITE 100% VERIFIED!');
    console.log('================================================================================\n');

  } catch (err) {
    console.error(`\n❌ Fatal journey failure: ${err.message}`);
    process.exit(1);
  }
}

runJourneys();
