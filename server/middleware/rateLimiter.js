const rateLimit = require('express-rate-limit');

// Strict limiter for authentication & OTP endpoints to prevent brute-force & spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication or OTP requests from this IP, please try again after 15 minutes'
  }
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requests per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded, please slow down your requests'
  }
});

// Telephony IVR webhook limiter (Twilio calls)
const ivrLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many IVR requests'
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  ivrLimiter
};
