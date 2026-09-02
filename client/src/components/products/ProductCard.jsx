import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Leaf, MapPin, Sparkles, Plus, Check, Star, Building2, User, Award, ShieldCheck, Zap, Heart, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const ProductCard = ({ product, buyerPersona = 'consumer' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [selectedQty, setSelectedQty] = useState(buyerPersona === 'bulk' ? (product?.bulk_details?.moq_kg || 50) : 1);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!product) return null;

  const category = (product.category || 'vegetables').toLowerCase();

  const getCategoryEmoji = (cat) => {
    switch (cat) {
      case 'vegetables': return '🥬';
      case 'fruits': return '🍎';
      case 'grains': return '🌾';
      case 'pulses': return '🫘';
      case 'dairy': return '🥛';
      case 'spices': return '🌶️';
      case 'oilseeds': return '🌻';
      default: return '📦';
    }
  };

  const getProductImage = () => {
    if (product.image_url) return product.image_url;
    const name = (product.name || '').toLowerCase();
    const productImages = {
      'tomato':          'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=400&h=300&fit=crop',
      'onion':           'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&h=300&fit=crop',
      'guava':           'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=400&h=300&fit=crop',
      'bell pepper':     'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=300&fit=crop',
      'red bell':        'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=300&fit=crop',
      'mango':           'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=300&fit=crop',
      'alphonso':        'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=300&fit=crop',
      'pomegranate':     'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop',
      'banana':          'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=300&fit=crop',
      'grapes':          'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=300&fit=crop',
      'grape':           'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=300&fit=crop',
      'papaya':          'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400&h=300&fit=crop',
      'strawberry':      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=300&fit=crop',
      'cabbage':         'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400&h=300&fit=crop',
      'rice':            'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop',
      'basmati':         'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop',
      'wheat':           'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop',
      'maize':           'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop',
      'corn':            'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop',
      'toor dal':        'https://images.unsplash.com/photo-1612257416648-ee7a6c5b1e5e?w=400&h=300&fit=crop',
      'moong dal':       'https://images.unsplash.com/photo-1585996954372-a6bc5032dcc2?w=400&h=300&fit=crop',
      'chana dal':       'https://images.unsplash.com/photo-1613743983303-b3e89f8a2b80?w=400&h=300&fit=crop',
      'dal':             'https://images.unsplash.com/photo-1612257416648-ee7a6c5b1e5e?w=400&h=300&fit=crop',
      'milk':            'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop',
      'paneer':          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
      'ghee':            'https://images.unsplash.com/photo-1631898039984-fd5f61fe8732?w=400&h=300&fit=crop',
      'pepper':          'https://images.unsplash.com/photo-1599909533601-aa1e5c1c6b07?w=400&h=300&fit=crop',
      'black pepper':    'https://images.unsplash.com/photo-1599909533601-aa1e5c1c6b07?w=400&h=300&fit=crop',
      'cardamom':        'https://images.unsplash.com/photo-1701175498498-1677ea48a498?w=400&h=300&fit=crop',
      'cinnamon':        'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=400&h=300&fit=crop',
      'cloves':          'https://images.unsplash.com/photo-1505674838245-8cf12e71a078?w=400&h=300&fit=crop',
      'clove':           'https://images.unsplash.com/photo-1505674838245-8cf12e71a078?w=400&h=300&fit=crop',
      'mustard':         'https://images.unsplash.com/photo-1648198786498-4480cf9322e3?w=400&h=300&fit=crop',
      'groundnut':       'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=400&h=300&fit=crop',
      'peanut':          'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=400&h=300&fit=crop',
      'soybean':         'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop',
      'soy':             'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop',
    };
    // Match by checking if product name contains any key
    for (const [key, url] of Object.entries(productImages)) {
      if (name.includes(key)) return url;
    }
    // Fallback to category images
    const categoryFallback = {
      vegetables: 'https://images.unsplash.com/photo-1566385101042-1a0aa4c1c900?w=400&h=300&fit=crop',
      fruits: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=300&fit=crop',
      grains: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop',
      pulses: 'https://images.unsplash.com/photo-1612257416648-ee7a6c5b1e5e?w=400&h=300&fit=crop',
      dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=300&fit=crop',
      spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop',
      oilseeds: 'https://images.unsplash.com/photo-1474979266404-7eaacdc948fb?w=400&h=300&fit=crop',
    };
    return categoryFallback[category] || categoryFallback.vegetables;
  };

  const basePrice = Number(product.price_per_kg) || 20;
  const benchmarks = product.benchmarks || {};
  const mandiPrice = benchmarks.mandi_modal_price || Math.round(basePrice * 1.08);
  const supermarketPrice = benchmarks.supermarket_retail_price || Math.round(basePrice * 1.35);
  const discountPercent = Math.max(15, Math.round(((supermarketPrice - basePrice) / supermarketPrice) * 100));

  const isOutOfStock = product.quantity_kg === 0;

  // If bulk persona, apply volume tiered discount
  let effectivePrice = basePrice;
  let bulkDiscountBadge = null;
  if (buyerPersona === 'bulk') {
    if (selectedQty >= 1000) {
      effectivePrice = parseFloat((basePrice * 0.85).toFixed(1));
      bulkDiscountBadge = '15% Volume Off';
    } else if (selectedQty >= 200) {
      effectivePrice = parseFloat((basePrice * 0.90).toFixed(1));
      bulkDiscountBadge = '10% Volume Off';
    } else {
      effectivePrice = parseFloat((basePrice * 0.95).toFixed(1));
      bulkDiscountBadge = '5% Bulk Off';
    }
  }

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    if (!user) {
      toast.error('Please sign in first to add items to cart');
      navigate('/login');
      return;
    }

    setIsAdding(true);
    try {
      await api.post('/cart', { product_id: product.id || product._id, quantity_kg: selectedQty });
      setJustAdded(true);
      toast.success(`Added ${selectedQty}kg of ${product.name} to cart!`);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add to cart';
      toast.error(msg);
      if (error.response?.status === 401 || (error.response?.status === 400 && msg.includes('token'))) {
        navigate('/login');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickBuy = async (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    if (!user) {
      toast.error('Please sign in first to complete purchase');
      navigate('/login');
      return;
    }

    try {
      const res = await api.post('/orders', {
        product_id: product.id || product._id,
        quantity_kg: selectedQty,
        order_type: buyerPersona === 'bulk' ? 'bulk_contract' : 'individual',
        delivery_address: user.location || 'Bangalore Direct'
      });
      const orderId = res.data.data?.orderId || res.data.data?.id;
      toast.success(`Order #${orderId} Placed! Farmer notified via SMS.`);
      navigate('/buyer/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Quick buy failed';
      toast.error(msg);
      if (error.response?.status === 401 || (error.response?.status === 400 && msg.includes('token'))) {
        navigate('/login');
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm hover:shadow-2xl border border-gray-200/90 overflow-hidden transition-all duration-300 flex flex-col group hover:-translate-y-1 relative">
      
      {/* Top Floating Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {product.freshness?.is_urgent_deal ? (
          <span className="bg-amber-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-md animate-pulse">
            <Zap size={10} className="text-yellow-200 fill-yellow-200" /> ⚡ Urgent Fresh Deal ({product.freshness.hours_remaining}h left)
          </span>
        ) : product.freshness?.is_harvested_today ? (
          <span className="bg-emerald-700 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-md">
            <Sparkles size={10} className="text-amber-300" /> 🌿 Harvested Today (100% Fresh)
          </span>
        ) : product.freshness?.expiry_date || product.expiry_date ? (
          <span className="bg-teal-800 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
            <ShieldCheck size={10} className="text-teal-200" /> 🌿 Fresh till {product.freshness?.expiry_date || product.expiry_date}
          </span>
        ) : (
          <span className="bg-emerald-800 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-md">
            <ShieldCheck size={11} className="text-amber-300" /> Kisan Assured
          </span>
        )}
        {product.is_organic ? (
          <span className="bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
            <Leaf size={10} /> 100% Organic
          </span>
        ) : null}
      </div>

      {/* Wishlist Button */}
      <button 
        onClick={(e) => { e.preventDefault(); setIsFavorite(!isFavorite); toast.success(isFavorite ? 'Removed from Wishlist' : 'Saved to Wishlist'); }}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white text-gray-400 hover:text-red-500 transition-colors"
      >
        <Heart size={15} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
      </button>

      {/* Product Image Header */}
      <Link to={`/product/${product.id || product._id}`} className="block relative">
        <div className="relative h-48 bg-gray-100 overflow-hidden border-b border-gray-100">
          <img 
            src={getProductImage()} 
            alt={product.name} 
            className={`w-full h-48 object-cover rounded-t-3xl transform group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
          />
          
          {/* Category Emoji Badge */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-sm border border-white/50 z-20" style={{marginTop: '40px'}}>
            {getCategoryEmoji(category)}
          </div>

          {/* Delivery Window & Nearest Distance Strip */}
          <div className="absolute bottom-2 left-3 right-3 flex justify-between items-center text-[10px] text-gray-600 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-white/60 shadow-xs z-10">
            <span className="font-bold text-emerald-800 flex items-center gap-1">
              <Zap size={11} className="text-amber-500 fill-amber-400" />
              Direct Transit: ~{product.estimated_transit_hours || 2}h
            </span>
            <span className="font-black text-gray-700 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              <MapPin size={10} className="text-primary" />
              {product.distance_km ? `${product.distance_km} km (Nearest)` : (product.farmer_location || 'Salem')}
            </span>
          </div>
        </div>
      </Link>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Rating & Smart Match Score Row */}
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-amber-900 font-bold">
              <Star size={12} className="text-amber-500 fill-amber-400" />
              <span>4.8</span>
              <span className="text-[10px] text-gray-400 font-normal">(120+ orders)</span>
            </div>

            <div className="flex items-center gap-1">
              {product.smart_match_score ? (
                <span className="bg-emerald-100 text-emerald-900 text-[10px] px-2 py-0.5 rounded-md font-black border border-emerald-300 flex items-center gap-0.5">
                  <Sparkles size={9} className="text-emerald-700" /> {product.smart_match_score}% Match
                </span>
              ) : null}
              <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded-md font-bold border border-slate-200">
                Grade {product.quality_grade || 'A'}
              </span>
            </div>
          </div>

          {/* Product Title */}
          <Link to={`/product/${product.id || product._id}`} className="block mt-2 group-hover:text-primary transition-colors">
            <h3 className="font-black text-base text-gray-900 line-clamp-1 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Origin & Farmer Traceability */}
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <span>🧑‍🌾 {product.farmer_name || 'Murugan'}</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">{product.farmer_location || 'Salem'}, {product.farmer_state || 'Tamil Nadu'}</span>
          </p>

          {/* Freshness Window Indicator Badge Bar */}
          <div className="mt-2 flex items-center justify-between text-[11px] bg-emerald-50/80 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-emerald-950">
            <span className="font-bold flex items-center gap-1 text-emerald-800">
              🌿 {product.freshness?.badge_text || `Fresh for ${product.freshness?.days_remaining || 4} days`}
            </span>
            <span className="text-[10px] text-gray-500">
              Harvest: {product.freshness?.harvest_date || 'Today'}
            </span>
          </div>

          {/* Stock Badges */}
          <div className="mt-1">
            {isOutOfStock ? (
              <span className="inline-flex items-center bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded">
                Out of Stock
              </span>
            ) : product.quantity_kg > 0 && product.quantity_kg < 20 ? (
              <span className="inline-flex items-center bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100">
                🔥 Only {product.quantity_kg} kg left!
              </span>
            ) : null}
          </div>

          {/* Amazon-Style Price Block */}
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 font-sans">
              ₹{effectivePrice}
            </span>
            <span className="text-xs text-gray-400 line-through">
              ₹{supermarketPrice}
            </span>
            <span className="text-xs font-black text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
              {discountPercent}% OFF
            </span>
          </div>

          {/* Fulfillment & Direct Pay Transparency */}
          <div className="mt-2 p-2 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-[11px] space-y-0.5">
            <div className="flex justify-between text-indigo-900 font-medium">
              <span>Fulfillment:</span>
              <strong className="text-indigo-800 font-semibold">🏡 Direct from Farm Gate</strong>
            </div>
            <div className="flex justify-between text-emerald-800 font-extrabold border-t border-emerald-200/60 pt-0.5">
              <span>Farmer Share:</span>
              <span>98% Direct Payout</span>
            </div>
          </div>

          {/* Quantity Selector Chips */}
          <div className="mt-3">
            <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
              {buyerPersona === 'bulk' ? 'Select Bulk Lot Size:' : 'Select Quantity:'}
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(buyerPersona === 'bulk' ? [50, 100, 200, 500] : [1, 2, 5, 10]).map((qty) => (
                <button
                  key={qty}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => setSelectedQty(qty)}
                  className={`py-1 px-2.5 rounded-lg font-bold text-xs transition-all ${
                    isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                    : selectedQty === qty
                      ? 'bg-primary text-white shadow-xs scale-105 cursor-pointer'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                  }`}
                >
                  {qty}kg
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons (Amazon / Flipkart style Add to Cart & Buy Now) */}
        <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
          <button
            onClick={handleAddToCart}
            disabled={isAdding || isOutOfStock}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border-2 shadow-xs ${
              isOutOfStock 
                ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                : justAdded 
                  ? 'bg-emerald-600 text-white border-emerald-600 cursor-pointer' 
                  : 'border-primary text-primary hover:bg-green-50 cursor-pointer'
            }`}
          >
            {isOutOfStock ? (
              'Out of Stock'
            ) : justAdded ? (
              <>
                <Check size={14} /> Added
              </>
            ) : (
              <>
                <ShoppingCart size={14} /> Add to Cart
              </>
            )}
          </button>

          <button
            onClick={handleQuickBuy}
            disabled={isOutOfStock}
            className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1 shadow-sm transition-all ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-amber-400 hover:bg-amber-500 text-slate-950 cursor-pointer'
            }`}
          >
            {isOutOfStock ? 'Unavailable' : <><Zap size={13} className="fill-slate-950" /> 1-Click Buy</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProductCard;
