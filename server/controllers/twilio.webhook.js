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

// Pre-cached Sarvam AI Bulbul v3 Natural Indic Voice Audio URLs
const SARVAM_AUDIO = {
  greeting: '/audio/0e513d449840835fadeb2201ec5afa9a.wav',
  menu: {
    ta: '/audio/4e941d33c88b964cc7416d476217e8ca.wav',
    hi: '/audio/fe038b772acf18239d158a6c58263bd2.wav',
    en: '/audio/91a994d175ba11dec7ceea1e5b7524fb.wav'
  },
  sell_prompt: {
    ta: '/audio/520a4de9bc7624c5ce68d7c27a2b7782.wav',
    hi: '/audio/c445a77f45f57588b131e4f65f735ddd.wav',
    en: '/audio/26c830b1fa149b246f7ad6e05bfe2d06.wav'
  },
  orders: {
    ta: '/audio/0a631322519b4bab3f8d28f2f2d8d70e.wav',
    hi: '/audio/fe038b772acf18239d158a6c58263bd2.wav',
    en: '/audio/91a994d175ba11dec7ceea1e5b7524fb.wav'
  },
  doctor: {
    ta: '/audio/7632b303e5996c5d92f91af625e83b6f.wav',
    hi: '/audio/fe038b772acf18239d158a6c58263bd2.wav',
    en: '/audio/91a994d175ba11dec7ceea1e5b7524fb.wav'
  },
  thanks: {
    ta: '/audio/e96d48ba22cc3d006608f93ff2d303e1.wav',
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

    // Determine caller phone
    let phone = req.body?.To || req.body?.Called || req.body?.From || '7989998568';
    if (phone.includes('8454780736')) {
      phone = req.body?.From || req.body?.Caller || '7989998568';
    }
    if (phone.includes('8454780736')) {
      phone = '7989998568';
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10) || '7989998568';
    const baseUrl = process.env.PUBLIC_URL || 'https://oral-iowa-portal-wright.trycloudflare.com';

    const getVoiceLang = (l) => l === 'ta' ? 'ta-IN' : l === 'en' ? 'en-IN' : 'hi-IN';
    const getSpeaker = (l) => l === 'ta' ? 'kavitha' : 'priya';

    console.log(`[Twilio Webhook] Step: ${step}, Lang: ${lang}, Digits: "${digits}", RecordingUrl: "${recordingUrl}", Phone: ${cleanPhone}`);

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
      let chosenLang = 'hi';
      if (digits === '2') chosenLang = 'ta';
      else if (digits === '3') chosenLang = 'en';
      else chosenLang = 'hi'; // Default 1 -> Hindi

      const menuAudioUrl = `${baseUrl}${SARVAM_AUDIO.menu[chosenLang] || SARVAM_AUDIO.menu.ta}`;

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=${chosenLang}" numDigits="1" method="POST" timeout="10">
    <Play>${menuAudioUrl}</Play>
  </Gather>
  <Play>${baseUrl}${SARVAM_AUDIO.thanks[chosenLang] || SARVAM_AUDIO.thanks.ta}</Play>
</Response>`);
    }

    // ─── STEP 2: MAIN MENU SELECTION ───
    else if (step === 'MENU') {

      // Option 1: Sell Crop -> Speak details + address after beep
      if (digits === '1') {
        const sellPromptUrl = `${baseUrl}${SARVAM_AUDIO.sell_prompt[lang] || SARVAM_AUDIO.sell_prompt.ta}`;

        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Play>${sellPromptUrl}</Play>
  <Record action="${baseUrl}/api/ivr/twilio-gather?step=PRODUCE&amp;lang=${lang}" method="POST" maxLength="15" playBeep="true" timeout="4" trim="trim-silence"/>
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
          ? `உங்கள் கணக்கில் ${totalOrders} ஆர்டர்கள் உள்ளன. மொத்த வருமானம் ${earnings} ரூபாய். கோயம்பேடு கிடங்கு மூலம் விரைவில் உங்கள் வங்கி கணக்கில் வரவு வைக்கப்படும். நன்றி!`
          : lang === 'en'
          ? `You have ${totalOrders} confirmed orders. Total earnings: ${earnings} rupees. Deposited to your bank account upon delivery. Thank you!`
          : `आपके खाते में कुल ${totalOrders} आर्डर हैं। कुल कमाई ${earnings} रुपये है। वेयरहाउस डिलीवरी होते ही बैंक खाते में जमा होगी। धन्यवाद!`;

        const audioUrl = await getSarvamAudio(msg, lang);

        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Play>${audioUrl}</Play>
</Response>`);
      }

      // Option 3: Crop Doctor
      else if (digits === '3') {
        const docAudioUrl = `${baseUrl}${SARVAM_AUDIO.doctor[lang] || SARVAM_AUDIO.doctor.ta}`;

        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Play>${docAudioUrl}</Play>
</Response>`);
      }

      // Fallback
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${baseUrl}${SARVAM_AUDIO.thanks[lang] || SARVAM_AUDIO.thanks.ta}</Play>
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
      let crop = 'Onion', qty = 200, price = 30, address = 'Salem, Tamil Nadu';
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
        ? `நீங்கள் சொன்னது: பயிர் ${displayCrop}, அளவு ${qty} கிலோ, ஒரு கிலோவுக்கு ${price} ரூபாய், பண்ணை முகவரி ${address}. இது சரி என்றால் ஒன்று அழுத்தவும். மாற்ற இரண்டு அழுத்தவும்.`
        : lang === 'en'
        ? `You said: crop ${crop}, quantity ${qty} kilograms, price ${price} rupees per kg, farm address ${address}. If correct, press 1. To speak again, press 2.`
        : `आपने बताया: फसल ${crop}, वजन ${qty} किलो, भाव ${price} रुपये प्रति किलो, पता ${address}। सही है तो 1 दबाएं। दोबारा बोलने के लिए 2 दबाएं।`;

      const verifyAudioUrl = await getSarvamAudio(verifyMsg, lang);

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=CONFIRM&amp;lang=${lang}&amp;crop=${encodeURIComponent(crop)}&amp;qty=${qty}&amp;price=${price}&amp;address=${encodeURIComponent(address)}" numDigits="1" method="POST" timeout="10">
    <Play>${verifyAudioUrl}</Play>
  </Gather>
</Response>`);
    }

    // ─── STEP 4: FINAL CONFIRMATION & PUBLISH TO CHENNAI HUB ───
    else if (step === 'CONFIRM') {
      const crop = decodeURIComponent(req.query.crop || 'Onion');
      const qty = parseFloat(req.query.qty) || 200;
      const price = parseFloat(req.query.price) || 30;
      const address = decodeURIComponent(req.query.address || 'Salem, Tamil Nadu');

      // If farmer pressed 2 -> Retry recording
      if (digits === '2') {
        const retryMsg = lang === 'ta'
          ? "சரி. பீப் ஒலிக்குப் பிறகு மீண்டும் சொல்லுங்கள்: பயிரின் பெயர், எத்தனை கிலோ, ஒரு கிலோ விலை, மற்றும் உங்கள் பண்ணை முகவரி."
          : lang === 'en'
          ? "Okay. Please speak again after the beep: crop name, kilograms, price per kg, and farm address."
          : "ठीक है। बीप के बाद दोबारा बोलें: फसल का नाम, कितने किलो, भाव, और आपका पता।";

        const retryAudioUrl = await getSarvamAudio(retryMsg, lang);

        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Play>${retryAudioUrl}</Play>
  <Record action="${baseUrl}/api/ivr/twilio-gather?step=PRODUCE&amp;lang=${lang}" method="POST" maxLength="15" playBeep="true" timeout="4" trim="trim-silence"/>
</Response>`);
      }

      // Farmer confirmed (pressed 1 or timeout) -> List produce & assign Chennai Hub logistics
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

        const insProd = db.prepare('INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, quality_grade, is_organic, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          farmer.id, crop, 'vegetables', `Listed via 2G Phone Call (Farm: ${resolvedAddress})`, qty, price, 'A', 0, 'available'
        );
        listingId = insProd.lastInsertRowid;

        // Create Stage 1 First-Mile Logistics Pickup Task
        try {
          const driver = db.prepare("SELECT id FROM users WHERE role = 'logistics' LIMIT 1").get();
          const warehouse = db.prepare("SELECT * FROM warehouses WHERE city = 'Chennai' LIMIT 1").get() || {
            id: 1,
            name: 'Chennai Central Agri-Hub (Koyambedu)',
            address: 'Koyambedu Wholesale Complex, Chennai',
            latitude: 13.0694,
            longitude: 80.1948
          };

          const distKm = Math.round(mapsService.calculateDistanceKm(farmLat, farmLng, warehouse.latitude, warehouse.longitude) || 120);

          db.prepare(`
            INSERT INTO logistics (
              product_id, stage, warehouse_id, driver_id, 
              pickup_location, pickup_lat, pickup_lng, 
              delivery_location, delivery_lat, delivery_lng, 
              distance_km, estimated_time_hrs, vehicle_type, status
            )
            VALUES (?, 'farm_to_warehouse', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned')
          `).run(
            listingId,
            warehouse.id,
            driver?.id || 13,
            `${resolvedAddress}`,
            farmLat,
            farmLng,
            `${warehouse.name}, ${warehouse.address}`,
            warehouse.latitude,
            warehouse.longitude,
            distKm,
            parseFloat((distKm / 45).toFixed(1)),
            qty >= 500 ? 'heavy_truck' : 'mini_truck'
          );
        } catch (logErr) {
          console.warn('[Logistics Farm Pickup Creation Warning]:', logErr.message);
        }

        // SMS confirmation to farmer
        const displayCrop = (lang === 'ta' && tamilCropNames[crop]) ? tamilCropNames[crop] : crop;
        const smsText = lang === 'ta'
          ? `KisanSetu: Ungal ${qty}kg ${displayCrop} @ Rs ${price}/kg முகவரி: ${resolvedAddress}-ilirundhu Koyambedu Warehouse (Chennai)-kku pickup schedule seiyappattadhu (ID #${listingId}).`
          : `KisanSetu: Aapki ${qty}kg ${crop} @ Rs ${price}/kg pata: ${resolvedAddress} se Koyambedu Warehouse (Chennai) pickup schedule ho gayi hai (ID #${listingId}).`;

        smsService.sendSMS(cleanPhone, smsText).catch(() => {});

      } catch (dbErr) {
        console.error('[DB Insert Error in IVR]:', dbErr.message);
      }

      const displayCrop = (lang === 'ta' && tamilCropNames[crop]) ? tamilCropNames[crop] : crop;
      const successMsg = lang === 'ta'
        ? `வாழ்த்துகள்! உங்கள் ${qty} கிலோ ${displayCrop}, ${price} ரூபாய், முகவரி ${address}-லிருந்து சென்னை கோயம்பேடு கிடங்கு பிக்கப்பிற்கு வெற்றிகரமாக பதிவானது. பட்டியல் எண் ${listingId}. நன்றி! ஜெய் கிசான்!`
        : lang === 'en'
        ? `Congratulations! Your ${qty} kilograms of ${crop} at ${price} rupees from ${address} is confirmed for Chennai Koyambedu Warehouse pickup. Listing ID is ${listingId}. Thank you! Jai Kisan!`
        : `बधाई हो किसान भाई! आपकी ${qty} किलो ${crop}, ${price} रुपये, पता ${address} से चेन्नई कोयम्बेडु वेयरहाउस पिकअप के लिए लिस्ट हो गई है। लिस्टिंग नंबर ${listingId}। धन्यवाद! जय किसान!`;

      const successAudioUrl = await getSarvamAudio(successMsg, lang);

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Play>${successAudioUrl}</Play>
</Response>`);
    }

    // Default catch-all
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${baseUrl}${SARVAM_AUDIO.thanks.ta}</Play>
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
