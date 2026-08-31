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
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.log(`[Simulated Voice Call -> ${toPhone}]`);
      return { success: true, simulated: true };
    }

    const cleanPhone = toPhone.startsWith('+') ? toPhone : `+91${toPhone.replace(/[^0-9]/g, '').slice(-10)}`;
    const baseUrl = process.env.PUBLIC_URL;

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      // The initial TwiML greets the farmer using Sarvam AI Indic voice and gathers language choice
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather action="${baseUrl}/api/ivr/twilio-gather?step=LANG" numDigits="1" method="POST" timeout="10">
    <Play>${baseUrl}/audio/0e513d449840835fadeb2201ec5afa9a.wav</Play>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">No button was pressed. Thank you for calling KisanSetu.</Say>
</Response>`;

      const params = new URLSearchParams();
      params.append('To', cleanPhone);
      params.append('From', this.fromNumber);
      params.append('Twiml', twiml);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`[Twilio Voice Call -> ${cleanPhone}] SID: ${data.sid}, Webhook: ${baseUrl}`);
        return { success: true, callSid: data.sid, status: data.status };
      } else {
        console.warn(`[Twilio Voice Call Warning]:`, data.message);
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error('[Twilio Voice Call Error]:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new VoiceCallService();
