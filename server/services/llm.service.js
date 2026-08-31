const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/database');

class LLMService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
    this.grokApiKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY || '';
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.preferredProvider = process.env.LLM_PROVIDER || (this.grokApiKey ? 'groq' : (this.geminiApiKey ? 'gemini' : 'agri-expert'));

    this.initClients();
  }

  initClients() {
    if (this.geminiApiKey && this.geminiApiKey.trim() !== '') {
      try {
        this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
      } catch (e) {
        console.warn('[Gemini Init Warning]', e.message);
        this.genAI = null;
      }
    } else {
      this.genAI = null;
    }
  }

  updateApiKeys({ geminiKey, grokKey, openaiKey, provider }) {
    if (geminiKey !== undefined) this.geminiApiKey = geminiKey;
    if (grokKey !== undefined) this.grokApiKey = grokKey;
    if (openaiKey !== undefined) this.openaiApiKey = openaiKey;
    if (provider) this.preferredProvider = provider;
    this.initClients();
  }

  getProviderStatus() {
    return {
      preferredProvider: this.preferredProvider,
      geminiConfigured: !!(this.geminiApiKey && this.geminiApiKey.length > 10),
      grokConfigured: !!(this.grokApiKey && this.grokApiKey.length > 10),
      openaiConfigured: !!(this.openaiApiKey && this.openaiApiKey.length > 10),
      hasActiveKey: !!(this.geminiApiKey || this.grokApiKey || this.openaiApiKey)
    };
  }

  /**
   * Universal completion across Groq / Grok, Gemini, and OpenAI with Fallback
   */
  async generateCompletion({ systemPrompt, userMessage, temperature = 0.3, responseFormat = 'text' }) {
    // 1. Try Groq Cloud / xAI Grok (High Speed & High Reliability)
    if (this.grokApiKey && this.grokApiKey.trim() !== '') {
      try {
        const isGroqCloud = this.grokApiKey.startsWith('gsk_');
        const endpoint = isGroqCloud 
          ? 'https://api.groq.com/openai/v1/chat/completions' 
          : 'https://api.x.ai/v1/chat/completions';
        
        // Priority models available for this key
        const models = isGroqCloud 
          ? ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b']
          : ['grok-2-latest', 'grok-beta'];

        for (const model of models) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.grokApiKey}`
              },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userMessage }
                ],
                temperature
              })
            });

            if (response.ok) {
              const data = await response.json();
              const reply = data.choices?.[0]?.message?.content || '';
              if (reply.trim()) {
                return { provider: `Groq (${model})`, text: reply };
              }
            }
          } catch (modelErr) {
            console.warn(`[Groq ${model} Attempt Failed]`, modelErr.message);
          }
        }
      } catch (err) {
        console.warn('[Groq/Grok General Error]', err.message);
      }
    }

    // 2. Try Google Gemini
    if (this.genAI) {
      try {
        const modelNames = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        for (const modelName of modelNames) {
          try {
            const model = this.genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                temperature,
                responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain'
              }
            });

            const fullPrompt = `${systemPrompt}\n\nUser Request: ${userMessage}`;
            const res = await model.generateContent(fullPrompt);
            const reply = res.response.text();
            if (reply && reply.trim()) {
              return { provider: `Gemini (${modelName})`, text: reply };
            }
          } catch (err) {
            // next
          }
        }
      } catch (err) {
        console.warn('[Gemini General Error]', err.message);
      }
    }

    // 3. Try OpenAI
    if (this.openaiApiKey && this.openaiApiKey.trim() !== '') {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            temperature
          })
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || '';
          if (reply.trim()) {
            return { provider: 'OpenAI (gpt-4o-mini)', text: reply };
          }
        }
      } catch (err) {
        console.warn('[OpenAI Error]', err.message);
      }
    }

    // 4. Intelligent Domain-Expert Agronomy Fallback
    return {
      provider: 'agri-expert-engine',
      text: this._generateHeuristicFallback(userMessage, systemPrompt)
    };
  }

  /**
   * Kisan Agri-Doctor Diagnosis & Crop Health Consultant
   */
  async diagnoseCropIssue({ cropName, symptoms, language = 'en', soilType = '', region = '' }) {
    const systemPrompt = `
You are 'Kisan Doctor' (किसान डॉक्टर / உழவன் மருத்துவர்), a premier agricultural scientist and plant pathologist for Indian smallholder farmers.
Your mission is to diagnose crop diseases, pest infestations, nutrient deficiencies, and recommend organic & cost-effective IPM (Integrated Pest Management) solutions.

Language: Respond directly in ${language === 'ta' ? 'Tamil (தமிழ்)' : language === 'hi' ? 'Hindi (हिंदी)' : language === 'mr' ? 'Marathi (मराठी)' : 'English'}.
Keep advice practical, affordable, and step-by-step for rural Indian farmers.

Format your diagnosis clearly:
1. 🩺 Likely Disease / Pest Diagnosis (संभावित रोग / நோய் கண்டறிதல்)
2. 🌿 Organic / Bio-pesticide Treatment (जैविक उपचार / இயற்கை மருந்து, e.g. Neem oil, Trichoderma viride, Jeevamrit)
3. 💊 Recommended Safe Chemical Treatment if severe
4. 💧 Water, Soil & Micronutrient Management
5. 🛡️ Prevention Tips for next crop cycle
`;

    const userMessage = `Crop: ${cropName || 'Field Crop'}, Region: ${region || 'India'}, Soil: ${soilType || 'Loamy'}, Symptoms: ${symptoms}`;
    const result = await this.generateCompletion({ systemPrompt, userMessage, temperature: 0.3 });

    return {
      provider: result.provider,
      cropName,
      language,
      diagnosis: result.text
    };
  }

  /**
   * Kisan Conversational Copilot for Farmers, Buyers, and Logistics
   */
  async chatWithCopilot({ message, history = [], userRole = 'consumer', language = 'en' }) {
    const productStats = db.prepare('SELECT category, COUNT(*) as count, AVG(price_per_kg) as avg_price FROM products GROUP BY category').all();
    const mandiStats = db.prepare('SELECT commodity, market_name, modal_price, msp FROM market_prices LIMIT 5').all();

    const systemPrompt = `
You are 'Kisan Copilot' (किसान साथी), the AI assistant for the 'For Farmers, For Us' digital agricultural marketplace in India.
You assist farmers, consumers, bulk buyers, and logistics partners.

Platform Facts:
- Platform Fee: Strictly 2% (98% of money goes directly to farmers, eliminating middlemen).
- Categories available: ${productStats.map(p => `${p.category} (${p.count} items, avg ₹${Math.round(p.avg_price || 0)}/kg)`).join(', ')}.
- Live Mandi Benchmarks: ${mandiStats.map(m => `${m.commodity} @ ${m.market_name} is ₹${m.modal_price}/quintal (MSP: ₹${m.msp || 'N/A'})`).join('; ')}.
- Dialphone & 2G helpline: Toll-free 1800-547-2600 & SMS 56161.

User Role: ${userRole}.
Requested Language: ${language === 'ta' ? 'Tamil' : language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English'}.
Respond politely, concisely, and helpfully in the requested language. Use bullet points and bold text for easy reading.
`;

    const formattedHistory = history.slice(-4).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
    const userMessage = `${formattedHistory}\nUser: ${message}`;

    const result = await this.generateCompletion({ systemPrompt, userMessage, temperature: 0.4 });

    return {
      provider: result.provider,
      reply: result.text,
      language
    };
  }

  _generateHeuristicFallback(userMessage, systemPrompt) {
    const lower = userMessage.toLowerCase();

    if (lower.includes('yellow') || lower.includes('spot') || lower.includes('pest') || lower.includes('disease') || lower.includes('कीड़ा') || lower.includes('பூச்சி')) {
      return `
🌿 **Kisan Doctor Diagnosis & Advice:**
1. **Probable Cause**: Early Blight / Fungal Leaf Spot or Sucking Pest (Aphids/Whiteflies) infestation.
2. **Organic Treatment (Immediate)**:
   - Spray **Neem Oil (Azadirachtin 1500 ppm)**: 5ml per liter of water + 1ml liquid soap.
   - Apply **Trichoderma viride** or **Pseudomonas fluorescens** bio-fungicide (5g/liter) at root zone.
3. **Soil & Nutrition**: Apply balanced micronutrients and avoid overhead sprinkler watering to reduce humidity on foliage.
4. **Government Schemes**: Check PM-Kisan and Soil Health Card portal for subsidized bio-fertilizers.
      `.trim();
    }

    return `
🌾 **Kisan Copilot Response:**
Namaste! I am your AI agricultural companion.
- **For Farmers**: You can list crops using web or call our toll-free 1800-547-2600 IVR.
- **For Buyers**: Browse farm-fresh produce with direct farmer origin traceability.
- **Fair Pricing**: We guarantee 98% direct payment to farmers with transparent logistics routing.
How can I assist you with crops, weather, mandi rates, or orders today?
    `.trim();
  }
}

module.exports = new LLMService();
