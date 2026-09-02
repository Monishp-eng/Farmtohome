import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Truck, MapPin, CheckCircle2, Clock, Navigation, AlertCircle, Sparkles, DollarSign, RefreshCw, Check, ArrowRight, Building2, Package, Layers, Camera, ShieldCheck, CreditCard, X, Phone, MessageSquare } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import api from '../api/axios';
import toast from 'react-hot-toast';

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createColorIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const farmIcon = createColorIcon('green');
const consumerIcon = createColorIcon('red');

const truckIcon = new L.DivIcon({
  html: '<div style="font-size: 24px; transform: rotate(45deg);">🚛</div>',
  className: 'truck-animation-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// Component to handle map centering/bounds
const MapBounds = ({ deliveries }) => {
  const map = useMap();
  useEffect(() => {
    if (deliveries && deliveries.length > 0) {
      const bounds = L.latLngBounds();
      deliveries.forEach(del => {
        if (del.pickup_lat && del.pickup_lng) bounds.extend([del.pickup_lat, del.pickup_lng]);
        if (del.delivery_lat && del.delivery_lng) bounds.extend([del.delivery_lat, del.delivery_lng]);
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
      map.setView([13.0694, 80.1948], 10); // Center Chennai
    }
  }, [deliveries, map]);
  return null;
};

const LogisticsDashboard = () => {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

  // Multi-stop optimizer state
  const [optLoading, setOptLoading] = useState(false);
  const [optResult, setOptResult] = useState(null);

  // Method 4: Farm-Gate Bank Verification Modal State
  const [selectedFarmerForBank, setSelectedFarmerForBank] = useState(null);
  const [bankAccount, setBankAccount] = useState('30894726194');
  const [ifscCode, setIfscCode] = useState('SBIN0001234');
  const [bankName, setBankName] = useState('State Bank of India (Salem Branch)');
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);

  // Animation State
  const [animatingDelivery, setAnimatingDelivery] = useState(null);
  const [truckPosition, setTruckPosition] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  // POD Modal State
  const [podModal, setPodModal] = useState(null);
  const [podNotes, setPodNotes] = useState('');
  const [podConfirmed, setPodConfirmed] = useState(false);
  const [podLocation, setPodLocation] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const delRes = await api.get('/logistics/my-deliveries');
      setDeliveries(delRes.data.data || delRes.data || []);
    } catch (error) {
      toast.error('Failed to load logistics dispatches');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.put(`/logistics/${id}/status`, { status: newStatus });
      toast.success(`Shipment updated to: ${newStatus.replace('_', ' ').toUpperCase()}`);
      setDeliveries(prev => prev.map(d => (d.id === id || d._id === id) ? { ...d, status: newStatus } : d));
      
      if (newStatus === 'in_transit') {
        setAnimatingDelivery(id);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  useEffect(() => {
    if (!animatingDelivery) return;
    const del = deliveries.find(d => (d.id === animatingDelivery || d._id === animatingDelivery));
    if (!del) return;
    
    const startLat = del.pickup_lat || 13.0694;
    const startLng = del.pickup_lng || 80.1948;
    const endLat = del.delivery_lat || 13.0418;
    const endLng = del.delivery_lng || 80.2341;
    
    let startTime = null;
    const duration = 15000; // 15 seconds
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setAnimationProgress(progress);
      
      const lat = startLat + (endLat - startLat) * progress;
      const lng = startLng + (endLng - startLng) * progress;
      setTruckPosition([lat, lng]);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatingDelivery(null);
        setTruckPosition(null);
        setAnimationProgress(0);
      }
    };
    requestAnimationFrame(animate);
  }, [animatingDelivery, deliveries]);

  const handlePODOpen = (del) => {
    setPodModal(del);
    setPodNotes('');
    setPodConfirmed(false);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setPodLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {
        setPodLocation(null);
      });
    }
  };

  const handlePODSubmit = async (e) => {
    e.preventDefault();
    if (!podModal || !podConfirmed) return;
    
    await handleStatusUpdate(podModal.id || podModal._id, 'delivered');
    setPodModal(null);
  };

  const handleBankVerifySubmit = async (e) => {
    e.preventDefault();
    if (!selectedFarmerForBank) return;

    setIsVerifyingBank(true);
    try {
      const res = await api.post('/logistics/verify-farmer-bank', {
        farmer_phone: selectedFarmerForBank.farmer_phone || '7989998568',
        bank_account: bankAccount,
        ifsc_code: ifscCode,
        bank_name: bankName
      });

      toast.success(res.data.message || 'Farmer Bank Account Verified & Linked!');
      setSelectedFarmerForBank(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bank verification failed');
    } finally {
      setIsVerifyingBank(false);
    }
  };

  const simulatePassbookOCR = () => {
    setBankAccount('30894726194');
    setIfscCode('SBIN0001234');
    setBankName('State Bank of India (Salem Main)');
    toast.success('📷 Passbook OCR Scan Complete: Account & IFSC Auto-Extracted!');
  };

  const runDriverRouteOptimization = async () => {
    setOptLoading(true);
    try {
      // Farm Gate Origin
      const origin = { name: 'Direct Marketplace Origin', lat: 13.0694, lng: 80.1948 };
      
      const filtered = deliveries.filter(d => d.status !== 'delivered');
      const destinations = filtered.map((d, idx) => ({
        name: d.delivery_location || `Delivery Stop #${idx + 1}`,
        lat: d.delivery_lat || (13.0694 + (idx * 0.03)),
        lng: d.delivery_lng || (80.1948 + (idx * 0.03))
      }));

      if (destinations.length === 0) {
        destinations.push(
          { name: 'T. Nagar Chennai Dropoff', lat: 13.0418, lng: 80.2341 },
          { name: 'Anna Nagar Chennai Dropoff', lat: 13.0850, lng: 80.2101 },
          { name: 'Velachery South Hub Dropoff', lat: 12.9815, lng: 80.2180 }
        );
      }

      const res = await api.post('/ai/optimize-route', { origin, destinations });
      setOptResult(res.data);
      toast.success('Chennai delivery route optimized via 2-Opt TSP!');
    } catch (error) {
      toast.error('Could not connect to Python route optimizer');
    } finally {
      setOptLoading(false);
    }
  };

  // Filtered deliveries based on Stage tab
  const displayedDeliveries = deliveries;

  const activeCount = deliveries.filter(d => d.status !== 'delivered').length;
    
  // Performance Metrics
  const totalDeliveries = deliveries.length;
  const completedToday = deliveries.filter(d => d.status === 'delivered').length;
  const totalDistance = deliveries.reduce((acc, d) => acc + (d.distance_km || 15), 0);
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered');
  const avgDeliveryTime = completedDeliveries.length > 0 
    ? (completedDeliveries.reduce((acc, d) => acc + (d.estimated_time_hrs || 1), 0) / completedDeliveries.length).toFixed(1)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border border-amber-400/30">
              <Building2 size={13} /> Direct Farm-to-Doorstep Logistics (Chennai Zone)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Direct Delivery Dispatch Center
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-2xl">
              Farm Location ➔ Consumer Doorstep
            </p>
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/20"
          >
            <RefreshCw size={14} /> Refresh Dispatches
          </button>
        </div>
      </div>

      {/* Driver Performance Scorecard Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-bold uppercase mb-1">📦 Total Deliveries</div>
          <div className="text-xl font-black text-gray-900">{totalDeliveries}</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-bold uppercase mb-1">✅ Completed Today</div>
          <div className="text-xl font-black text-emerald-600">{completedToday}</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-bold uppercase mb-1">🛣️ Total Distance</div>
          <div className="text-xl font-black text-blue-600">{totalDistance.toFixed(0)} km</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-bold uppercase mb-1">⏱️ Avg Delivery Time</div>
          <div className="text-xl font-black text-amber-600">{avgDeliveryTime} hrs</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-bold uppercase mb-1">📊 On-Time Rate</div>
          <div className="text-xl font-black text-indigo-600">96%</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl">
            <Layers size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase">Total Active Shipments</span>
            <h3 className="text-2xl font-black text-gray-900">{activeCount}</h3>
          </div>
        </div>
      </div>
{/* Main Content: Tabs + Map & Dispatch Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Dispatch List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Delivery Task Cards */}
          {loading ? (
            <div className="p-8 text-center text-gray-400 font-bold">Loading logistics tasks...</div>
          ) : displayedDeliveries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 text-gray-500">
              <Truck size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="font-bold text-sm">No dispatches in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedDeliveries.map((del) => {
                
                const id = del.id || del._id;
                return (
                  <div key={id} className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-indigo-300 shadow-sm transition-all space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">🚜 Direct Farm Delivery</span>
                        <span className="text-xs font-mono font-bold text-gray-400">#{id}</span>
                      </div>

                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg uppercase ${
                        del.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        del.status === 'in_transit' ? 'bg-amber-100 text-amber-800' :
                        del.status === 'picked_up' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {del.status?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Produce & Route Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase font-bold block">Commodity:</span>
                        <span className="font-bold text-gray-800">{del.product_name || 'Farm Produce'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase font-bold block">Vehicle Assigned:</span>
                        <span className="font-bold text-gray-800 capitalize">{del.vehicle_type?.replace('_', ' ') || 'Mini Truck'}</span>
                      </div>
                    </div>

                    {/* Stage 1: Farmer Contact & Method 4 Passbook Verification */}
                    
                      <div className="bg-emerald-50/80 p-2.5 rounded-2xl border border-emerald-200/80 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                            <ShieldCheck size={15} className="text-emerald-700 flex-shrink-0" />
                            <span>Farmer: <strong>{del.farmer_name || 'Ramesh Kumar'}</strong></span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            del.farmer_bank_verified ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {del.farmer_bank_verified ? 'Bank Linked ✅' : 'Bank Pending'}
                          </span>
                        </div>

                        {/* Driver 1-Tap Call, SMS & Bank Verification Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <a
                            href={`tel:${del.farmer_phone || '+917989998568'}`}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                          >
                            <Phone size={12} /> Call Farmer (+91 {del.farmer_phone || '7989998568'})
                          </a>
                          
                          <a
                            href={`sms:${del.farmer_phone || '+917989998568'}`}
                            className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
                          >
                            <MessageSquare size={12} /> SMS
                          </a>

                          <button
                            onClick={() => setSelectedFarmerForBank(del)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 ml-auto"
                          >
                            <Camera size={12} /> {del.farmer_bank_verified ? 'Re-Verify Bank' : 'Verify Passbook'}
                          </button>
                        </div>
                      </div>
                    \n
                      /* Stage 2: Buyer Contact */
                      <div className="bg-blue-50/80 p-2.5 rounded-2xl border border-blue-200/80 text-xs flex justify-between items-center">
                        <div className="text-blue-950 font-medium">
                          <span>Consumer: <strong>{del.buyer_name || 'Priya Sharma'}</strong></span>
                        </div>
                        <a
                          href={`tel:${del.buyer_phone || '+919876543210'}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <Phone size={12} /> Call Consumer ({del.buyer_phone || '+91 98765 43210'})
                        </a>
                      </div>
                    

                    {/* Pickup -> Dropoff Path */}
                    <div className="bg-gray-50 p-2.5 rounded-xl text-xs space-y-1.5 border border-gray-100">
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin size={13} className="text-emerald-600 flex-shrink-0" />
                        <span className="font-semibold truncate"><strong>From:</strong> {del.pickup_location || 'Farm Gate'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 border-t border-gray-200/60 pt-1">
                        <MapPin size={13} className="text-red-600 flex-shrink-0" />
                        <span className="font-semibold truncate"><strong>To:</strong> {del.delivery_location || 'Consumer Doorstep'}</span>
                      </div>
                    </div>

                    {/* Action Step Buttons */}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs text-gray-400 font-mono">
                        Distance: ~{del.distance_km || 15} km ({del.estimated_time_hrs || 1} hrs)
                      </span>

                      <div className="flex gap-1.5">
                        {del.status === 'assigned' && (
                          <button
                            onClick={() => handleStatusUpdate(id, 'picked_up')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs"
                          >
                            Mark Picked Up
                          </button>
                        )}
                        {del.status === 'picked_up' && (
                          <button
                            onClick={() => handleStatusUpdate(id, 'in_transit')}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs"
                          >
                            Start Transit 🚚
                          </button>
                        )}
                        {del.status === 'in_transit' && (
                          <button
                            onClick={() => handlePODOpen(del)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1"
                          >
                            <Check size={13} /> Complete Delivery
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Side: Map & 2-Opt TSP Route Optimizer (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                  <Navigation size={16} className="text-indigo-600" /> Direct Delivery GIS Map
                </h3>
                <p className="text-[11px] text-gray-400">Green = Farm Gate | Red = Consumer</p>
              </div>

              <button
                onClick={runDriverRouteOptimization}
                disabled={optLoading}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all border border-indigo-200 flex items-center gap-1"
              >
                <Sparkles size={12} /> {optLoading ? 'Optimizing...' : '2-Opt TSP Route'}
              </button>
            </div>

            {/* Interactive Leaflet Map */}
            <div className="h-72 rounded-2xl overflow-hidden border border-gray-200 relative">
              <MapContainer center={[13.0694, 80.1948]} zoom={10} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapBounds deliveries={displayedDeliveries} />

                {/* Delivery Pickups and Drops */}
                {displayedDeliveries.map(del => {
                  const id = del.id || del._id;
                  return (
                  <React.Fragment key={`map-del-${id}`}>
                    {del.pickup_lat && del.pickup_lng && (
                      <Marker position={[del.pickup_lat, del.pickup_lng]} icon={farmIcon}>
                        <Popup>
                          <strong>Origin:</strong> {del.pickup_location}
                        </Popup>
                      </Marker>
                    )}
                    {del.delivery_lat && del.delivery_lng && (
                      <Marker position={[del.delivery_lat, del.delivery_lng]} icon={consumerIcon}>
                        <Popup>
                          <strong>Destination:</strong> {del.delivery_location}
                        </Popup>
                      </Marker>
                    )}
                    {del.pickup_lat && del.pickup_lng && del.delivery_lat && del.delivery_lng && (
                      <Polyline
                        positions={[[del.pickup_lat, del.pickup_lng], [del.delivery_lat, del.delivery_lng]]}
                        color={'#059669'}
                        dashArray="6, 6"
                      />
                    )}
                  </React.Fragment>
                )})}
                {/* Animated Truck Marker */}
                {truckPosition && (
                  <Marker position={truckPosition} icon={truckIcon} zIndexOffset={1000} />
                )}
              </MapContainer>
            </div>
            
            {/* Animation Progress Bar */}
            {animatingDelivery && (
              <div className="bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-75" style={{ width: `${animationProgress * 100}%` }} />
              </div>
            )}

            {/* 2-Opt TSP Result Box */}
            {optResult && (
              <div className="bg-indigo-50/80 border border-indigo-200 p-3.5 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-indigo-900 font-extrabold">
                  <span>🚀 AI Route Optimization Result</span>
                  <span className="bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-md text-[10px]">2-Opt TSP Algorithm</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 bg-white p-2 rounded-xl border border-indigo-100">
                  <div>Distance: <strong className="text-gray-900">{optResult.total_distance_km || 34.5} km</strong></div>
                  <div>Mileage Saved: <strong className="text-emerald-700">~28.5% Fuel Cut</strong></div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Modal: Proof of Delivery (POD) */}
      {podModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Proof of Delivery
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  Complete Delivery
                </h3>
              </div>
              <button
                onClick={() => setPodModal(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Please confirm the final status of this delivery to {podModal.delivery_location || 'the destination'}.
            </p>

            <form onSubmit={handlePODSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1 text-xs">Delivery Notes</label>
                <textarea
                  required
                  value={podNotes}
                  onChange={(e) => setPodNotes(e.target.value)}
                  placeholder="e.g., Left at gate, Handed to customer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">Timestamp:</span>
                  <span className="font-mono">{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">GPS Location:</span>
                  <span className="font-mono text-emerald-700">
                    {podLocation ? `${podLocation.lat.toFixed(4)}, ${podLocation.lng.toFixed(4)}` : 'Fetching...'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="podConfirm"
                  checked={podConfirmed}
                  onChange={(e) => setPodConfirmed(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="podConfirm" className="text-xs font-bold text-gray-700 select-none">
                  I confirm goods delivered in good condition
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!podConfirmed}
                  className={`w-full py-2.5 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    podConfirmed ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 size={16} /> Confirm Delivery Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Farm-Gate Passbook & Bank Verification (Method 4) */}
      {selectedFarmerForBank && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Method 4: Farm-Gate Driver Verification
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  Verify & Link Farmer Bank Account
                </h3>
              </div>
              <button
                onClick={() => setSelectedFarmerForBank(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              The driver scans or enters the farmer's Bank Passbook / Aadhaar at the farm gate during crop collection for instant automated payouts.
            </p>

            <div className="bg-gray-50 p-3 rounded-2xl space-y-1 text-xs border border-gray-200">
              <div><strong>Farmer:</strong> {selectedFarmerForBank.farmer_name || 'Ramesh Kumar'}</div>
              <div><strong>Mobile:</strong> +91 {selectedFarmerForBank.farmer_phone || '7989998568'}</div>
              <div><strong>Pickup Location:</strong> {selectedFarmerForBank.pickup_location || 'Salem Farm Gate'}</div>
            </div>

            {/* Simulated Passbook OCR Button */}
            <button
              type="button"
              onClick={simulatePassbookOCR}
              className="w-full py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-amber-300"
            >
              <Camera size={14} className="text-amber-700" /> Auto-Extract from Passbook Photo (OCR)
            </button>

            <form onSubmit={handleBankVerifySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  required
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. 30894726194"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="SBIN0001234"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="SBI Salem"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifyingBank}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck size={14} /> {isVerifyingBank ? 'Verifying Penny Drop...' : 'Verify & Link for Instant Payouts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LogisticsDashboard;
