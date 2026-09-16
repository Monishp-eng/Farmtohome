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
    <Say voice="Polly.Aditi" language="hi-IN">वणक्कम! किसानसेतु நேரடி சேவைக்கு நல்வரவு. फसल बेचने के लिए 1 दबाएं। மண்டி விலை அறிய 2 அழுத்தவும்। फसल डॉक्टर सलाह के लिए 3 दबाएं।</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="hi-IN">நன்றி! உங்கள் அழைப்பு பதிவு செய்யப்பட்டது. KisanSetu சந்தை தகவல் உங்கள் தொலைபேசிக்கு SMS அனுப்பப்பட்டுள்ளது. வணக்கம்!</Say>
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
