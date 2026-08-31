const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, getUserStats, sendOtp, verifyOtp } = require('../controllers/auth.controller');
const { registerValidation, loginValidation, validate } = require('../middleware/validation');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/users/stats', authenticateToken, authorizeRoles('admin'), getUserStats);

module.exports = router;
