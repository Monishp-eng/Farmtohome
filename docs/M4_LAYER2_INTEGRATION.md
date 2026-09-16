# M4 Layer 2 Integration

This version combines the team FarmtoHome application with M4 Layer 2 notification work.

## Added
- Multilingual notification templates: English, Tamil, Hindi.
- Reusable notification orchestrator for SMS + FCM.
- Firebase Cloud Messaging service with demo mode.
- Notification API under `/api/notifications`.
- FCM token and notification-language fields on users.
- Order lifecycle integration for placed, confirmed, out-for-delivery, delivered and payment-received events.
- Existing `server/services/sms.service.js` remains the SMS gateway and is reused; it was not duplicated.

## Configuration

The existing Twilio variables remain in `server/.env`.

For FCM:
```env
FCM_DEMO_MODE=true
# For real Firebase:
# FCM_DEMO_MODE=false
# FIREBASE_SERVICE_ACCOUNT_JSON={...}
# or FIREBASE_SERVICE_ACCOUNT_FILE=/absolute/path/service-account.json
```

FCM demo mode is enabled by default so the backend can run without Firebase credentials.

## API
- `POST /api/notifications/order`
- `POST /api/notifications/sms/test`
- `POST /api/notifications/push`
- `POST /api/notifications/token` (authenticated)

## Local setup
```bash
cd server
npm install
npm start
```

The project already uses CommonJS, so M4 code was integrated using `require/module.exports` rather than creating a second ESM server.

## Git workflow
Work on a feature branch such as:
```bash
git checkout -b feature/m4-layer2
```
Then:
```bash
git add .
git commit -m "feat: complete M4 layer 2 notification integration"
git push -u origin feature/m4-layer2
```
