const express = require('express');
const router = express.Router();
const { getMarketPrices, getMspData, comparePrice, getPriceTrends, streamMarketPrices } = require('../controllers/market.controller');

router.get('/stream', streamMarketPrices);
router.get('/prices', getMarketPrices);
router.get('/msp', getMspData);
router.get('/comparison/:productName', comparePrice);
router.get('/trends/:commodity', getPriceTrends);

module.exports = router;
