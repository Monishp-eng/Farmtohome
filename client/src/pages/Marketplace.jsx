import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, Leaf, Sparkles, MapPin, ArrowUpDown, X, ShoppingBag, Building2, User, Award, TrendingUp, DollarSign, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ProductCard from '../components/products/ProductCard';
import Button from '../components/common/Button';
import api from '../api/axios';
import toast from 'react-hot-toast';

const Marketplace = ({ defaultPersona }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPersona = defaultPersona || searchParams.get('persona') || searchParams.get('mode') || 'consumer';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [buyerPersona, setBuyerPersona] = useState(initialPersona); // 'consumer' or 'bulk'
  const [sortBy, setSortBy] = useState('newest');

  const [filters, setFilters] = useState({
    search: '',
    category: 'All',
    minPrice: '',
    maxPrice: '',
    isOrganic: false,
    qualityGrade: 'All',
    location: 'All',
    minQuantity: initialPersona === 'bulk' ? '50' : ''
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const urlPersona = searchParams.get('persona') || searchParams.get('mode');
    if (urlPersona && (urlPersona === 'bulk' || urlPersona === 'consumer')) {
      setBuyerPersona(urlPersona);
      setFilters(prev => ({ ...prev, minQuantity: urlPersona === 'bulk' ? '50' : '' }));
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 250);
    return () => clearTimeout(handler);
  }, [filters.search]);

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, filters.category, filters.minPrice, filters.maxPrice, filters.isOrganic, filters.qualityGrade, filters.location, filters.minQuantity, buyerPersona, sortBy]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        buyer_type: buyerPersona,
        sortBy
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.category !== 'All') params.category = filters.category.toLowerCase();
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.isOrganic) params.organic = 'true';
      if (filters.qualityGrade !== 'All') params.qualityGrade = filters.qualityGrade;
      if (filters.location !== 'All') params.location = filters.location;
      if (filters.minQuantity) params.minQuantity = filters.minQuantity;

      params.user_lat = 12.9716;
      params.user_lng = 77.5946;

      const res = await api.get('/products', { params });
      let data = res.data.data || [];

      setProducts(data);
      setResultCount(data.length);
    } catch (error) {
      toast.error('Failed to load marketplace products');
      setProducts([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonaChange = (persona) => {
    setBuyerPersona(persona);
    setSearchParams({ persona });
    if (persona === 'bulk') {
      setFilters(prev => ({ ...prev, minQuantity: '50' }));
      toast.success('Switched to Bulk Wholesale Mode (Lots 50kg+, Up to 15% discount)');
    } else {
      setFilters(prev => ({ ...prev, minQuantity: '' }));
      toast.success('Switched to Individual Consumer Mode (Retail baskets)');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value
    });
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner with Buyer Persona Toggle */}
      <div className="bg-gradient-to-r from-emerald-950 via-primary-dark to-emerald-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-amber-400/30">
            <Sparkles size={14} className="text-amber-300" /> Transparent Fair-Trade Digital Market
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
            Direct Farm-to-Consumer & Bulk Wholesale Marketplace
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-2 leading-relaxed">
            Eliminating 5-7 layers of middlemen. The farmer gets 98% direct payment, while buyers save up to 25% compared to retail supermarkets.
          </p>
        </div>

        {/* Buyer Persona Mode Switcher Card */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-lg flex flex-col gap-2 w-full sm:w-auto">
          <span className="text-[11px] text-emerald-200 font-bold uppercase tracking-wider px-1">Select Buyer Persona:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePersonaChange('consumer')}
              className={`py-3 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                buyerPersona === 'consumer'
                  ? 'bg-primary text-white shadow-md ring-2 ring-white/40 scale-105'
                  : 'bg-white/20 text-emerald-100 hover:bg-white/30'
              }`}
            >
              <User size={16} /> 🛒 Individual Consumer
            </button>

            <button
              onClick={() => handlePersonaChange('bulk')}
              className={`py-3 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                buyerPersona === 'bulk'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-white/40 scale-105'
                  : 'bg-white/20 text-emerald-100 hover:bg-white/30'
              }`}
            >
              <Building2 size={16} /> 🏢 Bulk Buyer / Retailer
            </button>
          </div>
        </div>
      </div>

      {/* Buyer Persona Notice Banner */}
      {buyerPersona === 'bulk' ? (
        <div className="bg-purple-50 border-2 border-purple-300 p-5 rounded-2xl mb-6 flex flex-wrap justify-between items-center gap-3 text-xs text-purple-950 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-purple-950">Bulk Wholesale Mode Active</p>
              <p className="text-purple-700 mt-0.5">Showing wholesale lots with Minimum Order Quantity 50kg+. Automatic tiered volume discounts up to 15% applied at checkout.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-200 text-purple-900 font-bold px-3 py-1 rounded-full text-xs">
              MOQ 50kg+
            </span>
            <button
              onClick={() => handlePersonaChange('consumer')}
              className="text-xs text-purple-700 underline font-bold hover:text-purple-900"
            >
              Switch to Consumer
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl mb-6 flex flex-wrap justify-between items-center gap-3 text-xs text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={18} />
            <span><strong>Individual Consumer Mode:</strong> Small retail baskets (1–20kg), doorstep delivery, and 100% price transparency against APMC Mandi rates.</span>
          </div>
          <span className="bg-emerald-200 text-emerald-900 font-bold px-3 py-1 rounded-full text-[11px]">
            98% Farmer Pay
          </span>
        </div>
      )}

      {/* Category Pills Bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilters({ ...filters, category: cat.id })}
            className={`py-2 px-3.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              filters.category === cat.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Search & Sort Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            name="search"
            placeholder="Search crop, farmer name, village (e.g. Salem, Tomato)..."
            value={filters.search}
            onChange={handleFilterChange}
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          {filters.search && (
            <button
              onClick={() => setFilters({ ...filters, search: '' })}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-bold border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-primary"
          >
            <option value="newest">🕒 Newest Farm Harvest</option>
            <option value="price_asc">💵 Price: Low to High</option>
            <option value="price_desc">💎 Price: High to Low</option>
            <option value="quantity_desc">📦 Stock: Largest First</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 text-xs ${showFilters ? 'bg-primary text-white border-primary' : ''}`}
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
          </Button>
        </div>
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {showFilters && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Quality Grade</label>
            <select
              name="qualityGrade"
              value={filters.qualityGrade}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-xl p-2 bg-white font-medium"
            >
              <option value="All">All Grades (A, B, C)</option>
              <option value="A">Grade A (Premium / Export)</option>
              <option value="B">Grade B (Standard Market)</option>
              <option value="C">Grade C (Processing / Bulk)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Origin / State</label>
            <select
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-xl p-2 bg-white font-medium"
            >
              <option value="All">All Regions</option>
              <option value="Tamil Nadu">Tamil Nadu (Salem, Thanjavur)</option>
              <option value="Maharashtra">Maharashtra (Nashik, Pune)</option>
              <option value="Kerala">Kerala (Wayanad)</option>
              <option value="Punjab">Punjab (Ludhiana)</option>
              <option value="Karnataka">Karnataka (Kolar, Mandya)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Max Price per KG (₹)</label>
            <input
              type="number"
              name="maxPrice"
              placeholder="e.g. 50"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-xl p-2"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-xl cursor-pointer font-bold text-green-900">
              <input
                type="checkbox"
                name="isOrganic"
                checked={filters.isOrganic}
                onChange={handleFilterChange}
                className="h-4 w-4 text-primary rounded"
              />
              <Leaf size={14} className="text-primary" /> 100% Certified Organic
            </label>
          </div>
        </div>
      )}

      {/* Products Grid Feed */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm animate-pulse h-80">
              <div className="bg-gray-200 h-44 rounded-2xl mb-4"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
              <div className="bg-gray-200 h-3 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              buyerPersona={buyerPersona} 
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-16 text-center">
          <p className="text-gray-500 font-bold text-sm mb-2">No farm produce matches your active filters.</p>
          <Button
            size="sm"
            onClick={() => setFilters({ search: '', category: 'All', minPrice: '', maxPrice: '', isOrganic: false, qualityGrade: 'All', location: 'All', minQuantity: '' })}
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
