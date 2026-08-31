import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Mic, MicOff, Volume2, VolumeX, Settings, Globe, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const KisanCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en', 'hi', 'ta', 'mr'
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '🌾 **Namaste! I am Kisan Copilot (किसान साथी)**.\nHow can I help you today with crops, Mandi prices, direct selling, or marketplace orders?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Settings
  const [llmProvider, setLlmProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [grokKey, setGrokKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      const langCodeMap = { 'ta': 'ta-IN', 'hi': 'hi-IN', 'mr': 'mr-IN', 'en': 'en-IN' };
      rec.lang = langCodeMap[language] || 'en-IN';

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setInputValue(text);
        handleSendMessage(text);
      };
      recognitionRef.current = rec;
    }
  }, [language]);

  const speakReply = (text) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    // Strip markdown formatting for cleaner speech
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    const langCodeMap = { 'ta': 'ta-IN', 'hi': 'hi-IN', 'mr': 'mr-IN', 'en': 'en-IN' };
    utterance.lang = langCodeMap[language] || 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputValue;
    if (!textToSend.trim()) return;

    const userMsg = {
      role: 'user',
      content: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/copilot/chat', {
        message: userMsg.content,
        history: historyPayload,
        language
      });

      const replyText = res.data.data.reply;
      const assistantMsg = {
        role: 'assistant',
        content: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: res.data.data.provider
      };

      setMessages(prev => [...prev, assistantMsg]);
      speakReply(replyText);
    } catch (err) {
      toast.error('Copilot request failed');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue. Please try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await api.post('/copilot/config', {
        geminiKey,
        grokKey,
        openaiKey,
        provider: llmProvider
      });
      toast.success('LLM API configuration updated successfully!');
      setShowSettings(false);
    } catch (err) {
      toast.error('Failed to save API configuration');
    }
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        toast.error('Could not access microphone');
      }
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white p-4 rounded-full shadow-2xl flex items-center gap-2 group transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-white/30"
          aria-label="Open Kisan Copilot"
        >
          <div className="relative">
            <Bot size={26} className="animate-bounce" />
            <Sparkles size={12} className="absolute -top-1 -right-1 text-amber-300 animate-spin" />
          </div>
          <span className="hidden sm:inline font-bold text-sm pr-1">Kisan AI Copilot</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[440px] h-[580px] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-dark via-primary to-earth text-white p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                <Bot size={22} className="text-amber-200" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  Kisan Copilot <span className="text-[10px] bg-amber-400/30 text-amber-200 px-1.5 py-0.5 rounded font-mono">AI</span>
                </h3>
                <p className="text-[11px] text-gray-200">Multilingual Agri Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
                title="LLM Settings (Gemini / Grok / OpenAI API Keys)"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Settings Sub-panel */}
          {showSettings ? (
            <div className="p-5 flex-1 overflow-y-auto bg-gray-50 text-xs">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1">
                  <Settings size={15} className="text-primary" /> Multi-LLM Provider Settings
                </h4>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <p className="text-gray-500 mb-4 text-[11px]">
                Connect your preferred LLM provider API key. Fallback agronomist engine operates automatically if no key is supplied.
              </p>

              <form onSubmit={handleSaveConfig} className="space-y-3.5">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Active LLM Provider</label>
                  <select
                    value={llmProvider}
                    onChange={(e) => setLlmProvider(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white font-medium"
                  >
                    <option value="gemini">Google Gemini (gemini-2.0-flash)</option>
                    <option value="grok">xAI Grok (grok-2)</option>
                    <option value="openai">OpenAI (GPT-4o mini)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Google Gemini API Key</label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">xAI Grok API Key</label>
                  <input
                    type="password"
                    placeholder="xai-..."
                    value={grokKey}
                    onChange={(e) => setGrokKey(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">OpenAI API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2 rounded-lg"
                  >
                    Save Keys
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Language Toolbar */}
              <div className="bg-gray-100 px-4 py-2 flex justify-between items-center text-[11px] border-b border-gray-200">
                <span className="font-semibold text-gray-600 flex items-center gap-1">
                  <Globe size={12} className="text-primary" /> Language:
                </span>
                <div className="flex gap-1.5">
                  {[
                    { id: 'en', label: 'English' },
                    { id: 'hi', label: 'हिंदी' },
                    { id: 'ta', label: 'தமிழ்' },
                    { id: 'mr', label: 'मराठी' }
                  ].map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLanguage(l.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        language === l.id ? 'bg-primary text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gradient-to-b from-slate-50 to-white text-xs">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-end gap-1.5 max-w-[88%]">
                      {m.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0 mb-1">
                          <Bot size={13} />
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                          m.role === 'user'
                            ? 'bg-primary text-white rounded-br-none shadow-md font-medium'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {m.content}
                        {m.provider && (
                          <div className="text-[9px] mt-1 pt-1 border-t border-gray-100 text-gray-400 font-mono flex items-center gap-1">
                            <Sparkles size={9} /> Provider: {m.provider}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 px-1">{m.time}</span>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-primary font-medium p-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                    Kisan Copilot is thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex gap-1.5 overflow-x-auto text-[10px]">
                {[
                  '🍅 Today Tomato mandi price?',
                  '🌱 Organic pest control advice',
                  '💰 How direct selling saves fees'
                ].map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(chip)}
                    className="bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full whitespace-nowrap hover:border-primary hover:text-primary transition-colors flex-shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                <button
                  onClick={toggleMic}
                  className={`p-2 rounded-xl transition-all ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isListening ? 'Stop Speaking' : 'Voice Input'}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isListening ? 'Listening...' : 'Ask about crops, prices, orders...'}
                  className="flex-1 text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white p-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default KisanCopilot;
