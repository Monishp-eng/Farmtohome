/**
 * =========================================================================
 * 🌾 KISANSETU — LAYER 5 M4 TELEPHONY & INTEGRATION TEST SUITE
 * =========================================================================
 * Verifies all Layer 5 M4 deliverables:
 * 1. IVR Multi-Language Support (Telugu & Kannada alongside Tamil, Hindi, English)
 * 2. IVR Call Analytics & Drop-off Funnel Analysis
 * 3. IVR Audio Recordings & Transcription Metadata API
 * 4. WhatsApp Business Bot SELL Command (Product Creation in Marketplace)
 * 5. WhatsApp Business Bot ORDERS Inquiry & Status Lookups
 * 6. WhatsApp Business Bot PRICE Mandi Benchmark Rates
 * 7. WhatsApp Vision AI Photo Classification for Produce
 * 8. High-Concurrency Stress Test (10 concurrent calls/webhooks in <3 seconds)
 */

const BASE_URL = 'http://localhost:5000';

let passed = 0;
let total = 8;

async function test(name, fn) {
  process.stdout.write(`\nTesting: ${name}... `);
  try {
    await fn();
    console.log('✅ PASS');
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('🌾 KISANSETU — LAYER 5 M4 TELEPHONY & INTEGRATION VERIFICATION');
  console.log('===============================================================');

  // TEST 1: IVR Multi-Language Support (Telugu & Kannada)
  await test('1. IVR Multi-Language Prompts (Telugu & Kannada)', async () => {
    // Test Telugu DTMF Key 4
    const resTe = await fetch(`${BASE_URL}/api/ivr/dialogue-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caller_phone: '9443123456',
        dtmf_key: '4',
        session_state: { step: 'LANG_SELECT' }
      })
    });
    const dataTe = await resTe.json();
    if (!dataTe.success) throw new Error('Telugu IVR call failed');
    if (!dataTe.data.aiSpokenPrompt.includes('నమస్కారం') && !dataTe.data.aiSpokenPrompt.includes('కిసాన్‌సేతు')) {
      throw new Error(`Unexpected Telugu prompt: ${dataTe.data.aiSpokenPrompt}`);
    }

    // Test Kannada DTMF Key 5
    const resKn = await fetch(`${BASE_URL}/api/ivr/dialogue-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caller_phone: '9740123456',
        dtmf_key: '5',
        session_state: { step: 'LANG_SELECT' }
      })
    });
    const dataKn = await resKn.json();
    if (!dataKn.success) throw new Error('Kannada IVR call failed');
    if (!dataKn.data.aiSpokenPrompt.includes('ನಮಸ್ಕಾರ') && !dataKn.data.aiSpokenPrompt.includes('ಕಿಸಾನ್‌ಸೇತು')) {
      throw new Error(`Unexpected Kannada prompt: ${dataKn.data.aiSpokenPrompt}`);
    }
  });

  // TEST 2: IVR Analytics Dashboard & Funnel Metrics
  await test('2. IVR Call Analytics & Drop-off Funnel', async () => {
    const res = await fetch(`${BASE_URL}/api/ivr/analytics`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error('Failed to fetch IVR analytics');

    const { summary, languages, funnel } = json.data;
    if (typeof summary.totalCalls !== 'number' || summary.totalCalls < 1) {
      throw new Error(`Invalid total calls: ${summary.totalCalls}`);
    }
    if (typeof summary.conversionRate !== 'number' || summary.conversionRate <= 0) {
      throw new Error(`Invalid conversion rate: ${summary.conversionRate}`);
    }
    if (funnel.totalCalls < funnel.listingCreated) {
      throw new Error('Funnel total calls must be >= listings created');
    }
    if (!languages.te || !languages.kn || !languages.ta) {
      throw new Error('Missing regional language counts in analytics breakdown');
    }
  });

  // TEST 3: IVR Call Recordings & Transcriptions
  await test('3. IVR Call Recordings & Audio Metadata', async () => {
    const res = await fetch(`${BASE_URL}/api/ivr/recordings`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
      throw new Error('No call recordings returned');
    }

    const rec = json.data[0];
    if (!rec.title || !rec.audio_url || !rec.transcription) {
      throw new Error('Recording object missing required fields');
    }
  });

  // TEST 4: WhatsApp Bot SELL Command
  await test('4. WhatsApp Business Bot: SELL Produce Listing', async () => {
    const res = await fetch(`${BASE_URL}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: 'whatsapp:+919876543210',
        Body: 'SELL Tomato 350 26 Salem'
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error('WhatsApp SELL request failed');
    if (json.data.actionType !== 'SELL_LISTING') {
      throw new Error(`Expected actionType SELL_LISTING, got ${json.data.actionType}`);
    }
    if (!json.data.actionData?.listingId) {
      throw new Error('Listing ID was not returned');
    }
    if (!json.data.replyText.includes('Listing Confirmed')) {
      throw new Error('Reply does not contain confirmation');
    }
  });

  // TEST 5: WhatsApp Bot ORDERS Inquiry
  await test('5. WhatsApp Business Bot: ORDERS Inquiry', async () => {
    const res = await fetch(`${BASE_URL}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: 'whatsapp:+919876543210',
        Body: 'ORDERS'
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error('WhatsApp ORDERS request failed');
    if (json.data.actionType !== 'ORDERS_INQUIRY') {
      throw new Error(`Expected actionType ORDERS_INQUIRY, got ${json.data.actionType}`);
    }
    if (!json.data.replyText.includes('Active Orders') && !json.data.replyText.includes('Recent Orders')) {
      throw new Error('Unexpected orders reply text');
    }
  });

  // TEST 6: WhatsApp Bot PRICE Mandi Benchmark
  await test('6. WhatsApp Business Bot: PRICE Mandi Benchmark', async () => {
    const res = await fetch(`${BASE_URL}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: 'whatsapp:+919876543210',
        Body: 'PRICE Tomato'
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error('WhatsApp PRICE request failed');
    if (json.data.actionType !== 'PRICE_BENCHMARK') {
      throw new Error(`Expected actionType PRICE_BENCHMARK, got ${json.data.actionType}`);
    }
    if (!json.data.actionData?.modal || !json.data.actionData?.fairTrade) {
      throw new Error('Modal price or fair trade price missing');
    }
  });

  // TEST 7: WhatsApp Vision AI Photo Classification
  await test('7. WhatsApp Bot: Vision AI Photo Classification', async () => {
    const res = await fetch(`${BASE_URL}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: 'whatsapp:+919876543210',
        Body: 'Analyze this harvest',
        MediaUrl0: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=400&auto=format&fit=crop&q=60'
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error('WhatsApp media upload failed');
    if (json.data.actionType !== 'PHOTO_CLASSIFICATION') {
      throw new Error(`Expected actionType PHOTO_CLASSIFICATION, got ${json.data.actionType}`);
    }
    if (!json.data.actionData?.detectedCrop || !json.data.actionData?.confidence) {
      throw new Error('Vision AI crop detection data missing');
    }
  });

  // TEST 8: Concurrency Stress Test (10 Concurrent Calls/Requests in <3s)
  await test('8. High-Concurrency Stress: 10 Concurrent Calls (<3s Target)', async () => {
    const startTime = Date.now();
    const requests = Array.from({ length: 10 }).map((_, i) => {
      const isVoice = i % 2 === 0;
      if (isVoice) {
        return fetch(`${BASE_URL}/api/ivr/dialogue-call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caller_phone: `987654321${i}`,
            dtmf_key: String((i % 5) + 1),
            session_state: { step: 'LANG_SELECT' }
          })
        }).then(r => r.json());
      } else {
        return fetch(`${BASE_URL}/api/whatsapp/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            From: `whatsapp:+91987654321${i}`,
            Body: `PRICE Tomato`
          })
        }).then(r => r.json());
      }
    });

    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) throw new Error(`${failed.length} / 10 concurrent requests failed`);
    if (duration > 3000) throw new Error(`Took ${duration}ms, exceeded 3000ms threshold`);

    console.log(`\n   ⚡ 10 Concurrent Requests Processed in ${duration}ms (Avg: ${Math.round(duration/10)}ms/call, 0% Drop Rate)`);
  });

  console.log('\n===============================================================');
  console.log(`📊 LAYER 5 M4 TEST SUMMARY: ${passed} / ${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('===============================================================');

  if (passed === total) {
    console.log('🎉 ALL LAYER 5 M4 TELEPHONY & WHATSAPP DELIVERABLES VERIFIED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
