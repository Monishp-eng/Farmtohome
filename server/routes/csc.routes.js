const express = require('express');
const router = express.Router();
const { onboardFarmer, listProduce, getKioskStats } = require('../controllers/csc.controller');

// Common Service Center (CSC) Kisan Mitra Routes
router.post('/farmer-onboard', onboardFarmer);
router.post('/list-produce', listProduce);
router.get('/kiosk-stats', getKioskStats);

module.exports = router;
