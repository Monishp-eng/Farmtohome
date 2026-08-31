const express = require('express');
const router = express.Router();
const { getDemandForecast, predictDemand, optimizeRouteProxy, getPriceRecommendation } = require('../controllers/ai.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/demand-forecast', getDemandForecast);
router.post('/predict-demand', predictDemand);
router.post('/optimize-route', optimizeRouteProxy);
router.get('/price-recommendation/:productId', getPriceRecommendation);

module.exports = router;
