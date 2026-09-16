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
    const baseUrl = process.env.PUBLIC_URL || 'https://4da9c3d270a7b0.lhr.life';

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const audioUrl = `${baseUrl}/audio/tamil_greeting_kavitha.wav`;

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=ta&amp;phone=${cleanPhone.slice(-10)}" numDigits="1" method="POST" timeout="14">
    <Play>${audioUrl}</Play>
    <Say voice="Polly.Valluvar" language="ta-IN">வணக்கம்! கிசான் சேது குரல் சேவைக்கு நல்வரவு. பயிர் விற்பனை செய்ய 1 ஐ அழுத்தவும். ஆர்டர்கள் மற்றும் வருமானத்தை அறிய 2 ஐ அழுத்தவும். பயிர் மருத்துவருக்கு 3 ஐ அழுத்தவும்.</Say>
  </Gather>
  <Say voice="Polly.Valluvar" language="ta-IN">வணக்கம்! கிசான் சேது குரல் சேவைக்கு நல்வரவு. பயிர் விற்பனை செய்ய 1 ஐ அழுத்தவும். ஆர்டர்கள் மற்றும் வருமானத்தை அறிய 2 ஐ அழுத்தவும். பயிர் மருத்துவருக்கு 3 ஐ அழுத்தவும்.</Say>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=MENU&amp;lang=ta&amp;phone=${cleanPhone.slice(-10)}" numDigits="1" method="POST" timeout="10">
    <Play>${audioUrl}</Play>
    <Say voice="Polly.Valluvar" language="ta-IN">பயிர் விற்பனை செய்ய 1, ஆர்டர்களுக்கு 2, பயிர் மருத்துவருக்கு 3 அழுத்தவும்.</Say>
  </Gather>
  <Say voice="Polly.Valluvar" language="ta-IN">கிசான் சேது சேவைக்கு நன்றி! வணக்கம்.</Say>
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
