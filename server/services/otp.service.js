/**
 * OTP (One Time Password) Verification Service for Rural Farmers & Consumers
 * Supports SMS delivery, IVR DTMF voice readback, and 5-minute expiry security.
 */

const smsService = require('./sms.service');

class OTPService {
  constructor() {
    // In-memory OTP storage map: phone -> { code, expiresAt, verified, attempts }
    this.otpStore = new Map();
  }

  /**
   * Generate a 4-digit or 6-digit numeric OTP token
   * @param {string} phone - 10-digit mobile number
   * @param {string} purpose - 'REGISTRATION', 'LOGIN', 'ORDER_VERIFICATION', 'IVR_ONBOARDING'
   * @returns {{otp: string, expiresAt: Date}}
   */
  generateOTP(phone, purpose = 'REGISTRATION') {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    
    // Generate secure 4-digit numeric code (e.g. 4829)
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    this.otpStore.set(cleanPhone, {
      code,
      expiresAt,
      purpose,
      verified: false,
      attempts: 0,
      createdAt: new Date()
    });

    return { otp: code, expiresAt };
  }

  /**
   * Dispatch OTP via SMS to farmer's phone
   */
  async sendOTP(phone, purpose = 'REGISTRATION') {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    const { otp, expiresAt } = this.generateOTP(cleanPhone, purpose);

    const smsText = `Kisan Seva: Aapka verification OTP hai ${otp}. Yeh code 5 minute ke liye valid hai. Kripya kisi ke sath share na karein.`;
    
    const smsResult = await smsService.sendSMS(cleanPhone, smsText, {
      templateName: 'OTP_VERIFICATION',
      dltId: 'DLT_OTP_1001'
    });

    const isProduction = process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_OTP !== 'true';

    return {
      success: true,
      phone: cleanPhone,
      // Only include raw OTP in development/test mode or when explicitly allowed
      ...(isProduction ? {} : { otp }),
      expiresAt,
      smsStatus: smsResult.status
    };
  }

  /**
   * Verify an OTP entered by the user via SMS, Web, or IVR DTMF Keypad
   * @param {string} phone 
   * @param {string} inputCode 
   * @returns {{valid: boolean, message: string}}
   */
  verifyOTP(phone, inputCode) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    const record = this.otpStore.get(cleanPhone);
    const allowDemoKey = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_OTP === 'true';

    if (!record) {
      // Default fallback demo verification for development and testing only
      if (allowDemoKey && (inputCode === '1234' || inputCode === '0000')) {
        return { valid: true, message: 'OTP verified successfully (Demo Master Key)' };
      }
      return { valid: false, message: 'No OTP requested for this phone number or expired' };
    }

    if (new Date() > record.expiresAt) {
      this.otpStore.delete(cleanPhone);
      return { valid: false, message: 'OTP has expired. Please request a new code.' };
    }

    if (record.attempts >= 5) {
      this.otpStore.delete(cleanPhone);
      return { valid: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    record.attempts += 1;

    // Direct match or master demo key (only in non-production/demo mode)
    const isDirectMatch = record.code === String(inputCode).trim();
    const isDemoMatch = allowDemoKey && (inputCode === '1234' || inputCode === '0000');

    if (isDirectMatch || isDemoMatch) {
      record.verified = true;
      return { valid: true, message: 'OTP verified successfully' };
    }

    return { valid: false, message: 'Invalid OTP code. Please try again.' };
  }

  /**
   * Check if phone was recently verified
   */
  isPhoneVerified(phone) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    const record = this.otpStore.get(cleanPhone);
    return Boolean(record && record.verified);
  }
}

module.exports = new OTPService();
