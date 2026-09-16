/**
 * ⚡ KisanSetu — Layer 6: High-Concurrency Load & Performance Stress Test
 * Simulates 100 concurrent user requests across core API & AI endpoints
 * Asserts p95 response time < 500ms and 0.0% error rate per Build Plan (Page 7)
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
const TOTAL_CONCURRENT_USERS = 100;
const P95_TARGET_MS = 500;

function timedRequest(path) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          status: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - start;
      resolve({
        status: 500,
        duration,
        success: false,
        error: err.message
      });
    });

    req.end();
  });
}

function calculatePercentile(numbers, percentile) {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function runLoadTest() {
  console.log('================================================================================');
  console.log(`⚡ KISANSETU — LAYER 6: HIGH-CONCURRENCY LOAD & STRESS TEST (${TOTAL_CONCURRENT_USERS} USERS)`);
  console.log('================================================================================\n');

  const testEndpoints = [
    { name: 'System Health & Metrics', path: '/api/health' },
    { name: 'Product Catalog & 4-Factor Smart Matching', path: '/api/products' },
    { name: 'APMC Mandi Market Prices', path: '/api/market/prices' },
    { name: 'AI Demand Forecast Summary', path: '/api/ai/demand-forecast' }
  ];

  for (const endpoint of testEndpoints) {
    console.log(`Testing: ${endpoint.name} (${endpoint.path})...`);
    
    // Launch TOTAL_CONCURRENT_USERS concurrent requests simultaneously
    const startTime = Date.now();
    const promises = Array.from({ length: TOTAL_CONCURRENT_USERS }, () => timedRequest(endpoint.path));
    const results = await Promise.all(promises);
    const totalElapsed = Date.now() - startTime;

    const durations = results.map(r => r.duration);
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    const errorRate = ((failures.length / results.length) * 100).toFixed(1);
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const p50 = calculatePercentile(durations, 50);
    const p90 = calculatePercentile(durations, 90);
    const p95 = calculatePercentile(durations, 95);
    const p99 = calculatePercentile(durations, 99);
    const max = Math.max(...durations);
    const rps = ((results.length / totalElapsed) * 1000).toFixed(1);

    console.log(`  -> Concurrency:   ${TOTAL_CONCURRENT_USERS} simultaneous requests`);
    console.log(`  -> Success Rate:  ${successes.length}/${results.length} (Error Rate: ${errorRate}%)`);
    console.log(`  -> Throughput:    ${rps} requests/sec`);
    console.log(`  -> Latencies:     Avg: ${avgDuration}ms | p50: ${p50}ms | p90: ${p90}ms | p95: ${p95}ms | p99: ${p99}ms | Max: ${max}ms`);

    // Assertions
    if (failures.length > 0) {
      console.error(`  ❌ FAIL: Encountered ${failures.length} failed requests!`);
      process.exit(1);
    }

    if (p95 > P95_TARGET_MS) {
      console.error(`  ❌ FAIL: p95 latency ${p95}ms exceeds target ${P95_TARGET_MS}ms!`);
      process.exit(1);
    }

    console.log(`  ✅ PASS: 0.0% Error Rate & p95 ${p95}ms well under ${P95_TARGET_MS}ms target.\n`);
  }

  console.log('================================================================================');
  console.log('🎉 LAYER 6 PERFORMANCE & CONCURRENCY BENCHMARKS 100% VERIFIED!');
  console.log('================================================================================\n');
}

runLoadTest();
