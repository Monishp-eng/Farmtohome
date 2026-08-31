import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { BrainCircuit, Map as MapIcon, TrendingUp, Lightbulb, Sparkles, Navigation, CheckCircle2, ArrowRight, DollarSign, Leaf, Truck, AlertCircle, RefreshCw } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Loading from '../components/common/Loading';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map auto-bounds helper
const MapBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds();
      points.forEach(p => {
        if (p.lat && p.lng) bounds.extend([p.lat, p.lng]);
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    } else {
      map.setView([20.5937, 78.9629], 5);
    }
  }, [points, map]);
  return null;
};

const AnimatedCounter = ({ value, duration = 1500, formatter = (v) => v, isFloat = false }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    // ensure value is a number
    const target = Number(value) || 0;
    if (target === 0) {
      setCount(0);
      return;
    }
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{formatter(isFloat ? count : Math.round(count))}</span>;
};

const AIInsights = () => {
  const [activeTab, setActiveTab] = useState('demand');
  
  // Demand Forecasting State
  const [demandCategory, setDemandCategory] = useState('vegetables');
  const [demandRegion, setDemandRegion] = useState('Maharashtra');
  const [forecastData, setForecastData] = useState([]);
  const [demandLoading, setDemandLoading] = useState(false);

  // Route Optimization State
  const routePresets = [
    {
      name: 'Western Hub: Nashik Aggregator → Mumbai & Pune',
      origin: { name: 'Nashik Farmer Aggregator', lat: 19.9975, lng: 73.7898 },
      destinations: [
        { name: 'Mumbai Supermarket DC', lat: 19.0760, lng: 72.8777 },
        { name: 'Thane Distribution Center', lat: 19.2183, lng: 72.9781 },
        { name: 'Pune Mandi Fulfillment', lat: 18.5204, lng: 73.8567 },
        { name: 'Navi Mumbai Cold Storage', lat: 19.0330, lng: 73.0297 }
      ]
    },
    {
      name: 'South Hub: Salem Farm Gate → Bangalore & Chennai',
      origin: { name: 'Salem Farm Gate Aggregator', lat: 11.6643, lng: 78.1460 },
      destinations: [
        { name: 'Hosur Processing Hub', lat: 12.7409, lng: 77.8253 },
        { name: 'Bangalore Indiranagar Hub', lat: 12.9716, lng: 77.5946 },
        { name: 'Chennai Koyambedu DC', lat: 13.0827, lng: 80.2707 },
        { name: 'Mysore Wholesale Market', lat: 12.2958, lng: 76.6394 }
      ]
    },
    {
      name: 'North Hub: Ludhiana Grain Aggregator → Delhi NCR',
      origin: { name: 'Ludhiana Mandi Center', lat: 30.9010, lng: 75.8573 },
      destinations: [
        { name: 'Ambala Logistics Hub', lat: 30.3782, lng: 76.7767 },
        { name: 'Karnal Agri Center', lat: 29.6857, lng: 76.9905 },
        { name: 'Delhi Azadpur Mandi', lat: 28.7041, lng: 77.1025 },
        { name: 'Gurgaon Supermarket DC', lat: 28.4595, lng: 77.0266 }
      ]
    }
  ];

  const vehicleFleet = [
    { id: 'tata_ace', name: 'Tata Ace Mini Truck', emoji: '🛺', capacity: '1.0 Ton', speed: 35, costPerKm: 7, co2PerKm: 0.22 },
    { id: 'eicher_14ft', name: 'Eicher 14ft', emoji: '🚛', capacity: '4.5 Ton', speed: 40, costPerKm: 12, co2PerKm: 0.32 },
    { id: 'reefer', name: 'Refrigerated Reefer', emoji: '🧊', capacity: '10 Ton', speed: 35, costPerKm: 18, co2PerKm: 0.45 },
    { id: 'ev_mini', name: 'EV Mini Truck', emoji: '⚡', capacity: '1.5 Ton', speed: 30, costPerKm: 3, co2PerKm: 0.0 }
  ];

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [origin, setOrigin] = useState(routePresets[0].origin);
  const [destinations, setDestinations] = useState(routePresets[0].destinations);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFleet[0]);
  const [routeResult, setRouteResult] = useState(null);
  const [osrmRouteCoords, setOsrmRouteCoords] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  // Price Intelligence State
  const [marketTrends, setMarketTrends] = useState([]);
  const [priceLoading, setPriceLoading] = useState(false);

  useEffect(() => {
    fetchDemandForecast();
    handleOptimizeRoute();
    fetchMarketPrices();
  }, []);

  const fetchDemandForecast = async () => {
    setDemandLoading(true);
    try {
      const res = await api.post('/ai/predict-demand', {
        category: demandCategory,
        region: demandRegion,
        months_ahead: 6
      });

      let rawData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatted = rawData.map(item => {
        const mIdx = (item.month - 1) % 12;
        const mName = monthNames[mIdx] || `Month ${item.month}`;
        const demand = Math.round(item.predicted_demand_kg || 0);
        return {
          ...item,
          monthName: `${mName} ${item.year || 2026}`,
          demandKg: demand,
          lowerBound: Math.round(demand * 0.9),
          upperBound: Math.round(demand * 1.15),
          confidencePct: Math.round((item.confidence_score || 0.8) * 100),
          season: (item.factors || []).join(', ') || 'Regular Season'
        };
      });

      setForecastData(formatted);
    } catch (error) {
      toast.error('Failed to generate AI demand forecast');
    } finally {
      setDemandLoading(false);
    }
  };

  const handleSelectPreset = (idx) => {
    setSelectedPreset(idx);
    setOrigin(routePresets[idx].origin);
    setDestinations(routePresets[idx].destinations);
    runOptimization(routePresets[idx].origin, routePresets[idx].destinations);
  };

  const handleOptimizeRoute = () => {
    runOptimization(origin, destinations);
  };

  const fetchOSRMRoute = async (waypoints) => {
    try {
      const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]); // [lat, lng]
      }
    } catch (err) {
      console.error('OSRM fetch error:', err);
    }
    return waypoints.map(p => [p.lat, p.lng]); // fallback to straight line
  };

  const runOptimization = async (orig, dests) => {
    setRouteLoading(true);
    try {
      const res = await api.post('/ai/optimize-route', {
        origin: orig,
        destinations: dests
      });
      setRouteResult(res.data);
      
      const waypoints = res.data.optimized_route || [orig, ...dests];
      const osrmCoords = await fetchOSRMRoute(waypoints);
      setOsrmRouteCoords(osrmCoords);
      
      toast.success('Optimal Multi-Stop Route Computed!');
    } catch (error) {
      toast.error('Route optimization service unavailable');
    } finally {
      setRouteLoading(false);
    }
  };

  const fetchMarketPrices = async () => {
    setPriceLoading(true);
    try {
      const res = await api.get('/market/prices');
      setMarketTrends(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setPriceLoading(false);
    }
  };

  const mapPoints = routeResult?.optimized_route || [origin, ...destinations];
  const polylineCoords = mapPoints.map(p => [p.lat, p.lng]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-purple-400/30">
            <BrainCircuit size={14} className="text-purple-300" /> Machine Learning & Operations Research
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">AI Demand Forecasting & Logistics Route Engine</h1>
          <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-2xl">
            Empowering farmers with multi-month crop demand projections and minimizing transportation costs via AI Traveling Salesperson route optimization.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 p-1.5 flex gap-1 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('demand')}
          className={`flex items-center px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'demand' ? 'bg-purple-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingUp size={16} className="mr-2" /> 1. Predictive Demand Modeling
        </button>

        <button 
          onClick={() => setActiveTab('logistics')}
          className={`flex items-center px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'logistics' ? 'bg-purple-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MapIcon size={16} className="mr-2" /> 2. Multi-Stop Route Optimization
        </button>

        <button 
          onClick={() => setActiveTab('price')}
          className={`flex items-center px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'price' ? 'bg-purple-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Lightbulb size={16} className="mr-2" /> 3. Fair-Trade Price Intelligence
        </button>
      </div>

      {/* TAB 1: DEMAND FORECASTING */}
      {activeTab === 'demand' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Controls Bar */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Crop Category</label>
                <select 
                  value={demandCategory}
                  onChange={(e) => setDemandCategory(e.target.value)}
                  className="px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="vegetables">🥦 Vegetables</option>
                  <option value="fruits">🍎 Fruits</option>
                  <option value="grains">🌾 Grains & Rice</option>
                  <option value="pulses">🫘 Pulses & Dal</option>
                  <option value="dairy">🥛 Farm Dairy</option>
                  <option value="spices">🌶️ Spices</option>
                  <option value="oilseeds">🌻 Oilseeds</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Target Indian Region</label>
                <select 
                  value={demandRegion}
                  onChange={(e) => setDemandRegion(e.target.value)}
                  className="px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Maharashtra">Maharashtra (Nashik, Pune, Mumbai)</option>
                  <option value="Punjab">Punjab (Ludhiana, Amritsar)</option>
                  <option value="Kerala">Kerala (Wayanad, Kochi)</option>
                  <option value="Gujarat">Gujarat (Anand, Ahmedabad)</option>
                  <option value="Andhra Pradesh">Andhra Pradesh (Anantapur)</option>
                  <option value="Karnataka">Karnataka (Bangalore, Kolar)</option>
                  <option value="Tamil Nadu">Tamil Nadu (Salem, Chennai)</option>
                  <option value="Delhi">Delhi NCR (Azadpur, Ghazipur)</option>
                </select>
              </div>
            </div>

            <Button 
              onClick={fetchDemandForecast} 
              disabled={demandLoading} 
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
            >
              <RefreshCw size={14} className={demandLoading ? "animate-spin" : ""} />
              Generate 6-Month Projection
            </Button>
          </div>

          {/* Visualization Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Chart Area (8 Cols) */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">
                    Projected Consumption Demand (KG) — {demandRegion} ({demandCategory})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Trained Random Forest model combining rainfall indices, crop seasonality & festival surge patterns.
                  </p>
                </div>
              </div>

              {demandLoading ? (
                <div className="h-80 flex items-center justify-center text-gray-400 text-xs">
                  <Loading message="Simulating machine learning demand model..." />
                </div>
              ) : forecastData.length > 0 ? (
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7e22ce" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#7e22ce" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}kg`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#1e1b4b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }} 
                      />
                      <Area type="monotone" dataKey="demandKg" stroke="#7e22ce" strokeWidth={3} fillOpacity={1} fill="url(#colorDemand)" name="Expected Demand (KG)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-400 text-xs">No forecast data available</div>
              )}
            </div>

            {/* AI Crop Advisory (4 Cols) */}
            <div className="lg:col-span-4 bg-gradient-to-br from-purple-50 to-indigo-50/50 p-6 rounded-3xl border border-purple-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-purple-950 font-black text-sm">
                <Sparkles size={18} className="text-purple-600" /> Farmer Crop Advisory Engine
              </div>
              <p className="text-xs text-purple-800 leading-relaxed">
                Based on historical seasonal gaps and festival peaks, our model recommends planting schedules to maximize farm gate margins:
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white rounded-2xl border border-purple-200 shadow-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">📈 Peak Demand Window</span>
                    <span className="bg-purple-100 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-md">Month 2–3</span>
                  </div>
                  <p className="text-gray-600 text-[11px]">Festival & seasonal inventory accumulation. High institutional demand expected.</p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-emerald-200 shadow-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-950">🌾 Recommended Planting</span>
                    <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-md">High ROI</span>
                  </div>
                  <p className="text-gray-600 text-[11px]">Increase acreage for fast-yield lots (Grade A Produce) to capitalize on 20% higher market price.</p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-amber-200 shadow-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-950">⚠️ Risk Mitigation</span>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md">Advisory</span>
                  </div>
                  <p className="text-gray-600 text-[11px]">Utilize platform bulk contract pre-orders to lock in minimum fair prices before harvest.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Month-by-Month Projection Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {forecastData.map((f, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-200 text-center space-y-1.5 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-purple-700 block">{f.monthName}</span>
                <strong className="text-lg font-black text-gray-900 block">{f.demandKg} kg</strong>
                <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full inline-block">
                  {f.confidencePct}% Confidence
                </span>
                <span className="text-[9px] text-gray-400 block truncate">{f.season}</span>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 2: ROUTE OPTIMIZATION */}
      {activeTab === 'logistics' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Vehicle Fleet Selector */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-gray-900">Select Vehicle Fleet:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {vehicleFleet.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`p-3.5 rounded-2xl text-left text-xs font-bold transition-all border cursor-pointer flex flex-col ${
                    selectedVehicle.id === vehicle.id 
                      ? 'bg-purple-50 border-purple-500 text-purple-950 shadow-sm ring-1 ring-purple-400' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-lg">{vehicle.emoji}</span>
                    {selectedVehicle.id === vehicle.id && <CheckCircle2 size={16} className="text-purple-600" />}
                  </div>
                  <p className="font-extrabold mt-2">{vehicle.name}</p>
                  <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                    <span>{vehicle.capacity}</span>
                    <span>{vehicle.speed} km/h</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preset Selector */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-gray-900">Select Regional Logistics Route Preset:</span>
              <span className="text-[10px] text-purple-700 font-bold">2-Opt Heuristic TSP Algorithm</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {routePresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(idx)}
                  className={`p-3.5 rounded-2xl text-left text-xs font-bold transition-all border cursor-pointer ${
                    selectedPreset === idx 
                      ? 'bg-purple-50 border-purple-500 text-purple-950 shadow-sm ring-1 ring-purple-400' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <p className="font-extrabold">{preset.name}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{preset.destinations.length} Multi-Stop Dropoff Points</p>
                </button>
              ))}
            </div>
          </div>

          {/* Route Optimization Results & Scorecard */}
          {routeResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-xs flex flex-col justify-center relative overflow-hidden">
                <span className="text-[10px] text-gray-400 font-bold uppercase relative z-10">Optimized Distance</span>
                <strong className="text-xl font-black text-purple-700 block mt-1 relative z-10">
                  <AnimatedCounter value={routeResult.total_distance_km} formatter={(v) => `${v} km`} />
                </strong>
                <span className="text-[10px] text-emerald-600 font-bold relative z-10">
                  Saved <AnimatedCounter value={routeResult.distance_saved_km} /> km
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-xs flex flex-col justify-center relative overflow-hidden">
                <span className="text-[10px] text-gray-400 font-bold uppercase relative z-10">Transit Duration</span>
                <strong className="text-xl font-black text-blue-700 block mt-1 relative z-10">
                  <AnimatedCounter isFloat={true} value={routeResult.total_distance_km / selectedVehicle.speed} formatter={(v) => `${v.toFixed(1)} Hours`} />
                </strong>
                <span className="text-[10px] text-blue-600 font-bold relative z-10">@ {selectedVehicle.speed} km/h avg speed</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-xs flex flex-col justify-center relative overflow-hidden">
                <span className="text-[10px] text-gray-400 font-bold uppercase relative z-10">Fuel Cost Savings</span>
                <strong className="text-xl font-black text-emerald-700 block mt-1 relative z-10">
                  <AnimatedCounter value={routeResult.distance_saved_km * selectedVehicle.costPerKm} formatter={(v) => `₹${v}`} />
                </strong>
                <span className="text-[10px] text-gray-500 relative z-10">
                  = <AnimatedCounter isFloat={true} value={(routeResult.distance_saved_km / 4.5)} formatter={(v) => v.toFixed(1)} /> liters diesel saved
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-xs flex flex-col justify-center relative overflow-hidden">
                <span className="text-[10px] text-gray-400 font-bold uppercase relative z-10">CO2 Emissions Cut</span>
                <strong className="text-xl font-black text-green-700 block mt-1 relative z-10">
                  <AnimatedCounter isFloat={true} value={routeResult.distance_saved_km * selectedVehicle.co2PerKm} formatter={(v) => `${v.toFixed(1)} kg`} />
                </strong>
                {selectedVehicle.co2PerKm === 0 ? (
                  <span className="text-[10px] text-green-600 font-bold relative z-10 flex justify-center items-center gap-1 mt-1 bg-green-50 rounded-full px-2 py-0.5">
                    🔋 Zero Tailpipe Emissions
                  </span>
                ) : (
                  <span className="text-[10px] text-green-600 font-bold relative z-10">
                    ≈ <AnimatedCounter isFloat={true} value={(routeResult.distance_saved_km * selectedVehicle.co2PerKm) / 21} formatter={(v) => v.toFixed(1)} /> trees planted
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Interactive Leaflet Route Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Map (7 Cols) */}
            <div className="lg:col-span-7 bg-white p-4 rounded-3xl border border-gray-200 shadow-sm overflow-hidden h-96">
              <MapContainer center={[origin.lat, origin.lng]} zoom={7} scrollWheelZoom={false} className="h-full w-full rounded-2xl">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapBounds points={mapPoints} />
                
                {/* Naive Straight-Line Route */}
                {polylineCoords.length > 1 && (
                  <Polyline positions={polylineCoords} color="#9ca3af" weight={2} dashArray="4, 4" opacity={0.6} />
                )}

                {/* OSRM Route Polyline */}
                {osrmRouteCoords.length > 1 && (
                  <Polyline positions={osrmRouteCoords} color="#7c3aed" weight={5} opacity={0.8} />
                )}

                {/* Waypoint Markers */}
                {mapPoints.map((pt, idx) => (
                  <Marker key={idx} position={[pt.lat, pt.lng]}>
                    <Popup>
                      <div className="text-xs font-bold">
                        <p className={idx === 0 ? "text-emerald-700 font-black" : "text-purple-700 font-black"}>
                          {idx === 0 ? "🟢 Origin (Farm Gate)" : `📍 Stop #${idx}: ${pt.name}`}
                        </p>
                        <p className="text-gray-500 font-normal mt-0.5">Lat: {pt.lat}, Lng: {pt.lng}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Turn-by-Turn Segment Table (5 Cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <Navigation size={16} className="text-purple-600" />
                  Optimized Turn-by-Turn Dispatch Schedule
                </h4>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(routeResult?.route_segments || []).map((seg, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-purple-700 font-extrabold uppercase block">Leg {idx + 1}</span>
                        <p className="font-bold text-gray-900">{seg.from} → {seg.to}</p>
                      </div>
                      <div className="text-right">
                        <strong className="text-gray-900 font-mono text-xs">{seg.distance_km} km</strong>
                        <span className="text-[10px] text-gray-500 block">
                          {(seg.distance_km / selectedVehicle.speed).toFixed(1)} hrs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleOptimizeRoute} 
                disabled={routeLoading}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} className={routeLoading ? "animate-spin" : ""} />
                Re-calculate Optimal TSP Dispatch
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: PRICE INTELLIGENCE */}
      {activeTab === 'price' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-gray-900">
              Live Mandi Benchmarking & MSP Price Intelligence
            </h3>
            <p className="text-xs text-gray-500">
              Comparing real-time APMC Mandi modal rates against Government Minimum Support Price (MSP) to eliminate distress selling.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {marketTrends.slice(0, 9).map((m, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-sm text-gray-900">{m.commodity}</span>
                    <span className="text-[10px] bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-full">{m.market_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-xl border border-gray-200">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">Modal Mandi</span>
                      <strong className="text-sm font-black text-gray-900">₹{(m.modal_price / 100).toFixed(1)}/kg</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-[9px] text-emerald-700 uppercase font-bold block">Govt MSP</span>
                      <strong className="text-sm font-black text-emerald-700">₹{(m.msp ? (m.msp / 100).toFixed(1) : (m.modal_price * 0.9 / 100).toFixed(1))}/kg</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AIInsights;
