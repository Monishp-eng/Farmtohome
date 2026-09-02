const { GoogleGenerativeAI } = require('@google/generative-ai');
const Validators = require('./validators');
const mapsService = require('../services/maps.service');
const fetch = require('node-fetch');

class NLPExtractor {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.groqApiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
    this.modelName = 'gemini-2.0-flash';
    this.genAI = (this.geminiApiKey && this.geminiApiKey !== 'your_gemini_api_key_here') ? new GoogleGenerativeAI(this.geminiApiKey) : null;
  }

  /**
   * Extract entities from farmer speech/text using Cost-Optimized Heuristics -> LLM Cascade
   * 1. High-confidence heuristic matches return instantly at 0 API cost.
   * 2. Complex or colloquial utterances fall back to Groq Qwen / Gemini 2.0 Flash.
   */
  async extractEntities(text, targetState = 'GENERAL', language = 'en') {
    if (!text || typeof text !== 'string') {
      return {};
    }

    const trimmed = text.trim();

    // 1. FAST-PATH: Run Intelligent Local Multilingual Heuristic Parser FIRST (Zero API Cost)
    const heuristicResult = this._extractWithHeuristics(trimmed, targetState, language);
    const confidence = this._calculateConfidence(heuristicResult);

    if (confidence >= 0.85) {
      // Attach GPS coordinates if location is present
      if (heuristicResult.location) {
        const geo = await mapsService.geocode(heuristicResult.location);
        heuristicResult.latitude = geo.lat;
        heuristicResult.longitude = geo.lng;
        heuristicResult.geocoded_location = geo.location;
      }
      heuristicResult.extraction_confidence = confidence;
      heuristicResult.engine = 'HEURISTIC_ZERO_COST';
      return heuristicResult;
    }

    // 2. FALLBACK-PATH: Low-confidence or conversational speech -> Groq (Qwen/Llama) or Gemini
    try {
      let llmResult = null;
      if (this.groqApiKey && this.groqApiKey.startsWith('gsk_')) {
        llmResult = await this._extractWithGroq(trimmed, targetState, language);
      } else if (this.genAI) {
        llmResult = await this._extractWithGemini(trimmed, targetState, language);
      }

      if (llmResult && Object.keys(llmResult).length > 0) {
        // Merge heuristic matches if LLM missed simple tokens
        const merged = { ...heuristicResult, ...llmResult };
        if (merged.location) {
          const geo = await mapsService.geocode(merged.location);
          merged.latitude = geo.lat;
          merged.longitude = geo.lng;
          merged.geocoded_location = geo.location;
        }
        merged.engine = 'GROQ_QWEN_LLM';
        return merged;
      }
    } catch (err) {
      console.warn(`[NLP LLM Cascade Warning]:`, err.message);
    }

    // Default to best-effort heuristic
    if (heuristicResult.location) {
      const geo = await mapsService.geocode(heuristicResult.location);
      heuristicResult.latitude = geo.lat;
      heuristicResult.longitude = geo.lng;
    }
    heuristicResult.engine = 'HEURISTIC_FALLBACK';
    return heuristicResult;
  }

  _calculateConfidence(result) {
    let score = 0;
    if (result.crop) score += 0.40;
    if (result.quantity && result.quantity > 0) score += 0.25;
    if (result.expected_price && result.expected_price > 0) score += 0.25;
    if (result.location) score += 0.10;
    return score;
  }

  async _extractWithGroq(text, targetState, language) {
    const langMap = { 'ta': 'Tamil', 'hi': 'Hindi', 'mr': 'Marathi', 'en': 'English' };
    const prompt = `You are the agricultural NLP engine for Indian farmers who speak in ${langMap[language] || 'regional languages'}.
Extract produce listing JSON from this farmer speech: "${text}".
Return valid JSON only matching this schema:
{
  "name": "Farmer name or null",
  "location": "Village, district, or mandi name in India",
  "crop": "Standardized English crop name (e.g. Tomato, Onion, Basmati Rice, Wheat, Green Chilli, Milk, etc.)",
  "category": "vegetables | fruits | grains | pulses | dairy | spices | oilseeds",
  "quantity": number,
  "unit": "kg | quintal | tonne | bag",
  "expected_price": number (price per kg in INR),
  "is_organic": boolean
}`;

    const res = await globalThis.fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!res.ok) return null;
    const json = await res.json();
    const parsed = JSON.parse(json.choices[0]?.message?.content || '{}');
    return this._normalizeOutput(parsed);
  }

  async _extractWithGemini(text, targetState, language) {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    });

    const langMap = { 'ta': 'Tamil', 'hi': 'Hindi', 'mr': 'Marathi', 'en': 'English' };
    const systemPrompt = `Extract produce listing JSON from Indian farmer speech: "${text}" in ${langMap[language] || 'English'}.
JSON Schema: { name, location, crop, category, quantity, unit, expected_price, is_organic }`;

    const res = await model.generateContent(systemPrompt);
    const parsed = JSON.parse(res.response.text());
    return this._normalizeOutput(parsed);
  }

  _normalizeOutput(parsed) {
    const cleanOutput = {};
    if (parsed.name) cleanOutput.name = parsed.name;
    if (parsed.mobile_number) {
      const validMob = Validators.validateMobileNumber(parsed.mobile_number);
      if (validMob) cleanOutput.mobile_number = validMob;
    }
    if (parsed.location) cleanOutput.location = parsed.location;
    if (parsed.crop) cleanOutput.crop = parsed.crop;
    if (parsed.category) cleanOutput.category = parsed.category.toLowerCase();
    if (parsed.is_organic !== undefined) cleanOutput.is_organic = !!parsed.is_organic;

    if (parsed.quantity) {
      const q = Validators.normalizeQuantity(parsed.quantity, parsed.unit);
      if (q) {
        cleanOutput.quantity = q.quantity;
        cleanOutput.unit = q.unit;
      }
    }

    if (parsed.expected_price !== undefined && parsed.expected_price !== null) {
      const p = Validators.normalizePrice(parsed.expected_price);
      if (p !== null) cleanOutput.expected_price = p;
    }

    return cleanOutput;
  }

  /**
   * Rule-based Multi-lingual Heuristic Extractor
   */
  _extractWithHeuristics(text, targetState, language) {
    const lower = text.toLowerCase();
    const result = {};

    // 1. Mobile number
    const mobile = Validators.validateMobileNumber(text);
    if (mobile) result.mobile_number = mobile;

    // 2. Crop dictionary covering Tamil, Hindi, Marathi, Telugu, English
    const cropDictionary = {
      // Vegetables
      'tomato': { crop: 'Tomato', category: 'vegetables', price: 25 },
      'தக்காளி': { crop: 'Tomato', category: 'vegetables', price: 25 },
      'tamatar': { crop: 'Tomato', category: 'vegetables', price: 25 },
      'टमाटर': { crop: 'Tomato', category: 'vegetables', price: 25 },
      'टोमॅटो': { crop: 'Tomato', category: 'vegetables', price: 25 },
      'onion': { crop: 'Onion', category: 'vegetables', price: 22 },
      'வெங்காயம்': { crop: 'Onion', category: 'vegetables', price: 22 },
      'pyaz': { crop: 'Onion', category: 'vegetables', price: 22 },
      'प्याज': { crop: 'Onion', category: 'vegetables', price: 22 },
      'कांदा': { crop: 'Onion', category: 'vegetables', price: 22 },
      'potato': { crop: 'Potato', category: 'vegetables', price: 18 },
      'உருளைக்கிழங்கு': { crop: 'Potato', category: 'vegetables', price: 18 },
      'aloo': { crop: 'Potato', category: 'vegetables', price: 18 },
      'आलू': { crop: 'Potato', category: 'vegetables', price: 18 },
      'बटाटा': { crop: 'Potato', category: 'vegetables', price: 18 },
      'cabbage': { crop: 'Cabbage', category: 'vegetables', price: 15 },
      'முட்டைக்கோஸ்': { crop: 'Cabbage', category: 'vegetables', price: 15 },
      'patta gobhi': { crop: 'Cabbage', category: 'vegetables', price: 15 },
      'पत्तागोभी': { crop: 'Cabbage', category: 'vegetables', price: 15 },
      'cauliflower': { crop: 'Cauliflower', category: 'vegetables', price: 24 },
      'காலிஃபிளவர்': { crop: 'Cauliflower', category: 'vegetables', price: 24 },
      'phool gobhi': { crop: 'Cauliflower', category: 'vegetables', price: 24 },
      'brinjal': { crop: 'Brinjal', category: 'vegetables', price: 20 },
      'கத்தரிக்காய்': { crop: 'Brinjal', category: 'vegetables', price: 20 },
      'baingan': { crop: 'Brinjal', category: 'vegetables', price: 20 },
      'वांगी': { crop: 'Brinjal', category: 'vegetables', price: 20 },

      // Fruits
      'mango': { crop: 'Mango Alphonso', category: 'fruits', price: 120 },
      'மாம்பழம்': { crop: 'Mango Alphonso', category: 'fruits', price: 120 },
      'aam': { crop: 'Mango Alphonso', category: 'fruits', price: 120 },
      'आम': { crop: 'Mango Alphonso', category: 'fruits', price: 120 },
      'हापूस': { crop: 'Mango Alphonso', category: 'fruits', price: 120 },
      'banana': { crop: 'Banana', category: 'fruits', price: 30 },
      'வாழைப்பழம்': { crop: 'Banana', category: 'fruits', price: 30 },
      'kela': { crop: 'Banana', category: 'fruits', price: 30 },
      'केला': { crop: 'Banana', category: 'fruits', price: 30 },
      'केळी': { crop: 'Banana', category: 'fruits', price: 30 },
      'guava': { crop: 'Guava', category: 'fruits', price: 35 },
      'கொய்யா': { crop: 'Guava', category: 'fruits', price: 35 },
      'amrood': { crop: 'Guava', category: 'fruits', price: 35 },
      'अमरूद': { crop: 'Guava', category: 'fruits', price: 35 },
      'पेरू': { crop: 'Guava', category: 'fruits', price: 35 },
      'pomegranate': { crop: 'Pomegranate', category: 'fruits', price: 80 },
      'மாதுளை': { crop: 'Pomegranate', category: 'fruits', price: 80 },
      'anar': { crop: 'Pomegranate', category: 'fruits', price: 80 },
      'अनार': { crop: 'Pomegranate', category: 'fruits', price: 80 },
      'डाळिंब': { crop: 'Pomegranate', category: 'fruits', price: 80 },
      'grapes': { crop: 'Grapes', category: 'fruits', price: 60 },
      'திராட்சை': { crop: 'Grapes', category: 'fruits', price: 60 },
      'angoor': { crop: 'Grapes', category: 'fruits', price: 60 },
      'अंगूर': { crop: 'Grapes', category: 'fruits', price: 60 },
      'द्राक्षे': { crop: 'Grapes', category: 'fruits', price: 60 },

      // Grains
      'rice': { crop: 'Basmati Rice', category: 'grains', price: 65 },
      'அரிசி': { crop: 'Basmati Rice', category: 'grains', price: 65 },
      'chawal': { crop: 'Basmati Rice', category: 'grains', price: 65 },
      'चावल': { crop: 'Basmati Rice', category: 'grains', price: 65 },
      'तांदूळ': { crop: 'Basmati Rice', category: 'grains', price: 65 },
      'paddy': { crop: 'Paddy', category: 'grains', price: 24 },
      'நெல்': { crop: 'Paddy', category: 'grains', price: 24 },
      'dhan': { crop: 'Paddy', category: 'grains', price: 24 },
      'धान': { crop: 'Paddy', category: 'grains', price: 24 },
      'wheat': { crop: 'Wheat', category: 'grains', price: 28 },
      'கோதுமை': { crop: 'Wheat', category: 'grains', price: 28 },
      'gehun': { crop: 'Wheat', category: 'grains', price: 28 },
      'गेहूं': { crop: 'Wheat', category: 'grains', price: 28 },
      'गहू': { crop: 'Wheat', category: 'grains', price: 28 },

      // Pulses & Spices
      'toor': { crop: 'Toor Dal', category: 'pulses', price: 95 },
      'துவரம்': { crop: 'Toor Dal', category: 'pulses', price: 95 },
      'अरहर': { crop: 'Toor Dal', category: 'pulses', price: 95 },
      'तूर': { crop: 'Toor Dal', category: 'pulses', price: 95 },
      'chilli': { crop: 'Green Chilli', category: 'vegetables', price: 40 },
      'மிளகாய்': { crop: 'Green Chilli', category: 'vegetables', price: 40 },
      'mirchi': { crop: 'Green Chilli', category: 'vegetables', price: 40 },
      'मिर्च': { crop: 'Green Chilli', category: 'vegetables', price: 40 },
      'turmeric': { crop: 'Turmeric', category: 'spices', price: 120 },
      'மஞ்சள்': { crop: 'Turmeric', category: 'spices', price: 120 },
      'haldi': { crop: 'Turmeric', category: 'spices', price: 120 },
      'हल्दी': { crop: 'Turmeric', category: 'spices', price: 120 },
      'milk': { crop: 'Fresh Milk', category: 'dairy', price: 55 },
      'பால்': { crop: 'Fresh Milk', category: 'dairy', price: 55 },
      'doodh': { crop: 'Fresh Milk', category: 'dairy', price: 55 },
      'दूध': { crop: 'Fresh Milk', category: 'dairy', price: 55 }
    };

    for (const [key, val] of Object.entries(cropDictionary)) {
      if (lower.includes(key.toLowerCase())) {
        result.crop = val.crop;
        result.category = val.category;
        break;
      }
    }

    // 3. Extract quantity & unit
    const qtyMatch = lower.match(/(\d+(\.\d+)?)\s*(kg|kilo|kilos|கிலோ|किलो|क्विंटल|tonne|ton|டன்|टन|quintal|குவிண்டால்|bag|மூட்டை|बोरी)/i) ||
                     lower.match(/(\d+(\.\d+)?)/);

    if (qtyMatch) {
      const qVal = parseFloat(qtyMatch[1]);
      let uVal = 'kg';
      if (qtyMatch[3]) {
        if (/tonne|ton|டன்|टन/i.test(qtyMatch[3])) uVal = 'tonne';
        else if (/quintal|குவிண்டால்|क्विंटल/i.test(qtyMatch[3])) uVal = 'quintal';
        else if (/bag|மூட்டை|बोरी/i.test(qtyMatch[3])) uVal = 'bag';
      }
      result.quantity = qVal;
      result.unit = uVal;
    }

    // 4. Extract price (Robust Multilingual & Romanized regex)
    const priceMatch = lower.match(/(?:for|rs|rupees|rupee|rupaye|rupiya|bhav|₹|ரூபாய்|रुपये|रुपए|प्रति किलो|per kg|rate|@)\s*[:=]?\s*(\d+(\.\d+)?)/i) ||
                       lower.match(/(\d+(\.\d+)?)\s*(?:rs|rupees|rupee|rupaye|rupiya|bhav|₹|ரூபாய்|रुपये|रुपए|प्रति किलो|per kg|prati kilo|kilo rate)/i);
    if (priceMatch) {
      const pVal = parseFloat(priceMatch[1]);
      if (pVal > 0 && pVal < 100000) {
        result.expected_price = pVal;
      }
    }

    // 5. Locations
    const locs = [
      'Salem', 'சேலம்', 'Nashik', 'நாசிக்', 'नासिक', 'नाशिक', 'Madurai', 'மதுரை', 'Erode', 'ஈரோடு', 
      'Coimbatore', 'கோவை', 'Thanjavur', 'தஞ்சாவூர்', 'Pune', 'புனே', 'पुणे', 'Ludhiana', 'लुधियाना',
      'Dindigul', 'திண்டுக்கல்', 'Mumbai', 'மும்பை', 'मुंबई', 'Delhi', 'டெல்லி', 'दिल्ली', 'Bangalore', 'பெங்களூரு',
      'Wayanad', 'வயநாடு', 'वायनाड', 'Anand', 'आनंद', 'Guntur', 'குண்டூர்', 'गुंटूर', 'Kurnool', 'கர்நூல்'
    ];
    for (const l of locs) {
      if (lower.includes(l.toLowerCase())) {
        result.location = l;
        break;
      }
    }

    // 6. Freshness Window / Availability Duration (Days)
    // Matches: "fresh for 3 days", "3 நாட்கள்", "3 din", "3 days", "valid 4 days", "till 5 days"
    const freshMatch = lower.match(/(\d+)\s*(days?|naal|natkal|din|நாட்கள்|நாள்|दिन|दिवस)/i) ||
                       lower.match(/(fresh|ப்ரெஷ்|ताज़ा|ताजा)\s*(?:for|till)?\s*(\d+)/i);
    if (freshMatch) {
      const days = parseInt(freshMatch[1] || freshMatch[2], 10);
      if (days > 0 && days <= 365) {
        result.freshness_days = days;
      }
    }

    // Default intelligent freshness shelf-life per crop category if not specified
    const shelfLifeDefaults = {
      'Tomato': 4,
      'Onion': 14,
      'Potato': 20,
      'Cabbage': 4,
      'Cauliflower': 4,
      'Brinjal': 4,
      'Green Chilli': 6,
      'Mango Alphonso': 6,
      'Banana': 5,
      'Guava': 4,
      'Pomegranate': 10,
      'Grapes': 5,
      'Papaya': 4,
      'Strawberry': 3,
      'Fresh Milk': 2,
      'Paneer': 3,
      'Basmati Rice': 180,
      'Wheat': 180,
      'Paddy': 180,
      'Toor Dal': 180,
      'Moong Dal': 180,
      'Chana Dal': 180,
      'Mustard Seeds': 180,
      'Groundnut': 90,
      'Soybean': 180,
      'Turmeric': 365,
      'Black Pepper': 365,
      'Cardamom': 365,
      'Cinnamon': 365,
      'Cloves': 365,
      'Ghee': 180
    };

    if (!result.freshness_days) {
      result.freshness_days = shelfLifeDefaults[result.crop] || (result.category === 'vegetables' ? 4 : result.category === 'fruits' ? 5 : result.category === 'dairy' ? 2 : 90);
    }

    const todayObj = new Date();
    result.harvest_date = todayObj.toISOString().split('T')[0];
    const expiryObj = new Date(todayObj.getTime() + result.freshness_days * 24 * 60 * 60 * 1000);
    result.expiry_date = expiryObj.toISOString().split('T')[0];

    // 7. Organic indicator
    if (/organic|இயற்கை|जैविक|bio/i.test(lower)) {
      result.is_organic = true;
    }

    return result;
  }
}

module.exports = new NLPExtractor();
