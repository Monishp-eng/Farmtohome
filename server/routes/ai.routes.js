const express = require('express');
const router = express.Router();
const multer = require('multer');

// Memory storage for fast forwarding to AI Microservice
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const { 
  getDemandForecast, 
  predictDemand, 
  optimizeRouteProxy, 
  diagnoseCrop,
  getModelInfo,
  triggerRetrain,
  getBuyerPreferences,
  getPriceRecommendation 
} = require('../controllers/ai.controller');

router.get('/demand-forecast', getDemandForecast);
router.post('/predict-demand', predictDemand);
router.post('/optimize-route', optimizeRouteProxy);
router.post('/diagnose', upload.single('file'), diagnoseCrop);
router.get('/model-info', getModelInfo);
router.post('/retrain', triggerRetrain);
router.get('/buyer-preferences/:buyerId', getBuyerPreferences);
router.get('/price-recommendation/:productId', getPriceRecommendation);

module.exports = router;
