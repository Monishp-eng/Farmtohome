/**
 * Sarvam AI Indian Multilingual Voice & Speech Service
 * Powers Saaras STT (telephony 8kHz speech-to-text) and Bulbul TTS (natural Indian voices)
 * across 22+ Indian languages.
 */

const fetch = require('node-fetch');

class SarvamService {
  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY || '';
    this.baseUrl = 'https://api.sarvam.ai';
    
    // ISO language code mapper for Sarvam
    this.langMap = {
      'ta': 'ta-IN',
      'hi': 'hi-IN',
      'mr': 'mr-IN',
      'te': 'te-IN',
      'kn': 'kn-IN',
      'en': 'en-IN',
      'bn': 'bn-IN',
      'gu': 'gu-IN',
      'ml': 'ml-IN',
      'pa': 'pa-IN'
    };
  }

  /**
   * Transcribe farmer voice audio via Sarvam Saaras STT
   * @param {Buffer|string} audioData - Audio buffer or base64 string
   * @param {string} language - 'ta', 'hi', 'mr', 'en', etc.
   */
  async speechToText(audioData, language = 'hi') {
    const langCode = this.langMap[language] || 'hi-IN';

    if (this.apiKey && this.apiKey !== 'your_sarvam_api_subscription_key') {
      try {
        const response = await fetch(`${this.baseUrl}/speech-to-text`, {
          method: 'POST',
          headers: {
            'api-subscription-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            audio: typeof audioData === 'string' ? audioData : audioData.toString('base64'),
            language_code: langCode,
            model: 'saaras:v4'
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            transcript: data.transcript || '',
            language: langCode,
            confidence: data.confidence || 0.95,
            source: 'SARVAM_SAARAS_V4'
          };
        }
      } catch (err) {
        console.warn('[Sarvam STT Warning]:', err.message);
      }
    }

    // Default simulation fallback
    return {
      success: true,
      transcript: '',
      language: langCode,
      source: 'SIMULATED_VOICE_CAPTURE'
    };
  }

  /**
   * Synthesize regional speech audio via Sarvam Bulbul TTS
   * @param {string} text - Spoken dialogue text
   * @param {string} language - 'ta', 'hi', 'mr', 'en'
   * @param {string} speakerGender - 'female' or 'male'
   */
  async textToSpeech(text, language = 'hi', speakerGender = 'female') {
    const langCode = this.langMap[language] || 'hi-IN';

    if (this.apiKey && this.apiKey !== 'your_sarvam_api_subscription_key') {
      try {
        const response = await fetch(`${this.baseUrl}/text-to-speech`, {
          method: 'POST',
          headers: {
            'api-subscription-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: [text],
            target_language_code: langCode,
            speaker: speakerGender === 'female' ? 'meera' : 'arvind',
            pitch: 0,
            pace: 1.0,
            loudness: 1.5,
            speech_sample_rate: 8000, // 8kHz standard telephony audio
            enable_preprocessing: true,
            model: 'bulbul:v4'
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            audioBase64: data.audios ? data.audios[0] : null,
            language: langCode,
            source: 'SARVAM_BULBUL_V4'
          };
        }
      } catch (err) {
        console.warn('[Sarvam TTS Warning]:', err.message);
      }
    }

    return {
      success: true,
      audioBase64: null,
      text,
      language: langCode,
      source: 'BROWSER_SPEECH_SYNTHESIS_FALLBACK'
    };
  }
}

module.exports = new SarvamService();
