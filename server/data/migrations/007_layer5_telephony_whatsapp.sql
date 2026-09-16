-- 007_layer5_telephony_whatsapp.sql
-- Layer 5 M4: IVR Analytics, Call Recordings & WhatsApp Business Bot

ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS outcome VARCHAR(50) DEFAULT 'COMPLETED';

CREATE TABLE IF NOT EXISTS ivr_recordings (
    id SERIAL PRIMARY KEY,
    recording_sid VARCHAR(255),
    call_sid VARCHAR(255),
    caller_phone VARCHAR(50),
    title VARCHAR(255),
    language VARCHAR(10) DEFAULT 'ta',
    audio_url TEXT,
    duration VARCHAR(50),
    duration_seconds INTEGER DEFAULT 0,
    transcription TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    message_sid VARCHAR(255),
    from_phone VARCHAR(50) NOT NULL,
    to_phone VARCHAR(50),
    body TEXT,
    media_url TEXT,
    direction VARCHAR(20) DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
    command_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'delivered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ivr_logs_caller ON ivr_logs(caller_phone);
CREATE INDEX IF NOT EXISTS idx_ivr_logs_language ON ivr_logs(language);
CREATE INDEX IF NOT EXISTS idx_ivr_logs_created ON ivr_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_from ON whatsapp_messages(from_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_created ON whatsapp_messages(created_at);
