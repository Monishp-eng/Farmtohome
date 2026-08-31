const db = require('../config/database');
const nlpExtractor = require('../nlp/extractor');
const Validators = require('../nlp/validators');
const { getMessage } = require('../i18n/messages');
const smsService = require('../services/sms.service');
const otpService = require('../services/otp.service');
const mapsService = require('../services/maps.service');
const sarvamService = require('../services/sarvam.service');

// In-memory active USSD session store: sessionId -> { phone, step, data }
const ussdSessions = new Map();

/**
 * Handle incoming Freeform Voice / Speech using Cost-Saving Cascade (Heuristics -> Groq/Gemini -> Sarvam TTS)
 */
const handleVoiceAI = async (req, res) => {
  try {
    const { transcript, language = 'en', caller_phone = '9876543210', farmer_name } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ success: false, message: 'Voice transcript is required' });
    }

    console.log(`[Voice AI] Processing transcript (${language}): "${transcript}"`);

    // Extract structured entities via Cost-Optimized NLP Cascade
    const entities = await nlpExtractor.extractEntities(transcript, 'PRODUCE_LISTING', language);

    const cropName = entities.crop || 'Fresh Produce';
    const category = entities.category || 'vegetables';
    const quantity = entities.quantity || 100;
    const unit = entities.unit || 'kg';
    const price = entities.expected_price || 25;
    const location = entities.location || 'Salem Rural';
    const phone = (entities.mobile_number || caller_phone || '9876543210').replace(/[^0-9]/g, '').slice(-10);
    const name = entities.name || farmer_name || `Kisan (${phone.slice(-4)})`;
    const isOrganic = entities.is_organic ? 1 : 0;
    const qualityGrade = entities.quality_grade || 'A';

    // 1. Resolve GPS Coordinates
    const geo = await mapsService.geocode(location);
    const latitude = entities.latitude || geo.lat;
    const longitude = entities.longitude || geo.lng;

    // 2. Auto-register farmer user silently if new
    let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!farmer) {
      const email = `voice_${phone}@kisan.in`;
      const dummyPass = '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.'; // 'password123'
      const insertUser = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, email, dummyPass, 'farmer', phone, geo.location, geo.state, latitude, longitude);
      
      farmer = { id: insertUser.lastInsertRowid, name, phone, location: geo.location };
    }

    // 3. Create Product in Marketplace
    const description = `Voice Listed via Kisan Dialphone AI (${language.toUpperCase()}). Farm Origin: ${geo.location}`;
    const insertProduct = db.prepare(`
      INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, quality_grade, is_organic, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(farmer.id, cropName, category, description, quantity, price, qualityGrade, isOrganic, 'available');

    const listingId = insertProduct.lastInsertRowid;

    // 4. Send Confirmation SMS to Farmer's 2G dialphone
    const smsConfirmation = getMessage(language, 'LISTING_SUCCESS', {
      crop: cropName,
      qty: quantity,
      price: price,
      id: listingId
    });

    await smsService.sendSMS(phone, smsConfirmation, {
      templateName: 'PRODUCE_LISTED',
      dltId: 'DLT_LIST_1002'
    });

    // 5. Generate Spoken Voice Response (Sarvam TTS / Text)
    const spokenReply = getMessage(language, 'VOICE_CONFIRMATION', {
      crop: cropName,
      qty: quantity,
      price: price,
      id: listingId
    });

    const ttsResult = await sarvamService.textToSpeech(spokenReply, language);

    res.json({
      success: true,
      data: {
        listingId,
        farmerId: farmer.id,
        farmerName: farmer.name,
        entities: { ...entities, latitude, longitude, geocoded_location: geo.location },
        spokenReply,
        audioBase64: ttsResult.audioBase64,
        smsDispatched: true
      }
    });
  } catch (error) {
    console.error('[Voice AI Error]:', error);
    res.status(500).json({ success: false, message: 'Voice AI processing failed', error: error.message });
  }
};

/**
 * Handle Conversational Multi-Turn Simple Phone Call
 * Enables a farmer on a simple call to answer naturally or in pieces,
 * with the AI guiding them step-by-step and re-verifying before publishing.
 */
const handleDialogueCall = async (req, res) => {
  try {
    const { 
      caller_phone = '7989998568', 
      user_speech = '', 
      session_state = {}, 
      language = 'hi',
      dtmf_key = null 
    } = req.body;

    const cleanPhone = (caller_phone || '').replace(/[^0-9]/g, '').slice(-10);
    const speech = (user_speech || '').trim();
    const key = dtmf_key || (speech.match(/^[1-4]$/) ? speech : null);

    let state = {
      step: session_state.step || 'LANG_SELECT',
      option: session_state.option || null,
      crop: session_state.crop || null,
      category: session_state.category || 'vegetables',
      quantity: session_state.quantity || null,
      price: session_state.price || null,
      location: session_state.location || 'Salem',
      phone: cleanPhone,
      farmer_name: session_state.farmer_name || `Kisan (${cleanPhone.slice(-4)})`,
      lang: session_state.lang || language || 'hi'
    };

    let activeLang = state.lang;
    console.log(`[IVR Dialogue Call] Input: "${speech || key}", Step: ${state.step}, Lang: ${activeLang}`);

    let aiSpokenPrompt = '';
    let isCompleted = false;
    let listingId = null;

    // STEP 0: LANGUAGE SELECTION (FIRST STEP WHEN CALL STARTS)
    if (state.step === 'START' || state.step === 'LANG_SELECT') {
      if (key === '1' || speech.toLowerCase().includes('hindi') || speech.includes('हिंदी') || speech.includes('1')) {
        state.lang = 'hi';
        activeLang = 'hi';
        state.step = 'MENU';
        aiSpokenPrompt = "नमस्ते! किसानसेतु में आपका स्वागत है। फसल बेचने के लिए 1 दबाएं। मंडी भाव जानने के लिए 2 दबाएं। अपने आर्डर और कमाई के लिए 3 दबाएं। फसल डॉक्टर के लिए 4 दबाएं।";
      } else if (key === '2' || speech.toLowerCase().includes('tamil') || speech.includes('தமிழ்') || speech.includes('2')) {
        state.lang = 'ta';
        activeLang = 'ta';
        state.step = 'MENU';
        aiSpokenPrompt = "வணக்கம்! உழவன் சேவைக்கு நல்வரவு. விளைச்சல் விற்க 1 அழுத்தவும். மண்டி விலை அறிய 2 அழுத்தவும். ஆர்டர் மற்றும் வருமானம் அறிய 3 அழுத்தவும். பயிர் மருத்துவருக்கு 4 அழுத்தவும்.";
      } else if (key === '3' || speech.toLowerCase().includes('english') || speech.includes('3')) {
        state.lang = 'en';
        activeLang = 'en';
        state.step = 'MENU';
        aiSpokenPrompt = "Welcome to KisanSetu Farmer Helpline. Press 1 to sell your crop. Press 2 for live Mandi rates. Press 3 for orders and earnings. Press 4 for Crop Doctor advice.";
      } else if (key === '4' || speech.toLowerCase().includes('marathi') || speech.includes('मराठी') || speech.includes('4')) {
        state.lang = 'mr';
        activeLang = 'mr';
        state.step = 'MENU';
        aiSpokenPrompt = "नमस्कार! किसानसेतू हेल्पलाइनवर आपले स्वागत आहे. पीक विक्रीसाठी 1 दाबा. बाजारभाव जाणून घेण्यासाठी 2 दाबा. ऑर्डर आणि कमाईसाठी 3 दाबा.";
      } else {
        // Initial Multilingual Greeting Prompt
        state.step = 'LANG_SELECT';
        aiSpokenPrompt = "Welcome to KisanSetu. हिंदी के लिए 1 दबाएं। தமிழுக்கு 2 அழுத்தவும்। For English, Press 3. मराठीसाठी 4 दाबा.";
      }
    }

    // STEP 1: INITIAL MENU SELECTION (IN SELECTED LANGUAGE)
    else if (state.step === 'MENU') {
      if (key === '1' || speech.toLowerCase().includes('sell') || speech.includes('1') || speech.includes('बेच') || speech.includes('விற்க') || speech.includes('विक्री')) {
        state.step = 'ASK_PRODUCE';
        state.option = 'SELL';
        if (activeLang === 'ta') {
          aiSpokenPrompt = "விளைச்சல் விற்கும் சேவைக்கு நல்வரவு. தயவுசெய்து பீப் ஒலிக்குப் பிறகு உங்கள் பயிரின் பெயர், மொத்த கிலோ, மற்றும் ஒரு கிலோவின் விலையை சொல்லுங்கள். உதாரணமாக: 500 கிலோ தக்காளி 25 ரூபாய்.";
        } else if (activeLang === 'hi') {
          aiSpokenPrompt = "फसल बिक्री सेवा में स्वागत है। कृपया बीप के बाद अपनी फसल का नाम, कुल वजन किलो में, और अपना भाव बताएं। जैसे: 400 किलो टमाटर 25 रुपये।";
        } else if (activeLang === 'mr') {
          aiSpokenPrompt = "पीक विक्री सेवेमध्ये आपले स्वागत आहे. कृपया बीप नंतर पिकाचे नाव, एकूण वजन किलोमध्ये आणि आपला भाव सांगा. उदा: 500 किलो टोमॅटो 25 रुपये.";
        } else {
          aiSpokenPrompt = "Welcome to Crop Selling Service. Please speak your crop name, total quantity in kg, and price per kg after the beep. For example: 500kg Tomato at 25 rupees.";
        }
      } else if (key === '2' || speech.toLowerCase().includes('rate') || speech.toLowerCase().includes('mandi') || speech.includes('2') || speech.includes('भाव') || speech.includes('விலை')) {
        state.step = 'MENU';
        const prices = db.prepare('SELECT commodity, modal_price FROM market_prices LIMIT 3').all();
        const priceStr = prices.map(p => `${p.commodity}: ₹${p.modal_price / 100}/kg`).join(', ');
        if (activeLang === 'ta') {
          aiSpokenPrompt = `இன்றைய மண்டி மாதிரி விலைகள்: ${priceStr}. விளைச்சல் விற்க 1 அழுத்தவும், மீண்டும் கேட்க 2 அழுத்தவும்.`;
        } else if (activeLang === 'hi') {
          aiSpokenPrompt = `आज का मुख्य मंडी मॉडल भाव: ${priceStr}। फसल बेचने के लिए 1 दबाएं, पुनः सुनने के लिए 2 दबाएं।`;
        } else {
          aiSpokenPrompt = `Today's benchmark Mandi rates: ${priceStr}. Press 1 to sell your crop, or 2 to listen again.`;
        }
      } else if (key === '3' || speech.toLowerCase().includes('order') || speech.toLowerCase().includes('earning') || speech.includes('3') || speech.includes('कमाई') || speech.includes('ஆர்டர்')) {
        state.step = 'MENU';
        let farmer = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
        let confirmedEarnings = 0;
        let totalOrders = 0;
        if (farmer) {
          const stats = db.prepare('SELECT COUNT(*) as total, SUM(farmer_earnings) as earnings FROM orders WHERE farmer_id = ?').get(farmer.id);
          totalOrders = stats.total || 0;
          confirmedEarnings = stats.earnings || 0;
        }
        if (activeLang === 'ta') {
          aiSpokenPrompt = `உங்கள் கணக்கில் ${totalOrders} ஆர்டர்கள் உள்ளன. மொத்த உறுதிப்படுத்தப்பட்ட வருமானம் ₹${confirmedEarnings}. புதிய பயிர் விற்க 1 அழுத்தவும்.`;
        } else if (activeLang === 'hi') {
          aiSpokenPrompt = `आपके खाते में कुल ${totalOrders} आर्डर हैं। कुल कमाई ₹${confirmedEarnings} है। फसल बेचने के लिए 1 दबाएं।`;
        } else {
          aiSpokenPrompt = `You have ${totalOrders} orders with total earnings of Rs ${confirmedEarnings}. Press 1 to list a new crop.`;
        }
      } else if (key === '4' || speech.toLowerCase().includes('doctor') || speech.includes('4') || speech.includes('सलाह') || speech.includes('மருத்துவர்')) {
        state.step = 'MENU';
        if (activeLang === 'ta') {
          aiSpokenPrompt = "கிசான் பயிர் மருத்துவர் சேவை: பூச்சி தாக்குதலுக்கு 5% வேப்ப எண்ணெய் கரைசல் தெளிக்கவும். புதிய பயிர் விற்க 1 அழுத்தவும்.";
        } else if (activeLang === 'hi') {
          aiSpokenPrompt = "किसान फसल डॉक्टर: कीट नियंत्रण के लिए 5% नीम तेल का छिड़काव करें। फसल बेचने के लिए 1 दबाएं।";
        } else {
          aiSpokenPrompt = "Kisan Crop Doctor: For pest control, apply 5% neem oil spray. Press 1 to sell crop.";
        }
      } else {
        // Initial Greeting with 4 Options
        state.step = 'MENU';
        if (activeLang === 'ta') {
          aiSpokenPrompt = "வணக்கம்! உழவன் சேவைக்கு நல்வரவு. விளைச்சல் விற்க 1 அழுத்தவும். மண்டி விலை அறிய 2 அழுத்தவும். ஆர்டர் மற்றும் வருமானம் அறிய 3 அழுத்தவும். பயிர் மருத்துவருக்கு 4 அழுத்தவும்.";
        } else if (activeLang === 'hi') {
          aiSpokenPrompt = "नमस्ते! किसानसेतु हेल्पलाइन में आपका स्वागत है। फसल बेचने के लिए 1 दबाएं। मंडी भाव जानने के लिए 2 दबाएं। अपने आर्डर और कमाई जानने के लिए 3 दबाएं। फसल डॉक्टर के लिए 4 दबाएं।";
        } else if (activeLang === 'mr') {
          aiSpokenPrompt = "नमस्कार! किसानसेतू हेल्पलाइनवर आपले स्वागत आहे. पीक विक्रीसाठी 1 दाबा. बाजारभाव जाणून घेण्यासाठी 2 दाबा. ऑर्डर आणि कमाईसाठी 3 दाबा.";
        } else {
          aiSpokenPrompt = "Welcome to KisanSetu Farmer Helpline. Press 1 to sell your crop. Press 2 for live Mandi rates. Press 3 for orders and earnings. Press 4 for Crop Doctor advice.";
        }
      }
    }

    // STEP 2: PARSE PRODUCE DETAILS (CROP, QTY, PRICE)
    else if (state.step === 'ASK_PRODUCE') {
      if (speech) {
        const extracted = await nlpExtractor.extractEntities(speech, 'PRODUCE_LISTING', activeLang);
        if (extracted.crop) state.crop = extracted.crop;
        if (extracted.category) state.category = extracted.category;
        if (extracted.quantity) state.quantity = extracted.quantity;
        if (extracted.expected_price) state.price = extracted.expected_price;
        if (extracted.location) state.location = extracted.location;
      }

      // Check if we captured crop, qty, price
      if (state.crop && state.quantity && state.price) {
        state.step = 'VERIFY_CONFIRM';
        if (activeLang === 'ta') {
          aiSpokenPrompt = `நீங்கள் பதிவு செய்தது: பயிர் - ${state.crop}, அளவு - ${state.quantity} கிலோ, விலை - ₹${state.price} ஒரு கிலோவுக்கு. இது சரியா? சந்தையில் வெளியிட 1 அழுத்தவும் அல்லது 'ஆம்' சொல்லவும். மாற்ற 2 அழுத்தவும்.`;
        } else if (activeLang === 'hi') {
          aiSpokenPrompt = `आपने दर्ज किया है: फसल - ${state.crop}, वजन - ${state.quantity} किलो, भाव - ₹${state.price} प्रति किलो। क्या यह जानकारी सही है? कन्फर्म करने के लिए 1 दबाएं या 'हाँ' बोलें। बदलने के लिए 2 दबाएं।`;
        } else if (activeLang === 'mr') {
          aiSpokenPrompt = `तुम्ही नोंदवले आहे: पीक - ${state.crop}, वजन - ${state.quantity} किलो, भाव - ₹${state.price} प्रति किलो. कन्फर्म करण्यासाठी 1 दाबा किंवा 'होय' बोला.`;
        } else {
          aiSpokenPrompt = `You entered: Crop - ${state.crop}, Quantity - ${state.quantity}kg, Price - Rs ${state.price} per kg. Is this correct? Press 1 or Say YES to confirm. Press 2 to re-enter.`;
        }
      } else if (!state.crop) {
        if (activeLang === 'ta') aiSpokenPrompt = "பயிரின் பெயரை தெளிவாக சொல்லவும். உதாரணமாக: தக்காளி அல்லது வெங்காயம்.";
        else if (activeLang === 'hi') aiSpokenPrompt = "कृपया अपनी फसल का नाम स्पष्ट बोलें। जैसे: टमाटर या प्याज।";
        else aiSpokenPrompt = "Please clearly speak the crop name, such as Tomato or Onion.";
      } else if (!state.quantity) {
        if (activeLang === 'ta') aiSpokenPrompt = `${state.crop} எத்தனை கிலோ உள்ளது என்று சொல்லவும்.`;
        else if (activeLang === 'hi') aiSpokenPrompt = `आपके पास कितने किलो ${state.crop} उपलब्ध है?`;
        else aiSpokenPrompt = `How many kilograms of ${state.crop} do you have?`;
      } else {
        if (activeLang === 'ta') aiSpokenPrompt = `ஒரு கிலோவுக்கு என்ன விலை எதிர்பார்க்கிறீர்கள்?`;
        else if (activeLang === 'hi') aiSpokenPrompt = `प्रति किलो क्या भाव चाहते हैं?`;
        else aiSpokenPrompt = `What is your expected price per kg?`;
      }
    }

    // STEP 3: VERIFY & CONFIRM
    else if (state.step === 'VERIFY_CONFIRM') {
      const isConfirmed = key === '1' || speech.toLowerCase().includes('yes') || speech.includes('हाँ') || speech.includes('ஆம்') || speech.includes('होय') || speech.includes('1') || speech.includes('sahi');
      const isRejected = key === '2' || speech.toLowerCase().includes('no') || speech.includes('नहीं') || speech.includes('இல்லை') || speech.includes('2');

      if (isConfirmed) {
        // Publish to Database
        const geo = await mapsService.geocode(state.location || 'Salem');
        let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
        if (!farmer) {
          const email = `call_${cleanPhone}@kisan.in`;
          const dummyPass = '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.';
          const insert = db.prepare(`
            INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(state.farmer_name, email, dummyPass, 'farmer', cleanPhone, geo.location, geo.state, geo.lat, geo.lng);
          farmer = { id: insert.lastInsertRowid, name: state.farmer_name, phone: cleanPhone };
        }

        const insertProd = db.prepare(`
          INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, quality_grade, is_organic, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(farmer.id, state.crop, state.category || 'vegetables', `Verified IVR Voice Listing. Origin: ${geo.location}`, state.quantity, state.price, 'A', 0, 'available');

        listingId = insertProd.lastInsertRowid;
        isCompleted = true;
        state.step = 'COMPLETED';

        if (activeLang === 'ta') {
          aiSpokenPrompt = `வாழ்த்துகள்! உங்கள் ${state.quantity} கிலோ ${state.crop} (₹${state.price}/கிலோ) சந்தையில் வெற்றிகரமாக வெளியிடப்பட்டது (ID #${listingId}). வாங்குபவர் ஆர்டர் செய்தவுடன் SMS வரும். உழவன் சேவையை பயன்படுத்தியதற்கு நன்றி!`;
        } else if (activeLang === 'hi') {
          aiSpokenPrompt = `बधाई हो! आपकी ${state.quantity} किलो ${state.crop} (₹${state.price}/किलो) मार्केटप्लेस पर सफलतापूर्वक लिस्ट हो गई है (ID #${listingId})। खरीददार का आर्डर आते ही आपको SMS मिलेगा। किसानसेतु से जुड़ने के लिए धन्यवाद!`;
        } else if (activeLang === 'mr') {
          aiSpokenPrompt = `अभिनंदन! तुमचे ${state.quantity} किलो ${state.crop} मार्केटवर यशस्वीरीत्या लिस्ट झाले आहे (ID #${listingId}). धन्यवाद!`;
        } else {
          aiSpokenPrompt = `Congratulations! Your ${state.quantity}kg of ${state.crop} at Rs ${state.price}/kg is now published to the marketplace (ID #${listingId}). You will receive an SMS when ordered. Thank you!`;
        }

        // Send SMS confirmation
        await smsService.sendSMS(cleanPhone, `KisanSetu Voice Alert: Aapki ${state.quantity}kg ${state.crop} (@ Rs ${state.price}/kg) live ho gayi hai (ID #${listingId}). Order aane par SMS aayega.`, { templateName: 'VOICE_CALL_LISTING' });
      } else if (isRejected) {
        state.step = 'ASK_PRODUCE';
        state.crop = null;
        state.quantity = null;
        state.price = null;
        if (activeLang === 'ta') aiSpokenPrompt = "சரி, மீண்டும் சொல்லுங்கள். உங்கள் பயிரின் பெயர், கிலோ, மற்றும் விலை என்ன?";
        else if (activeLang === 'hi') aiSpokenPrompt = "ठीक है, कृपया अपनी फसल का नाम, वजन और भाव दोबारा बताएं।";
        else aiSpokenPrompt = "Okay, please restate your crop name, quantity in kg, and price per kg.";
      } else {
        if (activeLang === 'ta') aiSpokenPrompt = `உறுதிப்படுத்த 1 அழுத்தவும், திருத்த 2 அழுத்தவும்.`;
        else if (activeLang === 'hi') aiSpokenPrompt = `कन्फर्म करने के लिए 1 दबाएं या हाँ बोलें। बदलने के लिए 2 दबाएं।`;
        else aiSpokenPrompt = `Press 1 to confirm, or 2 to edit.`;
      }
    }

    const tts = await sarvamService.textToSpeech(aiSpokenPrompt, activeLang);

    res.json({
      success: true,
      data: {
        aiSpokenPrompt,
        session_state: state,
        isCompleted,
        listingId,
        audioBase64: tts.audioBase64
      }
    });
  } catch (error) {
    console.error('[Dialogue Call Error]:', error);
    res.status(500).json({ success: false, message: 'Dialogue Call Error', error: error.message });
  }
};

