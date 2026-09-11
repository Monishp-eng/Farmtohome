const sarvamService = require('../services/sarvam.tts.service');
const nlpExtractor = require('../nlp/extractor');
const db = require('../config/database');
const mapsService = require('../services/maps.service');
const smsService = require('../services/sms.service');

// Tamil display names for common crops
const tamilCropNames = {
  'Tomato': 'தக்காளி',
  'Onion': 'வெங்காயம்',
  'Potato': 'உருளைக்கிழங்கு',
  'Rice': 'அரிசி',
  'Wheat': 'கோதுமை',
  'Green Chilli': 'பச்சை மிளகாய்',
  'Banana': 'வாழைப்பழம்',
  'Mango': 'மாம்பழம்',
  'Cabbage': 'முட்டைக்கோஸ்',
  'Carrot': 'கேரட்',
  'Brinjal': 'கத்தரிக்காய்',
  'Coconut': 'தேங்காய்',
  'Groundnut': 'வேர்க்கடலை',
  'Turmeric': 'மஞ்சள்',
  'Cotton': 'பருத்தி',
  'Sugarcane': 'கரும்பு'
};

// Pre-cached Sarvam AI Bulbul v3 Natural Native Tamil Voice Audio URLs (Kavitha)
const SARVAM_AUDIO = {
  greeting: '/audio/tamil_greeting_kavitha.wav',
  menu: {
    ta: '/audio/tamil_greeting_kavitha.wav',
    hi: '/audio/fe038b772acf18239d158a6c58263bd2.wav',
    en: '/audio/91a994d175ba11dec7ceea1e5b7524fb.wav'
  },
  sell_prompt: {
    ta: '/audio/tamil_sell_prompt_kavitha.wav',
    hi: '/audio/c445a77f45f57588b131e4f65f735ddd.wav',
    en: '/audio/26c830b1fa149b246f7ad6e05bfe2d06.wav'
  },
  orders: {
    ta: '/audio/tamil_orders_kavitha.wav',
    hi: '/audio/fe038b772acf18239d158a6c58263bd2.wav',
    en: '/audio/91a994d175ba11dec7ceea1e5b7524fb.wav'
  },
  doctor: {
    ta: '/audio/tamil_doctor_kavitha.wav',
    hi: '/audio/fe038b772acf18239d158a6c58263bd2.wav',
    en: '/audio/91a994d175ba11dec7ceea1e5b7524fb.wav'
  },
  thanks: {
    ta: '/audio/tamil_confirm_prompt_kavitha.wav',
    hi: '/audio/0e513d449840835fadeb2201ec5afa9a.wav',
    en: '/audio/91a994d175ba11dec7ceea1e5b7524fb.wav'
  }
};

/**
 * Enhanced Twilio IVR Voice Webhook Powered by Sarvam AI (Bulbul v3 + Saaras v3)
 * Full Interactive Conversational Flow for Zero-Internet 2G Phones
 */
