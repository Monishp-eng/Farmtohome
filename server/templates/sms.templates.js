const templates = {
  en: {
    order_placed: ({ orderId, customerName = 'Customer', amount = '' }) =>
      `Hello ${customerName}, your KisanSetu order ${orderId} has been placed${amount !== '' ? ` for ₹${amount}` : ''}. We will update you when it is confirmed.`,
    order_confirmed: ({ orderId }) =>
      `KisanSetu: Your order ${orderId} has been confirmed by the farmer. We will notify you when it is out for delivery.`,
    out_for_delivery: ({ orderId, driverName = 'our driver' }) =>
      `KisanSetu: Your order ${orderId} is out for delivery with ${driverName}. Please keep your phone available.`,
    delivered: ({ orderId }) =>
      `KisanSetu: Your order ${orderId} has been delivered successfully. Thank you for buying from local farmers!`,
    payment_received: ({ orderId, amount = '' }) =>
      `KisanSetu: Payment received for order ${orderId}${amount !== '' ? ` — ₹${amount}` : ''}. Thank you.`
  },
  ta: {
    order_placed: ({ orderId, customerName = 'வாடிக்கையாளர்', amount = '' }) =>
      `வணக்கம் ${customerName}, உங்கள் KisanSetu ஆர்டர் ${orderId} பதிவு செய்யப்பட்டது${amount !== '' ? `. தொகை ₹${amount}` : ''}. உறுதிப்படுத்தப்பட்டதும் தகவல் அனுப்பப்படும்.`,
    order_confirmed: ({ orderId }) =>
      `KisanSetu: உங்கள் ஆர்டர் ${orderId} விவசாயியால் உறுதிப்படுத்தப்பட்டது. டெலிவரி தொடங்கியதும் தகவல் அனுப்பப்படும்.`,
    out_for_delivery: ({ orderId, driverName = 'எங்கள் டெலிவரி ஓட்டுநர்' }) =>
      `KisanSetu: உங்கள் ஆர்டர் ${orderId} ${driverName} மூலம் டெலிவரிக்கு புறப்பட்டுள்ளது. உங்கள் தொலைபேசியை அருகில் வைத்திருங்கள்.`,
    delivered: ({ orderId }) =>
      `KisanSetu: உங்கள் ஆர்டர் ${orderId} வெற்றிகரமாக வழங்கப்பட்டது. உள்ளூர் விவசாயிகளிடம் வாங்கியதற்கு நன்றி!`,
    payment_received: ({ orderId, amount = '' }) =>
      `KisanSetu: ஆர்டர் ${orderId}க்கான கட்டணம் பெறப்பட்டது${amount !== '' ? ` — ₹${amount}` : ''}. நன்றி.`
  },
  hi: {
    order_placed: ({ orderId, customerName = 'ग्राहक', amount = '' }) =>
      `नमस्ते ${customerName}, आपका KisanSetu ऑर्डर ${orderId} दर्ज हो गया है${amount !== '' ? `. राशि ₹${amount}` : ''}. पुष्टि होने पर आपको सूचना मिलेगी।`,
    order_confirmed: ({ orderId }) =>
      `KisanSetu: आपका ऑर्डर ${orderId} किसान द्वारा पुष्टि कर दिया गया है। डिलीवरी शुरू होने पर आपको सूचना मिलेगी।`,
    out_for_delivery: ({ orderId, driverName = 'हमारे डिलीवरी ड्राइवर' }) =>
      `KisanSetu: आपका ऑर्डर ${orderId} ${driverName} के साथ डिलीवरी के लिए निकल चुका है। कृपया फोन पास रखें।`,
    delivered: ({ orderId }) =>
      `KisanSetu: आपका ऑर्डर ${orderId} सफलतापूर्वक डिलीवर हो गया है। स्थानीय किसानों से खरीदारी करने के लिए धन्यवाद!`,
    payment_received: ({ orderId, amount = '' }) =>
      `KisanSetu: ऑर्डर ${orderId} का भुगतान प्राप्त हो गया है${amount !== '' ? ` — ₹${amount}` : ''}. धन्यवाद।`
  }
};

const SUPPORTED_LANGUAGES = Object.keys(templates);
const SUPPORTED_EVENTS = Object.keys(templates.en);

function renderSms(event, language, data = {}) {
  const selectedLanguage = templates[language] ? language : 'en';
  const eventTemplate = templates[selectedLanguage][event];
  if (!eventTemplate) throw new Error(`Unsupported notification event: ${event}`);

  return { language: selectedLanguage, event, body: eventTemplate(data) };
}

module.exports = { templates, SUPPORTED_LANGUAGES, SUPPORTED_EVENTS, renderSms };
