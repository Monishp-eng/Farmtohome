const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentByOrder
} = require('../controllers/payment.controller');
const { authenticateToken } = require('../middleware/auth');
const { paymentCreateValidation, paymentVerifyValidation, validate } = require('../middleware/validation');

router.post('/create-order', authenticateToken, paymentCreateValidation, validate, createOrder);
router.post('/verify', authenticateToken, paymentVerifyValidation, validate, verifyPayment);
router.post('/webhook', handleWebhook);
router.get('/order/:orderId', authenticateToken, getPaymentByOrder);

module.exports = router;
