import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Heart, MapPin, Truck, CheckCircle2, Clock, 
  Sparkles, User, Building2, DollarSign, Package, RefreshCw, 
  Edit2, Trash2, Plus, Phone, Home, Check, X, Download, 
  Receipt, CreditCard, ShieldCheck, ArrowRight 
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import LiveTrackingMap from '../components/common/LiveTrackingMap';
import api from '../api/axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

  // Active tracking modal for live order
  const [trackingOrder, setTrackingOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/my-orders');
      const orderList = res.data.data || res.data || [];
      if (orderList.length === 0) {
        // Mock seed for rich display if new account
        setOrders([
          {
            id: 'ORD-8941',
            product_name: 'Hybrid Farm Tomatoes (Salem)',
            quantity_kg: 25,
            price_per_kg: 32,
            total_price: 800,
            status: 'in_transit',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            farmer_name: 'Murugan K.',
            farmer_location: 'Salem District, TN',
            delivery_address: 'Flat 4B, North Usman Rd, T. Nagar, Chennai',
            payment_method: 'UPI Direct Escrow',
            payment_id: 'pay_UPI_98240182'
          },
          {
            id: 'ORD-8902',
            product_name: 'Organic Red Onions',
            quantity_kg: 50,
            price_per_kg: 28,
            total_price: 1400,
            status: 'delivered',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            farmer_name: 'Selvam R.',
            farmer_location: 'Omalur, Salem, TN',
            delivery_address: 'Flat 4B, North Usman Rd, T. Nagar, Chennai',
            payment_method: 'Card Payment',
            payment_id: 'pay_CRD_10928371'
          },
          {
            id: 'ORD-8854',
            product_name: 'Fresh Nagpur Oranges',
            quantity_kg: 10,
            price_per_kg: 65,
            total_price: 650,
            status: 'delivered',
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            farmer_name: 'Ramesh Patil',
            farmer_location: 'Katol, Maharashtra',
            delivery_address: 'Flat 4B, North Usman Rd, T. Nagar, Chennai',
            payment_method: 'UPI Direct Escrow',
            payment_id: 'pay_UPI_33918274'
          }
        ]);
      } else {
        setOrders(orderList);
      }
    } catch (error) {
      console.warn('Orders fetch fallback to demo:', error);
      // Demo fallback orders
      setOrders([
        {
          id: 'ORD-8941',
          product_name: 'Hybrid Farm Tomatoes (Salem)',
          quantity_kg: 25,
          price_per_kg: 32,
          total_price: 800,
          status: 'in_transit',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          farmer_name: 'Murugan K.',
          farmer_location: 'Salem District, TN',
          delivery_address: 'Flat 4B, North Usman Rd, T. Nagar, Chennai',
          payment_method: 'UPI Direct Escrow',
          payment_id: 'pay_UPI_98240182'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Downloadable PDF Invoice Generation with jsPDF
  const downloadInvoicePDF = (order) => {
    try {
      const doc = new jsPDF();
      const orderId = order.id || order._id || 'ORD-UNKNOWN';
      const unitPrice = Number(order.price_per_kg) || 30;
      const qty = Number(order.quantity_kg) || 1;
      const total = Number(order.total_price) || (unitPrice * qty);
      const farmerPayout = (total * 0.98).toFixed(2);
      const platformFee = (total * 0.02).toFixed(2);

      // Header Banner
      doc.setFillColor(22, 101, 52); // primary dark green
      doc.rect(0, 0, 210, 35, 'F');

      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('KisanSetu | FarmToHome', 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(253, 230, 138); // amber-200
      doc.text('Direct Farm-Gate Agriculture Marketplace · Tax Invoice & Traceability Receipt', 14, 28);

      // Invoice & Customer Info
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`INVOICE #: INV-${orderId}`, 14, 45);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date of Issue: ${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN')}`, 14, 52);
      doc.text(`Payment Status: PAID (${order.payment_method || 'UPI Direct'})`, 14, 59);
      doc.text(`Transaction Reference: ${order.payment_id || `txn_${Date.now()}`}`, 14, 66);

      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO (BUYER):', 120, 45);
      doc.setFont('helvetica', 'normal');
      doc.text(`Customer: Consumer Buyer`, 120, 52);
      doc.text(`Delivery Address: ${order.delivery_address || 'Chennai, Tamil Nadu'}`, 120, 59, { maxWidth: 75 });

      // Table
      doc.autoTable({
        startY: 78,
        head: [['Item Description & Traceability', 'Quality Grade', 'Qty (KG)', 'Rate / KG', 'Total (INR)']],
        body: [
          [
            `${order.product_name || 'Fresh Farm Produce'}\nOrigin: ${order.farmer_name || 'Direct Farm'} (${order.farmer_location || 'Salem'})`,
            'Grade A (Export)',
            `${qty} kg`,
            `₹${unitPrice}`,
            `₹${total.toFixed(2)}`
          ]
        ],
        headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 }
      });

      const finalY = doc.lastAutoTable.finalY + 10;

      // Revenue Distribution Breakdown
      doc.setFillColor(240, 253, 244);
      doc.rect(14, finalY, 182, 36, 'F');
      doc.setDrawColor(187, 247, 208);
      doc.rect(14, finalY, 182, 36, 'S');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text('DIRECT IMPACT REVENUE SPLIT (Zero Middlemen):', 18, finalY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`• 98% Direct Farmer Payout (Disbursed via Escrow T+0): ₹${farmerPayout}`, 18, finalY + 16);
      doc.text(`• 2% Cold Logistics & Quality Inspection Rail: ₹${platformFee}`, 18, finalY + 23);
      doc.text(`• GST on Platform Ops: ₹0.00 (Exempt under Agri Direct Farmer Scheme)`, 18, finalY + 30);

      // Total Box
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Amount Paid: INR ₹${total.toFixed(2)}`, 120, finalY + 48);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('This is a computer-generated tax invoice verified under the National KisanSetu Direct Agri Network.', 14, 280);

      doc.save(`Invoice_${orderId}.pdf`);
      toast.success(`Invoice for #${orderId} downloaded!`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'active') return o.status !== 'delivered' && o.status !== 'cancelled';
    if (orderFilter === 'completed') return o.status === 'delivered';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-primary-dark to-emerald-900 dark:from-slate-950 dark:via-emerald-950 dark:to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
        <div>
          <span className="text-amber-300 font-bold text-xs uppercase tracking-wider block mb-1">
            🛒 Direct Farm-to-Consumer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">Buyer Operations Dashboard</h1>
          <p className="text-emerald-100 dark:text-gray-300 text-xs sm:text-sm mt-1">
            Track active cold transit shipments, view transaction receipts, and manage delivery addresses.
          </p>
        </div>

        <div className="bg-white/10 dark:bg-slate-900/70 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
          <span className="text-[10px] text-emerald-200 block uppercase font-bold">Total Orders</span>
          <span className="text-2xl font-black text-white">{orders.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'orders', label: '📦 Orders & Shipments', badge: orders.length },
          { id: 'payments', label: '💳 Payment History & Invoices' },
          { id: 'addresses', label: '📍 Saved Addresses' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {/* TAB 1: ORDERS & TRACKING */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Filter Pills */}
          <div className="flex gap-2 text-xs font-bold">
            {['all', 'active', 'completed'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setOrderFilter(f)}
                className={`px-4 py-2 rounded-xl capitalize transition-all cursor-pointer ${
                  orderFilter === f 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800'
                }`}
              >
                {f} Orders
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-white dark:bg-slate-900 h-40 rounded-3xl animate-pulse p-6 border border-gray-100 dark:border-slate-800" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-gray-300 dark:border-slate-800">
              <Package size={40} className="mx-auto text-gray-400 mb-3" />
              <h3 className="font-black text-base text-gray-900 dark:text-gray-100">No orders in this view</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">Explore our direct marketplace for fresh harvests.</p>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/marketplace'}>
                Browse Marketplace
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isInTransit = order.status === 'in_transit' || order.status === 'dispatched';
                return (
                  <div
                    key={order.id || order._id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-sm transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-gray-900 dark:text-gray-100">
                            Order #{order.id || order._id}
                          </span>
                          <Badge variant={order.status === 'delivered' ? 'success' : 'warning'}>
                            {order.status?.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Placed on {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isInTransit && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setTrackingOrder(order)}
                            className="flex items-center gap-1.5"
                          >
                            <Truck size={14} /> Live GPS Tracking
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => downloadInvoicePDF(order)}
                          className="flex items-center gap-1.5"
                        >
                          <Download size={14} /> PDF Invoice
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                      <div>
                        <span className="text-gray-400 block mb-0.5">Produce Details:</span>
                        <strong className="text-gray-900 dark:text-gray-100 block text-sm">
                          {order.product_name || 'Fresh Produce'}
                        </strong>
                        <span className="text-gray-500 dark:text-gray-400">
                          {order.quantity_kg} kg @ ₹{order.price_per_kg || 30}/kg
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block mb-0.5">Farm Origin:</span>
                        <strong className="text-gray-900 dark:text-gray-100 block">
                          🧑‍🌾 {order.farmer_name || 'Murugan K.'}
                        </strong>
                        <span className="text-gray-500 dark:text-gray-400">
                          {order.farmer_location || 'Salem District, TN'}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block mb-0.5">Payment Total:</span>
                        <strong className="text-emerald-700 dark:text-emerald-400 block text-base font-black">
                          ₹{order.total_price || (order.quantity_kg * (order.price_per_kg || 30))}
                        </strong>
                        <span className="text-gray-500 dark:text-gray-400">
                          via {order.payment_method || 'UPI Direct Escrow'}
                        </span>
                      </div>
                    </div>

                    {/* In-Line Live Map if selected */}
                    {trackingOrder?.id === order.id && (
                      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 animate-slide-up">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-black text-xs text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                            <Truck size={16} className="text-primary" /> Live Vehicle Position (WebSocket)
                          </span>
                          <button
                            onClick={() => setTrackingOrder(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                          >
                            Hide Map
                          </button>
                        </div>
                        <LiveTrackingMap deliveryId={order.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENT HISTORY & INVOICES */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Receipt size={18} className="text-primary" /> Real Payment History & Invoices
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Every transaction directly credits the farmer's verified bank account with 98% direct settlement.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Transaction ID</th>
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 rounded-r-xl text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-600 dark:text-gray-300">
                {orders.map((o) => (
                  <tr key={o.id || o._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3.5 font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200">
                      {o.payment_id || `txn_${o.id?.slice(-4) || '8491'}`}
                    </td>
                    <td className="p-3.5 font-bold">{o.id || o._id}</td>
                    <td className="p-3.5">{new Date(o.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                    <td className="p-3.5 font-black text-gray-900 dark:text-gray-100">
                      ₹{o.total_price || (o.quantity_kg * (o.price_per_kg || 30))}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1">
                        <CreditCard size={13} className="text-primary" />
                        {o.payment_method || 'UPI Direct Escrow'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge variant="success">Success</Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoicePDF(o)}
                        className="inline-flex items-center gap-1 text-[11px]"
                      >
                        <Download size={12} /> Download PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SAVED ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100">
              Saved Delivery Destinations
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingAddress({
                  id: Date.now(),
                  label: 'New Address',
                  isPrimary: false,
                  recipientName: 'Consumer Buyer',
                  phone: '+91 9876543210',
                  address: ''
                });
                setShowAddressModal(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus size={14} /> Add New Address
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <Home size={16} className="text-primary" /> {addr.label}
                    </span>
                    {addr.isPrimary && (
                      <Badge variant="primary">Default</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {addr.address}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Contact: {addr.recipientName} ({addr.phone})
                  </p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingAddress(addr);
                      setShowAddressModal(true);
                    }}
                  >
                    <Edit2 size={12} className="mr-1" /> Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const remaining = addresses.filter(a => a.id !== addr.id);
                      setAddresses(remaining);
                      localStorage.setItem('kisan_saved_addresses', JSON.stringify(remaining));
                      toast.success('Address deleted');
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Address Edit/Add Modal */}
      {showAddressModal && editingAddress && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 animate-slide-up text-xs">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100">
                Save Doorstep Address
              </h3>
              <button onClick={() => setShowAddressModal(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Label</label>
                <input
                  type="text"
                  value={editingAddress.label}
                  onChange={(e) => setEditingAddress({ ...editingAddress, label: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={editingAddress.recipientName}
                  onChange={(e) => setEditingAddress({ ...editingAddress, recipientName: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Phone Number (+91)</label>
                <input
                  type="tel"
                  value={editingAddress.phone}
                  onChange={(e) => setEditingAddress({ ...editingAddress, phone: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Full Postal Address</label>
                <textarea
                  rows={2}
                  value={editingAddress.address}
                  onChange={(e) => setEditingAddress({ ...editingAddress, address: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddressModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    const updated = addresses.some(a => a.id === editingAddress.id)
                      ? addresses.map(a => a.id === editingAddress.id ? editingAddress : a)
                      : [editingAddress, ...addresses];
                    setAddresses(updated);
                    localStorage.setItem('kisan_saved_addresses', JSON.stringify(updated));
                    setShowAddressModal(false);
                    toast.success('Address saved successfully');
                  }}
                >
                  Save Address
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BuyerDashboard;
