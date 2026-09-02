import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowLeft, ShieldCheck, Truck, Zap, Calendar, Sparkles, CheckCircle2, DollarSign, MapPin, Building2, ShoppingBag, CreditCard, ChevronRight } from 'lucide-react';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/common/Loading';

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Delivery & Payment Configuration
  const [deliveryAddress, setDeliveryAddress] = useState(user?.location || 'Flat 4B, Sri Krishna Apts, North Usman Rd, T. Nagar, Chennai, Tamil Nadu 600017');
  const [recipientName, setRecipientName] = useState(user?.name || 'Consumer Buyer');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '+91 9876543210');
  const [deliveryWindow, setDeliveryWindow] = useState('express_24h');
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'card', 'cod', 'b2b_credit'
  const [recurringPlan, setRecurringPlan] = useState('none'); // 'none', 'weekly', 'bi_weekly', 'monthly'
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

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchCart();
  }, [user, navigate]);

  const fetchCart = async () => {
    try {
      const res = await api.get('/cart');
      setCartItems(res.data.data || []);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load shopping cart');
      setLoading(false);
    }
  };

  const updateQuantity = async (id, newQty) => {
    if (newQty < 1) return;
    try {
      await api.put(`/cart/${id}`, { quantity_kg: newQty });
      setCartItems(cartItems.map(item => item.id === id || item._id === id ? { ...item, quantity_kg: newQty, quantity: newQty } : item));
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const removeItem = async (id) => {
    try {
      await api.delete(`/cart/${id}`);
      setCartItems(cartItems.filter(item => item.id !== id && item._id !== id));
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  // Financial Calculations with Volume Discounting
  let grossMrpTotal = 0;
  let subtotal = 0;

  cartItems.forEach(item => {
    const basePrice = Number(item.price_per_kg || item.product?.price_per_kg || 20);
    const qty = Number(item.quantity_kg || item.quantity || 1);
    const mrpPrice = Math.round(basePrice * 1.35); // Supermarket benchmark

    // Bulk tiered volume discount
    let unitPrice = basePrice;
    if (qty >= 1000) unitPrice = parseFloat((basePrice * 0.85).toFixed(1));
    else if (qty >= 200) unitPrice = parseFloat((basePrice * 0.90).toFixed(1));
    else if (qty >= 50) unitPrice = parseFloat((basePrice * 0.95).toFixed(1));

    grossMrpTotal += mrpPrice * qty;
    subtotal += unitPrice * qty;
  });

  const totalSavings = Math.max(0, grossMrpTotal - subtotal);
  const deliveryFee = subtotal > 500 ? 0 : 40;
  const platformFee = parseFloat((subtotal * 0.02).toFixed(2));
  const grandTotal = parseFloat((subtotal + deliveryFee).toFixed(2));
  const farmerDirectPayout = parseFloat((subtotal - platformFee).toFixed(2));

  const handleOpenConfirmation = () => {
    if (!deliveryAddress || !deliveryAddress.trim()) {
      toast.error('Please enter your delivery destination address');
      return;
    }
    if (!recipientPhone || !recipientPhone.trim()) {
      toast.error('Please provide a contact phone number for the delivery partner');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsCheckingOut(true);

    try {
      const fullDeliveryInfo = `${deliveryAddress.trim()} (Contact: ${recipientName.trim()}, Phone: ${recipientPhone.trim()})`;

      for (const item of cartItems) {
        const productId = item.product_id || item.product?.id || item.product?._id;
        const qty = Number(item.quantity_kg || item.quantity || 1);

        await api.post('/orders', {
          product_id: productId,
          quantity_kg: qty,
          order_type: qty >= 50 ? 'bulk_contract' : 'individual',
          recurring_frequency: recurringPlan,
          delivery_window: deliveryWindow,
          delivery_address: fullDeliveryInfo
        });
      }

      await api.delete('/cart');
      setCartItems([]);
      toast.success('🎉 Orders Placed! Farmers & Logistics Partners alerted.');
      navigate('/buyer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (loading) {
    return <div className="py-20"><Loading message="Loading your fresh harvest cart..." /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center text-xs text-gray-500 mb-6 font-medium">
        <Link to="/" className="hover:text-primary">Home</Link>
        <ChevronRight size={13} className="mx-2 text-gray-400" />
        <Link to="/marketplace" className="hover:text-primary">Marketplace</Link>
        <ChevronRight size={13} className="mx-2 text-gray-400" />
        <span className="text-gray-900 font-bold">Shopping Cart ({cartItems.length} items)</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
            <ShoppingBag className="text-primary" /> Fresh Farm Harvest Cart
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Amazon & Flipkart-grade direct farm checkout with 100% price transparency and zero middleman markups.
          </p>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-16 text-center shadow-sm space-y-4">
          <ShoppingBag size={56} className="mx-auto text-gray-300" />
          <h3 className="text-lg font-black text-gray-900">Your basket is empty</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Browse our direct-from-farm marketplace to get pesticide-free vegetables, grains, and fruits delivered to your doorstep.
          </p>
          <div className="pt-2">
            <Link to="/marketplace">
              <Button className="bg-primary hover:bg-primary-dark text-white font-black text-xs px-6 py-3 rounded-2xl shadow-md">
                Explore Farm Marketplace →
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Cart Items & Delivery Options (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Cart Items List */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
              <div className="bg-gray-50 px-6 py-3.5 flex justify-between items-center text-xs font-bold text-gray-700">
                <span>Produce & Farm Origin</span>
                <span>Quantity & Pricing</span>
              </div>

              {cartItems.map((item) => {
                const basePrice = Number(item.price_per_kg || item.product?.price_per_kg || 20);
                const qty = Number(item.quantity_kg || item.quantity || 1);
                
                let unitPrice = basePrice;
                let discountTag = null;
                if (qty >= 1000) { unitPrice = parseFloat((basePrice * 0.85).toFixed(1)); discountTag = '15% Bulk Off'; }
                else if (qty >= 200) { unitPrice = parseFloat((basePrice * 0.90).toFixed(1)); discountTag = '10% Bulk Off'; }
                else if (qty >= 50) { unitPrice = parseFloat((basePrice * 0.95).toFixed(1)); discountTag = '5% Bulk Off'; }

                const itemTotal = parseFloat((unitPrice * qty).toFixed(2));
                const supermarketMrp = Math.round(basePrice * 1.35) * qty;

                return (
                  <div key={item.id || item._id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    {/* Item Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl shrink-0">
                        {item.category === 'fruits' ? '🍎' : item.category === 'grains' ? '🌾' : '🥦'}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-gray-900">{item.name || item.product?.name || 'Farm Produce'}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          🧑‍🌾 {item.farmer_name || item.product?.farmer_name || 'Murugan'} • {item.farmer_location || 'Salem Farm Gate'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-black text-primary">₹{unitPrice}/kg</span>
                          <span className="text-[10px] text-gray-400 line-through">₹{Math.round(basePrice * 1.35)}/kg</span>
                          {discountTag && (
                            <span className="text-[9px] bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                              {discountTag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Selector & Item Total */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                      <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-gray-50">
                        <button
                          onClick={() => updateQuantity(item.id || item._id, Math.max(1, qty - (qty >= 50 ? 25 : 1)))}
                          className="px-2.5 py-1 text-xs font-black text-gray-600 hover:bg-gray-200"
                        >-</button>
                        <span className="px-3 py-1 font-black text-xs text-gray-900">{qty} kg</span>
                        <button
                          onClick={() => updateQuantity(item.id || item._id, qty + (qty >= 50 ? 25 : 1))}
                          className="px-2.5 py-1 text-xs font-black text-gray-600 hover:bg-gray-200"
                        >+</button>
                      </div>

                      <div className="text-right">
                        <strong className="text-base font-black text-gray-900 block">₹{itemTotal}</strong>
                        <span className="text-[10px] text-green-700 font-bold block">Save ₹{supermarketMrp - itemTotal}</span>
                      </div>

                      <button
                        onClick={() => removeItem(item.id || item._id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 transition-colors"
                        title="Remove from Cart"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Delivery Speed / Window Configuration */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <Truck size={16} className="text-primary" /> Delivery Window & Dispatch Speed
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${deliveryWindow === 'express_24h' ? 'border-primary bg-green-50/60 font-bold text-emerald-950 shadow-xs' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                  <input type="radio" name="window" checked={deliveryWindow === 'express_24h'} onChange={() => setDeliveryWindow('express_24h')} className="sr-only" />
                  <span className="flex items-center gap-1.5 font-black text-xs text-emerald-950 mb-1">
                    <Zap size={14} className="text-amber-500 fill-amber-400" /> ⚡ Express Next-Day
                  </span>
                  <p className="text-[11px] text-gray-500">Delivered within 24 hours directly from farm gate.</p>
                </label>

                <label className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${deliveryWindow === 'standard_48h' ? 'border-primary bg-green-50/60 font-bold text-emerald-950 shadow-xs' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                  <input type="radio" name="window" checked={deliveryWindow === 'standard_48h'} onChange={() => setDeliveryWindow('standard_48h')} className="sr-only" />
                  <span className="flex items-center gap-1.5 font-black text-xs text-emerald-950 mb-1">
                    <Truck size={14} className="text-blue-500" /> 🚚 Standard 2-Day Transit
                  </span>
                  <p className="text-[11px] text-gray-500">Scheduled regional vehicle aggregation.</p>
                </label>

                <label className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${deliveryWindow === 'recurring_weekly' ? 'border-purple-600 bg-purple-50 font-bold text-purple-950 shadow-xs' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                  <input type="radio" name="window" checked={deliveryWindow === 'recurring_weekly'} onChange={() => { setDeliveryWindow('recurring_weekly'); setRecurringPlan('weekly'); }} className="sr-only" />
                  <span className="flex items-center gap-1.5 font-black text-xs text-purple-950 mb-1">
                    <Calendar size={14} className="text-purple-600" /> 📅 Weekly Recurring Plan
                  </span>
                  <p className="text-[11px] text-gray-500">Auto-dispatched weekly standing order.</p>
                </label>
              </div>

              {/* Delivery Address Input & Recipient Suite */}
              <div className="pt-2 space-y-3 border-t border-gray-100">
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
                    {isLocating ? 'Acquiring GPS...' : 'Use Live GPS'}
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
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Contact Phone (For Driver Call)</label>
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
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Full Doorstep Address (Flat, Street, Area, City, PIN)</label>
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium text-gray-800 resize-none"
                    placeholder="Enter complete delivery address with flat number, landmark and 6-digit pincode..."
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Simulator */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <CreditCard size={16} className="text-primary" /> Select Payment Method
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { id: 'upi', label: '📱 Instant UPI', desc: 'GPay / PhonePe / Paytm' },
                  { id: 'card', label: '💳 Cards & NetBanking', desc: 'All Indian Banks' },
                  { id: 'cod', label: '💵 Cash on Delivery', desc: 'Pay at Doorstep' },
                  { id: 'b2b_credit', label: '🏢 B2B 15-Day Credit', desc: 'For Verified Retailers' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'border-primary bg-green-50 text-emerald-950 font-bold ring-1 ring-primary shadow-xs'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="block font-black text-xs">{m.label}</span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Amazon/Flipkart Order Financial Summary (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border-2 border-gray-200 p-6 shadow-md space-y-5 sticky top-24">
              <h3 className="font-black text-base text-gray-900 border-b pb-3">
                Order Summary ({cartItems.length} items)
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Total Items MRP:</span>
                  <span className="line-through text-gray-400 font-mono">₹{grossMrpTotal}</span>
                </div>

                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Direct Farm Savings:</span>
                  <span className="font-mono">- ₹{totalSavings}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Harvest Subtotal:</span>
                  <span className="font-black text-gray-900 font-mono">₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charges:</span>
                  <span className="font-mono font-bold text-green-700">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                </div>

                <div className="flex justify-between text-gray-400 text-[11px] border-t pt-2">
                  <span>Platform Fee (Strictly 2%):</span>
                  <span className="font-mono">₹{platformFee}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t-2 border-dashed border-gray-200 pt-3 flex justify-between items-baseline">
                <span className="font-black text-sm text-gray-900">Total Payable:</span>
                <span className="text-2xl font-black text-gray-900">₹{grandTotal}</span>
              </div>

              {/* 98% Farmer Direct Pay Badge */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 text-xs text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-emerald-900">
                  <CheckCircle2 size={15} className="text-emerald-700" />
                  <span>Fair Trade 98% Farmer Share</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  <strong>₹{farmerDirectPayout}</strong> will be deposited directly into rural farmers' bank accounts upon delivery.
                </p>
              </div>

              {/* Place Order Button - Opens Confirmation Modal */}
              <Button
                onClick={handleOpenConfirmation}
                disabled={isCheckingOut || cartItems.length === 0}
                className="w-full bg-primary hover:bg-primary-dark text-white font-black text-sm py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={16} />
                {`Review & Place Order (₹${grandTotal}) →`}
              </Button>

              <div className="text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" /> 100% Safe & Traceable Farm Gate Produce
              </div>

              {/* Order Confirmation Modal */}
              {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowConfirmModal(false)}>
                  <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-emerald-600" /> Confirm Your Order
                      </h3>
                      <button onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-200">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Summary</h4>
                      {cartItems.map((item, idx) => {
                        const name = item.product?.name || item.product_name || 'Farm Produce';
                        const qty = Number(item.quantity_kg || item.quantity || 1);
                        const price = Number(item.price_per_kg || item.product?.price_per_kg || 20);
                        return (
                          <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-200 last:border-0">
                            <span className="font-semibold text-gray-800">{name} × {qty} kg</span>
                            <span className="font-bold text-gray-900">₹{(price * qty).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Delivery Info */}
                    <div className="bg-emerald-50 rounded-2xl p-4 space-y-2 border border-emerald-200">
                      <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={13} /> Doorstep Delivery & Recipient
                      </h4>
                      <p className="text-xs font-bold text-gray-900">👤 {recipientName} • 📱 {recipientPhone}</p>
                      <p className="text-xs text-gray-700 font-medium">{deliveryAddress}</p>
                      <div className="flex gap-2 text-[11px] text-gray-600 pt-1">
                        <span className="bg-white px-2 py-0.5 rounded-lg border border-emerald-200 font-bold">
                          {deliveryWindow === 'express_24h' ? '⚡ Express 24h' : deliveryWindow === 'standard_48h' ? '📦 Standard 48h' : '🔄 Weekly Recurring'}
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded-lg border border-emerald-200 font-bold">
                          {paymentMethod === 'upi' ? '📱 UPI' : paymentMethod === 'card' ? '💳 Card' : paymentMethod === 'cod' ? '💵 COD' : '🏢 B2B Credit'}
                        </span>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                      <div className="flex justify-between text-gray-600"><span>Delivery</span><span>{deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${deliveryFee}`}</span></div>
                      <div className="flex justify-between text-gray-600"><span>Platform Fee (2%)</span><span>₹{platformFee}</span></div>
                      {totalSavings > 0 && (
                        <div className="flex justify-between text-emerald-700 font-bold"><span>You Save vs Supermarket</span><span>-₹{totalSavings.toLocaleString()}</span></div>
                      )}
                      <div className="flex justify-between text-gray-900 font-black text-base pt-2 border-t border-gray-200">
                        <span>Total</span><span>₹{grandTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 text-xs font-semibold">
                        <span>98% Direct Farmer Payout</span><span>₹{farmerDirectPayout.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowConfirmModal(false)}
                        className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-50 transition-all"
                      >
                        ← Edit Cart
                      </button>
                      <button
                        onClick={() => { setShowConfirmModal(false); handleCheckout(); }}
                        disabled={isCheckingOut}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <Sparkles size={14} />
                        {isCheckingOut ? 'Placing...' : 'Confirm & Pay →'}
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Cart;
