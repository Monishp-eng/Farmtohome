const express = require('express');
const router = express.Router();
const { handleIncomingWhatsApp, getWhatsAppLogs } = require('../controllers/whatsapp.controller');

// Webhook for Twilio Sandbox and Web Simulator
router.post('/webhook', handleIncomingWhatsApp);

// Audit logs
router.get('/logs', getWhatsAppLogs);

module.exports = router;
