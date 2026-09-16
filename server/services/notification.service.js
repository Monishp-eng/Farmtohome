/**
 * M4 Layer 2 Notification Orchestrator
 * Reuses the project's existing SMS gateway and adds Firebase Cloud Messaging.
 */
const smsService = require('./sms.service');
const { renderSms, SUPPORTED_EVENTS, SUPPORTED_LANGUAGES } = require('../templates/sms.templates');
const { sendPush } = require('./fcm.service');

const eventTitles = {
  order_placed: 'KisanSetu Order Placed',
  order_confirmed: 'KisanSetu Order Confirmed',
  out_for_delivery: 'KisanSetu Out for Delivery',
  delivered: 'KisanSetu Order Delivered',
  payment_received: 'KisanSetu Payment Received'
};

async function notifyOrderEvent({
  event,
  phone,
  language = 'en',
  pushToken,
  orderId,
  customerName,
  amount,
  driverName,
  smsOptions = {}
}) {
  const rendered = renderSms(event, language, {
    orderId,
    customerName,
    amount,
    driverName
  });

  const result = { event, orderId, language: rendered.language, sms: null, push: null };

  if (phone) {
    result.sms = await smsService.sendSMS(phone, rendered.body, {
      ...smsOptions,
      templateName: event.toUpperCase()
    });
  }

  if (pushToken) {
    result.push = await sendPush({
      token: pushToken,
      title: eventTitles[event] || 'KisanSetu Notification',
      body: rendered.body,
      data: { event, orderId }
    });
  }

  if (!phone && !pushToken) {
    throw new Error('At least one delivery target is required: phone or pushToken');
  }

  return result;
}

module.exports = {
  notifyOrderEvent,
  SUPPORTED_EVENTS,
  SUPPORTED_LANGUAGES
};
