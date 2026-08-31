require('dotenv').config();
const smsService = require('./services/sms.service');
const voiceService = require('./services/voiceCall.service');

async function testTwilio() {
  console.log('Testing Twilio Live Integration...');
  console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID);
  console.log('From Number:', process.env.TWILIO_PHONE_NUMBER);

  // We can test sending an SMS
  const testPhone = '9876543210'; // or farmer number
  console.log('\n1. Sending Test SMS...');
  const res = await smsService.sendSMS(testPhone, 'Namaste! KisanSetu marketplace testing message.');
  console.log('SMS Result:', res);
}

testTwilio();
