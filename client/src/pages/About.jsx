import React from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Sprout, ShieldCheck, Sparkles, Truck, PhoneCall, Stethoscope, TrendingUp, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '../components/common/Button';

const About = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-950 via-primary-dark to-emerald-900 text-white p-8 sm:p-12 rounded-3xl shadow-xl relative overflow-hidden text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-400/30">
          <Sparkles size={14} /> Democratizing Indian Agriculture Through Technology
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl mx-auto leading-tight">
          Empowering Indian Farmers with <span className="text-amber-300">Direct Fair Trade</span>
        </h1>
        <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Eliminating 5-7 layers of middlemen so farmers receive **98% direct payment** for their harvest, while urban families get farm-fresh produce at honest prices.
        </p>
      </div>

      {/* The Fundamental Problem & Our Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <div className="bg-red-50/70 border-2 border-red-200 rounded-3xl p-8 space-y-4">
          <span className="bg-red-200 text-red-900 text-xs font-black px-3 py-1 rounded-full uppercase">The Traditional Problem</span>
          <h2 className="text-2xl font-black text-red-950">Why Rural Farmers Struggle</h2>
          <p className="text-xs sm:text-sm text-red-900 leading-relaxed">
            In the conventional mandi system, a single tomato travels through local brokers, commission agents, regional auctioneers, cold storage hoarders, and city wholesalers. By the time it reaches your kitchen:
          </p>
          <ul className="space-y-2 text-xs text-red-950 font-medium">
            <li className="flex items-center gap-2">❌ Farmer receives only <strong>15–25%</strong> of the retail price.</li>
            <li className="flex items-center gap-2">❌ Produce spends <strong>4–6 days</strong> in transit, losing freshness.</li>
            <li className="flex items-center gap-2">❌ Unsophisticated farmers face distress selling without price benchmarks.</li>
          </ul>
        </div>

        <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-3xl p-8 space-y-4 shadow-sm">
          <span className="bg-emerald-200 text-emerald-900 text-xs font-black px-3 py-1 rounded-full uppercase">Our Revolutionary Model</span>
          <h2 className="text-2xl font-black text-emerald-950">Direct Farm-to-Consumer & Wholesale</h2>
          <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
            We built a unified digital platform uniting basic 2G dialphone accessibility, AI market intelligence, and optimized logistics:
          </p>
          <ul className="space-y-2 text-xs text-emerald-950 font-medium">
            <li className="flex items-center gap-2">✅ <strong>98% Direct Farmer Payout</strong> with transparent 2% platform fee.</li>
            <li className="flex items-center gap-2">✅ <strong>24–48h Farm Gate Transit</strong> with direct traceability.</li>
            <li className="flex items-center gap-2">✅ <strong>2G Keypad Missed-Call Listing</strong> for farmers without smartphones.</li>
          </ul>
        </div>
      </div>

      {/* 4 Core Pillars */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">Four Architectural Pillars</h3>
          <p className="text-xs text-gray-500 mt-1">Combining accessibility, artificial intelligence, and operations research.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <PhoneCall size={24} />
            </div>
            <h4 className="font-black text-base text-gray-900">2G Dialphone & SMS</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Virtual number missed call and formatted SMS for zero-internet rural farmers in Tamil, Hindi, Marathi & English.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <h4 className="font-black text-base text-gray-900">Price Transparency</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Real-time Mandi modal and Govt MSP benchmarks at point-of-listing preventing unfair underpricing.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <TrendingUp size={24} />
            </div>
            <h4 className="font-black text-base text-gray-900">AI Demand Forecaster</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Machine Learning projections anticipating 6-month crop consumption patterns and monsoon rainfall impacts.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Truck size={24} />
            </div>
            <h4 className="font-black text-base text-gray-900">2-Opt Route Optimizer</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Traveling Salesperson multi-stop route sequencing saving 30%+ fuel and reducing vehicle carbon emissions.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Bar */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-8 text-center space-y-4">
        <h3 className="text-2xl font-black text-emerald-950">Join the Fair-Trade Revolution</h3>
        <p className="text-xs sm:text-sm text-emerald-800 max-w-xl mx-auto">
          Whether you are a rural farmer, an individual consumer, or a bulk retail buyer, you can start today.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/marketplace">
            <Button className="bg-primary hover:bg-primary-dark text-white font-black text-xs px-6 py-3 rounded-xl shadow-md flex items-center gap-2">
              Browse Farm Harvests <ArrowRight size={14} />
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="outline" className="text-xs font-bold px-6 py-3 rounded-xl border-2 border-primary text-primary hover:bg-emerald-100">
              Join as a Farmer / Buyer
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
};

export default About;
