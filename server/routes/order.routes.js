const express = require('express');
const router = express.Router();
const { 
  placeOrder, 
  getMyOrders, 
  getOrderById, 
  updateOrderStatus, 
  getOrderStats,
  disputeOrder,
  resolveDispute,
  streamOrders
} = require('../controllers/order.controller');
const { orderValidation, validate } = require('../middleware/validation');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/', authenticateToken, authorizeRoles('consumer', 'buyer'), orderValidation, validate, placeOrder);
router.get('/stream', authenticateToken, streamOrders);
router.get('/my-orders', authenticateToken, getMyOrders);
router.get('/stats/summary', authenticateToken, authorizeRoles('admin'), getOrderStats);
router.get('/:id', authenticateToken, getOrderById);
router.put('/:id/status', authenticateToken, authorizeRoles('farmer', 'fpo', 'admin', 'logistics', 'driver'), updateOrderStatus);
router.put('/:id/dispute', authenticateToken, disputeOrder);
router.put('/:id/resolve', authenticateToken, authorizeRoles('admin'), resolveDispute);

module.exports = router;
