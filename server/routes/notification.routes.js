const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  notifyOrderEvent,
  SUPPORTED_EVENTS,
  SUPPORTED_LANGUAGES
} = require('../services/notification.service');
const { sendPush } = require('../services/fcm.service');
const smsService = require('../services/sms.service');
const db = require('../config/database');

const router = express.Router();

router.post('/order', async (req, res) => {
  try {
    const {
      event, phone, language = 'en', pushToken, orderId,
      customerName, amount, driverName
    } = req.body;

    if (!SUPPORTED_EVENTS.includes(event)) {
      return res.status(400).json({ success: false, message: 'Invalid event', supportedEvents: SUPPORTED_EVENTS });
    }
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, message: 'Invalid language', supportedLanguages: SUPPORTED_LANGUAGES });
    }
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' });

    const result = await notifyOrderEvent({
      event, phone, language, pushToken, orderId, customerName, amount, driverName
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Notification failed' });
  }
});

router.post('/sms/test', async (req, res) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) return res.status(400).json({ success: false, message: 'to and body are required' });
    res.json(await smsService.sendSMS(to, body, { templateName: 'M4_TEST' }));
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/push', async (req, res) => {
  try {
    const { token, title, body, data = {} } = req.body;
    res.json(await sendPush({ token, title, body, data }));
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/token', authenticateToken, (req, res) => {
  try {
    const { fcm_token, language = 'en' } = req.body;
    if (!fcm_token) return res.status(400).json({ success: false, message: 'fcm_token is required' });
    db.prepare('UPDATE users SET fcm_token = ?, notification_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(fcm_token, language, req.user.id);
    res.json({ success: true, message: 'FCM token registered' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
