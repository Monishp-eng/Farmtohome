/**
 * Twilio Interactive Voice Calling Service
 * Uses Sarvam AI Bulbul v3 TTS audio for natural Indian voice experience
 */
const fetch = require('node-fetch');

class VoiceCallService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async makeVoiceCall(toPhone) {
    const accountSid = this.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = this.authToken || process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = this.fromNumber || process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.log(`[Simulated Voice Call -> ${toPhone}]`);
      return { success: true, simulated: true };
    }

    const cleanPhone = toPhone.startsWith('+') ? toPhone : `+91${toPhone.replace(/[^0-9]/g, '').slice(-10)}`;
    const baseUrl = process.env.PUBLIC_URL;

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      // TwiML with fallback: speaks Indic greeting and menu
      // If baseUrl is provided and responsive, gather routes to webhook; otherwise completes cleanly
      const gatherAction = baseUrl && !baseUrl.includes('lhr.life') ? ` action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=ta&amp;phone=${cleanPhone.slice(-10)}"` : '';
      const redirectTag = baseUrl && !baseUrl.includes('lhr.life') ? `<Redirect method="POST">${baseUrl}/api/ivr/twilio-gather?step=LANG&amp;lang=ta&amp;phone=${cleanPhone.slice(-10)}</Redirect>` : '';

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather${gatherAction} numDigits="1" timeout="10">
    <Say language="ta-IN">வணக்கம்! கிசான் சேது நேரடி விவசாயி உதவி மையத்திற்கு நல்வரவு. உங்கள் விளைச்சலை விற்க ஒன்று அழுத்தவும். இன்றைய மண்டி விலை நிலவரம் அறிய இரண்டு அழுத்தவும். உங்கள் ஆர்டர்கள் மற்றும் வருமானம் பார்க்க மூன்று அழுத்தவும். பயிர் மருத்துவர் ஆலோசனைக்கு நான்கு அழுத்தவும்.</Say>
  </Gather>
  <Say language="ta-IN">நன்றி! உங்கள் அழைப்பு பதிவு செய்யப்பட்டது. சந்தை தகவல் SMS மூலம் உங்கள் தொலைபேசிக்கு அனுப்பப்பட்டுள்ளது. கிசான் சேது நேரடி உழவர் சேவைக்கு நன்றி! வணக்கம்.</Say>
  ${redirectTag}
</Response>`;

      const params = new URLSearchParams();
      params.append('To', cleanPhone);
      params.append('From', fromNumber);
      params.append('Twiml', twiml);

      console.log(`[Initiating Twilio Voice Call] From: ${fromNumber} -> To: ${cleanPhone}`);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`[Twilio Voice Call Success -> ${cleanPhone}] SID: ${data.sid}, Status: ${data.status}`);
        return { success: true, callSid: data.sid, status: data.status, simulated: false };
      } else {
        console.warn(`[Twilio Voice Call Warning]:`, data.message);
        return { success: false, message: data.message, simulated: false };
      }
    } catch (err) {
      console.error('[Twilio Voice Call Error]:', err.message);
      return { success: false, error: err.message, simulated: false };
    }
  }
}

module.exports = new VoiceCallService();
