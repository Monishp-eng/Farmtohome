const express = require('express');
const router = express.Router();
const { chat, diagnose, updateConfig, getStatus } = require('../controllers/copilot.controller');

router.post('/chat', chat);
router.post('/diagnose', diagnose);
router.post('/config', updateConfig);
router.get('/status', getStatus);

module.exports = router;
