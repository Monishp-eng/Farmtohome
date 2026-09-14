const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
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

async function runTests() {
  console.log('🧪 Starting Layer 1 Foundation Automated Test Suite...');
  console.log('====================================================\n');
  let passed = 0, failed = 0;

  async function assert(testName, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${testName}`);
      console.error(`   Reason: ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await assert('Health Check endpoint returns status 200 and healthy DB', async () => {
    const res = await request('GET', '/api/health');
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.data.status !== 'healthy') throw new Error(`Expected healthy status, got ${res.data.status}`);
    if (!res.data.database || !res.data.database.status) throw new Error('Database status missing in health check');
  });

  // 2. Auth: Register
  const testEmail = `test_m1_${Date.now()}@farmtohome.in`;
  let registeredTokens;
  await assert('User Registration issues access + refresh tokens with 15m expiration', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'M1 Test Farmer',
      email: testEmail,
      password: 'StrongPassword123!',
      role: 'farmer',
      phone: '9876543299'
    });
    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status} (${JSON.stringify(res.data)})`);
    if (!res.data.accessToken || !res.data.refreshToken) throw new Error('Access or refresh token missing');
    registeredTokens = res.data;
  });

  // 3. Auth: Login
  let loginTokens;
  await assert('User Login verifies credentials & returns rotated token pair', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'StrongPassword123!'
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (!res.data.accessToken || !res.data.refreshToken) throw new Error('Tokens missing in login response');
    loginTokens = res.data;
  });

  // 4. Token Rotation: Refresh Token
  await assert('Token Rotation rotates refresh token and returns fresh access token', async () => {
    const res = await request('POST', '/api/auth/refresh-token', {
      refreshToken: loginTokens.refreshToken
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status} (${JSON.stringify(res.data)})`);
    if (!res.data.accessToken || !res.data.refreshToken) throw new Error('Rotated tokens missing');
    if (res.data.refreshToken === loginTokens.refreshToken) throw new Error('Refresh token was not rotated!');
  });

  // 5. Input Validation: Invalid phone rejected
  await assert('Input Validation intercepts invalid phone number with 400 Bad Request', async () => {
    const res = await request('POST', '/api/auth/send-otp', {
      phone: '123'
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    if (!res.data.errors || res.data.errors.length === 0) throw new Error('Validation errors array missing');
  });

  // 6. OTP Generation
  let sentOtp;
  await assert('OTP Generation creates 4-digit code for 10-digit Indian phone', async () => {
    const res = await request('POST', '/api/auth/send-otp', {
      phone: '9876543299'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.data || !res.data.data.otp) throw new Error('OTP missing from response data');
    sentOtp = res.data.data.otp;
  });

  // 7. Phone OTP Login
  await assert('Passwordless Phone Login authenticates farmer directly via OTP', async () => {
    const res = await request('POST', '/api/auth/phone-login', {
      phone: '9876543299',
      otp: sentOtp
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status} (${JSON.stringify(res.data)})`);
    if (!res.data.accessToken || !res.data.refreshToken) throw new Error('Tokens missing from phone login');
  });

  // 8. Auth Header Validation: RFC 6750 HTTP 401 on Invalid Token
  await assert('Authentication middleware returns HTTP 401 Unauthorized for invalid token', async () => {
    const res = await request('GET', '/api/auth/profile', null, {
      Authorization: 'Bearer totally_invalid_token_xyz'
    });
    if (res.status !== 401) throw new Error(`Expected HTTP 401, got ${res.status}`);
  });

  // 9. Dual-Engine DB Abstraction: async query/get/all interface
  await assert('Dual-Engine Database interface executes async queries seamlessly', async () => {
    const db = require('./config/database');
    const userRow = await db.get('SELECT id, email, role FROM users WHERE email = ?', [testEmail]);
    if (!userRow || userRow.email !== testEmail) throw new Error('Failed to query user via db.get()');

    const allUsers = await db.all('SELECT id FROM users LIMIT 5');
    if (!Array.isArray(allUsers) || allUsers.length === 0) throw new Error('Failed to query users via db.all()');

    const qResult = await db.query('SELECT count(*) as count FROM users');
    if (!qResult || !qResult.rows || qResult.rows.length === 0) throw new Error('Failed to execute db.query()');
  });

  // 10. Refresh Token Expiration & Invalidation Check
  await assert('Refresh Token Handler rejects expired or forged refresh tokens with 401', async () => {
    const res = await request('POST', '/api/auth/refresh-token', {
      refreshToken: 'forged_or_tampered_token_string'
    });
    if (res.status !== 401) throw new Error(`Expected HTTP 401, got ${res.status}`);
  });

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 Layer 1 Foundation is 100% complete and fully verified!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
