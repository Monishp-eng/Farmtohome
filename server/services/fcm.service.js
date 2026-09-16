/**
 * M4 Layer 2 Firebase Cloud Messaging service.
 *
 * FCM_DEMO_MODE=true (default) keeps local development credential-free.
 * Set FCM_DEMO_MODE=false and provide FIREBASE_SERVICE_ACCOUNT_JSON
 * or FIREBASE_SERVICE_ACCOUNT_FILE for real push delivery.
 */
const fs = require('fs');
let admin = null;
let initialized = false;

function initFirebase() {
  if (initialized) return true;

  if (String(process.env.FCM_DEMO_MODE || 'true').toLowerCase() === 'true') {
    return false;
  }

  if (!admin) {
    admin = require('firebase-admin');
  }

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_FILE) {
    const raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8');
    credential = admin.credential.cert(JSON.parse(raw));
  } else {
    throw new Error(
      'Firebase credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_FILE.'
    );
  }

  admin.initializeApp({ credential });
  initialized = true;
  return true;
}

async function sendPush({ token, title, body, data = {} }) {
  if (!token || !title || !body) {
    throw new Error('Push notification requires token, title and body');
  }

  const demo = String(process.env.FCM_DEMO_MODE || 'true').toLowerCase() === 'true';
  if (demo) {
    return {
      success: true,
      mode: 'demo',
      messageId: `demo_fcm_${Date.now()}`,
      token,
      title,
      body,
      data
    };
  }

  initFirebase();

  const messageId = await admin.messaging().send({
    token,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]))
  });

  return { success: true, mode: 'fcm', messageId };
}

module.exports = { sendPush };
