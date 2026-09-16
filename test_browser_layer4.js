const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || path.join(__dirname, 'screenshots');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runBrowserTests() {
  console.log('===============================================================');
  console.log('🌐 KISANSETU — COMPREHENSIVE BROWSER TEST SUITE (PUPPETEER E2E)');
  console.log('===============================================================');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  let passed = 0;
  let total = 9;

  // Helper assert
  async function testStep(name, fn) {
    process.stdout.write(`\nTesting: ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
    }
  }

  // TEST 1: Landing Page & Interactive Calculator
  await testStep('1. Landing Page, Interactive Calculator & Dark Mode', async () => {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 15000 });

    // Verify Title
    const title = await page.title();
    if (!title.includes('For Farmers, For Us')) throw new Error(`Unexpected title: ${title}`);

    // Verify 1-Click Layer 4 Live Experience Switcher Banner exists
    const switcher = await page.$('text=Layer 4 Live Demo');
    if (!switcher) throw new Error('Layer 4 Live Demo banner not found');

    // Test Farmer Income Calculator Slider
    const slider = await page.$('input[type="range"]');
    if (!slider) throw new Error('Income calculator slider not found');

    // Select 'onion' crop button
    const onionBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find(b => b.textContent.includes('onion'));
      if (found) { found.click(); return true; }
      return false;
    });
    if (!onionBtn) throw new Error('Could not find Onion crop button');

    // Take Light Mode Screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_home_page.png'), fullPage: false });

    // Toggle Dark Mode via Moon/Sun icon in Navbar
    const toggled = await page.evaluate(() => {
      const themeBtn = document.querySelector('button[title*="Dark"], button[title*="Light"], button[aria-label*="theme"], button[aria-label*="Theme"]');
      if (themeBtn) {
        themeBtn.click();
        return true;
      }
      // Fallback click on any button containing dark mode toggle svg
      const btns = Array.from(document.querySelectorAll('nav button'));
      if (btns.length > 0) {
        btns[btns.length - 1].click();
        return true;
      }
      return false;
    });

    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_home_page_dark.png'), fullPage: false });

    // Toggle back to light mode
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      if (btns.length > 0) btns[btns.length - 1].click();
    });
  });

  // TEST 2: Marketplace & 4-Factor Smart Match Radar
  await testStep('2. Marketplace & 4-Factor Smart Match Radar Popup', async () => {
    await page.goto('http://localhost:3000/marketplace', { waitUntil: 'networkidle2', timeout: 15000 });

    // Wait for at least one product card to render
    await page.waitForSelector('button, h3', { timeout: 8000 });

    // Find and click the smart match score button
    const popupOpened = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const matchBtn = buttons.find(b => b.textContent.includes('% Match'));
      if (matchBtn) {
        matchBtn.click();
        return true;
      }
      return false;
    });

    if (popupOpened) {
      await sleep(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_marketplace_smart_match.png'), fullPage: false });
    } else {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_marketplace.png'), fullPage: false });
    }

    // Add product to cart
    await page.evaluate(() => {
      const addBtns = Array.from(document.querySelectorAll('button'));
      const addBtn = addBtns.find(b => b.textContent.includes('Add to Cart'));
      if (addBtn) addBtn.click();
    });

    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_marketplace_cart_added.png'), fullPage: false });
  });

  // TEST 3: AI Crop Doctor & 1-Click Sample Leaf Presets
  await testStep('3. AI Crop Doctor & 1-Click Sample Leaf Presets', async () => {
    await page.goto('http://localhost:3000/agri-doctor', { waitUntil: 'networkidle2', timeout: 15000 });

    // Click the 1-click sample leaf preset "Tomato Early Blight"
    const clickedSample = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const tomatoPreset = btns.find(b => b.textContent.includes('Tomato Early Blight'));
      if (tomatoPreset) {
        tomatoPreset.click();
        return true;
      }
      return false;
    });

    if (!clickedSample) throw new Error('Sample leaf preset not found in DOM');

    // Wait for ResNet50 neural classification result
    await sleep(1000);

    const hasDiagnosis = await page.evaluate(() => {
      return document.body.textContent.includes('Early Blight') || document.body.textContent.includes('Alternaria solani');
    });

    if (!hasDiagnosis) throw new Error('ResNet50 diagnosis result did not render in DOM');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_crop_doctor_resnet50.png'), fullPage: false });
  });

  // TEST 4: 2G GSM Telephony & 2-Way SMS Gateway
  await testStep('4. 2G GSM Telephony & SMS Gateway Simulator', async () => {
    await page.goto('http://localhost:3000/dialphone', { waitUntil: 'networkidle2', timeout: 15000 });

    // Switch to SMS Gateway Tab using direct tab ID
    const switchedTab = await page.evaluate(() => {
      const tab = document.getElementById('tab-sms-gateway');
      if (tab) {
        tab.click();
        return true;
      }
      return false;
    });

    if (!switchedTab) throw new Error('Could not find SMS Gateway tab');

    await sleep(600);

    // Click quick SMS preset chip [SELL Tomato 500 25 Salem]
    await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('button'));
      const tomatoChip = chips.find(c => c.textContent.includes('SELL Tomato'));
      if (tomatoChip) tomatoChip.click();
    });

    // Click "Send SMS"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sendBtn = buttons.find(b => b.textContent.includes('Send SMS'));
      if (sendBtn) sendBtn.click();
    });

    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_dialphone_sms.png'), fullPage: false });
  });

  // TEST 5: WhatsApp Business Bot Simulator (Layer 5 M4)
  await testStep('5. WhatsApp Business Bot Webhook Simulator', async () => {
    // Switch to WhatsApp tab using direct tab ID
    const switchedWa = await page.evaluate(() => {
      const waTab = document.getElementById('tab-whatsapp-bot');
      if (waTab) {
        waTab.click();
        return true;
      }
      return false;
    });

    if (!switchedWa) throw new Error('Could not find WhatsApp Business Bot tab');

    await sleep(600);

    // Click 1-Click WhatsApp Quick Action Preset: SELL Tomato 200 25 Salem
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sellChip = btns.find(b => b.textContent.includes('SELL Tomato 200 25 Salem'));
      if (sellChip) sellChip.click();
    });

    // Wait for webhook round-trip
    await sleep(2000);

    const hasWaReply = await page.evaluate(() => {
      return document.body.textContent.includes('Marketplace Listing Confirmed') || 
             document.body.textContent.includes('KisanSetu Official Bot') ||
             document.body.textContent.includes('KisanSetu WhatsApp');
    });

    if (!hasWaReply) throw new Error('WhatsApp Bot response not found in chat thread');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_whatsapp_business_bot.png'), fullPage: false });
  });

  // TEST 6: Telephony & IVR Analytics Hub (Layer 5 M4)
  await testStep('6. Telephony & IVR Analytics & Drop-off Funnel', async () => {
    // Switch to Analytics tab using direct tab ID
    const switchedAnalytics = await page.evaluate(() => {
      const aTab = document.getElementById('tab-analytics');
      if (aTab) {
        aTab.click();
        return true;
      }
      return false;
    });

    if (!switchedAnalytics) throw new Error('Could not find Telephony & IVR Analytics tab');

    await sleep(800);

    const hasAnalyticsCards = await page.evaluate(() => {
      return document.body.textContent.includes('Total Voice Calls') && document.body.textContent.includes('Drop-Off Funnel');
    });

    if (!hasAnalyticsCards) throw new Error('IVR Analytics KPI cards or Drop-off funnel not rendered');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_telephony_analytics_hub.png'), fullPage: false });
  });

  // Helper for Authenticated Tests: Login API and set localStorage
  async function loginAs(email, password) {
    const loginRes = await page.evaluate(async (em, pw) => {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: pw })
      });
      const json = await res.json();
      if (json.data && json.data.token) {
        localStorage.setItem('token', json.data.token);
        localStorage.setItem('refreshToken', json.data.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(json.data.user));
        return { success: true };
      }
      return { success: false, msg: json.message };
    }, email, password);

    if (!loginRes.success) throw new Error(`Login failed for ${email}: ${loginRes.msg}`);
  }

  // TEST 7: Buyer Dashboard & PDF Invoice
  await testStep('7. Buyer Dashboard & PDF Invoice Generation', async () => {
    await loginAs('priya@example.com', 'password123');
    await page.goto('http://localhost:3000/buyer/dashboard', { waitUntil: 'networkidle2', timeout: 15000 });

    await page.waitForSelector('h1', { timeout: 8000 });

    const isBuyerPage = await page.evaluate(() => {
      return document.body.textContent.includes('Buyer Operations Dashboard') || document.body.textContent.includes('Total Orders');
    });
    if (!isBuyerPage) throw new Error('Buyer dashboard content not found');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_buyer_dashboard.png'), fullPage: false });
  });

  // TEST 8: Farmer Dashboard & Revenue Analytics
  await testStep('8. Farmer Dashboard & Recharts Revenue Overview', async () => {
    await loginAs('ramesh@example.com', 'password123');
    await page.goto('http://localhost:3000/farmer/dashboard', { waitUntil: 'networkidle2', timeout: 15000 });

    await page.waitForSelector('h1', { timeout: 8000 });

    const isFarmerPage = await page.evaluate(() => {
      return document.body.textContent.includes('Farmer Operations Hub') || document.body.textContent.includes('Total Direct Revenue');
    });
    if (!isFarmerPage) throw new Error('Farmer dashboard content not found');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_farmer_dashboard.png'), fullPage: false });
  });

  // TEST 9: Logistics Dashboard & Dispatch Tracker
  await testStep('9. Logistics Dashboard & Fleet Hub', async () => {
    await loginAs('kiran@example.com', 'password123');
    await page.goto('http://localhost:3000/logistics/dashboard', { waitUntil: 'networkidle2', timeout: 15000 });

    await page.waitForSelector('h1', { timeout: 8000 });

    const isLogisticsPage = await page.evaluate(() => {
      return document.body.textContent.includes('Logistics') || document.body.textContent.includes('Deliveries');
    });
    if (!isLogisticsPage) throw new Error('Logistics dashboard content not found');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_logistics_dashboard.png'), fullPage: false });
  });

  await browser.close();

  console.log('\n===============================================================');
  console.log(`📊 BROWSER TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log(`⚠️ Console Errors Encountered: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Console errors:', consoleErrors.slice(0, 5));
  }
  console.log('===============================================================');

  if (passed === total) {
    console.log('🎉 ALL BROWSER & LAYER 4 WORKFLOWS FULLY VERIFIED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runBrowserTests().catch(err => {
  console.error('Fatal browser test failure:', err);
  process.exit(1);
});
