import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Leaf, MapPin, ShieldCheck, ChevronRight, Star, TrendingDown, Building2, User, Sparkles, Award, DollarSign, Calendar, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import Button from '../components/common/Button';
import PriceTag from '../components/common/PriceTag';
import Loading from '../components/common/Loading';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Order Configuration State
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState('individual'); // 'individual' or 'bulk_contract'
  const [recurringFrequency, setRecurringFrequency] = useState('none'); // 'none', 'weekly', 'bi_weekly', 'monthly'
  const [isPlacingDirect, setIsPlacingDirect] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        setProduct(res.data.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Product not found or failed to load');
        setProduct(null);
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div className="py-20"><Loading message="Loading farm produce details..." /></div>;
  if (!product) return <div className="py-20 text-center text-gray-500 font-bold">Product not found</div>;

  // Calculate volume tiered pricing
  const basePrice = product.price_per_kg;
  let effectiveUnitPrice = basePrice;
  let discountPct = 0;

  if (quantity >= 1000) {
    discountPct = 15;
    effectiveUnitPrice = parseFloat((basePrice * 0.85).toFixed(1));
  } else if (quantity >= 200) {
    discountPct = 10;
    effectiveUnitPrice = parseFloat((basePrice * 0.90).toFixed(1));
  } else if (quantity >= 50) {
    discountPct = 5;
    effectiveUnitPrice = parseFloat((basePrice * 0.95).toFixed(1));
  }

  const subtotal = parseFloat((effectiveUnitPrice * quantity).toFixed(2));
  const platformFee = parseFloat((subtotal * 0.02).toFixed(2));
  const farmerPayout = parseFloat((subtotal - platformFee).toFixed(2));

  const benchmarks = product.benchmarks || {};
  const mandiPrice = benchmarks.mandi_modal_price || Math.round(basePrice * 1.08);
  const mspPrice = benchmarks.msp_price || Math.round(basePrice * 0.9);
  const supermarketPrice = benchmarks.supermarket_retail_price || Math.round(basePrice * 1.35);

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please sign in first to add items to cart');
      navigate('/login');
      return;
    }
    
    try {
      await api.post('/cart', { product_id: product.id, quantity_kg: quantity });
      toast.success(`Added ${quantity}kg of ${product.name} to cart!`);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add to cart';
      toast.error(msg);
      if (error.response?.status === 401 || error.response?.status === 400 && msg.includes('token')) {
        navigate('/login');
      }
    }
  };

  // Direct Order & Delivery Configuration State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.location || 'Flat 4B, Sri Krishna Apts, North Usman Rd, T. Nagar, Chennai, Tamil Nadu 600017');
  const [recipientName, setRecipientName] = useState(user?.name || 'Consumer Buyer');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '+91 9876543210');
  const [deliveryWindow, setDeliveryWindow] = useState('express_24h');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isLocating, setIsLocating] = useState(false);

  const addressPresets = [
    { label: '🏢 T. Nagar, Chennai', address: 'Flat 4B, Sri Krishna Apts, North Usman Rd, T. Nagar, Chennai, Tamil Nadu 600017' },
    { label: '🏡 Anna Nagar, Chennai', address: 'Plot 12, 2nd Avenue, Anna Nagar East, Chennai, Tamil Nadu 600040' },
    { label: '🏢 Indiranagar, Bangalore', address: 'No. 402, 100ft Road, Indiranagar, Bangalore, Karnataka 560038' },
    { label: '🏡 Salem Central, TN', address: 'Door 24, Fairlands Main Road, Salem, Tamil Nadu 636016' }
  ];

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const gpsAddr = `Doorstep GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), Chennai City, Tamil Nadu`;
        setDeliveryAddress(gpsAddr);
        setIsLocating(false);
        toast.success('📍 Live GPS coordinates captured for delivery!');
      },
      (error) => {
        setIsLocating(false);
        toast.error('Unable to retrieve GPS location. Please select or type an address.');
      },
      { timeout: 8000 }
    );
  };

  const handleOpenDirectOrder = () => {
    if (!user) {
      toast.error('Please sign in first to place an order');
      navigate('/login');
      return;
    }
    if (product.quantity_kg === 0) {
      toast.error('This crop is currently out of stock');
      return;
    }
    setShowAddressModal(true);
  };

  const handleDirectBuy = async () => {
    if (!deliveryAddress || !deliveryAddress.trim()) {
      toast.error('Please enter your delivery destination address');
      return;
    }
    if (!recipientPhone || !recipientPhone.trim()) {
      toast.error('Please provide a contact phone number for the delivery partner');
      return;
    }

    setIsPlacingDirect(true);
    try {
      const fullDeliveryInfo = `${deliveryAddress.trim()} (Contact: ${recipientName.trim()}, Phone: ${recipientPhone.trim()})`;

      const res = await api.post('/orders', {
        product_id: product.id,
        quantity_kg: quantity,
        order_type: orderType,
        recurring_frequency: recurringFrequency,
        delivery_window: deliveryWindow,
        delivery_address: fullDeliveryInfo
      });

      const orderData = res.data.data;
      setShowAddressModal(false);
      toast.success(`Order #${orderData?.orderId || orderData?.id} Placed! Farmer notified via SMS.`);
      navigate('/buyer/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to place order';
      toast.error(msg);
      if (error.response?.status === 401 || error.response?.status === 400 && msg.includes('token')) {
        navigate('/login');
      }
    } finally {
      setIsPlacingDirect(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center text-xs text-gray-500 mb-6 font-medium">
        <Link to="/" className="hover:text-primary">Home</Link>
        <ChevronRight size={13} className="mx-2 text-gray-400" />
        <Link to="/marketplace" className="hover:text-primary">Marketplace</Link>
        <ChevronRight size={13} className="mx-2 text-gray-400" />
        <span className="text-gray-900 font-bold capitalize">{product.name}</span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left Column: Visual Area & Origin Details (5 Cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-50 via-green-50 to-amber-50 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-100">
            <div className="flex justify-between items-start">
              <div className="flex flex-wrap gap-2">
                <span className="bg-primary text-white text-xs px-3 py-1 rounded-full font-bold capitalize shadow-xs">
                  {product.category}
                </span>
                <span className="bg-white text-slate-800 text-xs px-3 py-1 rounded-full font-bold border border-gray-200 shadow-xs flex items-center gap-1">
                  <Award size={13} className="text-amber-500" /> Grade {product.quality_grade || 'A'}
                </span>
                {product.is_organic ? (
                  <span className="bg-emerald-700 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                    <Leaf size={12} /> 100% Certified Organic
                  </span>
                ) : null}
              </div>
            </div>

            {/* Product Image with Stock Badge */}
            <div className="relative">
              <img
                src={product.image_url || (() => {
                  const name = (product.name || '').toLowerCase();
                  const productImages = {
                    'tomato': 'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=600&h=400&fit=crop',
                    'onion': 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&h=400&fit=crop',
                    'guava': 'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=600&h=400&fit=crop',
                    'bell pepper': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&h=400&fit=crop',
                    'red bell': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&h=400&fit=crop',
                    'mango': 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&h=400&fit=crop',
                    'alphonso': 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&h=400&fit=crop',
                    'pomegranate': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&h=400&fit=crop',
                    'banana': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&h=400&fit=crop',
                    'grapes': 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600&h=400&fit=crop',
                    'papaya': 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=600&h=400&fit=crop',
                    'strawberry': 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&h=400&fit=crop',
                    'cabbage': 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&h=400&fit=crop',
                    'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=400&fit=crop',
                    'basmati': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=400&fit=crop',
                    'wheat': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop',
                    'maize': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&h=400&fit=crop',
                    'toor dal': 'https://images.unsplash.com/photo-1612257416648-ee7a6c5b1e5e?w=600&h=400&fit=crop',
                    'moong dal': 'https://images.unsplash.com/photo-1585996954372-a6bc5032dcc2?w=600&h=400&fit=crop',
                    'chana dal': 'https://images.unsplash.com/photo-1613743983303-b3e89f8a2b80?w=600&h=400&fit=crop',
                    'milk': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&h=400&fit=crop',
                    'paneer': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&h=400&fit=crop',
                    'ghee': 'https://images.unsplash.com/photo-1631898039984-fd5f61fe8732?w=600&h=400&fit=crop',
                    'pepper': 'https://images.unsplash.com/photo-1599909533601-aa1e5c1c6b07?w=600&h=400&fit=crop',
                    'black pepper': 'https://images.unsplash.com/photo-1599909533601-aa1e5c1c6b07?w=600&h=400&fit=crop',
                    'cardamom': 'https://images.unsplash.com/photo-1701175498498-1677ea48a498?w=600&h=400&fit=crop',
                    'cinnamon': 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=600&h=400&fit=crop',
                    'clove': 'https://images.unsplash.com/photo-1505674838245-8cf12e71a078?w=600&h=400&fit=crop',
                    'mustard': 'https://images.unsplash.com/photo-1648198786498-4480cf9322e3?w=600&h=400&fit=crop',
                    'groundnut': 'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=600&h=400&fit=crop',
                    'soybean': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&h=400&fit=crop',
                  };
                  for (const [key, url] of Object.entries(productImages)) {
                    if (name.includes(key)) return url;
                  }
                  const catFallback = {
                    vegetables: 'https://images.unsplash.com/photo-1566385101042-1a0aa4c1c900?w=600&h=400&fit=crop',
                    fruits: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&h=400&fit=crop',
                    grains: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop',
                    pulses: 'https://images.unsplash.com/photo-1612257416648-ee7a6c5b1e5e?w=600&h=400&fit=crop',
                    dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&h=400&fit=crop',
                    spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&h=400&fit=crop',
                    oilseeds: 'https://images.unsplash.com/photo-1474979266404-7eaacdc948fb?w=600&h=400&fit=crop',
                  };
                  return catFallback[product.category?.toLowerCase()] || catFallback.vegetables;
                })()}
                alt={product.name}
                className="w-full h-56 object-cover rounded-2xl shadow-sm"
              />
              <span className="absolute top-3 left-3 text-4xl drop-shadow-lg select-none">
                {product.category?.toLowerCase() === 'vegetables' ? '🥦' : 
                 product.category?.toLowerCase() === 'fruits' ? '🍎' :
                 product.category?.toLowerCase() === 'grains' ? '🌾' :
                 product.category?.toLowerCase() === 'pulses' ? '🫘' :
                 product.category?.toLowerCase() === 'dairy' ? '🥛' :
                 product.category?.toLowerCase() === 'spices' ? '🌶️' :
                 product.category?.toLowerCase() === 'oilseeds' ? '🌻' : '📦'}
              </span>
              {product.quantity_kg > 0 && product.quantity_kg < 20 && (
                <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full animate-pulse shadow-lg">
                  🔥 Only {product.quantity_kg} kg left!
                </span>
              )}
              {product.quantity_kg === 0 && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                  <span className="bg-red-600 text-white text-sm font-black px-4 py-2 rounded-xl">OUT OF STOCK</span>
                </div>
              )}
            </div>

            {/* Farmer Farm Gate Origin Card */}
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm space-y-2 text-xs">
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Farm Gate Origin Traceability</span>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-sm text-gray-900">🧑‍🌾 {product.farmer_name || 'Verified Farmer'}</span>
                <span className="text-gray-500 font-mono">📱 +91-{product.farmer_phone?.slice(-4) ? `******${product.farmer_phone.slice(-4)}` : 'Verified'}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600 border-t border-gray-100 pt-1.5">
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-primary" /> {product.farmer_location || 'Salem'}, {product.farmer_state || 'Tamil Nadu'}
                </span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Lat: {product.farmer_lat || 11.66}, Lng: {product.farmer_lng || 78.14}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, Transparency & Purchasing (7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
            
            {/* Title & Description */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{product.name}</h1>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {product.description || 'Harvested fresh from rural Indian farms. Directly packed at farm gate with full traceability and fair-trade pricing.'}
              </p>
            </div>

            {/* Direct Freshness Window & Nearest Farm Proximity Matrix */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-100/40 p-4 rounded-2xl border border-emerald-300 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <Clock size={15} className="text-emerald-700" /> Direct Freshness & Proximity Guarantee
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Zap size={10} className="text-amber-600 fill-amber-500" /> Direct Farm Gate Dispatch
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Harvest Date</span>
                  <strong className="text-xs font-black text-gray-900 block mt-0.5">
                    {product.freshness?.harvest_date || 'Harvested Today'}
                  </strong>
                  <span className="text-[9px] text-emerald-700 block font-bold">
                    {product.freshness?.is_harvested_today ? '🌿 Plucked Today' : 'Direct Harvest'}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-emerald-300 shadow-2xs">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Freshness Window</span>
                  <strong className="text-xs font-black text-emerald-800 block mt-0.5">
                    {product.freshness?.days_remaining || 4} Days Left
                  </strong>
                  <span className="text-[9px] text-gray-500 block">
                    Till {product.freshness?.expiry_date || product.expiry_date || '5 Days'}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-blue-200 shadow-2xs">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Nearest Farm Distance</span>
                  <strong className="text-xs font-black text-blue-900 block mt-0.5">
                    {product.distance_km ? `${product.distance_km} km` : 'Local Farm'}
                  </strong>
                  <span className="text-[9px] text-blue-600 block">{product.farmer_location || 'Salem'}</span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Direct Transit Time</span>
                  <strong className="text-xs font-black text-amber-900 block mt-0.5">
                    ~{product.estimated_transit_hours || 2} Hours
                  </strong>
                  <span className="text-[9px] text-amber-700 block font-bold">Doorstep Delivery</span>
                </div>
              </div>
            </div>

            {/* Direct Fair-Trade Fulfillment Matrix */}
            <div className="bg-gradient-to-br from-gray-50 to-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <DollarSign size={15} className="text-primary" /> Direct Fair-Trade Payout Model
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full">
                  Zero Middlemen Cut
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-emerald-300 shadow-xs">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Farmer Net Payout</span>
                  <strong className="text-base font-black text-primary">₹{(basePrice * 0.98).toFixed(1)}/kg</strong>
                  <span className="text-[9px] text-emerald-700 block font-bold">98% Direct to Farmer</span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-indigo-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Ships Direct</span>
                  <strong className="text-sm font-black text-indigo-900 truncate block mt-0.5">Direct Farm Gate</strong>
                  <span className="text-[9px] text-indigo-600 block">{product.farmer_location || 'Local Farm'}</span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-red-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Supermarket MRP</span>
                  <strong className="text-base font-black text-red-600 line-through">₹{supermarketPrice}/kg</strong>
                  <span className="text-[9px] text-green-600 block font-bold">You Save ₹{supermarketPrice - basePrice}/kg</span>
                </div>
              </div>
            </div>

            {/* Wholesale Tiered Volume Discounts (Bulk Buyers) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                  <Building2 size={14} className="text-purple-600" /> Wholesale Bulk Tier Discounts:
                </span>
                <span className="text-[11px] text-purple-700 font-bold">Available Stock: {product.quantity_kg} kg</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { range: '1–49 kg', disc: '0%', price: basePrice },
                  { range: '50–199 kg', disc: '5% OFF', price: parseFloat((basePrice * 0.95).toFixed(1)) },
                  { range: '200–999 kg', disc: '10% OFF', price: parseFloat((basePrice * 0.90).toFixed(1)) },
                  { range: '1000+ kg', disc: '15% OFF', price: parseFloat((basePrice * 0.85).toFixed(1)) }
                ].map((tier, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      (idx === 0 && quantity < 50) ||
                      (idx === 1 && quantity >= 50 && quantity < 200) ||
                      (idx === 2 && quantity >= 200 && quantity < 1000) ||
                      (idx === 3 && quantity >= 1000)
                        ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold shadow-xs ring-1 ring-purple-400'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <span className="text-[10px] block opacity-75">{tier.range}</span>
                    <strong className="block text-xs mt-0.5">₹{tier.price}/kg</strong>
                    <span className="text-[9px] text-purple-700 font-bold">{tier.disc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buyer Persona & Supply Contract Mode */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">Order Delivery Mode:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setOrderType('individual'); setRecurringFrequency('none'); }}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                      orderType === 'individual' ? 'bg-primary text-white shadow-xs' : 'bg-white text-gray-700 border'
                    }`}
                  >
                    One-Time Purchase
                  </button>
                  <button
                    onClick={() => { setOrderType('bulk_contract'); setRecurringFrequency('weekly'); }}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                      orderType === 'bulk_contract' ? 'bg-purple-700 text-white shadow-xs' : 'bg-white text-gray-700 border'
                    }`}
                  >
                    Recurring Supply Contract
                  </button>
                </div>
              </div>

              {orderType === 'bulk_contract' && (
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Contract Frequency:</span>
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value)}
                    className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 font-bold text-xs"
                  >
                    <option value="weekly">Weekly Recurring Dispatch</option>
                    <option value="bi_weekly">Bi-Weekly Recurring Dispatch</option>
                    <option value="monthly">Monthly Recurring Dispatch</option>
                  </select>
                </div>
              )}
            </div>

            {/* Quantity Selector & Live Financial Math */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-700">Quantity:</span>
                  <div className="flex items-center border-2 border-gray-300 rounded-2xl overflow-hidden bg-white">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 5))}
                      className="px-3.5 py-2 font-bold text-gray-600 hover:bg-gray-100"
                    >-</button>
                    <input
                      type="number"
                      min="1"
                      max={product.quantity_kg || 99999}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center font-black text-sm py-2 focus:outline-none"
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.quantity_kg || 99999, quantity + 5))}
                      className="px-3.5 py-2 font-bold text-gray-600 hover:bg-gray-100"
                    >+</button>
                  </div>
                  <span className="text-xs text-gray-500 font-bold">KG</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">
                    {discountPct > 0 ? `Effective Price (incl. ${discountPct}% bulk discount):` : 'Total Price:'}
                  </span>
                  <span className="text-2xl font-black text-gray-900">
                    ₹{subtotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 98/2 Revenue Breakdown Pill */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between text-xs text-emerald-950">
                <span>Farmer Direct Payout (98%): <strong>₹{farmerPayout.toLocaleString()}</strong></span>
                <span>Platform Fee (2%): <strong>₹{platformFee}</strong></span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleAddToCart}
                  className="py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-2 border-primary text-primary hover:bg-green-50"
                >
                  <ShoppingCart size={15} /> Add to Cart
                </Button>

                <Button
                  onClick={handleOpenDirectOrder}
                  disabled={isPlacingDirect || product.quantity_kg === 0}
                  className="py-3 rounded-2xl font-black text-xs bg-primary hover:bg-primary-dark text-white flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={15} /> Place Order & Dispatch Farmer SMS →
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Direct Order & Delivery Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddressModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-600" /> Confirm Doorstep Delivery
                </h3>
                <p className="text-xs text-gray-500">Produce dispatched straight from {product.farmer_name || 'Farmer'} ({product.farmer_location || 'Salem'})</p>
              </div>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            {/* Produce Summary Card */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-200 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-sm text-gray-900 capitalize">{product.name}</span>
                <span className="bg-primary text-white font-bold px-2 py-0.5 rounded-md">₹{effectiveUnitPrice}/kg</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Selected Volume: <strong>{quantity} kg</strong></span>
                <span className="font-black text-gray-900 text-base">Total: ₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <span>Direct Farmer Payout (98%): <strong>₹{farmerPayout.toLocaleString()}</strong></span>
                <span className="text-[10px]">Fee (2%): ₹{platformFee}</span>
              </div>
            </div>

            {/* Delivery Address & Recipient Suite */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <MapPin className="text-primary" size={15} /> Delivery Destination & Recipient *
                </label>
                <button
                  type="button"
                  onClick={handleUseGPS}
                  disabled={isLocating}
                  className="text-[11px] font-bold text-primary hover:text-primary-dark bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer transition-all hover:bg-emerald-100"
                >
                  {isLocating ? <RefreshCw size={11} className="animate-spin" /> : '📍'}
                  {isLocating ? 'Locating...' : 'Use Live GPS'}
                </button>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-semibold text-gray-800"
                    placeholder="e.g. Anand Kumar"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Contact Mobile (For Driver)</label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-mono text-gray-800"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Quick Select Delivery Area:</label>
                <div className="flex flex-wrap gap-1.5">
                  {addressPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDeliveryAddress(p.address)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        deliveryAddress === p.address
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address Text Area */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Full Doorstep Address</label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium text-gray-800 resize-none"
                  placeholder="Enter complete delivery address with flat number, street, area, and 6-digit pincode..."
                />
              </div>

              {/* Delivery Window & Payment Mode */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Transit Window</label>
                  <select
                    value={deliveryWindow}
                    onChange={(e) => setDeliveryWindow(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold bg-white text-xs"
                  >
                    <option value="express_24h">⚡ Express 24h</option>
                    <option value="standard_48h">🚚 Standard 48h</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold bg-white text-xs"
                  >
                    <option value="upi">📱 Instant UPI</option>
                    <option value="card">💳 Cards / NetBanking</option>
                    <option value="cod">💵 Cash on Delivery</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowAddressModal(false)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-bold text-xs rounded-2xl hover:bg-gray-50 transition-all cursor-pointer"
              >
                ← Cancel
              </button>
              <button
                onClick={handleDirectBuy}
                disabled={isPlacingDirect}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles size={14} />
                {isPlacingDirect ? 'Placing Order...' : `Confirm & Pay ₹${subtotal.toLocaleString()} →`}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
