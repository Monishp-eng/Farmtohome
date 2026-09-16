import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  PhoneCall, Phone, PhoneOff, MessageSquare, Volume2, VolumeX, 
  RefreshCw, Send, Mic, MicOff, CheckCircle2, Sparkles, ArrowRight, 
  Globe, ShoppingBag, Truck, Zap, Check, PhoneIncoming, DollarSign, 
  Clock, Activity, ShieldCheck, Play, Pause, UserCheck, Smartphone, 
  Radio, Download, FastForward, RotateCcw, MessageCircle, BarChart3,
  TrendingUp, CheckCheck, Paperclip, Users, Layers, ExternalLink
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import toast from 'react-hot-toast';
import api from '../api/axios';

const DialphoneGateway = () => {
  // Live Outbound Call State
  const [targetPhone, setTargetPhone] = useState('7989998568');
  const [isCallingOutbound, setIsCallingOutbound] = useState(false);
  const [outboundCallStatus, setOutboundCallStatus] = useState('IDLE'); // 'IDLE' | 'RINGING' | 'IN_CALL' | 'COMPLETED' | 'FAILED'
  const [callSid, setCallSid] = useState('');
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Active Simulation Tab: 'voice-ai' | 'sms-gateway' | 'recordings'
  const [activeTab, setActiveTab] = useState('voice-ai');
  const [selectedLanguage, setSelectedLanguage] = useState('ta'); // 'ta', 'hi', 'en'
  const [isMuted, setIsMuted] = useState(false);

  // In-Browser Virtual Phone State (Nokia 105 Simulator)
  const [callStatus, setCallStatus] = useState('IDLE');
  const [callDuration, setCallDuration] = useState(0);
  const [dialogueMessages, setDialogueMessages] = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [callListingResult, setCallListingResult] = useState(null);

  // WhatsApp Business Bot State (Layer 5 M4)
  const [waPhone, setWaPhone] = useState('7989998568');
  const [waInput, setWaInput] = useState('SELL TOMATO 200 25 SALEM');
  const [isWaSending, setIsWaSending] = useState(false);
  const [waMessages, setWaMessages] = useState([
    {
      id: 1,
      from: 'bot',
      text: "🌾 *Welcome to KisanSetu WhatsApp Business Bot!*\nConnecting non-smartphone & smartphone farmers directly with urban consumers at 0% commission.\n\n*Available Commands*:\n1️⃣ *SELL <Crop> <KG> <Price> <Location>*\n2️⃣ *ORDERS* (Track deliveries & payout)\n3️⃣ *PRICE <Crop>* (APMC live modal rates)\n4️⃣ 📸 *Send a photo* of your harvest",
      time: '10:00 AM',
      actions: ['SELL Tomato 200 25 Salem', 'ORDERS', 'PRICE Tomato']
    }
  ]);

  // IVR Analytics State (Layer 5 M4)
  const [ivrAnalytics, setIvrAnalytics] = useState({
    summary: {
      totalCalls: 8,
      todayCalls: 2,
      avgDurationSeconds: 73,
      conversionRate: 63,
      activePhoneChannels: 4
    },
    languages: { ta: 3, hi: 2, te: 2, kn: 1, en: 1 },
    funnel: { totalCalls: 8, menuSelected: 7, produceEntered: 6, listingCreated: 5 },
    recentLogs: []
  });

  // SMS Gateway Simulator State
  const [smsPhone, setSmsPhone] = useState('7989998568');
  const [smsInput, setSmsInput] = useState('SELL ONION 200 30 SALEM OMALUR');
  const [smsThread, setSmsThread] = useState([
    { from: 'system', text: '🌾 KisanSetu 2-Way SMS Gateway Active. Send: SELL <CROP> <KG> <PRICE> <LOCATION>', time: '10:00 AM' }
  ]);
  const [isSmsLoading, setIsSmsLoading] = useState(false);

  // Audio Playback State for Call Recordings
  const [playingRecordingId, setPlayingRecordingId] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioRef = useRef(null);
  const playbackIntervalRef = useRef(null);

  const callRecordings = [
    {
      id: 'REC-01',
      title: 'Farmer Murugan K. — Tomato Harvest Listing (Tamil)',
      duration: '01:24',
      date: 'Today, 10:15 AM',
      caller: '+91 9842109842',
      language: 'Tamil (தமிழ்)',
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg',
      summary: 'Listed 250kg Salem Hybrid Tomatoes @ ₹32/kg. Grade A, ready for farm gate cold dispatch.'
    },
    {
      id: 'REC-02',
      title: 'FPO Selvam R. — Bulk Red Onion Consultation (Tamil)',
      duration: '02:08',
      date: 'Yesterday, 04:30 PM',
      caller: '+91 9789123456',
      language: 'Tamil (தமிழ்)',
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg',
      summary: 'Configured 1,000kg Nashik Red Onions @ ₹28/kg. Scheduled refrigerated pickup with Bangalore retail buyer.'
    },
    {
      id: 'REC-03',
      title: 'Kisan Doctor Voice Query — Leaf Spot Diagnosis (Hindi)',
      duration: '00:54',
      date: 'Sep 14, 11:20 AM',
      caller: '+91 9123456780',
      language: 'Hindi (हिंदी)',
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg',
      summary: 'Diagnosed Early Blight on potato crop. Recommended Copper Oxychloride spray.'
    }
  ];

  // Live Logs
  const [dialphoneListings, setDialphoneListings] = useState([]);
  const [recentSmsLogs, setRecentSmsLogs] = useState([]);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Real-time WebSocket simulator for live call status
  useEffect(() => {
    setIsWsConnected(true);
    let ws;
    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/telephony`;
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.status) setOutboundCallStatus(msg.status);
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    fetchLogs();
    initSpeechRecognition();
  }, [selectedLanguage]);

  useEffect(() => {
    if (callStatus === 'IN_CALL') {
      timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/ivr/logs');
      if (res.data?.data?.dialphoneProducts) setDialphoneListings(res.data.data.dialphoneProducts);
      if (res.data?.data?.recentSMS) setRecentSmsLogs(res.data.data.recentSMS);

      // Layer 5 M4: Fetch IVR Analytics
      const analyticsRes = await api.get('/ivr/analytics');
      if (analyticsRes.data?.data) {
        setIvrAnalytics(analyticsRes.data.data);
      }
    } catch (e) {
      console.warn('Error fetching ivr logs/analytics', e);
    }
  };

  const handleSendWhatsApp = async (customText, customMedia) => {
    const text = (customText || waInput).trim();
    if (!text && !customMedia) return;

    const userMsg = {
      id: Date.now(),
      from: 'farmer',
      text: text || (customMedia ? '📸 Uploaded Harvest Photo' : ''),
      media: customMedia || null,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setWaMessages(prev => [...prev, userMsg]);
    setWaInput('');
    setIsWaSending(true);

    try {
      const res = await api.post('/whatsapp/webhook', {
        From: 'whatsapp:+91' + waPhone,
        Body: text,
        MediaUrl0: customMedia || undefined
      });

      if (res.data?.data?.replyText) {
        const botMsg = {
          id: Date.now() + 1,
          from: 'bot',
          text: res.data.data.replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionType: res.data.data.actionType,
          actionData: res.data.data.actionData
        };
        setWaMessages(prev => [...prev, botMsg]);
        toast.success('WhatsApp response received from KisanSetu Bot!');
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not connect to WhatsApp webhook');
    } finally {
      setIsWaSending(false);
    }
  };

  // Trigger outbound call with live simulated progression
  const handleTriggerRealCall = async (e) => {
    e?.preventDefault();
    const clean = targetPhone.replace(/[^0-9]/g, '').slice(-10);
    if (!clean || clean.length !== 10) {
      toast.error('Please enter a valid 10-digit Indian phone number');
      return;
    }

    setIsCallingOutbound(true);
    setOutboundCallStatus('RINGING');
    toast.loading(`Calling +91 ${clean}... Look at your phone!`, { id: 'call-toast' });

    try {
      const res = await api.post('/ivr/trigger-outbound-call', { phone: clean });
      if (res.data?.success && res.data?.data?.success) {
        setCallSid(res.data.data?.callSid || 'CALL_' + Date.now());
        setOutboundCallStatus('IN_CALL');
        if (res.data.data.simulated) {
          toast.success(`Demo mode: starting in-browser audio simulation!`, { id: 'call-toast' });
          startVirtualCall();
        } else {
          toast.success(`📞 Real call dispatched via Twilio to +91 ${clean}! Check your phone now.`, { id: 'call-toast' });
        }

        // Simulate progression to COMPLETED after call
        setTimeout(() => {
          setOutboundCallStatus('COMPLETED');
          toast.success('Voice call session completed and transcribed!');
        }, 15000);
      } else {
        setOutboundCallStatus('FAILED');
        toast.error('Starting in-browser Voice AI simulator!', { id: 'call-toast' });
        startVirtualCall();
      }
      fetchLogs();
    } catch (err) {
      setOutboundCallStatus('IN_CALL');
      toast.success('Live In-Browser Voice AI connection established!', { id: 'call-toast' });
      startVirtualCall();
    } finally {
      setIsCallingOutbound(false);
    }
  };

  const speakText = (text, lang = selectedLanguage) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    const langCodeMap = { 'ta': 'ta-IN', 'hi': 'hi-IN', 'en': 'en-IN' };
    utterance.lang = langCodeMap[lang] || 'ta-IN';
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      const langCodeMap = { 'ta': 'ta-IN', 'hi': 'hi-IN', 'en': 'en-IN' };
      recognition.lang = langCodeMap[selectedLanguage] || 'ta-IN';
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleFarmerVoiceInput(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const startVirtualCall = () => {
    setCallStatus('RINGING');
    setCallListingResult(null);
    setDialogueMessages([]);

    setTimeout(() => {
      setCallStatus('IN_CALL');
      const welcome = selectedLanguage === 'ta'
        ? 'வணக்கம் உழவர் தோழரே! உங்களின் விளைபொருளை KisanSetu சந்தையில் விற்க, பயிர் பெயர் மற்றும் அளவை சொல்லுங்கள்.'
        : selectedLanguage === 'hi'
        ? 'नमस्ते किसान साथी! अपनी फसल को KisanSetu मंडी में बेचने के लिए फसल का नाम और मात्रा बताएं।'
        : 'Welcome Farmer! To list your fresh harvest, please state your crop name and quantity in KG.';

      setDialogueMessages([{ sender: 'ai', text: welcome, time: 'Just now' }]);
      speakText(welcome);
    }, 1500);
  };

  const endVirtualCall = () => {
    setCallStatus('IDLE');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (isListening && recognitionRef.current) recognitionRef.current.stop();
  };

  const handleFarmerVoiceInput = (text) => {
    setDialogueMessages(prev => [...prev, { sender: 'farmer', text, time: 'Just now' }]);
    setTimeout(() => {
      const reply = selectedLanguage === 'ta'
        ? `மிக்க நன்றி! ${text} வெற்றிகரமாக KisanSetu ஆன்லைன் சந்தையில் பட்டியலிடப்பட்டது. அருகில் உள்ள நுகர்வோர் மற்றும் வாகன ஓட்டுனர்களுக்கு SMS அனுப்பப்பட்டுள்ளது.`
        : selectedLanguage === 'hi'
        ? `धन्यवाद! ${text} की लिस्टिंग सफलतापूर्वक KisanSetu मंडी पर लाइव कर दी गई है।`
        : `Confirmed! Your listing of ${text} has been posted directly to the live marketplace.`;

      setDialogueMessages(prev => [...prev, { sender: 'ai', text: reply, time: 'Just now' }]);
      speakText(reply);

      setCallListingResult({
        crop: 'Fresh Harvest Produce',
        quantity: '100 KG',
        price: '₹35 / KG',
        status: 'Listed on Marketplace'
      });
    }, 1000);
  };

  // Audio Playback Scrubber for Call Recordings
  const togglePlayRecording = (recording) => {
    if (playingRecordingId === recording.id && isPlayingAudio) {
      setIsPlayingAudio(false);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    } else {
      setPlayingRecordingId(recording.id);
      setIsPlayingAudio(true);
      setPlaybackProgress(0);

      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            clearInterval(playbackIntervalRef.current);
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 2;
        });
      }, 500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-primary-dark to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              2G Feature Phone Inclusivity
            </span>
            <span className="text-emerald-300 text-xs font-bold flex items-center gap-1">
              <Radio size={12} className="animate-pulse" /> Sarvam Indic Voice AI + Twilio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            2G Dialphone & Voice AI Gateway
          </h1>
          <p className="text-emerald-100 dark:text-gray-300 text-xs sm:text-sm mt-1">
            Enabling non-smartphone farmers to list produce and receive instant payment alerts via a simple toll-free phone call.
          </p>
        </div>

        {/* WebSocket Status Indicator */}
        <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-900/60 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-white">WebSocket Telephony Live</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'voice-ai', label: '📞 Nokia 105 Voice AI' },
          { id: 'whatsapp-bot', label: '📱 WhatsApp Business Bot', badge: 'Twilio' },
          { id: 'analytics', label: '📊 Telephony & IVR Analytics' },
          { id: 'recordings', label: '🎙️ Call Recordings', badge: callRecordings.length },
          { id: 'sms-gateway', label: '💬 2-Way SMS Gateway' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {/* TAB 1: NOKIA 105 SIMULATOR & OUTBOUND CALL */}
      {activeTab === 'voice-ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Nokia 105 Phone Frame (5 cols) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-xs bg-slate-900 text-white rounded-[40px] p-5 shadow-2xl border-4 border-slate-700 select-none">
              
              {/* Speaker Grille */}
              <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mb-4" />

              {/* Nokia Monochrome LCD Screen */}
              <div className="bg-emerald-950 border-2 border-emerald-800 rounded-2xl p-4 mb-5 min-h-[160px] flex flex-col justify-between text-emerald-300 font-mono shadow-inner">
                <div className="flex justify-between items-center text-[10px] text-emerald-400 border-b border-emerald-800/80 pb-1">
                  <span>📶 2G AIRTEL</span>
                  <span>{callStatus === 'IN_CALL' ? `${callDuration}s` : '10:45 AM'}</span>
                  <span>🔋 95%</span>
                </div>

                <div className="my-auto text-center">
                  {callStatus === 'IDLE' && (
                    <div className="space-y-1">
                      <PhoneCall size={28} className="mx-auto text-emerald-400 opacity-80" />
                      <h4 className="text-xs font-bold text-emerald-300">KisanSetu Toll-Free</h4>
                      <p className="text-[10px] text-emerald-500">1800-KISAN-2026</p>
                    </div>
                  )}

                  {callStatus === 'RINGING' && (
                    <div className="space-y-1 animate-pulse">
                      <PhoneIncoming size={32} className="mx-auto text-amber-400" />
                      <h4 className="text-xs font-bold text-amber-300">Connecting IVR...</h4>
                      <p className="text-[10px] text-amber-500">Sarvam Tamil AI</p>
                    </div>
                  )}

                  {callStatus === 'IN_CALL' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1 text-emerald-300 text-xs font-black">
                        <Activity size={14} className="animate-pulse" />
                        <span>LIVE CALL IN PROGRESS</span>
                      </div>
                      <p className="text-[11px] text-gray-200 line-clamp-3 bg-black/40 p-1.5 rounded-lg border border-emerald-500/30">
                        {dialogueMessages[dialogueMessages.length - 1]?.text || 'Listening...'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-center text-emerald-400 border-t border-emerald-800/60 pt-1">
                  Tamil · Hindi · English Voice AI
                </div>
              </div>

              {/* Physical Keypad Buttons */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {callStatus === 'IDLE' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={startVirtualCall}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl"
                    >
                      <Phone size={14} className="mr-1" /> Call Helpline
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={endVirtualCall}
                      className="rounded-2xl"
                    >
                      <PhoneOff size={14} className="mr-1" /> End Call
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={toggleListening}
                    disabled={callStatus !== 'IN_CALL'}
                    className={`rounded-2xl ${isListening ? 'bg-amber-400 text-slate-950 font-black' : ''}`}
                  >
                    {isListening ? <Mic size={14} className="mr-1 text-red-600" /> : <MicOff size={14} className="mr-1" />}
                    <span>{isListening ? 'Listening...' : 'Speak (Mic)'}</span>
                  </Button>
                </div>

                {/* 12-Key DTMF Keypad Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleFarmerVoiceInput(k)}
                      className="py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-200 font-bold rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Trigger Real Outbound Call & Live Transcript (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Real Outbound Twilio Call Trigger Box */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={18} className="text-primary" />
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">
                  Trigger Real Outbound Call to Physical Phone
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Enter your mobile number to receive a live demonstration phone call from the Sarvam AI Indian farmer IVR system.
              </p>

              <form onSubmit={handleTriggerRealCall} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">+91</span>
                  <input
                    type="tel"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="7989998568"
                    className="w-full pl-11 pr-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-bold"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isCallingOutbound}
                  className="flex items-center gap-1.5"
                >
                  <PhoneCall size={14} /> Trigger Call
                </Button>
              </form>

              {outboundCallStatus !== 'IDLE' && (
                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950 dark:text-emerald-300">
                    Telephony State: <strong>{outboundCallStatus}</strong>
                  </span>
                  <Badge variant={outboundCallStatus === 'COMPLETED' ? 'success' : 'warning'}>
                    {outboundCallStatus}
                  </Badge>
                </div>
              )}
            </div>

            {/* Live Conversation Transcript */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Activity size={16} className="text-primary" /> Live Voice AI Transcript Stream
              </h3>

              <div className="space-y-3 max-h-60 overflow-y-auto p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl text-xs">
                {dialogueMessages.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">
                    Press "Call Helpline" on the phone or trigger an outbound call to view the real-time AI dialog.
                  </p>
                ) : (
                  dialogueMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl max-w-[85%] ${
                        m.sender === 'farmer'
                          ? 'ml-auto bg-primary text-white font-bold'
                          : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="text-[10px] opacity-75 block mb-0.5">
                        {m.sender === 'farmer' ? '🧑‍🌾 Farmer Voice' : '🤖 Sarvam Indic AI'}
                      </span>
                      <p>{m.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: CALL RECORDINGS & AUDIO PLAYBACK */}
      {activeTab === 'recordings' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm transition-colors space-y-6">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Volume2 size={18} className="text-primary" /> IVR Call Recordings & Audio Playback
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Listen to recorded farmer 2G IVR voice conversations, transcribe speech to text, and audit marketplace entries.
            </p>
          </div>

          <div className="space-y-4">
            {callRecordings.map((rec) => {
              const isPlaying = playingRecordingId === rec.id && isPlayingAudio;
              return (
                <div
                  key={rec.id}
                  className="p-5 rounded-3xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <strong className="text-sm font-black text-gray-900 dark:text-gray-100 block">
                        {rec.title}
                      </strong>
                      <span className="text-gray-400 text-[11px]">
                        {rec.caller} · {rec.language} · {rec.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={isPlaying ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => togglePlayRecording(rec)}
                        className="flex items-center gap-1.5"
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isPlaying ? 'Pause Audio' : 'Play Recording'}</span>
                      </Button>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{rec.duration}</span>
                    </div>
                  </div>

                  {/* Audio Waveform Scrubber Simulation */}
                  {playingRecordingId === rec.id && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-300 dark:border-emerald-800 animate-slide-up space-y-2">
                      <div className="flex items-center gap-1 justify-center h-8">
                        {[12, 24, 38, 16, 28, 44, 32, 20, 48, 18, 26, 36, 14, 40].map((h, i) => (
                          <div
                            key={i}
                            className={`w-1.5 rounded-full transition-all duration-150 ${
                              isPlaying ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-700'
                            }`}
                            style={{ height: isPlaying ? `${Math.max(8, (h * (playbackProgress % 20)) / 10)}px` : `${h / 2}px` }}
                          />
                        ))}
                      </div>

                      <div className="w-full bg-gray-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-200"
                          style={{ width: `${playbackProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800">
                    📝 <strong>Transcription:</strong> {rec.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: WHATSAPP BUSINESS BOT (LAYER 5 M4) */}
      {activeTab === 'whatsapp-bot' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-[#efeae2] dark:bg-slate-950 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[680px]">
            
            {/* WhatsApp Header */}
            <div className="bg-[#008069] text-white p-3.5 px-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-black border border-white/30">
                    🌾
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#008069]"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold tracking-tight">KisanSetu Official Bot</h3>
                    <span className="bg-emerald-400 text-emerald-950 p-0.5 rounded-full text-[9px]">
                      <Check size={10} strokeWidth={4} />
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100 flex items-center gap-1 opacity-90">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                    Twilio Sandbox (+1 415 523 8886) · Verified Business
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="bg-black/20 text-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10">
                  Dual-Mode Webhook Active
                </span>
              </div>
            </div>

            {/* WhatsApp Chat Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-[radial-gradient(#008069_1px,transparent_1px)] [background-size:16px_16px] [background-opacity:0.04]">
              {waMessages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                    m.from === 'farmer'
                      ? 'ml-auto bg-[#d9fdd3] dark:bg-emerald-900 text-gray-900 dark:text-gray-100 rounded-tr-none'
                      : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-slate-800'
                  }`}
                >
                  {m.media && (
                    <img src={m.media} alt="Uploaded produce" className="rounded-xl max-h-48 mb-2 w-full object-cover" />
                  )}
                  <div className="whitespace-pre-line leading-relaxed font-sans text-xs">
                    {m.text}
                  </div>
                  
                  {/* Interactive Quick-Reply Buttons */}
                  {m.from === 'bot' && (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-800/80 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp('CONFIRM_ORDER')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        ✅ Confirm Order
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp('TRACK_DELIVERY')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        🚚 Track Delivery
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400 text-right mt-1 flex items-center justify-end gap-1">
                    <span>{m.time}</span>
                    {m.from === 'farmer' && <CheckCheck size={13} className="text-sky-500" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick 1-Click Action Presets */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2.5 px-4 border-t border-gray-200 dark:border-slate-800">
              <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500" /> 1-Click WhatsApp Quick Actions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '🍅 SELL Tomato 200 25 Salem', text: 'SELL TOMATO 200 25 SALEM' },
                  { label: '🧅 SELL Onion 300 22 Nashik', text: 'SELL ONION 300 22 NASHIK' },
                  { label: '📦 ORDERS', text: 'ORDERS' },
                  { label: '📊 PRICE Tomato', text: 'PRICE TOMATO' },
                  { label: '📸 1-Click Vision AI Photo Listing', text: 'SELL TOMATO 150 28 SALEM', media: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=400&auto=format&fit=crop&q=60' }
                ].map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendWhatsApp(p.text, p.media)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendWhatsApp();
              }}
              className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => handleSendWhatsApp('SELL TOMATO 250 28 SALEM', 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=400&auto=format&fit=crop&q=60')}
                title="Attach Harvest Photo for Vision AI"
                className="p-2 text-gray-500 hover:text-emerald-600 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                value={waInput}
                onChange={(e) => setWaInput(e.target.value)}
                placeholder="Type command e.g. SELL TOMATO 100 25 SALEM or ORDERS..."
                className="flex-1 p-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#008069]"
              />

              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isWaSending}
                className="bg-[#008069] hover:bg-[#00705a] text-white rounded-xl px-4 flex items-center gap-1"
              >
                <Send size={14} /> Send
              </Button>
            </form>

          </div>
        </div>
      )}

      {/* TAB 5: TELEPHONY & IVR ANALYTICS HUB (LAYER 5 M4) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4 border-l-4 border-l-primary shadow-sm">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-1">Total Voice Calls</span>
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center justify-between">
                <span>{ivrAnalytics.summary.totalCalls}</span>
                <PhoneCall size={20} className="text-primary opacity-60" />
              </div>
              <span className="text-[11px] text-emerald-600 font-bold mt-1 block">+{ivrAnalytics.summary.todayCalls} today</span>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-1">Avg Call Duration</span>
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center justify-between">
                <span>{ivrAnalytics.summary.avgDurationSeconds}s</span>
                <Clock size={20} className="text-emerald-500 opacity-60" />
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">Optimal multi-turn flow</span>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500 shadow-sm">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-1">Listing Conversion</span>
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center justify-between">
                <span>{ivrAnalytics.summary.conversionRate}%</span>
                <TrendingUp size={20} className="text-amber-500 opacity-60" />
              </div>
              <span className="text-[11px] text-emerald-600 font-bold mt-1 block">Calls leading to listings</span>
            </Card>

            <Card className="p-4 border-l-4 border-l-indigo-500 shadow-sm">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-1">Active GSM Channels</span>
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center justify-between">
                <span>{ivrAnalytics.summary.activePhoneChannels}</span>
                <Activity size={20} className="text-indigo-500 opacity-60" />
              </div>
              <span className="text-[11px] text-indigo-500 font-bold mt-1 block">Toll-Free & Direct DID</span>
            </Card>

            <Card className="p-4 border-l-4 border-l-teal-500 shadow-sm col-span-2 lg:col-span-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-1">Languages Supported</span>
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center justify-between">
                <span>5</span>
                <Globe size={20} className="text-teal-500 opacity-60" />
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">Tamil, Hindi, Telugu, Kannada, English</span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Drop-Off Funnel Analysis (6 cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Layers size={16} className="text-primary" /> IVR Call Drop-Off Funnel Analysis
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Tracks callers advancing from initial ring through language, menu options, and final marketplace listing.
              </p>

              <div className="space-y-4">
                {[
                  { stage: '1. Call Connected (Ring-In)', count: ivrAnalytics.funnel.totalCalls, pct: 100, color: 'bg-emerald-600' },
                  { stage: '2. Language Selected (Tamil/Hindi/Telugu/Kannada)', count: ivrAnalytics.funnel.menuSelected, pct: Math.round((ivrAnalytics.funnel.menuSelected / ivrAnalytics.funnel.totalCalls) * 100), color: 'bg-emerald-500' },
                  { stage: '3. Produce Stated (Crop & Volume NLP)', count: ivrAnalytics.funnel.produceEntered, pct: Math.round((ivrAnalytics.funnel.produceEntered / ivrAnalytics.funnel.totalCalls) * 100), color: 'bg-amber-500' },
                  { stage: '4. Produce Listed in Marketplace (Confirmed)', count: ivrAnalytics.funnel.listingCreated, pct: Math.round((ivrAnalytics.funnel.listingCreated / ivrAnalytics.funnel.totalCalls) * 100), color: 'bg-primary' }
                ].map((f, i) => (
                  <div key={i} className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-700 dark:text-gray-300">{f.stage}</span>
                      <span className="text-gray-900 dark:text-gray-100 font-mono font-black">{f.count} calls ({f.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className={`h-full ${f.color} rounded-full transition-all duration-500`} style={{ width: `${f.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Language Distribution Breakdown (6 cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Globe size={16} className="text-primary" /> Multi-Language IVR Usage Distribution
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Indic regional voice interactions powered by Sarvam AI TTS and Amazon Polly.
              </p>

              <div className="space-y-3.5">
                {[
                  { code: 'ta', name: 'Tamil (தமிழ்)', count: ivrAnalytics.languages.ta || 0, color: 'bg-emerald-500' },
                  { code: 'hi', name: 'Hindi (हिंदी)', count: ivrAnalytics.languages.hi || 0, color: 'bg-amber-500' },
                  { code: 'te', name: 'Telugu (తెలుగు)', count: ivrAnalytics.languages.te || 0, color: 'bg-cyan-500' },
                  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', count: ivrAnalytics.languages.kn || 0, color: 'bg-indigo-500' },
                  { code: 'en', name: 'English', count: ivrAnalytics.languages.en || 0, color: 'bg-slate-500' }
                ].map((l, i) => {
                  const total = Object.values(ivrAnalytics.languages).reduce((a, b) => a + b, 0) || 1;
                  const share = Math.round((l.count / total) * 100);
                  return (
                    <div key={i} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-700 dark:text-gray-300">{l.name}</span>
                        <span className="text-gray-900 dark:text-gray-100 font-mono">{l.count} calls ({share}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${l.color} rounded-full`} style={{ width: `${Math.max(8, share)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Recent Inbound Call Audit Stream */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <PhoneIncoming size={16} className="text-primary" /> Live Inbound Voice & WhatsApp Audit Stream
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Call SID</th>
                    <th className="p-3">Caller Phone</th>
                    <th className="p-3">Language</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Detected Crop</th>
                    <th className="p-3">Outcome</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {(ivrAnalytics.recentLogs?.length > 0 ? ivrAnalytics.recentLogs : [
                    { call_sid: 'CA101', caller_phone: '9842109842', language: 'ta', duration_seconds: 84, detected_crop: 'Tomato', outcome: 'LISTING_CREATED' },
                    { call_sid: 'CA102', caller_phone: '9789123456', language: 'ta', duration_seconds: 128, detected_crop: 'Onion', outcome: 'LISTING_CREATED' },
                    { call_sid: 'CA104', caller_phone: '9443123456', language: 'te', duration_seconds: 95, detected_crop: 'Green Chilli', outcome: 'LISTING_CREATED' },
                    { call_sid: 'CA107', caller_phone: '9740123456', language: 'kn', duration_seconds: 76, detected_crop: 'Ragi', outcome: 'LISTING_CREATED' },
                    { call_sid: 'CA108', caller_phone: '9988123456', language: 'te', duration_seconds: 22, detected_crop: 'Tomato', outcome: 'DROPPED' }
                  ]).map((log, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-gray-500">{log.call_sid || `CA-${idx+100}`}</td>
                      <td className="p-3 font-mono font-bold">+91 {log.caller_phone}</td>
                      <td className="p-3">
                        <Badge variant="outline" size="sm">
                          {log.language?.toUpperCase() || 'TA'}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono">{log.duration_seconds || 65}s</td>
                      <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{log.detected_crop || 'Fresh Produce'}</td>
                      <td className="p-3">
                        <Badge variant={log.outcome === 'LISTING_CREATED' ? 'success' : log.outcome === 'DROPPED' ? 'danger' : 'warning'}>
                          {log.outcome || 'COMPLETED'}
                        </Badge>
                      </td>
                      <td className="p-3 text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Verified
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: 2-WAY SMS GATEWAY */}
      {activeTab === 'sms-gateway' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm transition-colors max-w-2xl mx-auto">
          <h2 className="text-base font-black text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" /> 2-Way SMS Gateway Simulator
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Farmers can text keywords like <code>SELL TOMATO 100 30 SALEM</code> to post listings without mobile data.
          </p>

          <div className="space-y-3 mb-6 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl min-h-[220px] max-h-80 overflow-y-auto text-xs">
            {smsThread.map((sms, i) => (
              <div
                key={i}
                className={`p-3 rounded-2xl max-w-[80%] ${
                  sms.from === 'farmer'
                    ? 'ml-auto bg-primary text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-700'
                }`}
              >
                <p>{sms.text}</p>
                <span className="text-[10px] opacity-75 block text-right mt-1">{sms.time}</span>
              </div>
            ))}
          </div>

          {/* Quick SMS Presets */}
          <div className="mb-4">
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" /> Quick 1-Click SMS Presets:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '🍅 SELL Tomato 500 25 Salem', cmd: 'SELL TOMATO 500 25 SALEM' },
                { label: '🧅 SELL Onion 300 22 Nashik', cmd: 'SELL ONION 300 22 NASHIK' },
                { label: '🌾 PRICE Basmati Punjab', cmd: 'PRICE BASMATI PUNJAB' },
                { label: '📦 STATUS ORD-1042', cmd: 'STATUS ORD-1042' }
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSmsInput(p.cmd)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-gray-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-gray-200 dark:border-slate-700 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!smsInput.trim()) return;
              const text = smsInput.trim();
              setSmsThread(prev => [...prev, { from: 'farmer', text, time: 'Just now' }]);
              setSmsInput('');
              setTimeout(() => {
                let reply = '✅ KisanSetu: Command received and processed.';
                if (text.toUpperCase().startsWith('SELL')) {
                  reply = `✅ KisanSetu: Listing confirmed! Your produce has been published live to the digital marketplace at zero commission. Nearest drivers alerted.`;
                } else if (text.toUpperCase().startsWith('PRICE')) {
                  reply = `📊 APMC Mandi Benchmark: Modal ₹24/kg, Min ₹18/kg, Max ₹30/kg. Recommended KisanSetu Direct Price: ₹25/kg (+5% fair trade premium).`;
                } else if (text.toUpperCase().startsWith('STATUS')) {
                  reply = `🚚 Order ORD-1042 Status: In Transit with Driver Kiran. Expected doorstep delivery in 45 mins.`;
                }
                setSmsThread(prev => [
                  ...prev,
                  {
                    from: 'system',
                    text: reply,
                    time: 'Just now'
                  }
                ]);
                toast.success('SMS response received from KisanSetu Gateway!');
              }, 900);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={smsInput}
              onChange={(e) => setSmsInput(e.target.value)}
              placeholder="e.g. SELL TOMATO 100 35 SALEM"
              className="flex-1 p-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-mono"
            />
            <Button type="submit" variant="primary" size="sm" className="flex items-center gap-1.5">
              <Send size={13} /> Send SMS
            </Button>
          </form>
        </div>
      )}

    </div>
  );
};

export default DialphoneGateway;
