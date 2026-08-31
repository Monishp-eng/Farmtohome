import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, DollarSign, Star, Plus, Edit2, Trash2, Shield } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ProductForm from '../components/products/ProductForm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('listings');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [myProducts, setMyProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Verify role
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
        
        setMyProducts(productsRes.data.data || productsRes.data || []);
        setOrders(ordersRes.data.data || ordersRes.data || []);
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
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', payload);
        toast.success('Product added successfully');
      }
      
      // Refresh products
      const productsRes = await api.get('/products/farmer/my-products');
      setMyProducts(productsRes.data.data || productsRes.data || []);
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      setMyProducts(prev => prev.filter(p => p.id !== id && p._id !== id));
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'confirmed' });
      toast.success('Order confirmed!');
      setOrders(prev => prev.map(o => (o.id === orderId || o._id === orderId) ? { ...o, status: 'confirmed' } : o));
    } catch (error) {
      toast.error('Failed to confirm order');
    }
  };

  // Calculations
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  
  const totalEarnings = orders.reduce((sum, order) => {
    return sum + (Number(order.farmer_earnings) || Number(order.total_price) || 0);
  }, 0);

  // Earnings by month
  const monthlyEarnings = {};
  orders.forEach(order => {
    const date = new Date(order.created_at || order.createdAt || new Date());
    const month = date.toLocaleString('default', { month: 'short' });
    const amount = Number(order.farmer_earnings) || Number(order.total_price) || 0;
    monthlyEarnings[month] = (monthlyEarnings[month] || 0) + amount;
  });
  
  const earningsData = Object.keys(monthlyEarnings).map(month => ({
    name: month,
    earnings: monthlyEarnings[month]
  }));

  const stats = [
    { label: 'Total Products', value: myProducts.length, icon: <Package className="text-blue-500" /> },
    { label: 'Active Orders', value: activeOrders, icon: <TrendingUp className="text-green-500" /> },
    { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString()}`, icon: <DollarSign className="text-amber-500" /> },
    { label: 'Avg Rating', value: '4.8/5', icon: <Star className="text-yellow-500" /> }, // Keeping rating static unless API provides it
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Farmer Dashboard</h1>
        <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="flex items-center">
          <Plus size={18} className="mr-1" /> Add Product
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <Card key={i} padding="p-4" className="flex items-center">
            <div className="p-3 rounded-full bg-gray-50 mr-4">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b overflow-x-auto">
          {['listings', 'orders', 'earnings', 'insights'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-medium capitalize whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab === 'listings' ? 'My Listings' : tab === 'orders' ? 'Orders' : tab === 'earnings' ? 'Earnings' : 'AI Recommendations'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'listings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {myProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No products found. Add your first product!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/kg</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {myProducts.map((p) => (
                      <tr key={p.id || p._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{p.name}</div>
                          <div className="text-sm text-gray-500 capitalize">{p.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{p.price_per_kg}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.quantity_kg} kg</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            p.status?.toLowerCase() === 'active' || p.quantity_kg > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {p.status || (p.quantity_kg > 0 ? 'Active' : 'Out of Stock')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="text-primary hover:text-primary-dark mr-3"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteProduct(p.id || p._id)} className="text-red-600 hover:text-red-900"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No orders yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((o) => (
                      <tr key={o.id || o._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {String(o.id || o._id).slice(-6).toUpperCase()}<br/>
                          <span className="text-xs text-gray-500">{new Date(o.created_at || o.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{o.buyer?.name || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {o.items?.map(i => `${i.product?.name || 'Item'} (${i.quantity}kg)`).join(', ') || `${o.quantity}kg`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{o.total_price || o.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            o.status === 'delivered' ? 'bg-gray-100 text-gray-800' : 
                            (o.status === 'confirmed' || o.status === 'in_transit') ? 'bg-blue-100 text-blue-800' : 
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {o.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {(o.status === 'pending' || !o.status) && (
                            <Button size="sm" onClick={() => handleConfirmOrder(o.id || o._id)}>Confirm</Button>
                          )}
                          {o.status === 'confirmed' && <Button size="sm" variant="outline" disabled>Awaiting Logistics</Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Earnings Overview</h3>
              <div className="h-72">
                {earningsData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">No earnings data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={earningsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value}`} />
                      <Bar dataKey="earnings" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="text-emerald-600" size={18} /> Verified Bank Payout Rail
              </h3>
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-950">State Bank of India</span>
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full">Method 4 Linked ✅</span>
                  </div>
                  <p className="text-gray-600 font-mono text-sm font-bold">•••• •••• •••• 6194</p>
                  <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-emerald-200/60">
                    <span>IFSC: <strong className="font-mono text-gray-800">SBIN0001234</strong></span>
                    <span>Branch: <strong>Salem Main</strong></span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1 text-gray-600">
                  <p className="font-bold text-gray-900 text-xs">⚡ Automated T+0 Escrow Releases</p>
                  <p className="text-[11px]">98% net harvest earnings are credited directly to this account via IMPS/UPI upon last-mile delivery.</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <p className="text-sm text-gray-500">Total savings from bypassing middlemen</p>
                  <p className="text-2xl font-bold text-primary mt-1">₹8,400</p>
                </div>
            </Card>
          </div>
        )}
        
        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card header={<h3 className="font-bold text-gray-900">Price Recommendations</h3>}>
              <ul className="space-y-4">
                <li className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Onions (Red)</p>
                    <p className="text-sm text-gray-500">Current: ₹35/kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">Suggested: ₹38/kg</p>
                    <p className="text-xs text-gray-500">High demand in Mumbai</p>
                  </div>
                </li>
                <li className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">Potatoes</p>
                    <p className="text-sm text-gray-500">Current: ₹22/kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">Suggested: ₹20/kg</p>
                    <p className="text-xs text-gray-500">Oversupply in market</p>
                  </div>
                </li>
              </ul>
            </Card>
            <Card header={<h3 className="font-bold text-gray-900">What to grow next?</h3>}>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <h4 className="font-bold text-blue-800 mb-1">AI Demand Forecast for Nashik Region</h4>
                <p className="text-sm text-blue-600">Based on climate data and market trends for Oct-Dec season.</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Garlic</span> <span className="font-medium text-green-600">Very High Demand</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width: '90%'}}></div></div>
                
                <div className="flex justify-between text-sm mt-3"><span>Tomatoes</span> <span className="font-medium text-amber-600">Medium Demand</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{width: '60%'}}></div></div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProduct ? "Edit Product Listing" : "Add New Produce"}
        size="lg"
      >
        <ProductForm 
          onSubmit={handleAddProduct} 
          initialData={editingProduct ? {
            ...editingProduct,
            category: editingProduct.category.charAt(0).toUpperCase() + editingProduct.category.slice(1)
          } : null}
          isLoading={isSubmitting} 
        />
      </Modal>
    </div>
  );
};

export default FarmerDashboard;