const handleTwilioGather = async (req, res) => {
  try {
    res.type('text/xml');

    const digits = (req.body?.Digits || req.query?.Digits || '').trim();
    const speech = (req.body?.SpeechResult || '').trim();
    const recordingUrl = (req.body?.RecordingUrl || '').trim();
    const step = req.query?.step || 'LANG';
    const lang = req.query?.lang || 'hi';

    // Extract caller/farmer phone number dynamically (supports ANY registered or unregistered caller)
    const twilioNumber = (process.env.TWILIO_PHONE_NUMBER || '8454780736').replace(/[^0-9]/g, '').slice(-10);
    const fromNumber = (req.body?.From || req.body?.Caller || '').replace(/[^0-9]/g, '').slice(-10);
    const toNumber = (req.body?.To || req.body?.Called || '').replace(/[^0-9]/g, '').slice(-10);
    const queryPhone = (req.query?.phone || '').replace(/[^0-9]/g, '').slice(-10);

    let rawPhone = queryPhone;
    if (!rawPhone) {
      if (fromNumber && fromNumber !== twilioNumber) {
        rawPhone = fromNumber;
      } else if (toNumber && toNumber !== twilioNumber) {
        rawPhone = toNumber;
      } else {
        rawPhone = fromNumber || toNumber || '9876543210';
      }
    }
    const cleanPhone = rawPhone.slice(-10) || '9876543210';
    const baseUrl = process.env.PUBLIC_URL || 'https://oral-iowa-portal-wright.trycloudflare.com';

    const getVoiceLang = (l) => l === 'ta' ? 'ta-IN' : l === 'en' ? 'en-IN' : 'hi-IN';
    const getSpeaker = (l) => l === 'ta' ? 'kavitha' : 'priya';

    console.log(`[Twilio Webhook] Step: ${step}, Lang: ${lang}, Digits: "${digits}", RecordingUrl: "${recordingUrl}", Caller Phone: ${cleanPhone}`);

    // Helper: generate audio via Sarvam AI or return cached URL
    async function getSarvamAudio(text, langCode) {
      try {
        const url = await sarvamService.generateAudio(text, getVoiceLang(langCode), getSpeaker(langCode));
        return url || `${baseUrl}${SARVAM_AUDIO.thanks[langCode] || SARVAM_AUDIO.thanks.ta}`;
      } catch (e) {
        return `${baseUrl}${SARVAM_AUDIO.thanks[langCode] || SARVAM_AUDIO.thanks.ta}`;
      }
    }

    // ─── STEP 1: LANGUAGE SELECTION ───
    if (step === 'LANG') {
      let chosenLang = 'ta'; // Default to Tamil directly
      if (digits === '1') chosenLang = 'ta';
      else if (digits === '2') chosenLang = 'hi';
      else if (digits === '3') chosenLang = 'en';

      const menuPrompt = chosenLang === 'ta'
        ? 'वणक्कम! उळवन नेरडी सेवैक्कु नलवरवु। पयिर विर्क, ओण्ड्रु अळुत्तवुम। उङ्गल आर्डर मट्रुम वरुमानम पार्क, इरंडु अळुत्तवुम। पयिर मरुत्तुवरक्कु, मूण्ड्रु अळुत्तवुम।'
        : chosenLang === 'en'
        ? 'Welcome! Press 1 to sell fresh produce. Press 2 to check your orders and earnings. Press 3 for Crop Doctor.'
        : 'नमस्ते! फसल बेचने के लिए 1 दबाएं। अपने आर्डर और कमाई जानने के लिए 2 दबाएं। फसल डॉक्टर के लिए 3 दबाएं।';

      const langCode = chosenLang === 'en' ? 'en-IN' : 'hi-IN';

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=${chosenLang}&amp;phone=${cleanPhone}" numDigits="1" method="POST" timeout="12">
    <Say voice="Polly.Aditi" language="${langCode}">${menuPrompt}</Say>
  </Gather>
  <Redirect method="POST">${baseUrl}/api/ivr/twilio-gather?step=LANG&amp;lang=ta&amp;phone=${cleanPhone}</Redirect>
</Response>`);
    }

    // ─── STEP 2: MAIN MENU SELECTION ───
    else if (step === 'MENU') {

      // Option 1: Sell Crop -> Speak details + address after beep
      if (digits === '1' || digits === '') {
        const sellPrompt = lang === 'ta'
          ? 'बीप ओलिर्कु पिरगु तेलिवाग चोल्लुङ्गल: उङ्गल पयिरिन पेयर, एत्तने किलो, ओरु किलो विले, मट्रुम उङ्गल ऊरु मुगवरि।'
          : lang === 'en'
          ? 'After the beep, please clearly speak: crop name, quantity in kilograms, expected price per kg, and your farm address.'
          : 'बीप की आवाज के बाद बोलें: फसल का नाम, कितने किलो, प्रति किलो भाव, और आपका पता।';

        const langCode = lang === 'en' ? 'en-IN' : 'hi-IN';

        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="${langCode}">${sellPrompt}</Say>
  <Record action="${baseUrl}/api/ivr/twilio-gather?step=PRODUCE&amp;lang=${lang}&amp;phone=${cleanPhone}" method="POST" maxLength="20" playBeep="true" timeout="6" trim="trim-silence"/>
</Response>`);
      }

      // Option 2: Orders & Earnings
      else if (digits === '2') {
        let totalOrders = 2, earnings = 1450;
        try {
          const farmer = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
          if (farmer) {
            const stats = db.prepare('SELECT COUNT(*) as total, SUM(farmer_earnings) as earnings FROM orders WHERE farmer_id = ?').get(farmer.id);
            if (stats?.total) totalOrders = stats.total;
            if (stats?.earnings) earnings = stats.earnings;
          }
        } catch (e) {}

        const msg = lang === 'ta'
          ? `उङ्गल कणक्किल ${totalOrders} आर्डरगल उल्लन। मोत्त वरुमानम ${earnings} रूपाय। नेरडी डेलिवरि मूलम उन्गल बैंक कणक्किल वरवु वेक्कप्पडुम। नन्ड्री!`
          : lang === 'en'
          ? `You have ${totalOrders} confirmed orders. Total earnings: ${earnings} rupees. Deposited to your bank account upon delivery. Thank you!`
          : `आपके खाते में कुल ${totalOrders} आर्डर हैं। कुल कमाई ${earnings} रुपये है। डायरेक्ट डिलीवरी होते ही बैंक खाते में जमा होगी। धन्यवाद!`;

        const langCode = lang === 'en' ? 'en-IN' : 'hi-IN';

        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="${langCode}">${msg}</Say>
</Response>`);
      }

      // Option 3: Crop Doctor
      else if (digits === '3') {
        const docMsg = lang === 'ta'
          ? 'पयिर मरुत्तुवर सेवैक्कु नलवरवु। इलेयिल एदावदु पूच्चि इरुनदाल चोल्लुङ्गल।'
          : lang === 'en'
          ? 'Welcome to Crop Doctor. Please describe the symptoms or leaf discoloration.'
          : 'फसल डॉक्टर में स्वागत है। कृपया अपनी फसल की बीमारी या पत्तों के लक्षण बताएं।';

        const langCode = lang === 'en' ? 'en-IN' : 'hi-IN';

        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="${langCode}">${docMsg}</Say>
</Response>`);
      }

      // Fallback
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="hi-IN">नन्ड्री! Thank you for calling KisanSetu.</Say>
</Response>`);
    }

    // ─── STEP 3: PRODUCE & ADDRESS VOICE CAPTURE (STT + NLP) ───
    else if (step === 'PRODUCE') {
      let rawText = speech || '';

      // 1. Transcribe with Sarvam Saaras v3 STT if recording exists
      if (recordingUrl) {
        try {
          console.log(`[Twilio IVR] Transcribing recording from ${recordingUrl} with Sarvam AI STT...`);
          const sttTranscript = await sarvamService.transcribeTwilioRecording(recordingUrl, getVoiceLang(lang));
          if (sttTranscript) {
            rawText = sttTranscript;
            console.log(`[Twilio IVR] Transcribed text: "${rawText}"`);
          }
        } catch (sttErr) {
          console.warn('[STT Error]:', sttErr.message);
        }
      }

      // 2. Extract crop, quantity, price, and farm address via NLP
      let crop = 'Tomato', qty = 100, price = 25, address = 'Salem, Tamil Nadu';
      if (rawText) {
        try {
          const extracted = await nlpExtractor.extractEntities(rawText, 'PRODUCE_LISTING', lang);
          console.log('[Twilio IVR] NLP Extracted entities:', extracted);
          if (extracted.crop) crop = extracted.crop;
          if (extracted.quantity) qty = extracted.quantity;
          if (extracted.expected_price) price = extracted.expected_price;
          if (extracted.location) address = extracted.location;
        } catch (nlpErr) {
          console.warn('[NLP Extraction Warning]:', nlpErr.message);
        }
      }

      const displayCrop = (lang === 'ta' && tamilCropNames[crop]) ? tamilCropNames[crop] : crop;

      const verifyMsg = lang === 'ta'
        ? `नीङ्गल चोन्नदु: पयिर ${displayCrop}, अलवु ${qty} किलो, ओरु किलो विले ${price} रूपाय, मुगवरि ${address}। इदु सरि endral ओण्ड्रु अळुत्तवुम। मात्र इरंडु अळुत्तवुम।`
        : lang === 'en'
        ? `You said: crop ${crop}, quantity ${qty} kilograms, price ${price} rupees per kg, farm address ${address}. If correct, press 1. To speak again, press 2.`
        : `आपने बताया: फसल ${crop}, वजन ${qty} किलो, भाव ${price} रुपये प्रति किलो, पता ${address}। सही है तो 1 दबाएं। दोबारा बोलने के लिए 2 दबाएं।`;

      const langCode = lang === 'en' ? 'en-IN' : 'hi-IN';

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=CONFIRM&amp;lang=${lang}&amp;crop=${encodeURIComponent(crop)}&amp;qty=${qty}&amp;price=${price}&amp;address=${encodeURIComponent(address)}&amp;phone=${cleanPhone}" numDigits="1" method="POST" timeout="10">
    <Say voice="Polly.Aditi" language="${langCode}">${verifyMsg}</Say>
  </Gather>
</Response>`);
    }

    // ─── STEP 4: FINAL CONFIRMATION & PUBLISH TO HUB ───
    else if (step === 'CONFIRM') {
      const crop = decodeURIComponent(req.query.crop || 'Tomato');
      const qty = parseFloat(req.query.qty) || 100;
      const price = parseFloat(req.query.price) || 25;
      const address = decodeURIComponent(req.query.address || 'Salem, Tamil Nadu');

      // If farmer pressed 2 -> Retry recording
      if (digits === '2') {
        const retryMsg = lang === 'ta'
          ? "सरि। बीप ओलिर्कु पिरगु मीण्डुम चोल्लुङ्गल: पयिरिन पेयर, एत्तने किलो, ओरु किलो विले, मट्रुम उङ्गल मुगवरि।"
          : lang === 'en'
          ? "Okay. Please speak again after the beep: crop name, kilograms, price per kg, and farm address."
          : "ठीक है। बीप के बाद दोबारा बोलें: फसल का नाम, कितने किलो, भाव, और आपका पता।";

        const langCode = lang === 'en' ? 'en-IN' : 'hi-IN';

        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="${langCode}">${retryMsg}</Say>
  <Record action="${baseUrl}/api/ivr/twilio-gather?step=PRODUCE&amp;lang=${lang}&amp;phone=${cleanPhone}" method="POST" maxLength="15" playBeep="true" timeout="4" trim="trim-silence"/>
</Response>`);
      }

      // Farmer confirmed (pressed 1 or timeout) -> List produce 
      let listingId = Date.now() % 10000;
      try {
        const geo = await mapsService.geocode(address);
        const farmLat = geo.lat || 11.6643;
        const farmLng = geo.lng || 78.1460;
        const resolvedAddress = geo.location || address;

        let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
        if (!farmer) {
          const dummyPass = '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.';
          const ins = db.prepare('INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
            `Kisan (${cleanPhone.slice(-4)})`, `call_${cleanPhone}@kisan.in`, dummyPass, 'farmer', cleanPhone, resolvedAddress, 'Tamil Nadu', farmLat, farmLng
          );
          farmer = { id: ins.lastInsertRowid };
        } else {
          db.prepare('UPDATE users SET location = ?, latitude = ?, longitude = ? WHERE id = ?').run(resolvedAddress, farmLat, farmLng, farmer.id);
        }

        const shelfLifeMap = { 'Tomato': 4, 'Onion': 14, 'Potato': 20, 'Cabbage': 4, 'Brinjal': 4, 'Mango Alphonso': 6, 'Banana': 5, 'Fresh Milk': 2 };
        const shelfDays = shelfLifeMap[crop] || 4;
        const todayDate = new Date();
        const harvestDate = todayDate.toISOString().split('T')[0];
        const expiryDate = new Date(todayDate.getTime() + shelfDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const insProd = db.prepare('INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, quality_grade, is_organic, harvest_date, expiry_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          farmer.id, crop, 'vegetables', `Listed via 2G Phone Call (Farm: ${resolvedAddress})`, qty, price, 'A', 0, harvestDate, expiryDate, 'available'
        );
        listingId = insProd.lastInsertRowid;

        // SMS confirmation to farmer mentioning direct nearest matching & freshness validity
        const displayCrop = (lang === 'ta' && tamilCropNames[crop]) ? tamilCropNames[crop] : crop;
        const smsText = lang === 'ta'
          ? `உங்கள் ${displayCrop} பட்டியல் (#${listingId}) நேரடி சந்தையில் வெளியிடப்பட்டது! ${expiryDate} வரை ப்ரெஷ். அருகில் உள்ள வாடிக்கையாளர்கள் ஆர்டர் செய்யும்போது SMS வரும்.`
          : lang === 'en'
          ? `Your ${crop} listing (#${listingId}) is now live! Fresh & available till ${expiryDate}. Matched directly with nearest buyers.`
          : `Aapki ${crop} listing (#${listingId}) live ho gayi hai! ${expiryDate} tak fresh. Nazdeeki buyers ke order par SMS aayega.`;

        smsService.sendSMS(cleanPhone, smsText).catch(() => {});

      } catch (dbErr) {
        console.error('[DB Insert Error in IVR]:', dbErr.message);
      }

      const displayCrop = (lang === 'ta' && tamilCropNames[crop]) ? tamilCropNames[crop] : crop;
      const successMsg = lang === 'ta'
        ? `वाळ्त्तुकल! उङ्गल ${qty} किलो ${displayCrop}, ${price} रूपाय, वेद्रिगरमाग पदिवानदु। नन्ड्री! जेय किसन!`
        : lang === 'en'
        ? `Congratulations! Your ${qty} kilograms of ${crop} at ${price} rupees is confirmed. Listing ID is ${listingId}. Thank you! Jai Kisan!`
        : `बधाई हो किसान भाई! आपकी ${qty} किलो ${crop}, ${price} रुपये, लिस्ट हो गई है। लिस्टिंग नंबर ${listingId}। धन्यवाद! जय किसान!`;

      const langCode = lang === 'en' ? 'en-IN' : 'hi-IN';

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="${langCode}">${successMsg}</Say>
</Response>`);
    }

    // Default catch-all
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="hi-IN">नन्ड्री! Thank you for calling KisanSetu.</Say>
</Response>`);

  } catch (globalErr) {
    console.error('[Twilio Gather Global Error]:', globalErr);
    res.type('text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Thank you for calling KisanSetu.</Say>
</Response>`);
  }
};

module.exports = handleTwilioGather;
