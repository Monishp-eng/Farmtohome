/**
 * Multilingual Message Dictionary for Voice Agent & IVR (Tamil, Hindi, Marathi, English)
 */

const messages = {
  en: {
    welcome: "Welcome to For Farmers, For Us Kisan Voice Helpline. Press 1 for Tamil, 2 for Hindi, 3 for Marathi, 4 for English.",
    recordingConsentPrompt: "This call may be recorded for quality and verification. Say YES or press 1 to agree, say NO or press 2.",
    mobilePrompt: "Please enter your 10-digit mobile number.",
    namePrompt: "What is your name?",
    locationPrompt: "Which village, town or mandi are you from?",
    cropPrompt: "What crop or agricultural product do you want to sell?",
    quantityPrompt: "How much quantity do you have in kilograms or tonnes?",
    pricePrompt: "What price are you expecting per kilogram? Say skip if not decided.",
    confirmationPrompt: "Confirming: {quantity} {unit} of {crop} from {location} at Rs {price} per {unit}. Press 1 to list on marketplace, 2 to cancel.",
    saveSuccess: "Congratulations! Your produce has been successfully registered on the digital marketplace. Verified buyers can now purchase your crop directly.",
    mandiBhavPrompt: "Today's APMC Mandi rates: {rates}. Press 9 for Main Menu.",
    genericError: "Sorry, I could not understand. Please try again."
  },

  ta: {
    welcome: "FarmConnect விவசாய குரல் சேவைக்கு நல்வரவு. தமிழுக்கு 1, இந்திக்கு 2, மராத்திக்கு 3, ஆங்கிலத்திற்கு 4 அழுத்தவும்.",
    recordingConsentPrompt: "இந்த அழைப்பு சரிபார்ப்புக்காக பதிவு செய்யப்படலாம். சம்மதமெனில் 1 அல்லது ஆம் என்று கூறவும்.",
    mobilePrompt: "தயவுசெய்து உங்கள் 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.",
    namePrompt: "உங்கள் பெயர் என்ன?",
    locationPrompt: "நீங்கள் எந்த ஊர் அல்லது கிராமத்தில் விவசாயம் செய்கிறீர்கள்?",
    cropPrompt: "நீங்கள் என்ன பயிர் அல்லது விளைபொருளை விற்க விரும்புகிறீர்கள்?",
    quantityPrompt: "எவ்வளவு அளவு விளைச்சல் உள்ளது (கிலோ அல்லது டன்னில்)?",
    pricePrompt: "ஒரு கிலோவிற்கு என்ன விலை எதிர்பார்க்கிறீர்கள்? அல்லது skip என கூறவும்.",
    confirmationPrompt: "உறுதிப்படுத்தல்: {location}-லிருந்து {quantity} {unit} {crop}, ஒரு {unit}-க்கு ₹{price}. சந்தையில் பட்டியலிட 1 அழுத்தவும், ரத்து செய்ய 2 அழுத்தவும்.",
    saveSuccess: "வாழ்த்துகள்! உங்கள் விளைபொருள் டிஜிட்டல் சந்தையில் வெற்றிகரமாக பட்டியலிடப்பட்டுள்ளது. வாங்குபவர்கள் நேரடியாக ஆர்டர் செய்வார்கள்.",
    mandiBhavPrompt: "இன்றைய மண்டி விலைகள்: {rates}. முதன்மை மெனுவிற்கு 9 அழுத்தவும்.",
    genericError: "மன்னிக்கவும், புரியவில்லை. மீண்டும் கூறவும்."
  },

  hi: {
    welcome: "नमस्ते! 'For Farmers, For Us' किसान वॉइस हेल्पलाइन में आपका स्वागत है। तमिल के लिए 1, हिंदी के लिए 2, मराठी के लिए 3, इंग्लिश के लिए 4 दबाएं।",
    recordingConsentPrompt: "यह कॉल सत्यापन के लिए रिकॉर्ड की जा सकती है। सहमति के लिए 1 दबाएं या हाँ कहें।",
    mobilePrompt: "कृपया अपना 10 अंकों का मोबाइल नंबर दर्ज करें।",
    namePrompt: "आपका नाम क्या है?",
    locationPrompt: "आप किस गांव, शहर या मंडी से हैं?",
    cropPrompt: "आप कौन सी फसल या उपज बेचना चाहते हैं?",
    quantityPrompt: "आपके पास कितनी मात्रा है (किलो या क्विंटल में)?",
    pricePrompt: "आप प्रति किलो क्या भाव चाहते हैं? या skip कहें।",
    confirmationPrompt: "पुष्टि करें: {location} से {quantity} {unit} {crop}, भाव ₹{price} प्रति {unit}। लिस्ट करने के लिए 1 दबाएं, कैंसिल के लिए 2 दबाएं।",
    saveSuccess: "बधाई हो! आपकी फसल डिजिटल मार्केटप्लेस पर सफलतापूर्वक लिस्ट हो चुकी है। खरीदार सीधे आपसे खरीद सकेंगे।",
    mandiBhavPrompt: "आज के मंडी भाव: {rates}। मुख्य मेनू के लिए 9 दबाएं।",
    genericError: "माफ़ कीजिये, समझ नहीं आया। कृपया दोबारा कहें।"
  },

  mr: {
    welcome: "शेतकरी व्हॉइस सेवेमध्ये आपले स्वागत आहे. तमिळसाठी 1, हिंदीसाठी 2, मराठीसाठी 3, इंग्रजीसाठी 4 दाबा.",
    recordingConsentPrompt: "हा कॉल पडताळणीसाठी रेकॉर्ड केला जाऊ शकतो. संमतीसाठी 1 दाबा.",
    mobilePrompt: "कृपया आपला 10 अंकी मोबाईल नंबर टाका.",
    namePrompt: "आपले नाव काय आहे?",
    locationPrompt: "आपण कोणत्या गाव किंवा बाजार समितीचे आहात?",
    cropPrompt: "आपण कोणते शेतमाल विकू इच्छिता?",
    quantityPrompt: "आपल्याकडे किती माल आहे (किलो किंवा क्विंटलमध्ये)?",
    pricePrompt: "आपल्याला प्रति किलो काय भाव अपेक्षित आहे?",
    confirmationPrompt: "खात्री करा: {location} येथून {quantity} {unit} {crop}, भाव ₹{price}/किलो. मार्केटवर नोंदवण्यासाठी 1 दाबा.",
    saveSuccess: "अभिनंदन! आपला शेतमाल डिजिटल मार्केटवर यशस्वीरित्या नोंदवला गेला आहे.",
    mandiBhavPrompt: "आजचे बाजार भाव: {rates}. मुख्य मेनूसाठी 9 दाबा.",
    genericError: "माफ करा, समजले नाही. पुन्हा प्रयत्न करा."
  }
};

function getMessage(lang = 'en', key = 'welcome', params = {}) {
  const selectedLang = messages[lang] ? lang : 'en';
  let template = messages[selectedLang][key] || messages['en'][key] || '';

  for (const [k, v] of Object.entries(params)) {
    template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }

  return template;
}

module.exports = {
  messages,
  getMessage
};
