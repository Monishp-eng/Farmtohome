import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, Phone, PhoneOff, MessageSquare, Volume2, VolumeX, RefreshCw, Send, Mic, MicOff, CheckCircle2, Sparkles, ArrowRight, Globe, ShoppingBag, Truck, Zap, Check, PhoneIncoming, DollarSign, Clock, Activity, ShieldCheck, Play, UserCheck, Smartphone } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import api from '../api/axios';

const DialphoneGateway = () => {
  // Live Outbound Call State (Judge / Farmer Demo)
  const [targetPhone, setTargetPhone] = useState('7989998568');
  const [isCallingOutbound, setIsCallingOutbound] = useState(false);
  const [outboundCallStatus, setOutboundCallStatus] = useState(null); // 'RINGING', 'CONNECTED', 'FAILED'
  const [callSid, setCallSid] = useState('');

  // Active Simulation Tab: 'voice-ai' or 'sms-gateway'
  const [activeTab, setActiveTab] = useState('voice-ai');
  const [selectedLanguage, setSelectedLanguage] = useState('ta'); // 'ta', 'hi', 'en'
  const [isMuted, setIsMuted] = useState(false);

  // In-Browser Virtual Phone State (Nokia 105 Simulator)
  const [callStatus, setCallStatus] = useState('IDLE'); // 'IDLE', 'RINGING', 'IN_CALL', 'ENDED'
  const [callDuration, setCallDuration] = useState(0);
  const [dialogueMessages, setDialogueMessages] = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [callListingResult, setCallListingResult] = useState(null);

  // SMS Gateway Simulator State
  const [smsPhone, setSmsPhone] = useState('7989998568');
  const [smsInput, setSmsInput] = useState('SELL ONION 200 30 SALEM OMALUR');
  const [smsThread, setSmsThread] = useState([
    { from: 'system', text: '🌾 KisanSetu 2-Way SMS Gateway Active. Send: SELL <CROP> <KG> <PRICE> <LOCATION>', time: '10:00 AM' }
  ]);
  const [isSmsLoading, setIsSmsLoading] = useState(false);

  // Live Logs
  const [dialphoneListings, setDialphoneListings] = useState([]);
  const [recentSmsLogs, setRecentSmsLogs] = useState([]);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

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
    } catch (e) {
      console.error('Error fetching logs', e);
    }
  };

  // ─── 1. REAL OUTBOUND PHONE CALL TO JUDGE / USER ───
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
        setOutboundCallStatus('CONNECTED');
        toast.success(`Incoming call dispatched to +91 ${clean}! Pick up your phone.`, { id: 'call-toast' });
      } else {
        const errorMsg = res.data?.data?.message || res.data?.message || '';
        const isUnverified = errorMsg.toLowerCase().includes('unverified') || errorMsg.toLowerCase().includes('trial');
        setOutboundCallStatus('FAILED');
        
        if (isUnverified) {
          toast.error(`Twilio Trial Mode: +91 ${clean} is unverified. Dial our toll-free number directly from your phone OR starting In-Browser Voice Call!`, { id: 'call-toast', duration: 7000 });
          startVirtualCall();
        } else {
          toast.error(errorMsg || 'Call placement failed. Dial our number directly from your phone!', { id: 'call-toast' });
        }
      }
      fetchLogs();
    } catch (err) {
      setOutboundCallStatus('FAILED');
      toast.error('Starting live In-Browser Voice AI simulator!', { id: 'call-toast' });
      startVirtualCall();
    } finally {
      setIsCallingOutbound(false);
    }
  };

  // ─── 2. IN-BROWSER VIRTUAL PHONE (NOKIA 105 SIMULATOR) ───
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
    window.speechSynthesis.speak(utterance);
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    const langCodeMap = { 'ta': 'ta-IN', 'hi': 'hi-IN', 'en': 'en-IN' };
    recognition.lang = langCodeMap[selectedLanguage] || 'ta-IN';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleFarmerVoiceInput(transcript);
    };

    recognitionRef.current = recognition;
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        initSpeechRecognition();
        recognitionRef.current?.start();
      }
    }
  };

  const startVirtualCall = async () => {
    setCallStatus('RINGING');
    setDialogueMessages([]);
    setCallListingResult(null);

    setTimeout(async () => {
      setCallStatus('IN_CALL');
      const welcome = selectedLanguage === 'ta'
        ? 'வணக்கம்! உழவன் சேவைக்கு நல்வரவு. பீப் ஒலிக்குப் பிறகு சொல்லுங்கள்: உங்கள் பயிரின் பெயர், அளவு, விலை, மற்றும் பண்ணை முகவரி.'
        : selectedLanguage === 'hi'
        ? 'नमस्ते! किसानसेतु में आपका स्वागत है। बीप के बाद बोलें: आपकी फसल, वजन, भाव, और आपका पता।'
        : 'Welcome to KisanSetu. Please speak: crop name, quantity, price per kg, and your farm address.';

      setDialogueMessages([{ from: 'ai', text: welcome, time: 'Just now' }]);
      speakText(welcome);
    }, 1500);
  };

  const handleFarmerVoiceInput = async (spokenText) => {
    if (!spokenText.trim()) return;

    setDialogueMessages(prev => [...prev, { from: 'farmer', text: spokenText, time: 'Just now' }]);

    try {
      const res = await api.post('/ivr/voice-ai', {
        speech: spokenText,
        language: selectedLanguage,
        caller_phone: targetPhone
      });

      const data = res.data.data;
      if (data.reply) {
        setDialogueMessages(prev => [...prev, { from: 'ai', text: data.reply, time: 'Just now' }]);
        speakText(data.reply);
      }

      if (data.listing) {
        setCallListingResult(data.listing);
        toast.success(`Published! ID #${data.listing.id} scheduled for Marketplace.`);
        fetchLogs();
      }
    } catch (err) {
      toast.error('Voice processing error');
    }
  };

  const endVirtualCall = () => {
    setCallStatus('ENDED');
    window.speechSynthesis?.cancel();
    setTimeout(() => setCallStatus('IDLE'), 1000);
  };

  // ─── 3. SMS GATEWAY SIMULATION ───
  const handleSendSms = async (e) => {
    e?.preventDefault();
    if (!smsInput.trim()) return;

    setIsSmsLoading(true);
    const text = smsInput.trim();
    setSmsThread(prev => [...prev, { from: 'farmer', text, time: 'Just now' }]);
    setSmsInput('');

    try {
      const res = await api.post('/ivr/sms', {
        from_phone: smsPhone,
        message: text
      });

      const reply = res.data.data?.reply || 'KisanSetu: SMS received.';
      setSmsThread(prev => [...prev, { from: 'system', text: reply, time: 'Just now' }]);
      toast.success('SMS Processed! Farmer notified.');
      fetchLogs();
    } catch (err) {
      toast.error('SMS processing failed');
    } finally {
      setIsSmsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border border-amber-400/30">
              <Sparkles size={13} /> Zero-Cost 2G Telecom Gateway (No Smartphone Required)
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              2G Voice AI & Telecom Gateway
            </h1>
            <p className="text-emerald-200 text-xs sm:text-sm mt-1 max-w-2xl">
              Empowering farmers with ₹0 airtime and a ₹1,000 feature phone to list produce via Sarvam AI Voice, listing published on marketplace, and get paid 98% directly.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/20"
          >
            <RefreshCw size={14} /> Refresh Logs
          </button>
        </div>
      </div>

      {/* 🌟 PROMINENT JUDGE DEMO: Real Telecom Outbound Call Box */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-indigo-500/50 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Phone Input & Trigger (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              <PhoneIncoming size={14} className="animate-bounce" /> Live Judge Presentation Demo
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              📲 Have the Platform Call Your Real Mobile Phone (100% Free)
            </h2>

            <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
              Tell the judge: <em className="text-amber-300 font-semibold">"Sir/Ma'am, in rural India, farmers have zero balance. So KisanSetu initiates free incoming calls. May I have your 10-digit mobile number?"</em>
            </p>

            <form onSubmit={handleTriggerRealCall} className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 10-Digit Mobile Number"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/10 border-2 border-indigo-400/50 rounded-2xl text-white placeholder-gray-400 text-sm font-mono font-bold focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 backdrop-blur-sm transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isCallingOutbound}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <PhoneCall size={16} />
                {isCallingOutbound ? 'Dispatching Call...' : '📲 Call My Phone Now'}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-indigo-200">
              <span className="text-amber-400 font-bold flex items-center gap-1">📞 Direct Dial-In:</span>
              <span>Any person can dial <strong className="text-white bg-indigo-900/80 px-2 py-0.5 rounded font-mono font-bold">+1 (845) 478-0736</strong> directly from ANY phone (registered or unregistered) to experience Sarvam AI!</span>
            </div>

            {outboundCallStatus === 'CONNECTED' && (
              <div className="bg-emerald-950/80 border border-emerald-500/60 p-3 rounded-2xl flex items-center gap-3 animate-pulse">
                <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl">
                  <PhoneIncoming size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">📳 Phone Call Placed to +91 {targetPhone}!</h4>
                  <p className="text-[11px] text-gray-300">Answer the incoming call on your phone to speak with Sarvam AI in Tamil/Hindi.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Step-by-Step Guide for the Judge (5 cols) */}
          <div className="lg:col-span-5 bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3 backdrop-blur-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <ShieldCheck size={14} /> What Happens During the Phone Call:
            </h3>

            <ol className="space-y-2.5 text-xs text-gray-200">
              <li className="flex items-start gap-2">
                <span className="bg-amber-400 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
                <span><strong>Answer Incoming Call:</strong> Your phone rings from <code className="text-amber-300 font-mono">+1 (845) 478-0736</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-amber-400 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
                <span><strong>Select Language:</strong> Press <strong className="text-emerald-300">2 for Tamil</strong>, <strong className="text-amber-300">3 for Hindi</strong>, or <strong>1 for English</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-amber-400 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
                <span><strong>Speak Harvest & Address:</strong> Say <em>"200 kg Onion at 30 Rs in Salem Omalur"</em>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-amber-400 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">4</span>
                <span><strong>Sarvam AI Verification:</strong> AI speaks back confirmation & assigns pickup to <strong>Marketplace</strong>!</span>
              </li>
            </ol>
          </div>

        </div>
      </div>

      {/* Simulator Modes: Tab Switcher */}
      <div className="flex gap-3 bg-gray-100 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('voice-ai')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'voice-ai' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Phone size={14} className="text-emerald-600" /> Virtual Phone (Nokia 105)
        </button>
        <button
          onClick={() => setActiveTab('sms-gateway')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'sms-gateway' ? 'bg-white text-blue-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageSquare size={14} className="text-blue-600" /> 2-Way SMS Gateway
        </button>
      </div>

      {/* Mode 1: Virtual Nokia 105 Feature Phone Simulator */}
      {activeTab === 'voice-ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Virtual Nokia 105 Body (5 cols) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-80 bg-slate-900 p-6 rounded-[40px] shadow-2xl border-4 border-slate-700 space-y-4 text-white">
              
              {/* Earpiece */}
              <div className="w-16 h-1.5 bg-slate-700 rounded-full mx-auto"></div>

              {/* Color LCD Screen */}
              <div className="bg-emerald-950/90 rounded-2xl p-4 border-2 border-emerald-600/40 h-64 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="flex justify-between items-center text-[10px] text-emerald-400 font-mono">
                  <span>📶 BSNL 2G</span>
                  <span>{callStatus === 'IN_CALL' ? `⏱️ 00:${callDuration < 10 ? '0' : ''}${callDuration}` : '10:00 AM'}</span>
                  <span>🔋 98%</span>
                </div>

                <div className="my-auto text-center space-y-1">
                  {callStatus === 'IDLE' && (
                    <>
                      <PhoneCall size={32} className="mx-auto text-emerald-400 opacity-80" />
                      <h4 className="text-xs font-bold text-emerald-300">KisanSetu Helpline</h4>
                      <p className="text-[10px] text-emerald-500 font-mono">1800-KISAN-2026</p>
                    </>
                  )}
                  {callStatus === 'RINGING' && (
                    <div className="space-y-1 animate-pulse">
                      <PhoneIncoming size={32} className="mx-auto text-amber-400" />
                      <h4 className="text-xs font-bold text-amber-300">Connecting Helpline...</h4>
                      <p className="text-[10px] text-amber-500">Sarvam Indic Voice AI</p>
                    </div>
                  )}
                  {callStatus === 'IN_CALL' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1 text-emerald-300">
                        <Activity size={16} className="animate-pulse" />
                        <span className="text-xs font-black">CALL IN PROGRESS</span>
                      </div>
                      <p className="text-[11px] text-gray-200 line-clamp-3 bg-black/40 p-1.5 rounded-lg border border-emerald-500/30">
                        {dialogueMessages[dialogueMessages.length - 1]?.text || 'Listening to your harvest details...'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-center text-emerald-400 border-t border-emerald-800/60 pt-1 font-mono">
                  Tamil / Hindi / English Voice AI
                </div>
              </div>

              {/* Physical Keypad */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {callStatus === 'IDLE' ? (
                    <button
                      onClick={startVirtualCall}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-900/50"
                    >
                      <Phone size={14} /> Call Helpline
                    </button>
                  ) : (
                    <button
                      onClick={endVirtualCall}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-1 shadow-lg shadow-red-900/50"
                    >
                      <PhoneOff size={14} /> End Call
                    </button>
                  )}

                  <button
                    onClick={toggleListening}
                    disabled={callStatus !== 'IN_CALL'}
                    className={`w-full py-3 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-1 ${
                      isListening ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
                    } disabled:opacity-30`}
                  >
                    {isListening ? <Mic size={14} /> : <MicOff size={14} />}
                    {isListening ? 'Listening...' : 'Speak (Mic)'}
                  </button>
                </div>

                {/* 12-Key DTMF Keypad Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                    <button
                      key={k}
                      onClick={() => handleFarmerVoiceInput(k)}
                      className="py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-200 font-bold text-xs rounded-xl border border-slate-700 active:scale-95 transition-all"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Live Conversation Transcript & Result (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Language Selector */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Globe size={14} className="text-emerald-600" /> Voice Language:
              </span>
              <div className="flex gap-2">
                {[
                  { code: 'ta', label: 'தமிழ் (Tamil)' },
                  { code: 'hi', label: 'हिंदी (Hindi)' },
                  { code: 'en', label: 'English' }
                ].map(l => (
                  <button
                    key={l.code}
                    onClick={() => setSelectedLanguage(l.code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedLanguage === l.code ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dialogue Transcript Feed */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-3 min-h-[300px] flex flex-col justify-between">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {dialogueMessages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <PhoneCall size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs font-bold">Press "Call Helpline" on the Nokia 105 to start the voice session</p>
                  </div>
                ) : (
                  dialogueMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 text-xs ${msg.from === 'ai' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`p-3 rounded-2xl max-w-[80%] ${
                        msg.from === 'ai' ? 'bg-emerald-50 text-emerald-950 border border-emerald-200' : 'bg-indigo-600 text-white'
                      }`}>
                        <span className="text-[10px] font-bold block opacity-75 mb-0.5">
                          {msg.from === 'ai' ? '🤖 Sarvam Voice AI' : '🧑‍🌾 Farmer Spoken Input'}
                        </span>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Spoken Input Bar (Optional Type/Speak input) */}
              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  placeholder='Or type speech: "200 kg Onion at 30 Rs in Salem Omalur"'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      handleFarmerVoiceInput(e.target.value.trim());
                      e.target.value = '';
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  onClick={toggleListening}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  title="Speak via Microphone"
                >
                  <Mic size={16} />
                </button>
              </div>
            </div>

            {/* Successfully Created Listing Card */}
            {callListingResult && (
              <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-2xl space-y-2 animate-in zoom-in-95">
                <div className="flex justify-between items-center text-emerald-950 font-black text-xs">
                  <span>🎉 Produce Listed via Voice AI!</span>
                  <span className="bg-emerald-200 px-2 py-0.5 rounded-full text-[10px]">ID #{callListingResult.id}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs bg-white p-2.5 rounded-xl border border-emerald-200">
                  <div>Crop: <strong>{callListingResult.name}</strong></div>
                  <div>Quantity: <strong>{callListingResult.quantity_kg} kg</strong></div>
                  <div>Price: <strong>₹{callListingResult.price_per_kg}/kg</strong></div>
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold">
                  🏢 Scheduled for Listed on Marketplace at <strong>Direct Marketplace</strong>
                </div>
                <Link
                  to="/marketplace"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all mt-1"
                >
                  <ShoppingBag size={13} />
                  <span>Advance to Step 2: View on Marketplace →</span>
                </Link>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Mode 2: 2-Way SMS Gateway Simulator */}
      {activeTab === 'sms-gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SMS Simulator Form (5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-600" /> Send 2G Structured SMS
            </h3>

            <p className="text-xs text-gray-500">
              Farmers send simple SMS templates like <code className="bg-gray-100 text-blue-800 px-1 py-0.5 rounded font-mono font-bold">SELL ONION 200 30 SALEM</code> without internet.
            </p>

            <form onSubmit={handleSendSms} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Farmer Phone Number</label>
                <input
                  type="text"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">SMS Message</label>
                <textarea
                  rows={3}
                  value={smsInput}
                  onChange={(e) => setSmsInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono"
                  placeholder="SELL ONION 200 30 SALEM"
                />
              </div>

              <div className="flex gap-2">
                {[
                  'SELL ONION 200 30 SALEM',
                  'SELL TOMATO 500 25 KANCHIPURAM',
                  'ORDERS',
                  'EARNINGS'
                ].map((s, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setSmsInput(s)}
                    className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-lg font-mono font-bold truncate"
                  >
                    {s.split(' ')[0]}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSmsLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Send size={14} /> Send SMS to Helpline
              </button>
            </form>
          </div>

          {/* SMS Thread Screen (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-3 min-h-[350px]">
            <h4 className="text-xs font-black uppercase text-gray-400">Live 2-Way SMS Thread</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {smsThread.map((sms, idx) => (
                <div
                  key={idx}
                  className={`flex ${sms.from === 'farmer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-3 rounded-2xl max-w-[85%] text-xs ${
                    sms.from === 'farmer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}>
                    <span className="text-[9px] font-bold block opacity-70 mb-0.5">
                      {sms.from === 'farmer' ? '🧑‍🌾 Farmer (+91 ' + smsPhone + ')' : '🌾 KisanSetu Gateway'}
                    </span>
                    <p className="whitespace-pre-line font-mono">{sms.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Live Dispatched SMS Logs Strip */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
            <Activity size={16} className="text-emerald-600" /> Real Telecom SMS Logs (Twilio Gateway)
          </h3>
          <span className="text-xs text-gray-400 font-mono">{recentSmsLogs.length} Messages Dispatched</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {recentSmsLogs.slice(0, 6).map((log, idx) => (
            <div key={idx} className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-gray-800">To: +91 {log.toPhone}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">{log.status}</span>
              </div>
              <p className="text-gray-600 text-[11px] line-clamp-2">{log.text}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DialphoneGateway;
