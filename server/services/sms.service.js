/**
 * Production SMS Gateway Integration Service
 * Supports:
 * - Twilio SMS Gateway (Real SMS to verified mobile)
 * - MSG91 / DLT Provider
 * - In-Memory Gateway for Testing & Hackathon Demos
 */
require('dotenv').config();

class SMSService {
  constructor() {
    this.deliveryLogs = [];
  }

  /**
   * Dispatch an SMS message to a 10-digit Indian phone number
   * @param {string} toPhone - 10-digit mobile number (e.g. "7989998568")
   * @param {string} messageText - SMS message content
   * @param {object} options - { templateName, dltId, metadata }
   */
  async sendSMS(toPhone, messageText, options = {}) {
    const cleanPhone = (toPhone || '').replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      console.warn(`[SMS Service] Invalid phone number provided: ${toPhone}`);
      return { success: false, message: 'Invalid 10-digit phone number' };
    }

    const provider = process.env.SMS_PROVIDER || (process.env.TWILIO_ACCOUNT_SID ? 'twilio' : 'simulation');
    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const logEntry = {
      messageId,
      toPhone: cleanPhone,
      text: messageText,
      templateName: options.templateName || 'GENERAL',
      provider: provider,
      status: 'QUEUED',
      timestamp
    };

    // 1. Twilio SMS Gateway Integration (Real SMS)
    if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;
        const fullToPhone = `+91${cleanPhone}`;

        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', fullToPhone);
        params.append('From', fromNumber);
        params.append('Body', messageText);

        console.log(`[Twilio SMS -> ${fullToPhone}]: "${messageText.substring(0, 60)}..."`);

        const response = await globalThis.fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        const twilioData = await response.json();
        logEntry.providerResponse = twilioData;
        logEntry.status = response.ok ? 'DELIVERED (TWILIO)' : 'FAILED';
        if (!response.ok) {
          console.warn(`[Twilio SMS Warning]: ${twilioData.message}`);
        } else {
          console.log(`[Twilio SMS Sent]: SID ${twilioData.sid} -> ${fullToPhone}`);
        }
      } catch (err) {
        console.error('[SMS Service Twilio Error]:', err.message);
        logEntry.status = 'FALLBACK_SIMULATED';
      }
    }

    // 2. MSG91 Integration
    else if (provider === 'msg91' && process.env.OTP_API_KEY) {
      try {
        const response = await globalThis.fetch('https://api.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: {
            'authkey': process.env.OTP_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            template_id: options.dltId || process.env.DLT_TEMPLATE_ID,
            short_url: '0',
            recipients: [{ mobiles: `91${cleanPhone}`, message: messageText }]
          })
        });
        const resData = await response.json();
        logEntry.providerResponse = resData;
        logEntry.status = response.ok ? 'DELIVERED (MSG91)' : 'FAILED';
      } catch (err) {
        console.error('[SMS Service MSG91 Error]:', err.message);
        logEntry.status = 'FALLBACK_SIMULATED';
      }
    }

    // 3. Fallback simulation
    else {
      logEntry.status = 'DELIVERED (SIMULATED)';
      console.log(`[SMS Simulation -> +91-${cleanPhone}]: "${messageText}"`);
    }

    this.deliveryLogs.unshift(logEntry);
    if (this.deliveryLogs.length > 200) this.deliveryLogs.pop();

    return {
      success: true,
      messageId,
      status: logEntry.status,
      provider: provider,
      recipient: cleanPhone
    };
  }

  getRecentLogs(limit = 20) {
    return this.deliveryLogs.slice(0, limit);
  }
}

module.exports = new SMSService();