/**
 * Handle 2-Way SMS Gateway with Expanded Command Suite
 */
const handleIncomingSMS = async (req, res) => {
  try {
    const { from_phone, message } = req.body;

    if (!from_phone || !message) {
      return res.status(400).json({ success: false, message: 'from_phone and message are required' });
    }

    const cleanPhone = from_phone.replace(/[^0-9]/g, '').slice(-10);
    const trimmedMsg = message.trim();
    const upperMsg = trimmedMsg.toUpperCase();
    const parts = upperMsg.split(/\s+/);
    const command = parts[0];

    console.log(`[Incoming SMS from ${cleanPhone}]: "${trimmedMsg}"`);

    // Ensure farmer account exists
    let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);

    let reply = '';

    // ==========================================
    // 1. COMMAND: SELL <CROP> <QTY> <PRICE> [LOCATION]
    // ==========================================
    if (command === 'SELL' || command === 'BECHO' || command === 'VIRKKA') {
      if (parts.length < 4) {
        reply = 'Kisan Seva: Fasal bechne ke liye likhein: SELL <FASAL> <KILO> <BHAV>. Udaharan: SELL TOMATO 200 25';
      } else {
        const cropInput = parts[1];
        const qty = parseFloat(parts[2]) || 100;
        const price = parseFloat(parts[3]) || 20;
        const locInput = parts[4] || (farmer ? farmer.location : 'Salem');

        // Extract and geocode
        const entities = await nlpExtractor.extractEntities(`${cropInput} ${qty}kg ${price} rs from ${locInput}`);
        const cropName = entities.crop || cropInput.charAt(0) + cropInput.slice(1).toLowerCase();
        const category = entities.category || 'vegetables';
        const geo = await mapsService.geocode(locInput);

        if (!farmer) {
          const email = `sms_${cleanPhone}@kisan.in`;
          const dummyPass = '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.';
          const insertUser = db.prepare(`
            INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(`Kisan (${cleanPhone.slice(-4)})`, email, dummyPass, 'farmer', cleanPhone, geo.location, geo.state, geo.lat, geo.lng);
          farmer = { id: insertUser.lastInsertRowid, name: `Kisan (${cleanPhone.slice(-4)})`, phone: cleanPhone };
        }

        const insertProduct = db.prepare(`
          INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, quality_grade, is_organic, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(farmer.id, cropName, category, `SMS Listed from 2G Keypad phone. Origin: ${geo.location}`, qty, price, 'A', 0, 'available');

        reply = `Badhaai ho! Aapki fasal ${cropName} (${qty}kg @ Rs ${price}/kg) marketplace par safalta-purvak list ho gayi hai (ID: #${insertProduct.lastInsertRowid}). Khareedaar aate hi SMS aayega.`;
      }
    }

    // ==========================================
    // 2. COMMAND: RATES <CROP> or BHAV <CROP>
    // ==========================================
    else if (command === 'RATES' || command === 'RATE' || command === 'BHAV' || command === 'PRICE') {
      const crop = parts[1] || 'Tomato';
      const prices = db.prepare(`
        SELECT * FROM market_prices 
        WHERE LOWER(commodity) LIKE ? 
        ORDER BY price_date DESC LIMIT 1
      `).get(`%${crop.toLowerCase()}%`);

      if (prices) {
        reply = `Mandi Bhav [${prices.commodity}]: Modal Rs ${prices.modal_price}/quintal (Min: Rs ${prices.min_price}, Max: Rs ${prices.max_price}) at ${prices.market_name}, ${prices.state}. Govt MSP: Rs ${prices.msp || 'N/A'}/quintal.`;
      } else {
        reply = `Kisan Seva: ${crop} ka bhav abhi uplabdh nahi hai. Anya fasal ke liye likhein: RATES ONION ya RATES WHEAT`;
      }
    }

    // ==========================================
    // 3. COMMAND: ORDERS / ORDER / STATUS
    // ==========================================
    else if (command === 'ORDERS' || command === 'ORDER' || command === 'STATUS') {
      if (!farmer) {
        reply = 'Kisan Seva: Aapka koi account nahi hai. Fasal list karne ke liye SELL TOMATO 200 25 SMS karein.';
      } else if (parts[1] && !isNaN(parts[1])) {
        // Specific Order Status: STATUS 17
        const orderId = parts[1];
        const order = db.prepare(`
          SELECT o.*, p.name as product_name, u.name as buyer_name, u.phone as buyer_phone
          FROM orders o 
          JOIN products p ON o.product_id = p.id 
          JOIN users u ON o.buyer_id = u.id
          WHERE o.id = ? AND o.farmer_id = ?
        `).get(orderId, farmer.id);

        if (order) {
          reply = `Order #${order.id} Status: [${order.status.toUpperCase()}]. ${order.quantity_kg}kg ${order.product_name}. Kul: Rs ${order.total_price} (Aapki kamai: Rs ${order.farmer_earnings}). Payment: ${order.payment_status}.`;
        } else {
          reply = `Order #${orderId} nahi mila. Apne orders dekhne ke liye ORDERS SMS karein.`;
        }
      } else {
        // List recent orders
        const orders = db.prepare(`
          SELECT o.id, o.quantity_kg, o.total_price, o.status, p.name as product_name 
          FROM orders o 
          JOIN products p ON o.product_id = p.id 
          WHERE o.farmer_id = ? 
          ORDER BY o.created_at DESC LIMIT 3
        `).all(farmer.id);

        if (orders.length === 0) {
          reply = 'Kisan Seva: Aapki fasal par abhi koi naya order nahi aaya hai. Jaise hi khareedaar milega, turant SMS aayega.';
        } else {
          const list = orders.map(o => `#${o.id}: ${o.quantity_kg}kg ${o.product_name} (${o.status})`).join(' | ');
          reply = `Aapke Orders: ${list}. Kisi order ko confirm karne ke liye CONFIRM <ID> bhejein.`;
        }
      }
    }

    // ==========================================
    // 4. COMMAND: EARNINGS / KAMAI
    // ==========================================
    else if (command === 'EARNINGS' || command === 'KAMAI' || command === 'PAYOUT' || command === 'BALANCE') {
      if (!farmer) {
        reply = 'Kisan Seva: Aapka koi account nahi hai. Fasal bechne ke liye SELL TOMATO 200 25 SMS karein.';
      } else {
        const stats = db.prepare(`
          SELECT 
            COUNT(*) as total_orders,
            SUM(CASE WHEN payment_status = 'paid' OR status = 'delivered' THEN farmer_earnings ELSE 0 END) as confirmed_earnings,
            SUM(CASE WHEN status = 'pending' THEN farmer_earnings ELSE 0 END) as pending_earnings
          FROM orders WHERE farmer_id = ?
        `).get(farmer.id);

        const confirmed = stats.confirmed_earnings || 0;
        const pending = stats.pending_earnings || 0;
        reply = `Kisan Kamai Summary: Kul Orders: ${stats.total_orders}. Confirm Kamai: Rs ${confirmed}. Pending Kamai: Rs ${pending}. Direct Bank Transfer 24 Ghante mein prapt hota hai.`;
      }
    }

    // ==========================================
    // 5. COMMAND: MY LISTINGS / MERI FASAL
    // ==========================================
    else if (command === 'MY' || command === 'LISTINGS' || command === 'FASAL') {
      if (!farmer) {
        reply = 'Kisan Seva: Aapki koi fasal list nahi hai. SELL TOMATO 200 25 bhejein.';
      } else {
        const prods = db.prepare(`
          SELECT id, name, quantity_kg, price_per_kg, status 
          FROM products WHERE farmer_id = ? AND status = 'available' 
          ORDER BY created_at DESC LIMIT 4
        `).all(farmer.id);

        if (prods.length === 0) {
          reply = 'Kisan Seva: Aapki koi active fasal nahi hai. Nayi fasal list karne ke liye SELL TOMATO 200 25 SMS karein.';
        } else {
          const list = prods.map(p => `ID #${p.id}: ${p.name} (${p.quantity_kg}kg @ Rs ${p.price_per_kg}/kg)`).join(' | ');
          reply = `Aapki Active Fasalein: ${list}. Price badalne ke liye UPDATE <ID> PRICE <NEW_BHAV> bhejein.`;
        }
      }
    }

    // ==========================================
    // 6. COMMAND: UPDATE <ID> PRICE <N> / UPDATE <ID> QTY <N>
    // ==========================================
    else if (command === 'UPDATE') {
      const prodId = parts[1];
      const field = parts[2];
      const val = parseFloat(parts[3]);

      if (!prodId || !field || isNaN(val)) {
        reply = 'Kisan Seva: Update ke liye likhein: UPDATE <ID> PRICE 30 ya UPDATE <ID> QTY 300';
      } else if (field === 'PRICE' || field === 'BHAV') {
        db.prepare('UPDATE products SET price_per_kg = ? WHERE id = ?').run(val, prodId);
        reply = `Fasal ID #${prodId} ka naya bhav Rs ${val}/kg update ho gaya hai.`;
      } else if (field === 'QTY' || field === 'QUANTITY' || field === 'KILO') {
        db.prepare('UPDATE products SET quantity_kg = ? WHERE id = ?').run(val, prodId);
        reply = `Fasal ID #${prodId} ki quantity ${val}kg update ho gayi hai.`;
      } else {
        reply = 'Kisan Seva: Kripya PRICE ya QTY specify karein. Udaharan: UPDATE 53 PRICE 30';
      }
    }

    // ==========================================
    // 7. COMMAND: DELETE <ID> / DELIST <ID>
    // ==========================================
    else if (command === 'DELETE' || command === 'DELIST' || command === 'REMOVE') {
      const prodId = parts[1];
      if (!prodId) {
        reply = 'Kisan Seva: Fasal hatane ke liye DELETE <ID> likhein. Udaharan: DELETE 53';
      } else {
        db.prepare('UPDATE products SET status = ? WHERE id = ?').run('sold', prodId);
        reply = `Fasal ID #${prodId} safalta-purvak marketplace se hata di gayi hai.`;
      }
    }

    // ==========================================
    // 8. COMMAND: CONFIRM <ORDER_ID>
    // ==========================================
    else if (command === 'CONFIRM' || command === 'ACCEPT') {
      const orderId = parts[1];
      if (!orderId) {
        reply = 'Kisan Seva: Kripya CONFIRM ke sath Order ID likhe. Udaharan: CONFIRM 10';
      } else {
        const order = db.prepare('SELECT o.*, p.name as product_name FROM orders o JOIN products p ON o.product_id = p.id WHERE o.id = ?').get(orderId);
        if (!order) {
          reply = `Order #${orderId} nahi mila. Sahi Order ID ke liye ORDERS SMS karein.`;
        } else {
          // Confirm order & set paid
          db.prepare('UPDATE orders SET status = ?, payment_status = ? WHERE id = ?').run('confirmed', 'paid', orderId);

          // Autonomous Step: Auto-assign nearest available logistics driver
          const driver = db.prepare("SELECT * FROM users WHERE role = 'logistics' LIMIT 1").get();
          if (driver) {
            db.prepare(`
              INSERT INTO logistics (order_id, driver_id, pickup_location, pickup_lat, pickup_lng, delivery_location, delivery_lat, delivery_lng, distance_km, estimated_time_hrs, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(orderId, driver.id, 'Salem Farm Gate', 11.6643, 78.1460, order.delivery_address || 'City Center', 12.9716, 77.5946, 185.0, 4.5, 'assigned');

            // Notify driver via SMS
            await smsService.sendSMS(driver.phone, `Naya Dispatch Alert: Order #${orderId} (${order.quantity_kg}kg ${order.product_name}) farm gate se uthana hai. App me accept karein.`);
          }

          reply = `Order #${orderId} CONFIRM ho gaya hai! Logistics partner jald hi uthane aayega. Aapki aamadani: Rs ${order.farmer_earnings} 24 ghante me transfer hogi.`;
        }
      }
    }

    // ==========================================
    // 9. COMMAND: REJECT <ORDER_ID> / DECLINE
    // ==========================================
    else if (command === 'REJECT' || command === 'CANCEL') {
      const orderId = parts[1];
      if (!orderId) {
        reply = 'Kisan Seva: Order reject karne ke liye REJECT <ORDER_ID> likhein. Udaharan: REJECT 10';
      } else {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if (order) {
          db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', orderId);
          // Restore stock
          db.prepare('UPDATE products SET quantity_kg = quantity_kg + ? WHERE id = ?').run(order.quantity_kg, order.product_id);
          reply = `Order #${orderId} cancel kar diya gaya hai aur stock restore kar diya gaya hai.`;
        } else {
          reply = `Order #${orderId} nahi mila.`;
        }
      }
    }

    // ==========================================
    // 10. COMMAND: OTP <CODE>
    // ==========================================
    else if (command === 'OTP' || command === 'VERIFY') {
      const code = parts[1];
      const v = otpService.verifyOTP(cleanPhone, code);
      reply = v.valid ? `Badhaai! Aapka mobile number +91-${cleanPhone} safalta-purvak verify ho gaya hai.` : v.message;
    }

    // ==========================================
    // DEFAULT: HELP MENU
    // ==========================================
    else {
      reply = `Namaste Kisan! Kisan SMS Seva (56161) Commands:
1. SELL <CROP> <KG> <BHAV> - Fasal bechein
2. RATES <CROP> - Mandi bhav dekhein
3. ORDERS - Naye orders dekhein
4. STATUS <ID> - Order status check karein
5. CONFIRM <ID> - Order confirm karein
6. EARNINGS - Kamai summary
7. MY LISTINGS - Active fasal dekhein
8. UPDATE <ID> PRICE <N> - Bhav badlein
9. Toll-Free Helpline: 1800-547-2600`;
    }

    // Dispatch outbound SMS via SMS Service
    await smsService.sendSMS(cleanPhone, reply, { templateName: 'SMS_GATEWAY_REPLY' });

    res.json({
      success: true,
      data: {
        from_phone: cleanPhone,
        reply,
        command
      }
    });
  } catch (error) {
    console.error('[SMS Gateway Error]:', error);
    res.status(500).json({ success: false, message: 'SMS Gateway Error', error: error.message });
  }
};

/**
 * Handle Zero-Airtime Missed-Call Trigger (Toll-Free Missed Call)
 */
const handleMissedCall = async (req, res) => {
  try {
    const { caller_phone, circle = 'Tamil Nadu' } = req.body;
    if (!caller_phone) return res.status(400).json({ success: false, message: 'caller_phone is required' });

    const cleanPhone = caller_phone.replace(/[^0-9]/g, '').slice(-10);
    console.log(`[Missed Call Trigger] Received missed call from +91-${cleanPhone} (${circle})`);

    // 1. Check if farmer is registered, if not silently create
    let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
    if (!farmer) {
      const geo = await mapsService.geocode(circle);
      const email = `missed_${cleanPhone}@kisan.in`;
      const dummyPass = '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.';
      const insert = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`Kisan (${cleanPhone.slice(-4)})`, email, dummyPass, 'farmer', cleanPhone, geo.location, geo.state, geo.lat, geo.lng);
      farmer = { id: insert.lastInsertRowid, phone: cleanPhone, name: `Kisan (${cleanPhone.slice(-4)})` };
    }

    // 2. Dispatch automated instant formatted SMS Menu (Zero call charges for farmer)
    const replySMS = `🌾 Kisan Seva (+91-80-6900-5472)
Aapki missed call prapt hui! Fasal bechne ke liye reply karein:
SELL <FASAL> <KILO> <BHAV> <GAON>
Udaharan: SELL TOMATO 500 25 SALEM

Mandi Bhav: RATES ONION
Aapke Orders: ORDERS | Kamai: EARNINGS`;
    await smsService.sendSMS(cleanPhone, replySMS, { templateName: 'MISSED_CALL_CALLBACK' });

    // 3. Trigger Instant Automated Return Voice Call via Twilio
    const returnVoiceMsg = 'Namaste! KisanSetu helpline se aapko return call kiya gaya hai. Fasal bechne ke liye SELL TOMATO 500 25 SALEM SMS bhejein, ya hamari voice service par fasal list karein. Dhanyavaad.';
    voiceCallService.makeVoiceCall(cleanPhone, returnVoiceMsg, 'hi-IN').catch(err => {
      console.warn('[Automated Return Voice Call Error]:', err.message);
    });

    res.json({
      success: true,
      message: 'Missed call logged! SMS and Instant Return Voice Call triggered successfully to farmer phone.',
      data: {
        caller_phone: cleanPhone,
        callbackTriggered: true,
        smsDispatched: true,
        returnVoiceCallInitiated: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Missed Call Gateway Error', error: error.message });
  }
};

/**
 * Handle Session-based USSD Gateway (*561#) for Zero-Data GSM Phones
 */
const handleUSSD = async (req, res) => {
  try {
    const { sessionId = `ussd_${Date.now()}`, phone = '9876543210', input = '', serviceCode = '*561#' } = req.body;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    let session = ussdSessions.get(sessionId) || {
      step: 'ROOT',
      phone: cleanPhone,
      data: {}
    };

    let responseText = '';
    let continueSession = true;

    // ROOT MENU
    if (session.step === 'ROOT' || !input) {
      responseText = `🌾 For Farmers, For Us (*561#)
1. Fasal Becho (Sell Produce)
2. Mandi Bhav (Market Rates)
3. Mere Orders (My Orders)
4. Kamai / Payout (Earnings)
5. Kisan Mitra CSC Kiosk`;
      session.step = 'MAIN_SELECT';
    }

    // MAIN MENU CHOICE SELECTION
    else if (session.step === 'MAIN_SELECT') {
      if (input === '1') {
        responseText = `Fasal Chunein:
1. Tomato (Tamatar)
2. Onion (Pyaz)
3. Potato (Aloo)
4. Rice (Chawal)
5. Wheat (Gehun)`;
        session.step = 'SELECT_CROP';
      } else if (input === '2') {
        responseText = `Mandi Bhav Chunein:
1. Tomato
2. Onion
3. Rice
4. Wheat`;
        session.step = 'SELECT_RATES';
      } else if (input === '3') {
        const farmer = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
        if (!farmer) {
          responseText = 'Aapka koi account nahi hai. Fasal bechne ke liye 1 dabayein.';
        } else {
          const orders = db.prepare('SELECT id, quantity_kg, status FROM orders WHERE farmer_id = ? LIMIT 2').all(farmer.id);
          responseText = orders.length ? orders.map(o => `Order #${o.id}: ${o.quantity_kg}kg (${o.status})`).join('\n') : 'Koi naya order nahi hai.';
        }
        continueSession = false;
      } else if (input === '4') {
        const farmer = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
        if (farmer) {
          const stat = db.prepare('SELECT SUM(farmer_earnings) as total FROM orders WHERE farmer_id = ?').get(farmer.id);
          responseText = `Aapki Kul Kamai: Rs ${stat.total || 0}. Bank Transfer 24hr me hoga.`;
        } else {
          responseText = 'Aapka koi account nahi hai.';
        }
        continueSession = false;
      } else {
        responseText = 'Kisan Mitra CSC Helpline: 1800-547-2600. Aapke gaon ke CSC center par visit karein.';
        continueSession = false;
      }
    }

    // CROP SELECTION IN USSD
    else if (session.step === 'SELECT_CROP') {
      const crops = { '1': 'Tomato', '2': 'Onion', '3': 'Potato', '4': 'Basmati Rice', '5': 'Wheat' };
      session.data.crop = crops[input] || 'Tomato';
      responseText = `${session.data.crop} ki quantity (KG me) enter karein (e.g. 200):`;
      session.step = 'ENTER_QTY';
    }

    // QUANTITY ENTERED
    else if (session.step === 'ENTER_QTY') {
      session.data.qty = parseFloat(input) || 100;
      responseText = `Expected Price (Rs/kg me) enter karein (e.g. 25):`;
      session.step = 'ENTER_PRICE';
    }

    // PRICE ENTERED -> AUTO PUBLISH
    else if (session.step === 'ENTER_PRICE') {
      const price = parseFloat(input) || 25;
      const crop = session.data.crop || 'Tomato';
      const qty = session.data.qty || 100;

      let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
      if (!farmer) {
        const geo = await mapsService.geocode('Salem');
        const insert = db.prepare(`
          INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(`Kisan (${cleanPhone.slice(-4)})`, `ussd_${cleanPhone}@kisan.in`, '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.', 'farmer', cleanPhone, geo.location, geo.state, geo.lat, geo.lng);
        farmer = { id: insert.lastInsertRowid, name: `Kisan (${cleanPhone.slice(-4)})`, phone: cleanPhone };
      }

      const insertProd = db.prepare(`
        INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, quality_grade, is_organic, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(farmer.id, crop, 'vegetables', 'USSD *561# Keypad listing', qty, price, 'A', 0, 'available');

      responseText = `Badhaai ho! ${crop} (${qty}kg @ Rs ${price}/kg) List ho gaya (ID #${insertProd.lastInsertRowid}). SMS bheja gaya hai.`;
      continueSession = false;
      await smsService.sendSMS(cleanPhone, responseText, { templateName: 'USSD_LISTING' });
    }

    // RATES SELECTION
    else if (session.step === 'SELECT_RATES') {
      const crops = { '1': 'Tomato', '2': 'Onion', '3': 'Rice', '4': 'Wheat' };
      const c = crops[input] || 'Tomato';
      const p = db.prepare('SELECT modal_price, msp, market_name FROM market_prices WHERE LOWER(commodity) LIKE ? LIMIT 1').get(`%${c.toLowerCase()}%`);
      responseText = p ? `Mandi ${c}: Rs ${p.modal_price}/quintal at ${p.market_name}. MSP: Rs ${p.msp || 'N/A'}` : `${c} bhav uplabdh nahi hai.`;
      continueSession = false;
    }

    ussdSessions.set(sessionId, session);
    if (!continueSession) ussdSessions.delete(sessionId);

    res.json({
      success: true,
      sessionId,
      response: responseText,
      continueSession
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'USSD Engine Error', error: error.message });
  }
};

/**
 * Multi-Step IVR DTMF Keypad Call State Machine (Toll-Free 1800-547-2600)
 */
const handleIVRAction = async (req, res) => {
  try {
    const { caller_phone = '9876543210', step = 'WELCOME', dtmf_input, session_data = {} } = req.body;
    const cleanPhone = caller_phone.replace(/[^0-9]/g, '').slice(-10);

    let nextStep = step;
    let voicePrompt = '';
    let menuOptions = [];
    const updatedSession = { ...session_data, phone: cleanPhone };

    const lang = updatedSession.lang || 'en';

    switch (step) {
      case 'WELCOME':
        nextStep = 'SELECT_LANGUAGE';
        voicePrompt = "Namaste! Welcome to For Farmers, For Us Kisan Voice Helpline. For Tamil press 1. Hindi ke liye 2 dabayein. Marathi sathi 3 daba. For English press 4.";
        menuOptions = [
          { key: '1', label: '1: தமிழ் (Tamil)' },
          { key: '2', label: '2: हिंदी (Hindi)' },
          { key: '3', label: '3: मराठी (Marathi)' },
          { key: '4', label: '4: English' }
        ];
        break;

      case 'SELECT_LANGUAGE':
        const langChoice = dtmf_input || '4';
        const langMap = { '1': 'ta', '2': 'hi', '3': 'mr', '4': 'en' };
        updatedSession.lang = langMap[langChoice] || 'en';
        nextStep = 'MAIN_MENU';

        voicePrompt = getMessage(updatedSession.lang, 'MAIN_MENU');
        menuOptions = [
          { key: '1', label: '1: Sell Produce' },
          { key: '2', label: '2: Check Mandi Prices' },
          { key: '3', label: '3: Check My Orders' },
          { key: '4', label: '4: Kisan Mitra Help' }
        ];
        break;

      case 'MAIN_MENU':
        if (dtmf_input === '1') {
          nextStep = 'SELECT_CATEGORY';
          voicePrompt = getMessage(updatedSession.lang, 'SELECT_CATEGORY');
          menuOptions = [
            { key: '1', label: '1: Vegetables' },
            { key: '2', label: '2: Fruits' },
            { key: '3', label: '3: Grains & Cereals' },
            { key: '4', label: '4: Pulses & Dal' },
            { key: '5', label: '5: Farm Dairy' }
          ];
        } else if (dtmf_input === '2') {
          nextStep = 'SELECT_RATES_CATEGORY';
          voicePrompt = "Select category to check today's Mandi benchmark rates: Press 1 for Vegetables, 2 for Grains.";
          menuOptions = [
            { key: '1', label: '1: Vegetables (Tomato, Onion, Potato)' },
            { key: '2', label: '2: Grains (Rice, Wheat)' }
          ];
        } else if (dtmf_input === '3') {
          const farmer = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
          if (farmer) {
            const orders = db.prepare('SELECT o.id, o.quantity_kg, p.name as product_name, o.status FROM orders o JOIN products p ON o.product_id = p.id WHERE o.farmer_id = ? LIMIT 2').all(farmer.id);
            voicePrompt = orders.length 
              ? `You have ${orders.length} orders. ${orders.map(o => `Order ${o.id}: ${o.quantity_kg}kg ${o.product_name}, Status is ${o.status}`).join('. ')}. To confirm an order reply CONFIRM <ID> via SMS.`
              : 'You currently have no incoming orders. Produce listings are active on the digital marketplace.';
          } else {
            voicePrompt = "No registered listings found for your phone number. Press 1 to list your harvest now.";
          }
          nextStep = 'SELECT_LANGUAGE';
          menuOptions = [{ key: '9', label: '9: Main Menu' }];
        } else {
          voicePrompt = "Connecting you to your local Kisan Mitra digital kiosk coordinator. Please hold or visit your nearest Gram Panchayat CSC center.";
          nextStep = 'SELECT_LANGUAGE';
          menuOptions = [{ key: '9', label: '9: Main Menu' }];
        }
        break;

      case 'SELECT_CATEGORY':
        const catChoice = dtmf_input || '1';
        const cats = { '1': 'vegetables', '2': 'fruits', '3': 'grains', '4': 'pulses', '5': 'dairy' };
        updatedSession.category = cats[catChoice] || 'vegetables';
        nextStep = 'SELECT_CROP';

        // Dynamic category-to-crop menus
        if (updatedSession.category === 'fruits') {
          voicePrompt = "Select Fruit: 1 for Mango, 2 for Banana, 3 for Guava, 4 for Pomegranate.";
          menuOptions = [
            { key: '1', label: '1: Mango Alphonso' },
            { key: '2', label: '2: Banana' },
            { key: '3', label: '3: Guava' },
            { key: '4', label: '4: Pomegranate' }
          ];
        } else if (updatedSession.category === 'grains') {
          voicePrompt = "Select Grain: 1 for Basmati Rice, 2 for Wheat, 3 for Paddy.";
          menuOptions = [
            { key: '1', label: '1: Basmati Rice' },
            { key: '2', label: '2: Wheat' },
            { key: '3', label: '3: Paddy' }
          ];
        } else {
          voicePrompt = getMessage(updatedSession.lang, 'SELECT_CROP');
          menuOptions = [
            { key: '1', label: '1: Tomato' },
            { key: '2', label: '2: Onion' },
            { key: '3', label: '3: Potato' },
            { key: '4', label: '4: Brinjal' }
          ];
        }
        break;

      case 'SELECT_CROP':
        const cropChoice = dtmf_input || '1';
        if (updatedSession.category === 'fruits') {
          const fruitMap = { '1': 'Mango Alphonso', '2': 'Banana', '3': 'Guava', '4': 'Pomegranate' };
          updatedSession.crop = fruitMap[cropChoice] || 'Mango Alphonso';
        } else if (updatedSession.category === 'grains') {
          const grainMap = { '1': 'Basmati Rice', '2': 'Wheat', '3': 'Paddy' };
          updatedSession.crop = grainMap[cropChoice] || 'Basmati Rice';
        } else {
          const vegMap = { '1': 'Tomato', '2': 'Onion', '3': 'Potato', '4': 'Brinjal' };
          updatedSession.crop = vegMap[cropChoice] || 'Tomato';
        }

        nextStep = 'ENTER_QUANTITY';
        voicePrompt = getMessage(updatedSession.lang, 'ENTER_QUANTITY');
        menuOptions = [
          { key: '100#', label: 'Type: 100#' },
          { key: '200#', label: 'Type: 200#' },
          { key: '500#', label: 'Type: 500#' }
        ];
        break;

      case 'ENTER_QUANTITY':
        const qtyVal = parseFloat((dtmf_input || '100').replace('#', '')) || 100;
        updatedSession.quantity = qtyVal;
        nextStep = 'ENTER_PRICE';
        voicePrompt = getMessage(updatedSession.lang, 'ENTER_PRICE');
        menuOptions = [
          { key: '20#', label: 'Type: 20#' },
          { key: '25#', label: 'Type: 25#' },
          { key: '30#', label: 'Type: 30#' }
        ];
        break;

      case 'ENTER_PRICE':
        const priceVal = parseFloat((dtmf_input || '25').replace('#', '')) || 25;
        updatedSession.price = priceVal;
        nextStep = 'CONFIRM_LISTING';

        voicePrompt = getMessage(updatedSession.lang, 'CONFIRM_SUMMARY', {
          crop: updatedSession.crop,
          qty: updatedSession.quantity,
          price: updatedSession.price
        });

        menuOptions = [
          { key: '1', label: '1: Confirm & Publish Listing' },
          { key: '2', label: '2: Cancel & Re-enter' }
        ];
        break;

      case 'CONFIRM_LISTING':
        if (dtmf_input === '1') {
          const geo = await mapsService.geocode('Salem');
          let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
          if (!farmer) {
            const insert = db.prepare(`
              INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(`Kisan (${cleanPhone.slice(-4)})`, `ivr_${cleanPhone}@kisan.in`, '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.', 'farmer', cleanPhone, geo.location, geo.state, geo.lat, geo.lng);
            farmer = { id: insert.lastInsertRowid, phone: cleanPhone, name: `Kisan (${cleanPhone.slice(-4)})` };
          }

          const insertProd = db.prepare(`
            INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, quality_grade, is_organic, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(farmer.id, updatedSession.crop, updatedSession.category || 'vegetables', 'IVR 1800-547-2600 Listing', updatedSession.quantity, updatedSession.price, 'A', 0, 'available');

          const newId = insertProd.lastInsertRowid;
          voicePrompt = getMessage(updatedSession.lang, 'CALL_END', { id: newId });
          nextStep = 'CALL_COMPLETED';
          menuOptions = [{ key: '9', label: '9: Main Menu' }];

          // Dispatch SMS
          await smsService.sendSMS(cleanPhone, `Kisan Helpline: Aapki fasal ${updatedSession.crop} (${updatedSession.quantity}kg @ Rs ${updatedSession.price}/kg) list ho gayi hai (ID #${newId}).`, { templateName: 'IVR_LISTING' });
        } else {
          nextStep = 'SELECT_LANGUAGE';
          voicePrompt = "Listing cancelled. Returning to main menu.";
          menuOptions = [{ key: '9', label: '9: Main Menu' }];
        }
        break;

      default:
        nextStep = 'SELECT_LANGUAGE';
        voicePrompt = "Thank you for calling Kisan Seva.";
        menuOptions = [{ key: '9', label: '9: Main Menu' }];
    }

    res.json({
      success: true,
      data: {
        step: nextStep,
        voicePrompt,
        menuOptions,
        session_data: updatedSession
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'IVR Call Error', error: error.message });
  }
};

/**
 * Live Activity Logs & Delivery Receipts
 */
const getDialphoneLogs = async (req, res) => {
  try {
    const dialphoneProducts = db.prepare(`
      SELECT p.*, u.name as farmer_name, u.phone as farmer_phone, u.location as farmer_location 
      FROM products p 
      JOIN users u ON p.farmer_id = u.id 
      WHERE p.description LIKE '%Dialphone%' OR p.description LIKE '%IVR%' OR p.description LIKE '%SMS%' OR p.description LIKE '%Voice Listed%' OR p.description LIKE '%USSD%' OR p.description LIKE '%CSC%'
      ORDER BY p.created_at DESC LIMIT 15
    `).all();

    res.json({
      success: true,
      data: {
        recentSMS: smsService.getRecentLogs(20),
        dialphoneProducts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const voiceCallService = require('../services/voiceCall.service');

/**
 * Push helper to dispatch automated SMS
 */
const dispatchFarmerSMS = async (phone, text) => {
  return await smsService.sendSMS(phone, text, { templateName: 'SYSTEM_AUTONOMOUS_ALERT' });
};

/**
 * Trigger Real Outbound Phone Call via Twilio to Farmer's Phone
 */
const triggerOutboundCall = async (req, res) => {
  try {
    const { phone = '7989998568' } = req.body;
    const callRes = await voiceCallService.makeVoiceCall(phone);
    res.json({
      success: true,
      message: 'Outbound Voice Phone Call placed successfully!',
      data: callRes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Voice call error', error: error.message });
  }
};

/**
 * Interactive Twilio Live Webhook Gather (Multi-Turn Real Phone IVR)
 */
const handleTwilioGather = async (req, res) => {
  res.type('text/xml');
  const digits = (req.body?.Digits || req.query?.Digits || '').trim();
  const speech = (req.body?.SpeechResult || req.query?.SpeechResult || '').trim();
  const step = req.query?.step || 'LANG';
  const lang = req.query?.lang || 'hi';
  const fromPhone = req.body?.From || req.body?.Caller || '7989998568';
  const cleanPhone = fromPhone.replace(/[^0-9]/g, '').slice(-10);

  const baseUrl = process.env.PUBLIC_URL || 'https://bitter-trains-glow.loca.lt';

  console.log(`[Twilio Webhook Gather] Step: ${step}, Lang: ${lang}, Digits: ${digits}, Speech: "${speech}"`);

  // 1. LANGUAGE SELECTION STEP
  if (step === 'LANG') {
    let chosenLang = 'hi';
    if (digits === '2') chosenLang = 'ta';
    else if (digits === '3') chosenLang = 'en';
    else if (digits === '4') chosenLang = 'mr';

    if (chosenLang === 'ta') {
      return res.send(`
        <Response>
          <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=ta" numDigits="1" method="POST" timeout="8">
            <Say voice="Polly.Aditi" language="ta-IN">
              வணக்கம்! உழவன் சேவைக்கு நல்வரவு.
              விளைச்சல் விற்க 1 அழுத்தவும்.
              மண்டி விலை அறிய 2 அழுத்தவும்.
              ஆர்டர் மற்றும் வருமானம் அறிய 3 அழுத்தவும்.
              பயிர் மருத்துவருக்கு 4 அழுத்தவும்.
            </Say>
          </Gather>
          <Say voice="Polly.Aditi" language="ta-IN">நன்றி.</Say>
        </Response>
      `);
    } else if (chosenLang === 'en') {
      return res.send(`
        <Response>
          <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=en" numDigits="1" method="POST" timeout="8">
            <Say voice="Polly.Aditi" language="en-IN">
              Welcome to KisanSetu.
              Press 1 to sell your crop.
              Press 2 for live Mandi rates.
              Press 3 for your orders and earnings.
              Press 4 for Crop Doctor advice.
            </Say>
          </Gather>
          <Say voice="Polly.Aditi" language="en-IN">Thank you.</Say>
        </Response>
      `);
    } else {
      return res.send(`
        <Response>
          <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=hi" numDigits="1" method="POST" timeout="8">
            <Say voice="Polly.Aditi" language="hi-IN">
              नमस्ते! किसानसेतु में आपका स्वागत है।
              फसल बेचने के लिए 1 दबाएं।
              मंडी भाव जानने के लिए 2 दबाएं।
              अपने आर्डर और कमाई जानने के लिए 3 दबाएं।
              फसल डॉक्टर सलाह के लिए 4 दबाएं।
            </Say>
          </Gather>
          <Say voice="Polly.Aditi" language="hi-IN">धन्यवाद।</Say>
        </Response>
      `);
    }
  }

  // 2. MAIN MENU STEP
  else if (step === 'MENU') {
    if (digits === '1') {
      const askMsg = lang === 'ta' 
        ? "விளைச்சல் விற்கும் சேவைக்கு நல்வரவு. பீப் ஒலிக்குப் பிறகு உங்கள் பயிரின் பெயர், மொத்த அளவு மற்றும் ஒரு கிலோவின் விலையை சொல்லுங்கள்." 
        : lang === 'en'
        ? "Please speak your crop name, quantity in kg, and price per kg after the beep."
        : "फसल बिक्री सेवा में स्वागत है। कृपया बीप के बाद अपनी फसल का नाम, कुल वजन किलो में, और अपना भाव बताएं।";

      return res.send(`
        <Response>
          <Gather input="speech dtmf" timeout="6" speechTimeout="auto" action="${baseUrl}/api/ivr/twilio-gather?step=PRODUCE&amp;lang=${lang}" method="POST">
            <Say voice="Polly.Aditi" language="${lang === 'ta' ? 'ta-IN' : lang === 'en' ? 'en-IN' : 'hi-IN'}">${askMsg}</Say>
          </Gather>
        </Response>
      `);
    } else if (digits === '2') {
      const rateMsg = lang === 'ta' 
        ? "இன்றைய மண்டி மாதிரி விலை: தக்காளி ₹25, வெங்காயம் ₹32, உருளைக்கிழங்கு ₹18 ஒரு கிலோவிற்கு. நன்றி!" 
        : "आज का मुख्य मंडी मॉडल भाव: टमाटर ₹25, प्याज ₹32, आलू ₹18 प्रति किलो है। धन्यवाद!";
      return res.send(`
        <Response>
          <Say voice="Polly.Aditi" language="${lang === 'ta' ? 'ta-IN' : 'hi-IN'}">${rateMsg}</Say>
        </Response>
      `);
    } else {
      const msg = lang === 'ta' ? "உங்களுக்கு 2 ஆர்டர்கள் உள்ளன. உறுதிப்படுத்தப்பட்ட வருமானம் ₹1225. நன்றி!" : "आपके कुल 2 आर्डर हैं। कुल कमाई ₹1225 है। धन्यवाद!";
      return res.send(`
        <Response>
          <Say voice="Polly.Aditi" language="${lang === 'ta' ? 'ta-IN' : 'hi-IN'}">${msg}</Say>
        </Response>
      `);
    }
  }

  // 3. PRODUCE VOICE CAPTURE STEP
  else if (step === 'PRODUCE') {
    const rawSpeech = speech || '500 kg Tomato 25 rupees';
    const extracted = await nlpExtractor.extractEntities(rawSpeech, 'PRODUCE_LISTING', lang);
    const crop = extracted.crop || 'Tomato';
    const qty = extracted.quantity || 500;
    const price = extracted.expected_price || 25;

    const verifyMsg = lang === 'ta'
      ? `நீங்கள் பதிவு செய்தது: பயிர் ${crop}, அளவு ${qty} கிலோ, விலை ${price} ரூபாய். உறுதிப்படுத்த 1 அழுத்தவும், மாற்ற 2 அழுத்தவும்.`
      : `आपने दर्ज किया है: फसल ${crop}, वजन ${qty} किलो, भाव ${price} रुपये। कन्फर्म करने के लिए 1 दबाएं।`;

    return res.send(`
      <Response>
        <Gather action="${baseUrl}/api/ivr/twilio-gather?step=CONFIRM&amp;lang=${lang}&amp;crop=${encodeURIComponent(crop)}&amp;qty=${qty}&amp;price=${price}" numDigits="1" method="POST" timeout="8">
          <Say voice="Polly.Aditi" language="${lang === 'ta' ? 'ta-IN' : 'hi-IN'}">${verifyMsg}</Say>
        </Gather>
      </Response>
    `);
  }

  // 4. CONFIRM STEP
  else if (step === 'CONFIRM') {
    const crop = req.query.crop || 'Tomato';
    const qty = parseFloat(req.query.qty) || 500;
    const price = parseFloat(req.query.price) || 25;

    if (digits === '1' || !digits) {
      let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
      if (!farmer) {
        const dummyPass = '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.';
        const ins = db.prepare('INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(`Kisan (${cleanPhone.slice(-4)})`, `call_${cleanPhone}@kisan.in`, dummyPass, 'farmer', cleanPhone, 'Salem Rural', 'Tamil Nadu', 11.6643, 78.1460);
        farmer = { id: ins.lastInsertRowid };
      }

      const insProd = db.prepare('INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, quality_grade, is_organic, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(farmer.id, crop, 'vegetables', `Twilio Phone Call Listing`, qty, price, 'A', 0, 'available');
      const listingId = insProd.lastInsertRowid;

      // SMS
      smsService.sendSMS(cleanPhone, `KisanSetu Voice Alert: Aapki ${qty}kg ${crop} (@ Rs ${price}/kg) live ho gayi hai (ID #${listingId}).`).catch(() => {});

      const successMsg = lang === 'ta'
        ? `வாழ்த்துகள்! உங்கள் ${qty} கிலோ ${crop} சந்தையில் வெற்றிகரமாக பட்டியலிடப்பட்டது (ID #${listingId}). ஆர்டர் வந்ததும் SMS வரும். நன்றி!`
        : `बधाई हो! आपकी ${qty} किलो ${crop} मार्केटप्लेस पर सफलतापूर्वक लिस्ट हो गई है (ID #${listingId})। धन्यवाद!`;

      return res.send(`
        <Response>
          <Say voice="Polly.Aditi" language="${lang === 'ta' ? 'ta-IN' : 'hi-IN'}">${successMsg}</Say>
        </Response>
      `);
    } else {
      return res.send(`
        <Response>
          <Say voice="Polly.Aditi" language="${lang === 'ta' ? 'ta-IN' : 'hi-IN'}">ரத்து செய்யப்பட்டது. நன்றி.</Say>
        </Response>
      `);
    }
  }

  res.send('<Response><Say>Dhanyavaad.</Say></Response>');
};

module.exports = {
  handleVoiceAI,
  handleDialogueCall,
  handleIncomingSMS,
  handleMissedCall,
  handleUSSD,
  handleIVRAction,
  getDialphoneLogs,
  dispatchFarmerSMS,
  triggerOutboundCall,
  handleTwilioGather
};
