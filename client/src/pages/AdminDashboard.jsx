import React, { useState, useEffect } from 'react';
import { Users, Package, ShoppingCart, DollarSign } from 'lucide-react';
import Card from '../components/common/Card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  
  const [userRolesData, setUserRolesData] = useState([]);
  const [productCategoriesData, setProductCategoriesData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, ordersStatsRes, productsStatsRes, recentOrdersRes] = await Promise.all([
          api.get('/auth/users/stats'),
          api.get('/orders/stats/summary'),
          api.get('/products/categories/summary'),
          api.get('/orders/my-orders') // admin sees all
        ]);

        const usersData = usersRes.data.data || usersRes.data || [];
        const ordersData = ordersStatsRes.data.data || ordersStatsRes.data || {};
        const productsData = productsStatsRes.data.data || productsStatsRes.data || [];
        const recentData = recentOrdersRes.data.data || recentOrdersRes.data || [];

        // Format users for PieChart
        const formattedUsers = Array.isArray(usersData) ? usersData.map(u => ({
          name: (u.role || u._id || 'Unknown').charAt(0).toUpperCase() + (u.role || u._id || 'unknown').slice(1),
          value: u.count || 0
        })) : [];

        setUserRolesData(formattedUsers);
        
        // Format products for BarChart
        const formattedProducts = Array.isArray(productsData) ? productsData.map(p => ({
          name: (p.category || p._id || 'Unknown').charAt(0).toUpperCase() + (p.category || p._id || 'unknown').slice(1),
          count: p.count || 0
        })) : [];
        setProductCategoriesData(formattedProducts);

        const totalU = formattedUsers.reduce((sum, item) => sum + item.value, 0);
        const totalP = formattedProducts.reduce((sum, item) => sum + item.count, 0);
        
        setStats({
          totalUsers: totalU,
          totalProducts: totalP,
          totalOrders: ordersData.totalOrders || recentData.length || 0,
          totalRevenue: ordersData.totalRevenue || recentData.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0)
        });

        setRecentOrders(recentData.slice(0, 5)); // show only recent 5

      } catch (error) {
        toast.error('Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7'];

  const platformStats = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users className="text-blue-500" /> },
    { label: 'Total Products', value: stats.totalProducts, icon: <Package className="text-green-500" /> },
    { label: 'Total Orders', value: stats.totalOrders, icon: <ShoppingCart className="text-purple-500" /> },
    { label: 'Platform Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: <DollarSign className="text-amber-500" /> },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {platformStats.map((stat, i) => (
          <Card key={i} padding="p-6" className="flex items-center">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card header={<h3 className="font-bold">Users by Role</h3>}>
          <div className="h-64">
            {userRolesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={userRolesData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>
                    {userRolesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">No user data</div>
            )}
          </div>
        </Card>

        <Card header={<h3 className="font-bold">Products by Category</h3>}>
          <div className="h-64">
            {productCategoriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productCategoriesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">No product data</div>
            )}
          </div>
        </Card>
      </div>

      <Card header={<h3 className="font-bold">Recent Orders</h3>}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.length > 0 ? recentOrders.map((o) => (
                <tr key={o.id || o._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {String(o.id || o._id).slice(-6).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(o.created_at || o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{o.total_price || o.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                      o.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {(o.status || 'pending').replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No recent orders</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
