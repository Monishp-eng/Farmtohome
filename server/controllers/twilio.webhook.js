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
    const lang = req.query?.lang || 'ta';

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

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=${chosenLang}&amp;phone=${cleanPhone}" numDigits="1" method="POST" timeout="14">
    <Play>${baseUrl}/audio/tamil_greeting_kavitha.wav</Play>
  </Gather>
  <Say language="en-IN">Press 1 to sell crops, 2 for orders, 3 for crop doctor.</Say>
  <Redirect method="POST">${baseUrl}/api/ivr/twilio-gather?step=LANG&amp;lang=ta&amp;phone=${cleanPhone}</Redirect>
</Response>`);
    }

    // ─── STEP 2: MAIN MENU SELECTION ───
    else if (step === 'MENU') {

      // Option 1: Sell Crop -> Speak details + address after beep
      if (digits === '1' || digits === '') {
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Play>${baseUrl}/audio/tamil_sell_prompt_kavitha.wav</Play>
  <Record action="${baseUrl}/api/ivr/twilio-gather?step=PRODUCE&amp;lang=${lang}&amp;phone=${cleanPhone}" method="POST" maxLength="20" playBeep="true" timeout="6" trim="trim-silence"/>
</Response>`);
      }

      // Option 2: Orders & Earnings
      else if (digits === '2') {
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Play>${baseUrl}/audio/tamil_orders_kavitha.wav</Play>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=${lang}&amp;phone=${cleanPhone}" numDigits="1" timeout="8">
    <Say language="en-IN">Press 9 to return to the main menu.</Say>
  </Gather>
  <Say language="en-IN">Thank you for calling KisanSetu.</Say>
</Response>`);
      }

      // Option 3: Crop Doctor
      else if (digits === '3') {
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Play>${baseUrl}/audio/tamil_doctor_kavitha.wav</Play>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=${lang}&amp;phone=${cleanPhone}" numDigits="1" timeout="8">
    <Say language="en-IN">Press 9 to return to main menu.</Say>
  </Gather>
  <Say language="en-IN">Thank you for calling KisanSetu.</Say>
</Response>`);
      }

      // Fallback
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${baseUrl}/audio/tamil_confirm_prompt_kavitha.wav</Play>
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
      let crop = 'தக்காளி', qty = 100, price = 25, address = 'Salem, Tamil Nadu';
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
        ? `நீங்கள் சொன்னது: பயிர் ${displayCrop}, அளவு ${qty} கிலோ, ஒரு கிலோ விலை ${price} ரூபாய், முகவரி ${address}. இது சரி என்றால் ஒன்று அழுத்தவும். மாற்ற இரண்டு அழுத்தவும்.`
        : lang === 'en'
        ? `You said: crop ${crop}, quantity ${qty} kilograms, price ${price} rupees per kg, farm address ${address}. If correct, press 1. To speak again, press 2.`
        : `आपने बताया: फसल ${crop}, वजन ${qty} किलो, भाव ${price} रुपये प्रति किलो, पता ${address}। सही है तो 1 दबाएं। दोबारा बोलने के लिए 2 दबाएं।`;

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=CONFIRM&amp;lang=${lang}&amp;crop=${encodeURIComponent(crop)}&amp;qty=${qty}&amp;price=${price}&amp;address=${encodeURIComponent(address)}&amp;phone=${cleanPhone}" numDigits="1" method="POST" timeout="10">
    <Say ${lang === 'ta' ? 'voice="Polly.Valluvar" language="ta-IN"' : lang === 'en' ? 'language="en-IN"' : 'voice="Polly.Aditi" language="hi-IN"'}>${verifyMsg}</Say>
  </Gather>
  <Say voice="Polly.Valluvar" language="ta-IN">உறுதிப்படுத்த ஒன்று அழுத்தவும்.</Say>
</Response>`);
    }

    // ─── STEP 4: FINAL CONFIRMATION & PUBLISH TO HUB ───
    else if (step === 'CONFIRM') {
      const crop = decodeURIComponent(req.query.crop || 'தக்காளி');
      const qty = parseFloat(req.query.qty) || 100;
      const price = parseFloat(req.query.price) || 25;
      const address = decodeURIComponent(req.query.address || 'Salem, Tamil Nadu');

      // If farmer pressed 2 -> Retry recording
      if (digits === '2') {
        const retryMsg = lang === 'ta'
          ? "சரி. பீப் ஒலிக்குப் பிறகு மீண்டும் சொல்லுங்கள்: பயிரின் பெயர், எத்தனை கிலோ, ஒரு கிலோ விலை, மற்றும் உங்கள் முகவரி."
          : lang === 'en'
          ? "Okay. Please speak again after the beep: crop name, kilograms, price per kg, and farm address."
          : "ठीक है। बीप के बाद दोबारा बोलें: फसल का नाम, कितने किलो, भाव, और आपका पता।";

        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say ${lang === 'ta' ? 'voice="Polly.Valluvar" language="ta-IN"' : lang === 'en' ? 'language="en-IN"' : 'voice="Polly.Aditi" language="hi-IN"'}>${retryMsg}</Say>
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
          ? `🌾 உங்கள் ${displayCrop} பட்டியல் (#${listingId}) நேரடி சந்தையில் வெளியிடப்பட்டது! ${expiryDate} வரை பிரெஷ். நுகர்வோர் ஆர்டர் செய்யும்போது SMS வரும்.`
          : lang === 'en'
          ? `Your ${crop} listing (#${listingId}) is now live! Fresh & available till ${expiryDate}. Matched directly with nearest buyers.`
          : `Aapki ${crop} listing (#${listingId}) live ho gayi hai! ${expiryDate} tak fresh. Nazdeeki buyers ke order par SMS aayega.`;

        smsService.sendSMS(cleanPhone, smsText).catch(() => {});

      } catch (dbErr) {
        console.error('[DB Insert Error in IVR]:', dbErr.message);
      }

      const displayCrop = (lang === 'ta' && tamilCropNames[crop]) ? tamilCropNames[crop] : crop;
      const successMsg = lang === 'ta'
        ? `வாழ்த்துகள்! உங்கள் ${qty} கிலோ ${displayCrop}, ${price} ரூபாய், வெற்றிகரமாக சந்தையில் பதிவானது. பட்டியல் எண் ${listingId}. நன்றி! ஜெய் கிசான்!`
        : lang === 'en'
        ? `Congratulations! Your ${qty} kilograms of ${crop} at ${price} rupees is confirmed. Listing ID is ${listingId}. Thank you! Jai Kisan!`
        : `बधाई हो किसान भाई! आपकी ${qty} किलो ${crop}, ${price} रुपये, लिस्ट हो गई है। लिस्टिंग नंबर ${listingId}। धन्यवाद! जय किसान!`;

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say ${lang === 'ta' ? 'voice="Polly.Valluvar" language="ta-IN"' : lang === 'en' ? 'language="en-IN"' : 'voice="Polly.Aditi" language="hi-IN"'}>${successMsg}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Valluvar" language="ta-IN">கிசான் சேது நேரடி உழவர் சேவைக்கு நன்றி! வணக்கம்.</Say>
</Response>`);
    }

    // Default catch-all
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Valluvar" language="ta-IN">கிசான் சேது நேரடி உழவர் சேவைக்கு நன்றி! வணக்கம்.</Say>
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
