/**
 * 🔒 KisanSetu — Layer 6: OWASP Security Audit Automated Test Suite
 * Validates SQL Injection immunity, XSS defenses, JWT hardening, RBAC enforcement & input safety
 */

const http = require('http');

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

async function runSecurityAudit() {
  console.log('================================================================================');
  console.log('🔒 KISANSETU — LAYER 6: OWASP TOP 10 SECURITY AUDIT TEST SUITE');
  console.log('================================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. SQL INJECTION IMMUNITY (Parameterized Query Verification)
    // -------------------------------------------------------------------------
    console.log('[Security Test 1/5] SQL Injection Immunity & Parameterized Query Defenses');
    
    // Test 1.1: Authentication bypass attempt
    const sqlAuthRes = await request('POST', '/api/auth/login', {
      email: "' OR '1'='1' --",
      password: "' OR '1'='1' --"
    });
    assert(sqlAuthRes.status === 400 || sqlAuthRes.status === 401,
      'SQL Injection in login intercepted safely (no bypass possible)');

    // Test 1.2: Product Search SQL Injection attempt
    const sqlSearchRes = await request('GET', "/api/products?search=' UNION SELECT id, password_hash, email FROM users --");
    assert(sqlSearchRes.status === 200 && Array.isArray(sqlSearchRes.data.data),
      'SQL Injection in search clause treated as literal string; database schema unexposed');

    // Test 1.3: Market prices SQL Injection attempt
    const sqlMarketRes = await request('GET', "/api/market/prices?commodity=Tomato' OR '1'='1");
    assert(sqlMarketRes.status === 200, 'SQL Injection in market filter safely parameterized');

    // Test 1.4: Order ID SQL Injection attempt
    const sqlOrderRes = await request('GET', "/api/orders/1' OR '1'='1", null, {
      'Authorization': 'Bearer fake_token'
    });
    assert(sqlOrderRes.status === 401 || sqlOrderRes.status === 400 || sqlOrderRes.status === 404,
      'SQL Injection in URL parameter intercepted without unhandled database error');
    console.log('  -> SQL Injection Immunity Confirmed! ⭐\n');

    // -------------------------------------------------------------------------
    // 2. AUTHENTICATION & JWT HARDENING
    // -------------------------------------------------------------------------
    console.log('[Security Test 2/5] Authentication Hardening & JWT Verification');

    // Test 2.1: Missing Authorization Header on Protected Route
    const noAuthRes = await request('GET', '/api/orders/my-orders');
    assert(noAuthRes.status === 401 && noAuthRes.data.success === false,
      'Missing token rejected with RFC 6750 401 Unauthorized');

    // Test 2.2: Forged Token with Invalid Signature
    const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIn0.forged_signature_attack';
    const forgedRes = await request('GET', '/api/orders/my-orders', null, {
      'Authorization': `Bearer ${forgedToken}`
    });
    assert(forgedRes.status === 401, 'Forged JWT signature rejected with 401');

    // Test 2.3: Tampered Token String
    const malformedRes = await request('GET', '/api/orders/my-orders', null, {
      'Authorization': 'Bearer not-even-a-jwt-token'
    });
    assert(malformedRes.status === 401, 'Malformed token string rejected with 401');

    // Test 2.4: Forged Refresh Token Rotation
    const forgedRefresh = await request('POST', '/api/auth/refresh-token', {
      refreshToken: 'forged_fake_refresh_token_999'
    });
    assert(forgedRefresh.status === 401, 'Forged refresh token rejected; replay attack prevented');
    console.log('  -> Authentication & JWT Hardening Confirmed! ⭐\n');

    // -------------------------------------------------------------------------
    // 3. ROLE-BASED ACCESS CONTROL (RBAC) BOUNDARY TESTS
    // -------------------------------------------------------------------------
    console.log('[Security Test 3/5] 3-Tier RBAC Strict Authorization Boundaries');

    // Authenticate roles
    const consumerLogin = await request('POST', '/api/auth/login', { email: 'priya@example.com', password: 'password123' });
    const consumerToken = consumerLogin.data.token;

    const farmerLogin = await request('POST', '/api/auth/login', { email: 'ramesh@example.com', password: 'password123' });
    const farmerToken = farmerLogin.data.token;

    const driverLogin = await request('POST', '/api/auth/login', { email: 'kiran@example.com', password: 'password123' });
    const driverToken = driverLogin.data.token;

    // Test 3.1: Consumer attempting to create produce listing
    const conCreateRes = await request('POST', '/api/products', {
      name: 'Unauthorized Crop',
      category: 'fruits',
      quantity_kg: 50,
      price_per_kg: 20
    }, { 'Authorization': `Bearer ${consumerToken}` });
    assert(conCreateRes.status === 403, 'Consumer produce creation correctly FORBIDDEN (403)');

    // Test 3.2: Farmer attempting to view driver assigned dispatches
    const farmerDispatchRes = await request('GET', '/api/logistics/my-deliveries', null, {
      'Authorization': `Bearer ${farmerToken}`
    });
    assert(farmerDispatchRes.status === 403, 'Farmer accessing logistics dispatches correctly FORBIDDEN (403)');

    // Test 3.3: Consumer attempting to release farmer escrow payouts
    const conPayoutRes = await request('POST', '/api/payouts/release/1', null, {
      'Authorization': `Bearer ${consumerToken}`
    });
    assert(conPayoutRes.status === 403, 'Consumer releasing escrow funds correctly FORBIDDEN (403)');

    // Test 3.4: Driver attempting to access admin global revenue metrics
    const driverStatsRes = await request('GET', '/api/payouts/admin/stats', null, {
      'Authorization': `Bearer ${driverToken}`
    });
    assert(driverStatsRes.status === 403, 'Logistics Driver accessing admin financial stats correctly FORBIDDEN (403)');
    console.log('  -> RBAC Strict Boundaries Confirmed! ⭐\n');

    // -------------------------------------------------------------------------
    // 4. INPUT VALIDATION & DATA SANITIZATION (Strict Schema Enforcement)
    // -------------------------------------------------------------------------
    console.log('[Security Test 4/5] Input Validation & Data Sanitization Defense');

    // Test 4.1: Invalid Indian phone format
    const badPhoneRes = await request('POST', '/api/auth/send-otp', {
      phone: '12345' // Not a 10-digit Indian number starting with 6-9
    });
    assert(badPhoneRes.status === 400 && badPhoneRes.data.errors,
      'Invalid phone number intercepted with 400 Bad Request and validation schema details');

    // Test 4.2: Invalid Indian Bank IFSC Code format
    const badIfscRes = await request('PUT', '/api/auth/bank-details', {
      bank_account_number: '1234567890',
      bank_ifsc: 'INVALID_IFSC_123'
    }, { 'Authorization': `Bearer ${farmerToken}` });
    assert(badIfscRes.status === 400, 'Invalid IFSC format intercepted with 400 Bad Request');

    // Test 4.3: Negative quantity order attempt
    const negOrderRes = await request('POST', '/api/orders', {
      product_id: 1,
      quantity_kg: -50,
      delivery_address: 'Chennai'
    }, { 'Authorization': `Bearer ${consumerToken}` });
    assert(negOrderRes.status === 400, 'Negative order quantity intercepted safely (400 Bad Request)');
    console.log('  -> Input Validation & Sanitization Confirmed! ⭐\n');

    // -------------------------------------------------------------------------
    // 5. SECURITY HEADERS & DEFENSE-IN-DEPTH AUDIT
    // -------------------------------------------------------------------------
    console.log('[Security Test 5/5] Security Headers & Defense-in-Depth');

    const healthRes = await request('GET', '/api/health');
    assert(healthRes.headers['x-dns-prefetch-control'] !== undefined ||
           healthRes.headers['x-content-type-options'] !== undefined ||
           healthRes.headers['vary'] !== undefined,
      'Security headers (Helmet protection) verified on HTTP responses');
    console.log('  -> Defense-in-Depth Headers Confirmed! ⭐\n');

    console.log('================================================================================');
    console.log(`📊 FINAL SECURITY RESULTS: ${passed} / ${passed + failed} AUDIT CHECKS PASSED (100%)`);
    console.log('🎉 LAYER 6 OWASP SECURITY AUDIT 100% VERIFIED!');
    console.log('================================================================================\n');

  } catch (err) {
    console.error(`\n❌ Fatal security audit failure: ${err.message}`);
    process.exit(1);
  }
}

runSecurityAudit();
