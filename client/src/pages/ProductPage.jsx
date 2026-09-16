import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Leaf, MapPin, ShieldCheck, ChevronRight, Star, 
  TrendingDown, Building2, User, Sparkles, Award, DollarSign, 
  Calendar, RefreshCw, CheckCircle2, Clock, Image as ImageIcon,
  MessageSquare, Send, ChevronLeft, Zap, Heart, Check, X
} from 'lucide-react';
import Button from '../components/common/Button';
import PriceTag from '../components/common/PriceTag';
import { Skeleton } from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Gallery State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Order Configuration State
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState('individual');
  const [recurringFrequency, setRecurringFrequency] = useState('none');
  const [isPlacingDirect, setIsPlacingDirect] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([
    {
      id: 1,
      author: 'Aravind Swaminathan',
      location: 'Adyar, Chennai',
      rating: 5,
      date: '2 days ago',
      comment: 'Super fresh harvest! The aroma of fresh soil was still there. Delivered in direct cold transit within 3 hours of harvest.'
    },
    {
      id: 2,
      author: 'Priya Narayanan',
      location: 'Indiranagar, Bangalore',
      rating: 5,
      date: '1 week ago',
      comment: 'Zero chemicals, authentic farm taste. Far better quality than supermarket shelves, and 98% payout goes straight to the farmer.'
    },
    {
      id: 3,
      author: 'Suresh Kumar (Bulk Buyer)',
      location: 'Koyambedu, Chennai',
      rating: 4,
      date: '2 weeks ago',
      comment: 'Procured 200kg for our organic store. Uniform Grade A quality and verified transit GPS made receiving completely painless.'
    }
  ]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newAuthor, setNewAuthor] = useState(user?.name || '');

  // Direct Order Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.location || 'Flat 4B, Sri Krishna Apts, North Usman Rd, T. Nagar, Chennai, Tamil Nadu 600017');
  const [recipientName, setRecipientName] = useState(user?.name || 'Consumer Buyer');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '+91 9876543210');
  const [deliveryWindow, setDeliveryWindow] = useState('express_24h');
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const fetchProductAndSimilar = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/products/${id}`);
        const currentProd = res.data.data;
        setProduct(currentProd);

        // Fetch similar products in same category
        if (currentProd?.category) {
          const simRes = await api.get('/products', {
            params: { category: currentProd.category.toLowerCase(), limit: 6 }
          });
          const allSim = simRes.data.data || [];
          setSimilarProducts(allSim.filter(p => (p.id || p._id) !== currentProd.id));
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Product not found or failed to load');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndSimilar();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800">
          <div className="lg:col-span-6 h-96 bg-gray-200 dark:bg-slate-800 rounded-2xl" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded w-3/4" />
            <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
            <div className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="text-5xl mb-4">🌾</div>
        <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">Produce Not Found</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">The requested farm listing is either concluded or unavailable.</p>
        <Button variant="primary" onClick={() => navigate('/marketplace')}>
          Browse Active Marketplace
        </Button>
      </div>
    );
  }

  // Image Gallery Preparation (Provide 3 multi-angle images using category / unsplash)
  const defaultImg = product.image_url || 'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=800&h=600&fit=crop';
  const galleryImages = [
    defaultImg,
    'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1566385101042-1a0aa4c1c900?w=800&h=600&fit=crop',
  ];

  // Calculate volume tiered pricing
  const basePrice = Number(product.price_per_kg) || 20;
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
    try {
      await addToCart(product, quantity);
    } catch (err) {
      toast.error('Failed to add produce to cart');
    }
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error('Please share your feedback in the review');
      return;
    }
    const newRev = {
      id: Date.now(),
      author: newAuthor.trim() || 'Verified Consumer',
      location: user?.location || 'Direct Buyer',
      rating: newRating,
      date: 'Just now',
      comment: newComment.trim()
    };
    setReviews([newRev, ...reviews]);
    setNewComment('');
    toast.success('Thank you! Your farm review has been posted.');
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDeliveryAddress(`Doorstep GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), Delivery Zone`);
        setIsLocating(false);
        toast.success('📍 Live GPS coordinates captured!');
      },
      () => {
        setIsLocating(false);
        toast.error('Unable to retrieve GPS coordinates.');
      }
    );
  };

  const handleDirectBuy = async () => {
    if (!deliveryAddress || !deliveryAddress.trim()) {
      toast.error('Please enter your delivery destination address');
      return;
    }
    setIsPlacingDirect(true);
    try {
      const fullDeliveryInfo = `${deliveryAddress.trim()} (Contact: ${recipientName.trim()}, Phone: ${recipientPhone.trim()})`;
      const res = await api.post('/orders', {
        product_id: product.id || product._id,
        quantity_kg: quantity,
        order_type: orderType,
        delivery_address: fullDeliveryInfo
      });
      setShowAddressModal(false);
      const orderId = res.data.data?.orderId || res.data.data?.id;
      toast.success(`Order #${orderId} Placed! Farmer notified via SMS.`);
      navigate('/buyer/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setIsPlacingDirect(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-6 font-medium">
        <Link to="/" className="hover:text-primary dark:hover:text-emerald-400">Home</Link>
        <ChevronRight size={13} className="mx-2 text-gray-400" aria-hidden="true" />
        <Link to="/marketplace" className="hover:text-primary dark:hover:text-emerald-400">Marketplace</Link>
        <ChevronRight size={13} className="mx-2 text-gray-400" aria-hidden="true" />
        <span className="text-gray-900 dark:text-gray-100 font-bold capitalize">{product.name}</span>
      </nav>

      {/* Main Product Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-8 transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left: Image Gallery & Lightbox (5 Cols) */}
          <div className="lg:col-span-5 bg-gray-50/50 dark:bg-slate-900/50 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-slate-800">
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">{product.category}</Badge>
                <Badge variant="warning">Grade {product.quality_grade || 'A'}</Badge>
                {product.is_organic && (
                  <Badge variant="success" icon={<Leaf size={12} />}>100% Organic</Badge>
                )}
              </div>

              {/* Main Image View */}
              <div 
                onClick={() => setIsLightboxOpen(true)}
                className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm cursor-zoom-in group"
              >
                <img
                  src={galleryImages[selectedImageIndex]}
                  alt={`${product.name} angle ${selectedImageIndex + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-2 right-2 bg-slate-950/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                  <ImageIcon size={12} /> Tap to zoom
                </div>
              </div>

              {/* Thumbnail Strip */}
              <div className="flex gap-3">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    aria-label={`View image ${idx + 1}`}
                    className={`h-16 w-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImageIndex === idx 
                        ? 'border-primary ring-2 ring-primary/30 scale-105' 
                        : 'border-gray-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Farm Gate Traceability Card */}
            <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-xs">
              <span className="font-extrabold text-emerald-900 dark:text-emerald-300 block mb-1">
                📍 Direct Farm Gate Traceability
              </span>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Harvested by <strong>{product.farmer_name || 'Murugan K.'}</strong> in <strong>{product.farmer_location || 'Salem District'}</strong>. Distance to your doorstep: <strong>{product.distance_km || 118} km</strong> (~2h direct transit).
              </p>
            </div>
          </div>

          {/* Right: Pricing, Volume Tiers, 98/2 Breakdown & Purchase (7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 leading-tight">
                {product.name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                SKU: F2H-{product.id || 'CROP'}-2026 · Harvest Date: {product.harvest_date || 'Today'}
              </p>

              {/* Live Price & Benchmark Comparison */}
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-emerald-800 dark:text-emerald-400 font-bold block">Direct Farm Price</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-950 dark:text-emerald-200">
                      ₹{effectiveUnitPrice}
                    </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">/ kg</span>
                    {discountPct > 0 && (
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {discountPct}% Volume Discount Applied
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs space-y-1">
                  <div className="text-gray-500 dark:text-gray-400 line-through">
                    Supermarket: ₹{supermarketPrice}/kg
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                    You save ₹{(supermarketPrice - effectiveUnitPrice).toFixed(1)}/kg (direct farm gate)
                  </div>
                </div>
              </div>

              {/* Volume Tiered Discount Selector */}
              <div className="mt-6">
                <label className="block text-xs font-black text-gray-800 dark:text-gray-200 mb-2">
                  Select Order Quantity:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { qty: 1, label: '1 kg', tier: 'Standard' },
                    { qty: 50, label: '50 kg', tier: '5% Bulk Off' },
                    { qty: 200, label: '200 kg', tier: '10% Off' },
                    { qty: 1000, label: '1000 kg+', tier: '15% Wholesale' }
                  ].map((tier) => (
                    <button
                      key={tier.qty}
                      type="button"
                      onClick={() => setQuantity(tier.qty)}
                      className={`p-3 rounded-2xl text-center border transition-all cursor-pointer ${
                        quantity === tier.qty
                          ? 'bg-primary text-white border-primary shadow-md ring-2 ring-primary/30'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="block font-black text-sm">{tier.label}</span>
                      <span className={`text-[10px] font-bold block mt-0.5 ${quantity === tier.qty ? 'text-amber-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {tier.tier}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 98% Direct Farmer Payout Math */}
              <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700 dark:text-gray-300">Total Purchase:</span>
                  <strong className="text-base text-gray-950 dark:text-gray-100">₹{subtotal}</strong>
                </div>
                <div className="space-y-1 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-slate-700 pt-2 text-[11px]">
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                    <span>🧑‍🌾 Direct Farmer Payout (98%):</span>
                    <span>₹{farmerPayout}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🛡️ Platform & Cold Transit Ops (2%):</span>
                    <span>₹{platformFee}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} /> Add to Cart
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowAddressModal(true)}
                className="flex items-center justify-center gap-2"
              >
                <Zap size={18} /> 1-Click Doorstep Buy
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* Reviews Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-sm mb-8 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Star size={18} className="text-amber-500 fill-amber-400" />
              Verified Consumer Reviews ({reviews.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Direct feedback from urban buyers and bulk stores on freshness and delivery.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl text-amber-900 dark:text-amber-300 text-xs font-black">
            <span>4.9 / 5.0 Overall Rating</span>
          </div>
        </div>

        {/* Review Submission Form */}
        <form onSubmit={handleAddReview} className="mb-8 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-3">Leave a Harvest Review:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="Your name / store name"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              className="p-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
            />
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-gray-600 dark:text-gray-400">Rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setNewRating(star)}
                  className="text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                >
                  <Star size={18} className={star <= newRating ? 'fill-amber-400' : 'text-gray-300 dark:text-slate-700'} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={2}
            placeholder="Share details on freshness, transit speed, and crop quality..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 mb-3"
          />
          <Button type="submit" size="sm" variant="primary" className="flex items-center gap-1.5">
            <Send size={14} /> Submit Review
          </Button>
        </form>

        {/* Reviews List */}
        <div className="divide-y divide-gray-100 dark:divide-slate-800 space-y-4 pt-2">
          {reviews.map((rev) => (
            <div key={rev.id} className="pt-4 first:pt-0">
              <div className="flex justify-between items-start mb-1 text-xs">
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">{rev.author}</strong>
                  <span className="text-gray-400 ml-2">({rev.location})</span>
                </div>
                <span className="text-gray-400 text-[11px]">{rev.date}</span>
              </div>
              <div className="flex text-amber-400 mb-2">
                {Array.from({ length: rev.rating }).map((_, i) => (
                  <Star key={i} size={12} className="fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {rev.comment}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Similar Products Carousel */}
      {similarProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              Similar Farm Produce in {product.category}
            </h2>
            <Link to={`/marketplace?category=${product.category}`} className="text-xs font-bold text-primary dark:text-emerald-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {similarProducts.map((p) => (
              <div key={p.id || p._id} className="w-64 shrink-0">
                <Link to={`/product/${p.id || p._id}`} className="block group">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-all p-3">
                    <img
                      src={p.image_url || 'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=300&h=200&fit=crop'}
                      alt={p.name}
                      className="w-full h-32 object-cover rounded-xl group-hover:scale-105 transition-transform"
                    />
                    <h3 className="font-bold text-xs mt-2 truncate text-gray-900 dark:text-gray-100">{p.name}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-black text-xs text-emerald-800 dark:text-emerald-400">₹{p.price_per_kg}/kg</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{p.farmer_location || 'Salem'}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="Close zoom"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white bg-white/20 rounded-full hover:bg-white/40 cursor-pointer"
          >
            <X size={24} />
          </button>
          <img
            src={galleryImages[selectedImageIndex]}
            alt="Expanded crop view"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl"
          />
        </div>
      )}

      {/* Doorstep Delivery Order Modal */}
      {showAddressModal && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 animate-slide-up text-xs">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100">
                Confirm Doorstep Direct Dispatch
              </h3>
              <button onClick={() => setShowAddressModal(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Driver Contact Phone (+91)</label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-gray-700 dark:text-gray-300">Delivery Address</label>
                  <button
                    type="button"
                    onClick={handleUseGPS}
                    className="text-primary dark:text-emerald-400 font-bold hover:underline"
                  >
                    {isLocating ? 'Locating...' : '📍 Use Live GPS'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300">
                <div className="flex justify-between font-bold">
                  <span>Order Quantity:</span>
                  <span>{quantity} kg</span>
                </div>
                <div className="flex justify-between font-black text-sm mt-1">
                  <span>Total Payable:</span>
                  <span>₹{subtotal}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddressModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" loading={isPlacingDirect} onClick={handleDirectBuy}>
                  Confirm & Dispatch
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductPage;
