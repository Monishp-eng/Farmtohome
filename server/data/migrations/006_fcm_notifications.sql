-- ==============================================================================
-- 🌾 KisanSetu — Migration 006: Add FCM push token & notification language to users
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_language VARCHAR(10) DEFAULT 'en';
