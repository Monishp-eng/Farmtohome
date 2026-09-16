import React, { useState, useEffect } from 'react';
import { 
  Package, TrendingUp, DollarSign, Star, Plus, Edit2, Trash2, 
  Shield, Download, FileSpreadsheet, Calendar, CheckCircle2, 
  Clock, ArrowUpRight, Check, AlertCircle 
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import ProductForm from '../components/products/ProductForm';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('listings');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [chartRange, setChartRange] = useState('monthly'); // 'daily' | 'weekly' | 'monthly'
  
  const [myProducts, setMyProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role?.toLowerCase() !== 'farmer' && user.role?.toLowerCase() !== 'fpo') {
      toast.error('Unauthorized access');
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsRes, ordersRes] = await Promise.all([
          api.get('/products/farmer/my-products'),
          api.get('/orders/my-orders')
        ]);
        
        const prods = productsRes.data.data || productsRes.data || [];
        const ords = ordersRes.data.data || ordersRes.data || [];
        setMyProducts(prods);
        setOrders(ords);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const handleAddProduct = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = { ...data, category: data.category.toLowerCase() };
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id || editingProduct._id}`, payload);
        toast.success('Produce listing updated successfully');
      } else {
        await api.post('/products', payload);
        toast.success('Produce listed on direct marketplace!');
      }
      
      const productsRes = await api.get('/products/farmer/my-products');
      setMyProducts(productsRes.data.data || productsRes.data || []);
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    
    try {
      await api.delete(`/products/${id}`);
      toast.success('Listing removed');
      setMyProducts(prev => prev.filter(p => p.id !== id && p._id !== id));
    } catch (error) {
      toast.error('Failed to delete listing');
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'confirmed' });
      toast.success('Order confirmed for farm gate dispatch!');
      setOrders(prev => prev.map(o => (o.id === orderId || o._id === orderId) ? { ...o, status: 'confirmed' } : o));
    } catch (error) {
      toast.error('Failed to confirm order');
    }
  };

  // CSV Export Utility
  const exportToCSV = (datasetName) => {
    try {
      let exportData = [];
      let filename = 'KisanSetu_Report';

      if (datasetName === 'revenue') {
        filename = 'Farmer_Revenue_Statements';
        exportData = orders.map(o => ({
          'Order ID': o.id || o._id,
          'Date': new Date(o.created_at || Date.now()).toLocaleDateString(),
          'Produce': o.product_name || 'Farm Crop',
          'Quantity (kg)': o.quantity_kg,
          'Rate / kg': o.price_per_kg || 30,
          'Total Gross': o.total_price || (o.quantity_kg * (o.price_per_kg || 30)),
          'Farmer Payout (98%)': ((o.total_price || (o.quantity_kg * 30)) * 0.98).toFixed(2),
          'Status': o.status,
          'Payment Rail': 'Escrow T+0'
        }));
      } else if (datasetName === 'inventory') {
        filename = 'Farm_Produce_Inventory';
        exportData = myProducts.map(p => ({
          'Produce ID': p.id || p._id,
          'Name': p.name,
          'Category': p.category,
          'Price per kg (INR)': p.price_per_kg,
          'Stock Available (kg)': p.quantity_kg,
          'Quality Grade': p.quality_grade || 'A',
          'Organic Certified': p.is_organic ? 'YES' : 'NO',
          'Harvest Date': p.harvest_date || 'Recent'
        }));
      }

      if (exportData.length === 0) {
        toast.error('No records available to export');
        return;
      }

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${filename}.csv successfully!`);
    } catch (err) {
      toast.error('Failed to generate CSV export');
    }
  };

  // Metrics Calculations
  const activeOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const totalEarnings = orders.reduce((sum, o) => {
    const amt = Number(o.farmer_earnings) || Number(o.total_price) || 0;
    return sum + (amt * 0.98);
  }, 0);

  // Time Series Revenue Chart Data
  const getChartData = () => {
    if (chartRange === 'daily') {
      return [
        { name: 'Mon', revenue: 2400, mandiEquiv: 2100 },
        { name: 'Tue', revenue: 3800, mandiEquiv: 3200 },
        { name: 'Wed', revenue: 4200, mandiEquiv: 3600 },
        { name: 'Thu', revenue: 3100, mandiEquiv: 2700 },
        { name: 'Fri', revenue: 5600, mandiEquiv: 4800 },
        { name: 'Sat', revenue: 7800, mandiEquiv: 6700 },
        { name: 'Sun', revenue: 6400, mandiEquiv: 5500 },
      ];
    } else if (chartRange === 'weekly') {
      return [
        { name: 'Week 1', revenue: 18500, mandiEquiv: 15800 },
        { name: 'Week 2', revenue: 22400, mandiEquiv: 19100 },
        { name: 'Week 3', revenue: 27800, mandiEquiv: 23600 },
        { name: 'Week 4', revenue: 31200, mandiEquiv: 26500 },
      ];
    }
    // Monthly Default
    return [
      { name: 'Oct', revenue: 42000, mandiEquiv: 35700 },
      { name: 'Nov', revenue: 58000, mandiEquiv: 49300 },
      { name: 'Dec', revenue: 74000, mandiEquiv: 62900 },
      { name: 'Jan', revenue: 68000, mandiEquiv: 57800 },
      { name: 'Feb', revenue: 89000, mandiEquiv: 75650 },
      { name: 'Mar', revenue: 104500, mandiEquiv: 88800 },
    ];
  };

  const chartData = getChartData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-primary-dark to-emerald-900 dark:from-slate-950 dark:via-emerald-950 dark:to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              Verified Farmer FPO
            </span>
            <span className="text-emerald-200 text-xs font-bold">Method 4 Escrow Rail Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Welcome back, {user?.name || 'Farmer Partner'}
          </h1>
          <p className="text-emerald-100 dark:text-gray-300 text-xs sm:text-sm mt-1">
            Manage your harvest listings, confirm direct dispatches, and review bank payouts.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={() => exportToCSV('revenue')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5"
          >
            <Download size={14} /> Export CSV
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> List New Crop
          </Button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center text-gray-400 mb-2">
            <span className="text-xs font-bold">Total Direct Revenue</span>
            <DollarSign size={18} className="text-primary" />
          </div>
          <strong className="text-2xl font-black text-gray-900 dark:text-gray-100">
            ₹{totalEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '1,04,500'}
          </strong>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1 flex items-center gap-1">
            <ArrowUpRight size={13} /> +18.4% vs APMC Mandi Rates
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center text-gray-400 mb-2">
            <span className="text-xs font-bold">Active Listings</span>
            <Package size={18} className="text-amber-500" />
          </div>
          <strong className="text-2xl font-black text-gray-900 dark:text-gray-100">
            {myProducts.length} Crops
          </strong>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-1">
            Ready for farm gate collection
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center text-gray-400 mb-2">
            <span className="text-xs font-bold">Active Dispatch Orders</span>
            <Clock size={18} className="text-blue-500" />
          </div>
          <strong className="text-2xl font-black text-gray-900 dark:text-gray-100">
            {activeOrdersCount} Pending
          </strong>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold block mt-1">
            Direct cold truck routing assigned
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center text-gray-400 mb-2">
            <span className="text-xs font-bold">Verified Bank Rail</span>
            <Shield size={18} className="text-emerald-500" />
          </div>
          <strong className="text-base font-black text-gray-900 dark:text-gray-100 block truncate">
            SBI Salem Main (•••• 6194)
          </strong>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block mt-1">
            ✓ Automated T+0 Escrow Settlement
          </span>
        </div>
      </div>

      {/* Revenue Time-Series Chart Section */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm mb-8 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              Direct Farm Revenue vs APMC Mandi Benchmark
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Comparing your 98% direct KisanSetu payouts against middleman APMC rates.
            </p>
          </div>

          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            {['daily', 'weekly', 'monthly'].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setChartRange(range)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                  chartRange === range
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="farmRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="mandiRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip
                formatter={(val) => [`₹${val.toLocaleString()}`, '']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '16px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              />
              <Area type="monotone" dataKey="revenue" name="KisanSetu Direct (98%)" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#farmRev)" />
              <Area type="monotone" dataKey="mandiEquiv" name="APMC Mandi Net (Middleman)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#mandiRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs: Produce Listings vs Order Confirmations */}
      <Tabs
        tabs={[
          { id: 'listings', label: '🌾 My Produce Listings', badge: myProducts.length },
          { id: 'orders', label: '📦 Customer Orders & Dispatches', badge: orders.length }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {/* TAB 1: PRODUCE LISTINGS */}
      {activeTab === 'listings' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100">
              Active Produce Catalog
            </h2>
            <Button variant="outline" size="sm" onClick={() => exportToCSV('inventory')} className="flex items-center gap-1.5">
              <FileSpreadsheet size={14} /> Export Inventory
            </Button>
          </div>

          {myProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Package size={36} className="mx-auto text-gray-400 mb-2" />
              <p className="font-bold text-sm">No crops listed on marketplace yet.</p>
              <Button size="sm" variant="primary" className="mt-3" onClick={() => setIsModalOpen(true)}>
                Add First Crop Listing
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Crop Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Price / KG</th>
                    <th className="p-3.5">Stock Available</th>
                    <th className="p-3.5">Quality Grade</th>
                    <th className="p-3.5 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-600 dark:text-gray-300">
                  {myProducts.map((p) => (
                    <tr key={p.id || p._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-3.5 font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.is_organic && <Badge variant="success">Organic</Badge>}
                      </td>
                      <td className="p-3.5 capitalize">{p.category}</td>
                      <td className="p-3.5 font-black text-emerald-700 dark:text-emerald-400">₹{p.price_per_kg}</td>
                      <td className="p-3.5 font-bold">{p.quantity_kg} kg</td>
                      <td className="p-3.5">
                        <Badge variant="default">Grade {p.quality_grade || 'A'}</Badge>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingProduct(p);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteProduct(p.id || p._id)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <h2 className="text-base font-black text-gray-900 dark:text-gray-100 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            Incoming & Completed Consumer Orders
          </h2>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No customer orders placed yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div
                  key={o.id || o._id}
                  className="p-5 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-sm text-gray-900 dark:text-gray-100">
                        Order #{o.id || o._id}
                      </span>
                      <Badge variant={o.status === 'confirmed' ? 'success' : 'warning'}>
                        {o.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      <strong>{o.product_name || 'Produce'}</strong> — {o.quantity_kg} kg @ ₹{o.price_per_kg || 30}/kg
                    </p>
                    <p className="text-gray-400 mt-1">
                      Delivery: {o.delivery_address || 'Chennai Metro Zone'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block uppercase">Net Payout (98%)</span>
                      <strong className="text-base font-black text-emerald-700 dark:text-emerald-400">
                        ₹{((o.total_price || (o.quantity_kg * 30)) * 0.98).toFixed(2)}
                      </strong>
                    </div>

                    {o.status === 'placed' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleConfirmOrder(o.id || o._id)}
                        className="flex items-center gap-1.5"
                      >
                        <Check size={14} /> Accept & Ready
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'Edit Harvest Listing' : 'List New Crop on Marketplace'}
        size="lg"
      >
        <ProductForm
          initialData={editingProduct}
          onSubmit={handleAddProduct}
          loading={isSubmitting}
        />
      </Modal>

    </div>
  );
};

export default FarmerDashboard;
