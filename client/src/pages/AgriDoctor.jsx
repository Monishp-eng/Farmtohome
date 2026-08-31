import React, { useState, useEffect, useRef } from 'react';
import { Stethoscope, Sparkles, Mic, MicOff, AlertCircle, CheckCircle2, Leaf, Shield, Droplets, RefreshCw, Send, Globe, ChevronRight } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import api from '../api/axios';

const AgriDoctor = () => {
  const [cropName, setCropName] = useState('Tomato');
  const [symptoms, setSymptoms] = useState('');
  const [soilType, setSoilType] = useState('Red Loam');
  const [region, setRegion] = useState('Maharashtra');
  const [language, setLanguage] = useState('en'); // 'en', 'hi', 'ta', 'mr'
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);

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
        setSymptoms(prev => prev ? `${prev} ${text}` : text);
      };
      recognitionRef.current = rec;
    }
  }, [language]);

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

  const handleDiagnose = async (e) => {
    e?.preventDefault();
    if (!symptoms.trim()) {
      toast.error('Please describe crop symptoms or issues');
      return;
    }

    setIsDiagnosing(true);
    setDiagnosisResult(null);

    try {
      const res = await api.post('/copilot/diagnose', {
        cropName,
        symptoms,
        soilType,
        region,
        language
      });

      setDiagnosisResult(res.data.data);
      toast.success('Diagnosis completed by Kisan Doctor!');
    } catch (err) {
      toast.error('Diagnosis failed. Please try again.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-primary to-emerald-800 text-white p-8 rounded-3xl shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-400/20 text-emerald-200 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-400/30">
            <Stethoscope size={14} className="text-emerald-300 animate-pulse" /> AI Crop Health Doctor & Pest Diagnostic Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Kisan Agri-Doctor (किसान फसल डॉक्टर / உழவன் மருத்துவர்)
          </h1>
          <p className="text-emerald-100 max-w-3xl text-sm md:text-base leading-relaxed">
            AI-powered plant pathology, pest diagnosis, and organic treatment advisor. Speak or type your crop symptoms in **Tamil**, **Hindi**, **Marathi**, or **English** for instant step-by-step remedies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border border-gray-200 shadow-md">
            <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <Leaf className="text-primary" size={20} /> Describe Crop Symptoms
            </h3>

            <form onSubmit={handleDiagnose} className="space-y-4">
              {/* Language Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Globe size={13} className="text-primary" /> Advice Language (सल्ला भाषा)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'ta', label: 'தமிழ்' },
                    { id: 'hi', label: 'हिंदी' },
                    { id: 'mr', label: 'मराठी' },
                    { id: 'en', label: 'English' }
                  ].map(l => (
                    <button
                      type="button"
                      key={l.id}
                      onClick={() => setLanguage(l.id)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        language === l.id
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crop Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Crop (फसल / பயிர்)</label>
                <select
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="Tomato">Tomato (तमाटर / தக்காளி)</option>
                  <option value="Onion">Onion (प्याज / வெங்காயம்)</option>
                  <option value="Paddy (Rice)">Paddy / Rice (धान / நெல்)</option>
                  <option value="Wheat">Wheat (गेहूं / கோதுமை)</option>
                  <option value="Cotton">Cotton (कपास / பருத்தி)</option>
                  <option value="Chilli">Chilli (मिर्च / மிளகாய்)</option>
                  <option value="Sugarcane">Sugarcane (गन्ना / கரும்பு)</option>
                  <option value="Banana">Banana (केला / வாழை)</option>
                  <option value="Mango">Mango (आम / மாம்பழம்)</option>
                  <option value="Potato">Potato (आलू / உருளைக்கிழங்கு)</option>
                  <option value="Turmeric">Turmeric (हल्दी / மஞ்சள்)</option>
                  <option value="Soybean">Soybean (सोयाबीन)</option>
                </select>
              </div>

              {/* Region & Soil */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">State / Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-white font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Gujarat">Gujarat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Soil Type</label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-white font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="Black Clay (Regur)">Black Soil (काळी माती)</option>
                    <option value="Red Loam">Red Soil (செம்மண்)</option>
                    <option value="Alluvial Soil">Alluvial Soil (गाळाची माती)</option>
                    <option value="Sandy Loam">Sandy Loam (மணல் மண்)</option>
                  </select>
                </div>
              </div>

              {/* Symptoms Input with Voice */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">Observed Symptoms / Damage</label>
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`text-xs flex items-center gap-1 font-bold px-2 py-1 rounded-lg transition-colors ${
                      isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                    {isListening ? 'Listening...' : 'Speak Symptoms'}
                  </button>
                </div>
                <textarea
                  rows="4"
                  required
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Leaves turning yellow with brown spots on edges, whiteflies observed underneath leaves, curling of tender shoots..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                />
              </div>

              {/* Preset Symptom Buttons */}
              <div>
                <p className="text-[11px] font-bold text-gray-500 mb-1.5">Common Issue Templates:</p>
                <div className="space-y-1.5">
                  {[
                    'Yellow leaves with dark circular rings (Early Blight)',
                    'White powder on top of leaves & stunted fruit growth',
                    'Curling shoots with tiny black insects underneath (Aphids)',
                    'Root wilting and yellowing stems after irrigation'
                  ].map((s, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSymptoms(s)}
                      className="w-full text-left text-[11px] p-2 bg-gray-50 hover:bg-green-50 border border-gray-200 rounded-lg text-gray-700 transition-colors flex items-center justify-between"
                    >
                      <span>{s}</span>
                      <ChevronRight size={12} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isDiagnosing}
                className="w-full py-3 flex items-center justify-center gap-2 font-bold text-sm shadow-md"
              >
                {isDiagnosing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Diagnosing with Kisan Doctor...
                  </>
                ) : (
                  <>
                    <Stethoscope size={18} /> Get AI Diagnosis & Treatment
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right: AI Diagnosis Results */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 border border-gray-200 shadow-md">
            <h3 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} /> Agronomy Diagnosis & Prescription
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Scientifically verified remedies combining Integrated Pest Management (IPM), bio-pesticides, and soil management.
            </p>

            {diagnosisResult ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-3">
                    <CheckCircle2 size={18} className="text-emerald-600" /> Diagnosis for {cropName} ({soilType}, {region})
                  </div>
                  <div className="text-xs text-emerald-950 leading-relaxed whitespace-pre-wrap font-medium">
                    {diagnosisResult.diagnosis}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-green-50 border border-green-200 p-3.5 rounded-xl">
                    <Leaf className="text-green-600 mb-1" size={18} />
                    <h5 className="font-bold text-green-900 mb-1">Organic First</h5>
                    <p className="text-green-800 text-[11px]">Neem oil, Jeevamrit & Trichoderma reduce chemical residue by 80%.</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
                    <Droplets className="text-blue-600 mb-1" size={18} />
                    <h5 className="font-bold text-blue-900 mb-1">Irrigation Care</h5>
                    <p className="text-blue-800 text-[11px]">Avoid evening flooding to stop fungal spore spread.</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
                    <Shield className="text-amber-600 mb-1" size={18} />
                    <h5 className="font-bold text-amber-900 mb-1">Govt Support</h5>
                    <p className="text-amber-800 text-[11px]">Access PMKSY subsidies for drip irrigation & bio-inputs.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                <Stethoscope size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600 mb-1">No Active Diagnosis</p>
                <p className="text-xs text-gray-400">
                  Select your crop and describe the symptoms on the left to generate an instant diagnosis and prescription.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgriDoctor;
