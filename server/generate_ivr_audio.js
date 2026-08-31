/**
 * Pre-generate all static IVR audio prompts using Sarvam AI TTS
 * Run: node generate_ivr_audio.js
 */
require('dotenv').config();
const sarvamTTS = require('./services/sarvam.tts.service');

const prompts = {
  // === WELCOME ===
  welcome: {
    en: { text: 'Welcome to KisanSetu, the farmer helpline.', lang: 'en-IN' },
    ta: { text: 'கிசான் சேது விவசாயி உதவி எண்ணுக்கு வரவேற்கிறோம்.', lang: 'ta-IN' },
    hi: { text: 'किसान सेतु हेल्पलाइन में आपका स्वागत है।', lang: 'hi-IN' }
  },

  // === LANGUAGE SELECTION ===
  lang_select: {
    en: { text: 'Please select your language. For English, press 1. For Tamil, press 2. For Hindi, press 3. Please press 1, 2, or 3 now.', lang: 'en-IN' }
  },

  // === LANGUAGE CHOSEN ===
  lang_chosen: {
    en: { text: 'You have selected English.', lang: 'en-IN' },
    ta: { text: 'நீங்கள் தமிழை தேர்ந்தெடுத்துள்ளீர்கள். வணக்கம்!', lang: 'ta-IN' },
    hi: { text: 'आपने हिंदी चुनी है।', lang: 'hi-IN' }
  },

  // === MAIN MENU ===
  menu: {
    en: { text: 'To sell your crop, press 1. To hear today\'s mandi rates, press 2. To check your orders and earnings, press 3. For crop doctor advice, press 4. Please press a button now.', lang: 'en-IN' },
    ta: { text: 'உங்கள் விளைச்சலை விற்க, ஒன்று அழுத்தவும். இன்றைய மண்டி விலை அறிய, இரண்டு அழுத்தவும். உங்கள் ஆர்டர் மற்றும் வருமானம் அறிய, மூன்று அழுத்தவும். பயிர் மருத்துவர் ஆலோசனைக்கு, நான்கு அழுத்தவும். தயவுசெய்து இப்போது பட்டனை அழுத்தவும்.', lang: 'ta-IN' },
    hi: { text: 'अपनी फसल बेचने के लिए, एक दबाएं। आज का मंडी भाव जानने के लिए, दो दबाएं। अपने आर्डर और कमाई जानने के लिए, तीन दबाएं। फसल डॉक्टर से सलाह लेने के लिए, चार दबाएं। कृपया अभी बटन दबाएं।', lang: 'hi-IN' }
  },

  // === SELL CROP PROMPT ===
  sell_crop: {
    en: { text: 'Great choice! After the beep, please tell me: what crop you want to sell, how many kilograms you have, and what price per kilogram you want. For example: 500 kilograms of tomato at 25 rupees per kg. Please speak now.', lang: 'en-IN' },
    ta: { text: 'மிக நல்லது! பீப் ஒலிக்குப் பிறகு சொல்லுங்கள்: உங்கள் பயிரின் பெயர், எத்தனை கிலோ உள்ளது, ஒரு கிலோவுக்கு என்ன விலை. உதாரணம்: ஐநூறு கிலோ தக்காளி, இருபத்தைந்து ரூபாய். இப்போது பேசுங்கள்.', lang: 'ta-IN' },
    hi: { text: 'बहुत अच्छा! बीप के बाद बोलें: आपकी फसल का नाम, कितने किलो है, और प्रति किलो कितना भाव चाहिए। जैसे कि: पाँच सौ किलो टमाटर, पच्चीस रुपये। अब बोलिए।', lang: 'hi-IN' }
  },

  // === CROP DOCTOR ===
  crop_doctor: {
    en: { text: 'Kisan Crop Doctor Service: For pest control, apply 5 percent neem oil spray. For fungal disease, use copper oxychloride. Contact your nearest agriculture center for more help. Thank you!', lang: 'en-IN' },
    ta: { text: 'கிசான் பயிர் மருத்துவர் சேவை: பூச்சி கட்டுப்பாட்டிற்கு ஐந்து சதவீத வேப்ப எண்ணெய் தெளிக்கவும். பூஞ்சை நோய்க்கு காப்பர் ஆக்சிகுளோரைடு பயன்படுத்தவும். அருகிலுள்ள வேளாண் மையத்தை தொடர்பு கொள்ளவும். நன்றி!', lang: 'ta-IN' },
    hi: { text: 'किसान फसल डॉक्टर सेवा: कीट नियंत्रण के लिए पाँच प्रतिशत नीम तेल का छिड़काव करें। फफूंदी रोग के लिए कॉपर ऑक्सीक्लोराइड का उपयोग करें। अपने नजदीकी कृषि केंद्र से संपर्क करें। धन्यवाद!', lang: 'hi-IN' }
  },

  // === NO INPUT ===
  no_input: {
    en: { text: 'No input received. Please call again. Thank you.', lang: 'en-IN' },
    ta: { text: 'ஒன்றும் கேட்கவில்லை. மீண்டும் அழைக்கவும். நன்றி.', lang: 'ta-IN' },
    hi: { text: 'कुछ सुनाई नहीं दिया। कृपया दोबारा कॉल करें। धन्यवाद।', lang: 'hi-IN' }
  },

  // === THANK YOU ===
  thank_you: {
    en: { text: 'Thank you for using KisanSetu. Jai Kisaan!', lang: 'en-IN' },
    ta: { text: 'கிசான் சேது பயன்படுத்தியதற்கு நன்றி. ஜெய் கிசான்!', lang: 'ta-IN' },
    hi: { text: 'किसानसेतु से जुड़ने के लिए धन्यवाद। जय किसान!', lang: 'hi-IN' }
  },

  // === RETRY ===
  retry: {
    en: { text: 'Okay. Please tell me again: crop name, how many kilograms, and price per kilogram.', lang: 'en-IN' },
    ta: { text: 'சரி. மீண்டும் சொல்லுங்கள்: பயிரின் பெயர், எத்தனை கிலோ, ஒரு கிலோவுக்கு விலை.', lang: 'ta-IN' },
    hi: { text: 'ठीक है। कृपया दोबारा बताएं: फसल का नाम, कितने किलो, और प्रति किलो भाव।', lang: 'hi-IN' }
  }
};

async function generateAll() {
  console.log('🎙️  Generating IVR audio prompts with Sarvam AI Bulbul TTS...\n');
  let count = 0;
  let errors = 0;

  for (const [promptName, langs] of Object.entries(prompts)) {
    for (const [langKey, config] of Object.entries(langs)) {
      try {
        const url = await sarvamTTS.generateAudio(config.text, config.lang);
        if (url) {
          console.log(`  ✅ ${promptName}.${langKey} → ${url.split('/').pop()}`);
          count++;
        } else {
          console.log(`  ❌ ${promptName}.${langKey} — failed`);
          errors++;
        }
      } catch (e) {
        console.log(`  ❌ ${promptName}.${langKey} — ${e.message}`);
        errors++;
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n🎉 Done! Generated ${count} audio files, ${errors} errors.`);
}

generateAll();
