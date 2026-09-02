const express = require('express');
const router = express.Router();
const { 
  assignDelivery, 
  getMyDeliveries, 
  verifyFarmerBank,
  updateDeliveryStatus, 
  optimizeRoute 
} = require('../controllers/logistics.controller');
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');

router.post('/assign', authenticateToken, authorizeRoles('admin', 'logistics'), assignDelivery);
router.get('/my-deliveries', authenticateToken, authorizeRoles('logistics', 'admin', 'driver'), getMyDeliveries);
router.post('/verify-farmer-bank', authenticateToken, authorizeRoles('logistics', 'admin', 'driver'), verifyFarmerBank);
router.post('/optimize-route', authenticateToken, authorizeRoles('logistics', 'admin'), optimizeRoute);
router.put('/:id/status', authenticateToken, authorizeRoles('logistics', 'admin', 'driver'), updateDeliveryStatus);

module.exports = router;
