/**
 * Business & Fraud Validators for Voice Agent
 */

class Validators {
  /**
   * Validate Indian Mobile Number (10 digits starting with 6, 7, 8, 9)
   */
  static validateMobileNumber(text) {
    if (!text) return null;
    
    // Extract any 10-digit sequence
    const digits = text.toString().replace(/\D/g, '');
    
    // Handle country code +91 or 91
    if (digits.length === 12 && digits.startsWith('91')) {
      const actual = digits.substring(2);
      if (/^[6-9]\d{9}$/.test(actual)) return actual;
    }

    if (digits.length === 11 && digits.startsWith('0')) {
      const actual = digits.substring(1);
      if (/^[6-9]\d{9}$/.test(actual)) return actual;
    }

    // Match last 10 digits if valid
    if (digits.length >= 10) {
      const match = digits.match(/[6-9]\d{9}/);
      if (match) return match[0];
    }

    return null;
  }

  /**
   * Normalize and validate Quantity & Unit
   */
  static normalizeQuantity(quantity, unit) {
    if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
      return null;
    }

    const num = Number(quantity);
    if (num <= 0) return null;

    let normalizedUnit = 'kg';
    const u = (unit || '').toLowerCase().trim();

    if (u.includes('tonne') || u.includes('ton') || u.includes('டன்') || u.includes('टन')) {
      normalizedUnit = 'tonne';
    } else if (u.includes('quintal') || u.includes('குவிண்டால்') || u.includes('क्विंटल')) {
      normalizedUnit = 'quintal';
    } else if (u.includes('bag') || u.includes('மூட்டை') || u.includes('बोरी')) {
      normalizedUnit = 'bag';
    } else if (u.includes('box') || u.includes('பெட்டி') || u.includes('पेटी')) {
      normalizedUnit = 'box';
    } else {
      normalizedUnit = 'kg';
    }

    return {
      quantity: num,
      unit: normalizedUnit
    };
  }

  /**
   * Normalize Price
   */
  static normalizePrice(price) {
    if (price === undefined || price === null || price === 'skip' || price === 'null' || price === '') {
      return null;
    }
    const num = Number(price);
    if (isNaN(num) || num < 0) return null;
    return num;
  }

  /**
   * Fraud Risk Evaluation
   * Detects abnormal patterns that warrant REVIEW_REQUIRED
   */
  static assessRisk(farmerData, listingData, failedOtpAttempts = 0) {
    let riskStatus = 'NORMAL';
    const flags = [];

    // Flag 1: Failed OTP attempts
    if (failedOtpAttempts >= 3) {
      flags.push('HIGH_FAILED_OTP_ATTEMPTS');
      riskStatus = 'REVIEW_REQUIRED';
    }

    // Flag 2: Abnormally massive quantity (e.g. > 10,000 tonnes or > 1,000,000 kg)
    if (listingData?.unit === 'tonne' && listingData?.quantity > 500) {
      flags.push('ABNORMAL_LARGE_QUANTITY_TONNES');
      riskStatus = 'REVIEW_REQUIRED';
    }
    if (listingData?.unit === 'kg' && listingData?.quantity > 500000) {
      flags.push('ABNORMAL_LARGE_QUANTITY_KG');
      riskStatus = 'REVIEW_REQUIRED';
    }

    // Flag 3: Suspicious price anomaly (e.g. ₹10000 per kg for tomato/potato)
    if (listingData?.expected_price && listingData?.expected_price > 5000 && listingData?.unit === 'kg') {
      flags.push('UNREALISTIC_HIGH_PRICE');
      riskStatus = 'REVIEW_REQUIRED';
    }

    return {
      riskStatus,
      flags
    };
  }
}

module.exports = Validators;
