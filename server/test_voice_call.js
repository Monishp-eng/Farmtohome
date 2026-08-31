require('dotenv').config();
const voiceService = require('./services/voiceCall.service');

async function testCall() {
  console.log('Initiating interactive multilingual Voice Call to +91 79899 98568...');
  const res = await voiceService.makeVoiceCall('7989998568');
  console.log('Call Response:', res);
}

testCall();
