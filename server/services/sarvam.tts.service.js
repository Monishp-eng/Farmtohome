/**
 * Sarvam AI Text-to-Speech (Bulbul v3) & Speech-to-Text (Saaras v3) Service
 * High quality Indian language Voice AI for farmers
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

class SarvamService {
  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY;
    this.ttsEndpoint = 'https://api.sarvam.ai/text-to-speech';
    this.sttEndpoint = 'https://api.sarvam.ai/speech-to-text';
  }

  /**
   * Convert text to speech audio file and return the public URL (cached)
   * @param {string} text - Text to speak
   * @param {string} langCode - Language code (ta-IN, hi-IN, en-IN)
   * @param {string} [speaker] - Voice name (default: auto-selected per language)
   * @returns {Promise<string|null>} Public URL to the audio file
   */
  async generateAudio(text, langCode = 'ta-IN', speaker) {
    if (!this.apiKey) {
      console.warn('[Sarvam TTS] No API key configured');
      return null;
    }

    // Pick natural-sounding speakers compatible with Bulbul v3
    if (!speaker) {
      if (langCode === 'ta-IN') speaker = 'kavitha';
      else if (langCode === 'hi-IN') speaker = 'priya';
      else speaker = 'priya';
    }

    // Cache key based on text + lang + speaker
    const hash = crypto.createHash('md5').update(`${text}_${langCode}_${speaker}`).digest('hex');
    const filename = `${hash}.wav`;
    const filepath = path.join(AUDIO_DIR, filename);

    // Return cached file if exists
    if (fs.existsSync(filepath)) {
      const baseUrl = process.env.PUBLIC_URL;
      return `${baseUrl}/audio/${filename}`;
    }

    try {
      const response = await globalThis.fetch(this.ttsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': this.apiKey
        },
        body: JSON.stringify({
          inputs: [text],
          target_language_code: langCode,
          model: 'bulbul:v3',
          speaker: speaker
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Sarvam TTS Error] ${response.status}: ${errText}`);
        return null;
      }

      const data = await response.json();
      if (data.audios && data.audios[0]) {
        const audioBuffer = Buffer.from(data.audios[0], 'base64');
        fs.writeFileSync(filepath, audioBuffer);
        console.log(`[Sarvam TTS] Generated: ${filename} (${langCode}, ${text.substring(0, 40)}...)`);
        
        const baseUrl = process.env.PUBLIC_URL;
        return `${baseUrl}/audio/${filename}`;
      }

      console.warn('[Sarvam TTS] No audio in response');
      return null;
    } catch (err) {
      console.error('[Sarvam TTS Error]:', err.message);
      return null;
    }
  }

  /**
   * Transcribe audio buffer using Sarvam AI Saaras v3
   * @param {Buffer} audioBuffer - Audio buffer (WAV/MP3)
   * @param {string} langCode - Language code (ta-IN, hi-IN, en-IN)
   * @returns {Promise<string|null>} Transcribed text in the target language
   */
  async transcribeAudio(audioBuffer, langCode = 'ta-IN') {
    if (!this.apiKey) {
      console.warn('[Sarvam STT] No API key configured');
      return null;
    }

    try {
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('file', blob, 'audio.wav');
      formData.append('model', 'saaras:v3');
      if (langCode) {
        formData.append('language_code', langCode);
      }

      const response = await globalThis.fetch(this.sttEndpoint, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey
        },
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Sarvam STT Error] ${response.status}: ${errText}`);
        return null;
      }

      const data = await response.json();
      console.log(`[Sarvam STT Transcript] (${langCode}): "${data.transcript}"`);
      return data.transcript || null;
    } catch (err) {
      console.error('[Sarvam STT Exception]:', err.message);
      return null;
    }
  }

  /**
   * Download a Twilio recording and transcribe it with Sarvam AI
   * @param {string} recordingUrl - Twilio recording URL
   * @param {string} langCode - Language code (ta-IN, hi-IN, en-IN)
   * @returns {Promise<string|null>} Transcript
   */
  async transcribeTwilioRecording(recordingUrl, langCode = 'ta-IN') {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const url = recordingUrl.endsWith('.wav') ? recordingUrl : `${recordingUrl}.wav`;
      console.log(`[Twilio Recording Fetch] Downloading ${url}...`);

      const res = await globalThis.fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (!res.ok) {
        console.error(`[Twilio Recording Fetch Error] HTTP ${res.status}`);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return await this.transcribeAudio(buffer, langCode);
    } catch (err) {
      console.error('[Twilio Recording Transcribe Error]:', err.message);
      return null;
    }
  }
}

module.exports = new SarvamService();
