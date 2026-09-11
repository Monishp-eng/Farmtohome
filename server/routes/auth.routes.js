const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  updateBankDetails, 
  getUserStats, 
  sendOtp, 
  verifyOtp 
} = require('../controllers/auth.controller');
const { 
  registerValidation, 
  loginValidation, 
  otpSendValidation, 
  otpVerifyValidation, 
  bankDetailsValidation, 
  validate 
} = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Auth endpoints with brute-force rate-limiting and input validation
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/send-otp', authLimiter, otpSendValidation, validate, sendOtp);
router.post('/verify-otp', authLimiter, otpVerifyValidation, validate, verifyOtp);

// Authenticated user profile and direct bank registry
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/bank-details', authenticateToken, bankDetailsValidation, validate, updateBankDetails);

// Administrative stats
router.get('/users/stats', authenticateToken, authorizeRoles('admin'), getUserStats);

module.exports = router;
