const express = require('express');
const router = express.Router();
const {
  releaseEscrow,
  getFarmerLedger,
  getPayoutStats
} = require('../controllers/payout.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/release/:orderId', authenticateToken, authorizeRoles('admin', 'logistics', 'driver'), releaseEscrow);
router.post('/release', authenticateToken, authorizeRoles('admin', 'logistics', 'driver'), releaseEscrow);
router.get('/farmer/ledger', authenticateToken, authorizeRoles('farmer', 'fpo', 'admin'), getFarmerLedger);
router.get('/admin/stats', authenticateToken, authorizeRoles('admin'), getPayoutStats);

module.exports = router;
