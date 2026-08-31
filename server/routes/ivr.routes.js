const express = require('express');
const router = express.Router();
const { 
  handleVoiceAI, 
  handleDialogueCall,
  handleIncomingSMS, 
  handleMissedCall, 
  handleUSSD, 
  handleIVRAction, 
  getDialphoneLogs,
  triggerOutboundCall
} = require('../controllers/ivr.controller');
const handleTwilioGather = require('../controllers/twilio.webhook');

// 1. Natural Voice AI & Conversational Phone Call
router.post('/voice-ai', handleVoiceAI);
router.post('/dialogue-call', handleDialogueCall);
router.post('/trigger-outbound-call', triggerOutboundCall);

// Interactive Live Twilio Gather Webhook (Handles DTMF over actual phone calls)
router.all('/twilio-gather', handleTwilioGather);

// 2. 2-Way SMS Gateway (56161)
router.post('/sms', handleIncomingSMS);

// 3. Zero-Airtime Missed-Call Gateway
router.post('/missed-call', handleMissedCall);

// 4. Zero-Data GSM USSD (*561#)
router.post('/ussd', handleUSSD);

// 5. 2G DTMF Keypad IVR (1800-547-2600)
router.post('/call', handleIVRAction);

// 6. Live Activity & Delivery Logs
router.get('/logs', getDialphoneLogs);

module.exports = router;
