import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Shield, TrendingUp, Users, Sparkles, HeartHandshake, CheckCircle2, PhoneCall, Stethoscope, ShoppingBag, Sprout, Star, Truck } from 'lucide-react';
import Button from '../components/common/Button';
import ProductCard from '../components/products/ProductCard';
import api from '../api/axios';
import toast from 'react-hot-toast';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/products?limit=8');
        setFeaturedProducts(res.data.data || []);
      } catch (error) {
        toast.error('Failed to load featured products');
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const categories = [
    { id: 'all', label: 'All Fresh', icon: '🧺' },
    { id: 'vegetables', label: 'Vegetables', icon: '🥦' },
    { id: 'fruits', label: 'Fruits', icon: '🍎' },
    { id: 'grains', label: 'Grains & Rice', icon: '🌾' },
    { id: 'pulses', label: 'Pulses & Dal', icon: '🫘' },
    { id: 'dairy', label: 'Farm Dairy', icon: '🥛' },
    { id: 'spices', label: 'Spices', icon: '🌶️' }
  ];

  const filteredProducts = activeCategory === 'all'
    ? featuredProducts
    : featuredProducts.filter(p => p.category?.toLowerCase() === activeCategory);

  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-950 via-primary-dark to-emerald-900 text-white overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-400/30 backdrop-blur-sm">
                <Sparkles size={14} className="animate-spin" /> Direct Farmer-to-Consumer Revolution
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                Buy Fresh Directly From <span className="text-amber-300 underline decoration-amber-400/40">Verified Farmers</span>.
              </h1>

              <p className="text-emerald-100 text-base sm:text-lg max-w-xl leading-relaxed">
                Zero middlemen. Transparent pricing. <strong>98% of your payment goes directly to the farmer</strong>, giving your family farm-fresh harvest at honest prices.
              </p>

              <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                <Link to="/marketplace">
                  <Button size="lg" className="w-full sm:w-auto text-base font-bold shadow-xl flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950">
                    <ShoppingBag size={18} /> Browse Farm Produce <ArrowRight size={16} />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base font-bold bg-white/10 text-white border-white/40 hover:bg-white hover:text-emerald-900 backdrop-blur-sm">
                    🧑‍🌾 Join as a Farmer
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/20 text-xs">
                <div>
                  <p className="text-xl font-black text-amber-300">98%</p>
                  <p className="text-emerald-200 text-[11px]">Direct Farmer Pay</p>
                </div>
                <div>
                  <p className="text-xl font-black text-amber-300">24-48 hrs</p>
                  <p className="text-emerald-200 text-[11px]">Farm Gate to Kitchen</p>
                </div>
                <div>
                  <p className="text-xl font-black text-amber-300">100%</p>
                  <p className="text-emerald-200 text-[11px]">Farm Traceability</p>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Card */}
            <div className="lg:col-span-5">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl text-white space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Leaf size={14} /> Live Farm-to-Consumer Savings
                  </span>
                  <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">LIVE</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-white/10 p-3 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🍅</span>
                      <div>
                        <p className="font-bold text-white">Fresh Red Tomatoes</p>
                        <p className="text-[11px] text-emerald-200">Murugan Farm • Salem (500kg)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-amber-300 text-base">₹25/kg</p>
                      <p className="text-[10px] text-emerald-300 line-through">Mkt: ₹45/kg</p>
                    </div>
                  </div>

                  <div className="bg-white/10 p-3 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🧅</span>
                      <div>
                        <p className="font-bold text-white">Nasik Red Onions</p>
                        <p className="text-[11px] text-emerald-200">Patil Farm • Nashik (300kg)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-amber-300 text-base">₹22/kg</p>
                      <p className="text-[10px] text-emerald-300 line-through">Mkt: ₹38/kg</p>
                    </div>
                  </div>

                  <div className="bg-white/10 p-3 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🌾</span>
                      <div>
                        <p className="font-bold text-white">Organic Basmati Rice</p>
                        <p className="text-[11px] text-emerald-200">Harpreet Farm • Punjab (1000kg)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-amber-300 text-base">₹65/kg</p>
                      <p className="text-[10px] text-emerald-300 line-through">Mkt: ₹110/kg</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link to="/marketplace" className="block text-center text-xs font-bold text-amber-300 hover:text-amber-200 hover:underline">
                    View All 25+ Direct Farm Harvests →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Direct Price Comparison (The Middleman Problem Solved) */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Why Direct Selling Changes Everything
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              In traditional supermarkets, 65% of your money goes to brokers, commission agents, and cold storage hoarders. We eliminated them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Middleman Way */}
            <div className="bg-red-50/60 border-2 border-red-200 rounded-3xl p-6 sm:p-8 relative">
              <span className="absolute top-4 right-4 bg-red-100 text-red-800 text-[11px] font-bold px-3 py-1 rounded-full">
                Traditional System
              </span>
              <h3 className="font-extrabold text-lg text-red-900 mb-4 flex items-center gap-2">
                <span>❌</span> 5-Layer Middlemen Chain
              </h3>
              <div className="space-y-2.5 text-xs text-red-950">
                <div className="p-2.5 bg-white rounded-xl border border-red-200 flex justify-between items-center">
                  <span>🧑‍🌾 Farmer sells at village gate:</span>
                  <span className="font-bold text-red-700">₹12/kg (Barely covers cost)</span>
                </div>
                <div className="p-2.5 bg-white/70 rounded-xl flex justify-between items-center">
                  <span>1. Local Village Commission Broker:</span>
                  <span className="font-bold">+ ₹6/kg cut</span>
                </div>
                <div className="p-2.5 bg-white/70 rounded-xl flex justify-between items-center">
                  <span>2. APMC Mandi Trader & Auctioneer:</span>
                  <span className="font-bold">+ ₹8/kg cut</span>
                </div>
                <div className="p-2.5 bg-white/70 rounded-xl flex justify-between items-center">
                  <span>3. Supermarket Wholesale Distributor:</span>
                  <span className="font-bold">+ ₹14/kg markup</span>
                </div>
                <div className="p-3 bg-red-100/80 rounded-xl font-bold flex justify-between items-center text-sm text-red-900 border border-red-300">
                  <span>🛒 Consumer Pays Supermarket:</span>
                  <span>₹40/kg (Farmer got only ₹12)</span>
                </div>
              </div>
            </div>

            {/* Our Direct Model */}
            <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 relative shadow-md">
              <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full">
                For Farmers, For Us
              </span>
              <h3 className="font-extrabold text-lg text-emerald-900 mb-4 flex items-center gap-2">
                <span>✅</span> Direct Farm-to-Consumer
              </h3>
              <div className="space-y-2.5 text-xs text-emerald-950">
                <div className="p-2.5 bg-white rounded-xl border border-emerald-300 flex justify-between items-center">
                  <span>🧑‍🌾 Farmer lists harvest directly:</span>
                  <span className="font-bold text-emerald-700">₹25/kg (Double earnings!)</span>
                </div>
                <div className="p-2.5 bg-white/70 rounded-xl flex justify-between items-center">
                  <span>✨ Transparent Platform Fee:</span>
                  <span className="font-bold text-emerald-700">Strictly 2% (₹0.50)</span>
                </div>
                <div className="p-2.5 bg-white/70 rounded-xl flex justify-between items-center">
                  <span>🚚 Direct Local Farm Transit:</span>
                  <span className="font-bold text-emerald-700">₹2.50/kg</span>
                </div>
                <div className="p-3 bg-emerald-100/90 rounded-xl font-bold flex justify-between items-center text-sm text-emerald-900 border border-emerald-400">
                  <span>🛒 Consumer Pays:</span>
                  <span>₹28/kg (Save ₹12/kg & Fresh Harvest!)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Direct Produce Marketplace Grid */}
      <section className="py-16 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-1">
                <Sprout size={14} /> Harvested Today
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Featured Direct Farm Produce
              </h2>
            </div>
            <Link to="/marketplace">
              <Button variant="outline" className="text-xs font-bold flex items-center gap-1.5">
                Explore All 50+ Listings <ArrowRight size={14} />
              </Button>
            </Link>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeCategory === c.id
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>

          {/* Produce Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-72 bg-gray-200 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center text-gray-400 text-sm">
              No products found in this category. Check other categories or view all listings!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Core Pillars: 2G Dialphone, Direct Farm Logistics, AI Agri-Doctor */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Three Pillars of Agricultural Disruption
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Combining 2G telecom accessibility, direct farm-to-doorstep delivery, and generative AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: 2G Dialphone & IVR */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold">
                  <PhoneCall size={13} /> Zero Internet Required
                </div>
                <h3 className="text-xl font-black">2G Voice AI Helpline</h3>
                <p className="text-amber-100 text-xs leading-relaxed">
                  Farmers dial our helpline to list harvests in <strong>Tamil, Hindi, or English</strong> using Sarvam AI Voice.
                </p>
              </div>
              <div className="pt-6 relative z-10">
                <Link to="/dialphone">
                  <Button className="bg-white text-slate-900 hover:bg-amber-100 font-bold text-xs px-4 py-2 shadow-md w-full">
                    Try Dialphone Helpline →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 2: Direct Farm Logistics */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden border border-indigo-800/50">
              <div className="space-y-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full text-xs font-bold border border-indigo-400/30">
                  <Truck size={13} /> Farm Network
                </div>
                <h3 className="text-xl font-black">Direct Farm-to-Doorstep Delivery</h3>
                <p className="text-indigo-200 text-xs leading-relaxed">
                  Stage 1 Farm Gate intake to <strong>Direct Farm Pickup</strong> & Stage 2 doorstep delivery via 2-Opt TSP routing.
                </p>
              </div>
              <div className="pt-6 relative z-10">
                <Link to="/logistics/dashboard">
                  <Button className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs px-4 py-2 shadow-md w-full">
                    View Chennai Dispatches →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 3: Kisan Agri-Doctor */}
            <div className="bg-gradient-to-br from-emerald-700 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold">
                  <Stethoscope size={13} /> AI Plant Pathology
                </div>
                <h3 className="text-xl font-black">Kisan Crop Doctor</h3>
                <p className="text-emerald-100 text-xs leading-relaxed">
                  Speak crop symptoms in your mother tongue for instant AI diagnosis, organic neem remedies, and treatments.
                </p>
              </div>
              <div className="pt-6 relative z-10">
                <Link to="/agri-doctor">
                  <Button className="bg-white text-emerald-950 hover:bg-emerald-100 font-bold text-xs px-4 py-2 shadow-md w-full">
                    Diagnose Crop Free →
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
