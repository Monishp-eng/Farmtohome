import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Filter, SlidersHorizontal, Leaf, Sparkles, MapPin, 
  ArrowUpDown, X, ShoppingBag, Building2, User, Award, TrendingUp, 
  DollarSign, ShieldCheck, CheckCircle2, Clock, Zap, Navigation, 
  RefreshCw, Check 
} from 'lucide-react';
import ProductCard from '../components/products/ProductCard';
import Button from '../components/common/Button';
import LivePriceTicker from '../components/common/LivePriceTicker';
import { CardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { cacheProducts, getCachedProducts } from '../utils/indexedDB';
import useOnlineStatus from '../hooks/useOnlineStatus';

const Marketplace = ({ defaultPersona }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOnline } = useOnlineStatus();

  // Read state from URL search params for URL persistence
  const personaParam = defaultPersona || searchParams.get('persona') || searchParams.get('mode') || 'consumer';
  const sortParam = searchParams.get('sort') || 'smart_match';
  const tabParam = searchParams.get('tab') || 'all';
  const catParam = searchParams.get('category') || 'All';
  const searchParam = searchParams.get('q') || '';
  const gradeParam = searchParams.get('grade') || 'All';
  const distParam = searchParams.get('distance') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const organicParam = searchParams.get('organic') === 'true';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  // Delivery Location Preset for Proximity Calculation
  const [deliveryLocation, setDeliveryLocation] = useState({
    name: searchParams.get('city') || 'Chennai City',
    lat: 13.0827,
    lng: 80.2707
  });

  const presetLocations = [
    { name: 'Chennai City', lat: 13.0827, lng: 80.2707 },
    { name: 'Bangalore Metro', lat: 12.9716, lng: 77.5946 },
    { name: 'Salem District', lat: 11.6643, lng: 78.1460 },
    { name: 'Mumbai Western', lat: 19.0760, lng: 72.8777 },
    { name: 'Pune Suburbs', lat: 18.5204, lng: 73.8567 },
    { name: 'Delhi NCR', lat: 28.7041, lng: 77.1025 }
  ];

  const categories = [
    { id: 'All', label: 'All Crops', icon: '🧺' },
    { id: 'Vegetables', label: 'Vegetables', icon: '🥦' },
    { id: 'Fruits', label: 'Fruits', icon: '🍎' },
    { id: 'Grains', label: 'Grains & Rice', icon: '🌾' },
    { id: 'Pulses', label: 'Pulses & Dal', icon: '🫘' },
    { id: 'Dairy', label: 'Farm Dairy', icon: '🥛' },
    { id: 'Spices', label: 'Spices', icon: '🌶️' },
    { id: 'Oilseeds', label: 'Oilseeds', icon: '🌻' }
  ];

  // Helper to sync all filter updates into the URL search params
  const updateUrlParams = useCallback((newParams) => {
    setSearchParams(prev => {
      const merged = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined || v === 'All' || v === false) {
          merged.delete(k);
        } else {
          merged.set(k, String(v));
        }
      });
      return merged;
    }, { replace: true });
  }, [setSearchParams]);

  // Load products (page 1 on filter change)
  const fetchProducts = useCallback(async (isInitial = true) => {
    if (isInitial) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = isInitial ? 1 : page + 1;
      const params = {
        page: currentPage,
        limit: 12,
        buyer_type: personaParam,
        sortBy: tabParam === 'today' ? 'freshest' : tabParam === 'urgent' ? 'urgent' : tabParam === 'nearby' ? 'nearest' : sortParam,
        user_lat: deliveryLocation.lat,
        user_lng: deliveryLocation.lng
      };

      if (tabParam === 'today') params.freshnessFilter = 'today';
      if (tabParam === 'urgent') params.freshnessFilter = 'urgent';
      if (tabParam === 'nearby') params.maxDistance = '100';

      if (searchParam) params.search = searchParam;
      if (catParam !== 'All') params.category = catParam.toLowerCase();
      if (maxPriceParam) params.maxPrice = maxPriceParam;
      if (organicParam) params.organic = 'true';
      if (gradeParam !== 'All') params.qualityGrade = gradeParam;
      if (distParam) params.maxDistance = distParam;
      if (personaParam === 'bulk') params.minQuantity = '50';

      let data = [];
      let total = 0;

      if (isOnline) {
        try {
          const res = await api.get('/products', { params });
          data = res.data.data || [];
          total = res.data.count || data.length;
          // Cache in IndexedDB for offline viewing
          if (data.length > 0) {
            await cacheProducts(data);
          }
        } catch (apiErr) {
          // Fallback to IndexedDB
          console.warn('[Marketplace] API query failed, reading from IndexedDB');
          data = await getCachedProducts();
          total = data.length;
        }
      } else {
        // Offline mode
        data = await getCachedProducts();
        total = data.length;
      }

      // Filter client-side if offline
      if (!isOnline) {
        if (catParam !== 'All') {
          data = data.filter(p => (p.category || '').toLowerCase() === catParam.toLowerCase());
        }
        if (searchParam) {
          data = data.filter(p => (p.name || '').toLowerCase().includes(searchParam.toLowerCase()));
        }
      }

      if (isInitial) {
        setProducts(data);
      } else {
        setProducts(prev => [...prev, ...data]);
        setPage(currentPage);
      }

      setResultCount(total);
      // If fewer than limit returned, no more items
      setHasMore(data.length >= 12);
    } catch (error) {
      console.error('Marketplace fetch error:', error);
      toast.error('Failed to load marketplace products');
      if (isInitial) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [
    isOnline,
    personaParam,
    sortParam,
    tabParam,
    catParam,
    searchParam,
    maxPriceParam,
    organicParam,
    gradeParam,
    distParam,
    deliveryLocation,
    page
  ]);

  useEffect(() => {
    fetchProducts(true);
  }, [
    personaParam,
    sortParam,
    tabParam,
    catParam,
    searchParam,
    maxPriceParam,
    organicParam,
    gradeParam,
    distParam,
    deliveryLocation
  ]);

  // Infinite Scroll Intersection Observer target
  const observerRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
        fetchProducts(false);
      }
    }, { threshold: 0.1, rootMargin: '200px' });

    const currentElem = observerRef.current;
    if (currentElem) observer.observe(currentElem);

    return () => {
      if (currentElem) observer.unobserve(currentElem);
    };
  }, [hasMore, loading, loadingMore, fetchProducts]);

  const handlePersonaChange = (persona) => {
    updateUrlParams({ persona, mode: persona });
    if (persona === 'bulk') {
      toast.success('Switched to Bulk Wholesale Mode (50kg+ MOQ, up to 15% discount)');
    } else {
      toast.success('Switched to Retail Consumer Mode');
    }
  };

  const handleLocationChange = (loc) => {
    setDeliveryLocation(loc);
    updateUrlParams({ city: loc.name });
    toast.success(`📍 Delivery destination updated to ${loc.name}. Direct transit recalculated!`);
  };

  const clearAllFilters = () => {
    updateUrlParams({
      tab: 'all',
      category: 'All',
      q: '',
      grade: 'All',
      distance: '',
      maxPrice: '',
      organic: false
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Real-time APMC Mandi Price Ticker */}
      <LivePriceTicker />

      {/* Top Banner with Buyer Persona Toggle */}
      <div className="bg-gradient-to-r from-emerald-950 via-primary-dark to-emerald-900 dark:from-slate-950 dark:via-emerald-950 dark:to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden transition-colors">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-amber-400/30">
            <Sparkles size={14} className="text-amber-300" aria-hidden="true" /> Direct Farm-to-Doorstep Freshness & Proximity Engine
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
            Direct Farm-to-Consumer & Bulk Wholesale Marketplace
          </h1>
          <p className="text-emerald-100 dark:text-gray-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Zero middlemen markup. Produce is harvested on demand and dispatched directly from the farm gate in temperature-controlled cold transit.
          </p>
        </div>

        {/* Buyer Persona Mode Switcher */}
        <div className="relative z-10 bg-white/10 dark:bg-slate-900/60 backdrop-blur-md p-3 rounded-2xl border border-white/20 dark:border-slate-800 shadow-lg flex flex-col gap-2 w-full sm:w-auto">
          <span className="text-[11px] text-emerald-200 dark:text-emerald-400 font-bold uppercase tracking-wider px-1">Select Buyer Persona:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePersonaChange('consumer')}
              aria-pressed={personaParam === 'consumer'}
              className={`py-3 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                personaParam === 'consumer'
                  ? 'bg-primary text-white shadow-md ring-2 ring-white/40 scale-105'
                  : 'bg-white/20 text-emerald-100 hover:bg-white/30'
              }`}
            >
              <User size={16} aria-hidden="true" /> 🛒 Individual Consumer
            </button>

            <button
              type="button"
              onClick={() => handlePersonaChange('bulk')}
              aria-pressed={personaParam === 'bulk'}
              className={`py-3 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                personaParam === 'bulk'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-white/40 scale-105'
                  : 'bg-white/20 text-emerald-100 hover:bg-white/30'
              }`}
            >
              <Building2 size={16} aria-hidden="true" /> 🏢 Bulk Buyer / Retailer
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Proximity Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-emerald-200 dark:border-slate-800 shadow-xs mb-6 flex flex-col md:flex-row justify-between items-center gap-3 transition-colors">
        <div className="flex items-center gap-2.5 text-xs text-gray-800 dark:text-gray-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-primary dark:text-emerald-400 flex items-center justify-center font-bold">
            <Navigation size={16} aria-hidden="true" />
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 font-medium block text-[10px]">Your Delivery Destination (Distance & Direct Transit):</span>
            <strong className="text-emerald-950 dark:text-emerald-300 font-black text-sm flex items-center gap-1">
              📍 {deliveryLocation.name}
              <span className="text-[11px] text-gray-400 font-normal">({deliveryLocation.lat.toFixed(2)}° N, {deliveryLocation.lng.toFixed(2)}° E)</span>
            </strong>
          </div>
        </div>

        {/* Location Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          {presetLocations.map(loc => (
            <button
              key={loc.name}
              type="button"
              onClick={() => handleLocationChange(loc)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                deliveryLocation.name === loc.name
                  ? 'bg-emerald-800 dark:bg-emerald-700 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
              }`}
            >
              {loc.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Freshness & Demand Matching Tab Strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {[
          { id: 'all', label: '🌟 All Fresh Produce', icon: <Sparkles size={14} className="text-amber-500" /> },
          { id: 'today', label: '🌿 Harvested Today', icon: <Leaf size={14} className="text-emerald-500" /> },
          { id: 'nearby', label: '📍 Nearest Farms (<100km)', icon: <MapPin size={14} className="text-blue-500" /> },
          { id: 'urgent', label: '⚡ Urgent Fresh Deals (<36h Left)', icon: <Zap size={14} className="text-orange-500" /> }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => updateUrlParams({ tab: tab.id })}
            className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              tabParam === tab.id
                ? 'bg-emerald-900 dark:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400/40'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Category Pills Bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => updateUrlParams({ category: cat.id })}
            className={`py-2 px-3.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              catParam === cat.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Search & Sort Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs mb-6 flex flex-col sm:flex-row justify-between items-center gap-3 transition-colors">
        {/* Search Bar */}
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search crop, farmer name, village (e.g. Salem, Tomato)..."
            value={searchParam}
            onChange={(e) => updateUrlParams({ q: e.target.value })}
            className="w-full pl-10 pr-9 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} aria-hidden="true" />
          {searchParam && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => updateUrlParams({ q: '' })}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={sortParam}
            onChange={(e) => updateUrlParams({ sort: e.target.value })}
            aria-label="Sort products by"
            className="text-xs font-bold border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="smart_match">🌟 Smart Match: Nearest & Freshest</option>
            <option value="nearest">📍 Nearest Farm First</option>
            <option value="freshest">🌿 Freshest Harvest First</option>
            <option value="urgent">⚡ Urgent Farm Deals (&lt;36h Left)</option>
            <option value="price_asc">💵 Price: Low to High</option>
            <option value="price_desc">💎 Price: High to Low</option>
            <option value="quantity_desc">📦 Stock: Largest First</option>
            <option value="newest">🕒 Newest Listed</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 text-xs ${showFilters ? 'bg-primary text-white border-primary' : ''}`}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Filters</span>
          </Button>
        </div>
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs animate-slide-up transition-colors">
          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Quality Grade</label>
            <select
              value={gradeParam}
              onChange={(e) => updateUrlParams({ grade: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-medium"
            >
              <option value="All">All Grades (A, B, C)</option>
              <option value="A">Grade A (Export Quality)</option>
              <option value="B">Grade B (Standard Market)</option>
              <option value="C">Grade C (Processing / Bulk)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Max Distance from You</label>
            <select
              value={distParam}
              onChange={(e) => updateUrlParams({ distance: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-medium"
            >
              <option value="">Any Distance (Nationwide)</option>
              <option value="25">Within 25 km (Local Express)</option>
              <option value="50">Within 50 km (Suburban)</option>
              <option value="150">Within 150 km (Regional Farm Belt)</option>
              <option value="300">Within 300 km (Statewide)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Max Price per KG (₹)</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={maxPriceParam}
              onChange={(e) => updateUrlParams({ maxPrice: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl cursor-pointer font-bold text-green-900 dark:text-green-300">
              <input
                type="checkbox"
                checked={organicParam}
                onChange={(e) => updateUrlParams({ organic: e.target.checked })}
                className="h-4 w-4 text-primary rounded"
              />
              <Leaf size={14} className="text-primary" aria-hidden="true" /> 100% Certified Organic
            </label>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex justify-between items-center mb-4 text-xs text-gray-600 dark:text-gray-400">
        <span>
          Showing <strong>{products.length}</strong> of <strong>{resultCount}</strong> direct farm listings for <strong>{deliveryLocation.name}</strong>
        </span>
        <span className="text-emerald-800 dark:text-emerald-400 font-bold hidden sm:inline">
          🚚 Zero Middlemen · Direct Farm Gate Pickup
        </span>
      </div>

      {/* Products Grid Feed */}
      {loading ? (
        <CardSkeleton count={8} />
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard 
                key={product.id || product._id} 
                product={product} 
                buyerPersona={personaParam} 
              />
            ))}
          </div>

          {/* Infinite Scroll Trigger Element */}
          <div ref={observerRef} className="py-8 text-center flex flex-col items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                <RefreshCw size={16} className="animate-spin text-primary" />
                <span>Harvesting more fresh produce...</span>
              </div>
            )}
            {!hasMore && products.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                ✓ You have viewed all available produce listings for this region
              </p>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          icon="🧺"
          title="No farm produce matches your active filters"
          description="Try broadening your distance or resetting the freshness filter to view more harvests from other districts."
          actionLabel="Reset All Filters"
          onAction={clearAllFilters}
        />
      )}
    </div>
  );
};

export default Marketplace;
