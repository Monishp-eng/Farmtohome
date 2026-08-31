import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Loading from '../components/common/Loading';

const MarketPrices = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await api.get('/market/prices');
        setPriceData(res.data.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching market prices:', error);
        toast.error('Failed to load market prices');
        setPriceData([]);
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const filteredData = priceData.filter(item => 
    (item.commodity && item.commodity.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (item.market_name && item.market_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group comparison data for chart (e.g., show first commodity or specific one if searched)
  const comparisonCommodity = filteredData.length > 0 ? filteredData[0].commodity : 'Onion';
  const comparisonData = priceData
    .filter(d => d.commodity === comparisonCommodity)
    .map(d => ({
      name: d.market_name ? d.market_name.split(',')[0] : 'Market',
      Price: d.modal_price,
      MSP: d.msp || 0
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live APMC Market Prices</h1>
          <p className="text-gray-500 mt-1 text-sm">Real-time data aggregated from mandis across India</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search commodity or market..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>

      {loading ? (
        <div className="py-20"><Loading message="Loading live market prices..." /></div>
      ) : priceData.length === 0 ? (
        <div className="py-20 text-center text-gray-500">No market prices available.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commodity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min (₹/quintal)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Max (₹/quintal)</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-100">Modal (Avg)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">MSP</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.commodity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.market_name}{row.state ? `, ${row.state}` : ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.min_price}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.max_price}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary text-right bg-green-50/30">{row.modal_price}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {!row.msp ? (
                          <span className="text-gray-400">N/A</span>
                        ) : (
                          <div className="flex items-center justify-end">
                            <span className={row.modal_price < row.msp ? 'text-red-600 font-medium' : 'text-gray-900'}>{row.msp}</span>
                            {row.modal_price < row.msp && (
                              <AlertTriangle size={14} className="text-red-500 ml-1" title="Market price below MSP" />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <TrendingUp size={20} className="mr-2 text-primary" /> Price Comparison ({comparisonCommodity})
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Price" fill="#16a34a" name="Market Price (₹)" />
                    <Bar dataKey="MSP" fill="#9ca3af" name="Govt MSP (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">Prices across major markets vs Minimum Support Price (₹/quintal)</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
              <h3 className="font-bold text-amber-900 mb-2 flex items-center">
                <AlertTriangle size={18} className="mr-2" /> Warning
              </h3>
              <p className="text-sm text-amber-800">
                Prices for some commodities are currently hovering near or below MSP in select markets. 
                Farmers are advised to use our direct marketplace to secure better margins.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketPrices;
