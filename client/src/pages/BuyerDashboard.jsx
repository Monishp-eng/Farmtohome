import React, { useState, useEffect } from 'react';
import { ShoppingBag, Heart, MapPin, Truck, CheckCircle2, Clock, Sparkles, User, Building2, DollarSign, Package, RefreshCw, Edit2, Trash2, Plus, Phone, Home, Check, X } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapBounds = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, bounds]);
  return null;
};

const createEmojiIcon = (emoji) => L.divIcon({
  html: `<div style="font-size: 24px; text-align: center; line-height: 24px; drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${emoji}</div>`,
  className: 'custom-emoji-icon bg-transparent border-none',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const BuyerDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [orderFilter, setOrderFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Address Management State
  const initialAddresses = () => {
    try {
      const saved = localStorage.getItem('kisan_saved_addresses');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 1,
        label: 'Home Location',
        isPrimary: true,
        recipientName: 'Consumer Buyer',
        phone: '+91 9876543210',
        address: 'Flat 4B, Sri Krishna Apts, North Usman Rd, T. Nagar, Chennai, Tamil Nadu 600017'
      },
      {
        id: 2,
        label: 'Office / Secondary Store',
        isPrimary: false,
        recipientName: 'Consumer Buyer',
        phone: '+91 9876543210',
        address: 'Plot 12, 2nd Avenue, Anna Nagar East, Chennai, Tamil Nadu 600040'
      }
    ];
  };

  const [addresses, setAddresses] = useState(initialAddresses);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const addressPresets = [
    { label: '🏢 T. Nagar, Chennai', address: 'Flat 4B, Sri Krishna Apts, North Usman Rd, T. Nagar, Chennai, Tamil Nadu 600017' },
    { label: '🏡 Anna Nagar, Chennai', address: 'Plot 12, 2nd Avenue, Anna Nagar East, Chennai, Tamil Nadu 600040' },
    { label: '🏢 Indiranagar, Bangalore', address: 'No. 402, 100ft Road, Indiranagar, Bangalore, Karnataka 560038' },
    { label: '🏡 Salem Central, TN', address: 'Door 24, Fairlands Main Road, Salem, Tamil Nadu 636016' }
  ];

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr ? { ...addr } : {
      id: Date.now(),
      label: 'Home Delivery',
      isPrimary: addresses.length === 0,
      recipientName: 'Consumer Buyer',
      phone: '+91 9876543210',
      address: ''
    });
    setShowAddressModal(true);
  };

  const handleSaveAddress = () => {
    if (!editingAddress.address || !editingAddress.address.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }
    if (!editingAddress.phone || !editingAddress.phone.trim()) {
      toast.error('Please enter a contact phone number');
      return;
    }

    let updatedList;
    const exists = addresses.some(a => a.id === editingAddress.id);
    if (exists) {
      updatedList = addresses.map(a => a.id === editingAddress.id ? editingAddress : a);
    } else {
      updatedList = [editingAddress, ...addresses];
    }

    if (editingAddress.isPrimary) {
      updatedList = updatedList.map(a => ({
        ...a,
        isPrimary: a.id === editingAddress.id
      }));
    }

    setAddresses(updatedList);
    try {
      localStorage.setItem('kisan_saved_addresses', JSON.stringify(updatedList));
    } catch (e) {}

    setShowAddressModal(false);
    toast.success('🎉 Delivery address saved successfully!');
  };

  const handleDeleteAddress = (id) => {
    const updated = addresses.filter(a => a.id !== id);
    if (updated.length > 0 && !updated.some(a => a.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setAddresses(updated);
    try {
      localStorage.setItem('kisan_saved_addresses', JSON.stringify(updated));
    } catch (e) {}
    toast.success('Address removed');
  };

  const handleSetPrimary = (id) => {
    const updated = addresses.map(a => ({
      ...a,
      isPrimary: a.id === id
    }));
    setAddresses(updated);
    try {
      localStorage.setItem('kisan_saved_addresses', JSON.stringify(updated));
    } catch (e) {}
    toast.success('🌟 Primary delivery address updated!');
  };

  const handleUseGPSInEdit = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const gpsAddr = `Doorstep GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), Chennai Delivery Hub, Tamil Nadu`;
        setEditingAddress(prev => ({ ...prev, address: gpsAddr }));
        setIsLocating(false);
        toast.success('📍 Live GPS coordinates populated!');
      },
      (err) => {
        setIsLocating(false);
        toast.error('Unable to retrieve GPS. Please type or pick a preset address.');
      },
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my-orders');
      setOrders(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyAgain = async (order) => {
    try {
      await api.post('/cart', { product_id: order.product_id, quantity_kg: order.quantity_kg || 5 });
      toast.success('Added to cart! Visit marketplace to checkout.');
    } catch (err) {
      toast.error('Failed to add to cart');
    }
  };

  const totalSpent = orders.reduce((sum, order) => sum + (Number(order.total_price) || 0), 0);
  const inTransitCount = orders.filter(o => o.status === 'in_transit' || o.status === 'dispatched').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  const stats = [
    { label: 'Total Orders Placed', value: orders.length, icon: ShoppingBag },
    { label: 'Amount Spent', value: `₹${totalSpent.toLocaleString()}`, icon: DollarSign },
    { label: 'In Transit / Dispatched', value: inTransitCount, icon: Truck },
    { label: 'Completed Deliveries', value: deliveredCount, icon: CheckCircle2 },
  ];

  const getTimeline = (status) => {
    const statuses = ['pending', 'confirmed', 'dispatched', 'in_transit', 'delivered'];
    const displayNames = {
      'pending': '1. Order Placed',
      'confirmed': '2. Confirmed',
      'dispatched': '3. Dispatched from Farm',
      'in_transit': '4. In Transit',
      'delivered': '5. Delivered to Doorstep'
    };
    
    let currentIndex = statuses.indexOf(status?.toLowerCase());
    if (currentIndex === -1) currentIndex = 0;

    return statuses.map((s, idx) => ({
      key: s,
      status: displayNames[s],
      done: idx <= currentIndex,
      isCurrent: idx === currentIndex
    }));
  };

  const filteredOrders = orders.filter(order => {
    if (orderFilter === 'active') return ['pending', 'confirmed', 'dispatched', 'in_transit'].includes(order.status);
    if (orderFilter === 'completed') return order.status === 'delivered';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-primary-dark to-emerald-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl mb-8 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold bg-white/20 text-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Consumer Order Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2">Track Direct Farm Purchases</h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1">
            Real-time status updates synchronized with farmer SMS confirmations and logistics drivers.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-xs font-bold text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <nav className="flex flex-col text-xs font-bold">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`flex items-center px-4 py-3.5 ${activeTab === 'orders' ? 'bg-green-50 text-primary border-l-4 border-primary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <ShoppingBag size={16} className="mr-2.5" /> Active & Past Orders
              </button>
              <button 
                onClick={() => setActiveTab('addresses')}
                className={`flex items-center px-4 py-3.5 ${activeTab === 'addresses' ? 'bg-green-50 text-primary border-l-4 border-primary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <MapPin size={16} className="mr-2.5" /> Delivery Address
              </button>
            </nav>
          </div>
        </div>

        {/* Orders Content */}
        <div className="flex-1">
          {activeTab === 'orders' && (
            <>
              {/* Order Status Filters */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['all', 'active', 'completed'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-colors ${
                      orderFilter === filter
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {filter} Orders
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-400 font-bold text-sm">Loading farm orders...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-200">
                  <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-base font-bold text-gray-900">No orders found</h3>
                  <p className="text-xs text-gray-500 mt-1">Visit the marketplace to buy direct farm fresh produce.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredOrders.map(order => {
                    const showMap = order.status !== 'delivered' && order.status !== 'cancelled';
                    
                    const farmLoc = [order.farmer_lat || 11.6643, order.farmer_lng || 78.1460];
                    const consumerLoc = [order.delivery_lat || 13.0418, order.delivery_lng || 80.2341];
                    const polylinePositions = [farmLoc, consumerLoc];
                    
                    let truckLoc = null;
                    if (order.status === 'confirmed') truckLoc = farmLoc;
                    else if (order.status === 'dispatched' || order.status === 'in_transit') {
                      truckLoc = [
                        (farmLoc[0] + consumerLoc[0]) / 2,
                        (farmLoc[1] + consumerLoc[1]) / 2
                      ];
                    }

                    return (
                      <Card key={order.id} className="overflow-hidden border-2 border-gray-200/80 rounded-3xl">
                        {/* Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b flex flex-wrap justify-between items-center gap-4 text-xs">
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Order ID</span>
                            <span className="font-black text-gray-900 font-mono">#{order.id}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Date Placed</span>
                            <span className="font-bold text-gray-800">{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Farmer Origin</span>
                            <span className="font-bold text-emerald-800">🧑‍🌾 {order.farmer_name || 'Farmer'} ({order.farmer_location || 'Salem'})</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Paid</span>
                            <span className="font-black text-gray-900">₹{order.total_price}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-black capitalize ${
                              order.status === 'delivered' 
                                ? 'bg-emerald-100 text-emerald-900' 
                                : order.status === 'in_transit'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}>
                              {order.status}
                            </span>
                            {order.status === 'delivered' && (
                              <button 
                                onClick={() => handleBuyAgain(order)}
                                className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded-full text-xs font-black hover:bg-primary-dark transition-colors"
                              >
                                <RefreshCw size={12} /> Buy Again
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 space-y-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-black text-base text-gray-900">{order.product_name}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">{order.quantity_kg} kg • Farm Gate Direct</p>
                            </div>
                            <div className="text-right text-xs">
                              <span className="text-emerald-700 font-bold block">98% Payout: ₹{order.farmer_earnings}</span>
                              <span className="text-gray-400 text-[10px]">Platform Fee (2%): ₹{order.platform_fee}</span>
                            </div>
                          </div>

                          {/* Map container for active orders */}
                          {showMap && (
                            <div className="h-48 rounded-2xl border-2 border-emerald-100 overflow-hidden relative z-0">
                              <MapContainer 
                                center={farmLoc} 
                                zoom={6} 
                                scrollWheelZoom={false} 
                                className="h-full w-full"
                              >
                                <TileLayer
                                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                  attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                                />
                                <MapBounds bounds={polylinePositions} />
                                
                                <Polyline positions={polylinePositions} pathOptions={{ color: '#059669', dashArray: '5, 10', weight: 3 }} />
                                
                                <Marker position={farmLoc} icon={createEmojiIcon('🟢')}>
                                  <Popup>Farm Gate Origin</Popup>
                                </Marker>
                                
                                <Marker position={consumerLoc} icon={createEmojiIcon('🔴')}>
                                  <Popup>Delivery Location</Popup>
                                </Marker>

                                {truckLoc && (
                                  <Marker position={truckLoc} icon={createEmojiIcon('🚚')}>
                                    <Popup>Current Location</Popup>
                                  </Marker>
                                )}
                              </MapContainer>
                            </div>
                          )}
                          
                          {/* 5-Stage Order Lifecycle Stepper */}
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                            <h5 className="font-black text-xs text-gray-900 mb-4 flex items-center gap-1.5">
                              <Truck size={15} className="text-primary" /> Live 5-Stage Order Lifecycle:
                            </h5>

                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                              {getTimeline(order.status).map((track, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2.5 rounded-xl border text-center transition-all ${
                                    track.done
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-xs'
                                      : 'bg-white border-gray-200 text-gray-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-center mb-1">
                                    {track.done ? (
                                      <CheckCircle2 size={16} className="text-emerald-600" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                                    )}
                                  </div>
                                  <span className="text-[11px] leading-tight block">{track.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {order.distance_km && (
                            <div className="text-xs text-gray-500 flex justify-between items-center border-t pt-3">
                              <span className="flex items-center gap-1">
                                <MapPin size={13} className="text-primary" /> Delivery Distance: <strong>{order.distance_km} km</strong>
                              </span>
                              <span>Est. Transit: <strong>{order.estimated_time_hrs || 2} Hours</strong></span>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
          
          {activeTab === 'addresses' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                    <MapPin className="text-primary" size={20} /> Saved Delivery Addresses
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Manage your doorstep destinations for agricultural produce deliveries.</p>
                </div>
                <button
                  onClick={() => handleOpenEdit(null)}
                  className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} /> Add New Address
                </button>
              </div>

              {/* Address Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`rounded-3xl p-5 relative transition-all border-2 text-xs flex flex-col justify-between ${
                      addr.isPrimary
                        ? 'border-primary bg-emerald-50/70 shadow-sm ring-1 ring-primary/20'
                        : 'border-gray-200 bg-gray-50/60 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-gray-900">{addr.label}</span>
                          {addr.isPrimary && (
                            <span className="bg-primary text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                              ⭐ Primary Destination
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-800 font-medium leading-relaxed mb-3">
                        {addr.address}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-gray-600 font-mono">
                        <span className="flex items-center gap-1">
                          👤 {addr.recipientName || 'Recipient'}
                        </span>
                        <span className="flex items-center gap-1">
                          📱 {addr.phone}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between border-t border-gray-200/80 pt-3 mt-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(addr)}
                          className="px-3 py-1.5 bg-white border border-gray-300 hover:border-primary text-gray-700 hover:text-primary rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        {!addr.isPrimary && (
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                      </div>

                      {!addr.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(addr.id)}
                          className="text-[11px] font-black text-primary hover:underline cursor-pointer"
                        >
                          Set as Primary
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Address Edit / Add Modal */}
          {showAddressModal && editingAddress && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddressModal(false)}>
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <MapPin size={20} className="text-primary" />
                    {addresses.some(a => a.id === editingAddress.id) ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                  </h3>
                  <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Address Label */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Address Label</label>
                    <div className="flex gap-2">
                      {['Home Location', 'Office / Retail Store'].map(lbl => (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() => setEditingAddress(prev => ({ ...prev, label: lbl }))}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            editingAddress.label === lbl
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipient Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Recipient Name</label>
                      <input
                        type="text"
                        value={editingAddress.recipientName || ''}
                        onChange={(e) => setEditingAddress(prev => ({ ...prev, recipientName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. Anand Kumar"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Contact Phone (For Driver)</label>
                      <input
                        type="text"
                        value={editingAddress.phone || ''}
                        onChange={(e) => setEditingAddress(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>

                  {/* Quick Presets & GPS */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-gray-400">Quick Fill from Preset Hubs:</label>
                      <button
                        type="button"
                        onClick={handleUseGPSInEdit}
                        disabled={isLocating}
                        className="text-[11px] font-bold text-primary bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                      >
                        {isLocating ? <RefreshCw size={11} className="animate-spin" /> : '📍'}
                        {isLocating ? 'Locating...' : 'Use Live GPS'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {addressPresets.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditingAddress(prev => ({ ...prev, address: p.address }))}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            editingAddress.address === p.address
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full Doorstep Address Textarea */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Full Doorstep Address (Flat, Street, Area, City, PIN)</label>
                    <textarea
                      rows={3}
                      value={editingAddress.address || ''}
                      onChange={(e) => setEditingAddress(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder="Enter flat/door number, building, street, area, city and 6-digit pincode..."
                    />
                  </div>

                  {/* Set Primary Checkbox */}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingAddress.isPrimary || false}
                      onChange={(e) => setEditingAddress(prev => ({ ...prev, isPrimary: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="font-bold text-gray-700">Set as Primary Delivery Address</span>
                  </label>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setShowAddressModal(false)}
                    className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-bold text-xs rounded-2xl hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    ← Cancel
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Check size={14} /> Save Address
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
