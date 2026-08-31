const express = require('express');
const router = express.Router();
const { placeOrder, getMyOrders, getOrderById, updateOrderStatus, getOrderStats } = require('../controllers/order.controller');
const { orderValidation, validate } = require('../middleware/validation');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/', authenticateToken, authorizeRoles('consumer', 'buyer'), orderValidation, validate, placeOrder);
router.get('/my-orders', authenticateToken, getMyOrders);
router.get('/stats/summary', authenticateToken, authorizeRoles('admin'), getOrderStats);
router.get('/:id', authenticateToken, getOrderById);
router.put('/:id/status', authenticateToken, authorizeRoles('farmer', 'fpo', 'admin'), updateOrderStatus);

module.exports = router;
