import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import { Leaf, DollarSign, AlertTriangle, CheckCircle2, Sparkles, Award, Building2, Clock, Truck } from 'lucide-react';
import api from '../../api/axios';

const ProductForm = ({ onSubmit, initialData = null, isLoading = false }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || 'vegetables',
    description: initialData?.description || '',
    quantity_kg: initialData?.quantity_kg || '',
    price_per_kg: initialData?.price_per_kg || '',
    quality_grade: initialData?.quality_grade || 'A',
    is_organic: initialData?.is_organic || false,
    harvest_date: initialData?.harvest_date || new Date().toISOString().split('T')[0],
    expiry_date: initialData?.expiry_date || '',
    delivery_window: initialData?.delivery_window || 'standard_24h',
    min_order_quantity: initialData?.min_order_quantity || 1
  });

  const [benchmarkData, setBenchmarkData] = useState(null);
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);

  useEffect(() => {
    if (formData.name && formData.name.length >= 3) {
      const delay = setTimeout(() => {
        fetchPriceBenchmark(formData.name);
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [formData.name]);

  const fetchPriceBenchmark = async (cropName) => {
    setIsCheckingPrice(true);
    try {
      const res = await api.get(`/market/comparison/${encodeURIComponent(cropName)}`);
      setBenchmarkData(res.data?.data || null);
    } catch (e) {
      setBenchmarkData(null);
    } finally {
      setIsCheckingPrice(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const inputPrice = Number(formData.price_per_kg) || 0;
  const mspRate = benchmarkData?.msp_kg || 0;
  const mandiRate = benchmarkData?.modal_price_kg || 0;
  const suggestedPrice = benchmarkData?.suggested_fair_price_kg || (mspRate ? mspRate * 1.08 : 25);

  const isUnderpricing = inputPrice > 0 && mspRate > 0 && inputPrice < mspRate;
  const isBelowMandi = inputPrice > 0 && mandiRate > 0 && inputPrice < (mandiRate * 0.85);

  const applySuggestedPrice = () => {
    setFormData(prev => ({
      ...prev,
      price_per_kg: String(Math.round(suggestedPrice))
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Crop Name */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Crop / Produce Name *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
            placeholder="e.g. Fresh Red Tomatoes"
          />
        </div>
        
        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-bold text-xs bg-white"
          >
            <option value="vegetables">🥦 Vegetables</option>
            <option value="fruits">🍎 Fruits</option>
            <option value="grains">🌾 Grains & Rice</option>
            <option value="pulses">🫘 Pulses & Dal</option>
            <option value="dairy">🥛 Farm Dairy</option>
            <option value="spices">🌶️ Spices & Herbs</option>
            <option value="oilseeds">🌻 Oilseeds</option>
          </select>
        </div>

        {/* Real-Time Price Transparency & Anti-Underpricing Alert */}
        <div className="md:col-span-2 bg-gradient-to-br from-gray-50 to-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-black text-xs text-emerald-950 flex items-center gap-1.5">
              <DollarSign size={15} className="text-primary" />
              Point-of-Listing Mandi & MSP Price Transparency
            </span>
            {isCheckingPrice && <span className="text-[10px] text-gray-400">Fetching live APMC benchmarks...</span>}
          </div>

          {/* Benchmark Badges */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-xl border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">APMC Mandi Modal</span>
              <strong className="text-sm font-black text-gray-900 font-mono">
                {mandiRate ? `₹${mandiRate}/kg` : '₹24.0/kg'}
              </strong>
            </div>

            <div className="p-2 bg-white rounded-xl border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Govt MSP Baseline</span>
              <strong className="text-sm font-black text-gray-900 font-mono">
                {mspRate ? `₹${mspRate}/kg` : '₹20.5/kg'}
              </strong>
            </div>

            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-300">
              <span className="text-[10px] text-emerald-800 font-bold uppercase block">Suggested Fair Price</span>
              <strong className="text-sm font-black text-emerald-700 font-mono">
                ₹{suggestedPrice}/kg
              </strong>
            </div>
          </div>

          {/* Anti-Underpricing Warning Alert */}
          {isUnderpricing && (
            <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl flex flex-wrap justify-between items-center gap-2 text-amber-950">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-700 shrink-0" />
                <span>
                  <strong>⚠️ Underpricing Alert:</strong> Your price of <strong>₹{inputPrice}/kg</strong> is lower than the Govt MSP rate (₹{mspRate}/kg). You risk losing profit!
                </span>
              </div>
              <button
                type="button"
                onClick={applySuggestedPrice}
                className="bg-amber-800 hover:bg-amber-900 text-white px-3 py-1 rounded-lg font-black text-[11px] flex items-center gap-1 shadow-sm"
              >
                <Sparkles size={12} /> Auto-Set Fair Price (₹{Math.round(suggestedPrice)}/kg)
              </button>
            </div>
          )}

          {!isUnderpricing && inputPrice > 0 && (
            <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-950">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
              <span>
                <strong>✅ Fair Price Verified:</strong> You will receive <strong>98% direct payment (₹{(inputPrice * 0.98).toFixed(1)}/kg)</strong> on sale.
              </span>
            </div>
          )}
        </div>

        {/* Total Quantity & Price per KG */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Available Stock / Quantity (KG) *</label>
          <input
            type="number"
            name="quantity_kg"
            required
            min="1"
            value={formData.quantity_kg}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
            placeholder="e.g. 500"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Your Selling Price (₹ per KG) *</label>
          <input
            type="number"
            name="price_per_kg"
            required
            min="1"
            value={formData.price_per_kg}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-black text-sm text-primary"
            placeholder="e.g. 25"
          />
        </div>

        {/* Harvest Date & Freshness / Availability Window */}
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50/70 p-4 rounded-2xl border border-emerald-300 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-black text-xs text-emerald-950 flex items-center gap-1.5">
              <Clock size={15} className="text-emerald-700" />
              Direct Freshness Window & Availability Promise
            </span>
            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-200/70 px-2 py-0.5 rounded-full">
              Nearest Buyers Matched First
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Harvest Date *</label>
              <input
                type="date"
                name="harvest_date"
                required
                value={formData.harvest_date}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-bold text-xs bg-white"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">When was this produce plucked/harvested?</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Fresh & Available Until (Expiry Date) *</label>
              <input
                type="date"
                name="expiry_date"
                required
                value={formData.expiry_date || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-bold text-xs bg-white text-emerald-900"
              />
              <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">Last date this product stays 100% fresh for consumption</span>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Quick Select Freshness Duration:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '⚡ +2 Days (Leafy / Milk)', days: 2 },
                { label: '🌿 +4 Days (Tomatoes / Veggies)', days: 4 },
                { label: '🍎 +7 Days (Fruits / Bananas)', days: 7 },
                { label: '🧅 +14 Days (Onion / Potato)', days: 14 },
                { label: '🌾 +180 Days (Grains / Pulses)', days: 180 }
              ].map(preset => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => {
                    const hDate = new Date(formData.harvest_date || new Date());
                    const exp = new Date(hDate.getTime() + preset.days * 24 * 60 * 60 * 1000);
                    setFormData(prev => ({
                      ...prev,
                      expiry_date: exp.toISOString().split('T')[0]
                    }));
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 transition-colors shadow-2xs"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quality Grade & Delivery Speed */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Quality Grade</label>
          <select
            name="quality_grade"
            value={formData.quality_grade}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-bold text-xs bg-white"
          >
            <option value="A">Grade A (Premium / Export / Direct Retail)</option>
            <option value="B">Grade B (Standard Mandi / Local Retail)</option>
            <option value="C">Grade C (Processing / Bulk Pulping)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Delivery Speed / Window</label>
          <select
            name="delivery_window"
            value={formData.delivery_window}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-bold text-xs bg-white"
          >
            <option value="express_24h">⚡ Express Direct Dispatch (Within 24 Hours)</option>
            <option value="standard_48h">🚚 Standard Direct Farm Transit (24–48 Hours)</option>
            <option value="scheduled_weekly">📅 Scheduled Bulk Contract (Weekly / Monthly)</option>
          </select>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">Produce Description & Farm Gate Notes</label>
          <textarea
            name="description"
            rows="2"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            placeholder="Harvested fresh from pesticide-free farm gate..."
          ></textarea>
        </div>

        {/* Organic Certification Checkbox */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-xl cursor-pointer font-bold text-emerald-950">
            <input
              type="checkbox"
              name="is_organic"
              checked={formData.is_organic}
              onChange={handleChange}
              className="h-4 w-4 text-primary rounded"
            />
            <Leaf size={16} className="text-primary" />
            <span>100% Certified Organic / Zero Chemical Natural Farming Produce</span>
          </label>
        </div>

      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-black text-xs py-3 px-8 rounded-xl shadow-md flex items-center justify-center gap-2"
        >
          <Sparkles size={14} />
          {isLoading ? 'Publishing Listing...' : 'Publish Farm Produce Listing →'}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
