import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, Sprout, ShoppingBag, Truck, Shield, Stethoscope, PhoneCall, LogOut, ChevronDown, Building2, Plus, MapPin, TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/login');
  };

  // If on login or register page, treat as unauthenticated public view for ultra-clean UI
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const activeUser = (!isAuthPage && isAuthenticated) ? user : null;

  const userRole = (activeUser?.role || '').toLowerCase();
  const isFarmer = !!activeUser && (userRole === 'farmer' || userRole === 'fpo');
  const isDriver = !!activeUser && (userRole === 'logistics' || userRole === 'driver');
  const isConsumer = !!activeUser && (userRole === 'consumer' || userRole === 'buyer');
  const isAdmin = !!activeUser && userRole === 'admin';

  const getRoleBadge = (role) => {
    const r = (role || '').toLowerCase();
    switch (r) {
      case 'farmer':
      case 'fpo':
        return { label: '🧑‍🌾 Farmer', bg: 'bg-amber-400 text-amber-950' };
      case 'buyer':
      case 'consumer':
        return { label: '🛒 Consumer', bg: 'bg-emerald-300 text-emerald-950' };
      case 'logistics':
      case 'driver':
        return { label: '🚚 Driver', bg: 'bg-blue-400 text-blue-950' };
      case 'admin':
        return { label: '🛡️ Admin', bg: 'bg-purple-400 text-purple-950' };
      default:
        return { label: '🛒 Guest', bg: 'bg-gray-300 text-gray-950' };
    }
  };

  const getDashboardLink = () => {
    if (!activeUser) return '/login';
    if (isFarmer) return '/farmer/dashboard';
    if (isDriver) return '/logistics/dashboard';
    if (isAdmin) return '/admin/dashboard';
    return '/buyer/dashboard';
  };

  const roleInfo = activeUser ? getRoleBadge(activeUser.role) : null;

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-emerald-950 via-primary-dark to-primary text-white shadow-lg border-b border-emerald-800/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-2xl transform group-hover:scale-110 transition-transform">🌾</span>
              <div>
                <span className="font-black text-lg sm:text-xl tracking-tight text-white block leading-none">
                  For Farmers, <span className="text-amber-300">For Us</span>
                </span>
                <span className="text-[9px] text-emerald-200 tracking-wider uppercase font-semibold">
                  {isFarmer ? '🧑‍🌾 Farmer Direct Portal' : isDriver ? '🚚 Logistics Dispatch Portal' : '🛒 Direct Farm-to-Table'}
                </span>
              </div>
            </Link>
          </div>
          
          {/* Role-Specific Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-5 text-xs font-bold">
            
            {/* 1. If FARMER role */}
            {isFarmer ? (
              <>
                <Link to="/farmer/dashboard" className="hover:text-amber-300 transition-colors py-1 flex items-center gap-1">
                  <Sprout size={14} className="text-amber-300" /> My Farm Listings
                </Link>
                <Link to="/ai-insights" className="hover:text-amber-300 transition-colors py-1">
                  AI Crop Advisory
                </Link>
                <Link to="/agri-doctor" className="hover:text-amber-300 transition-colors py-1 flex items-center gap-1 text-emerald-300">
                  <Stethoscope size={14} /> Kisan Doctor
                </Link>
                <Link to="/dialphone" className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1">
                  <PhoneCall size={12} /> 2G Dialphone
                </Link>
              </>
            ) : isDriver ? (
              /* 2. If LOGISTICS DRIVER role */
              <>
                <Link to="/logistics/dashboard" className="hover:text-amber-300 transition-colors py-1 flex items-center gap-1">
                  <Truck size={14} className="text-blue-300" /> Active Deliveries
                </Link>
                <Link to="/ai-insights" className="hover:text-amber-300 transition-colors py-1 flex items-center gap-1">
                  <MapPin size={14} /> 2-Opt Route Optimizer
                </Link>
              </>
            ) : (
              /* 3. If Public Guest or Consumer */
              <>
                <Link to="/" className="hover:text-amber-300 transition-colors py-1">Home</Link>
                <Link to="/marketplace" className="hover:text-amber-300 transition-colors py-1 flex items-center gap-1">
                  <ShoppingBag size={14} className="text-amber-300" /> Marketplace
                </Link>
                <Link to="/bulk-buyer" className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/40 px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1">
                  <Building2 size={13} className="text-purple-300" /> Bulk Wholesale
                </Link>
                <Link to="/logistics/dashboard" className="hover:text-amber-300 transition-colors py-1 flex items-center gap-1">
                  <Truck size={13} className="text-emerald-300" /> Logistics
                </Link>
                <Link to="/agri-doctor" className="hover:text-amber-300 transition-colors py-1 flex items-center gap-1 text-emerald-300">
                  <Stethoscope size={14} /> Agri-Doctor
                </Link>
                <Link to="/dialphone" className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1">
                  <PhoneCall size={12} /> 2G Dialphone
                </Link>
              </>
            )}

            <Link to="/about" className="hover:text-amber-300 transition-colors py-1 text-gray-300">About</Link>
          </div>

          {/* Desktop User / Auth Area */}
          <div className="hidden md:flex items-center space-x-3 text-xs font-bold">
            {activeUser ? (
              <>
                {/* Cart Icon (Only for Consumers) */}
                {isConsumer && (
                  <Link to="/cart" className="relative p-2 text-white hover:text-amber-300 transition-colors" title="Shopping Cart">
                    <ShoppingCart size={20} />
                  </Link>
                )}

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-full transition-all text-xs cursor-pointer"
                  >
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${roleInfo?.bg}`}>
                      {roleInfo?.label}
                    </span>
                    <span className="truncate max-w-[110px] text-white font-bold">{activeUser.name}</span>
                    <ChevronDown size={13} className="text-gray-300" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl py-2 z-50 text-slate-800 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-gray-100 text-xs">
                        <p className="font-bold text-gray-900 truncate">{activeUser.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{activeUser.email}</p>
                      </div>

                      <Link
                        to={getDashboardLink()}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-primary font-semibold transition-colors"
                      >
                        📊 {isFarmer ? 'Farmer Operations Dashboard' : isDriver ? 'Logistics Partner Dashboard' : 'My Orders & Account'}
                      </Link>

                      {isFarmer && (
                        <Link
                          to="/farmer/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-50 font-semibold transition-colors"
                        >
                          ➕ Add New Produce Listing
                        </Link>
                      )}

                      {isConsumer && (
                        <>
                          <Link
                            to="/marketplace"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="block px-4 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-primary font-semibold transition-colors"
                          >
                            🛒 Browse Farm Produce
                          </Link>
                          <Link
                            to="/cart"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="block px-4 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-primary font-semibold transition-colors"
                          >
                            🛍️ View Cart & Checkout
                          </Link>
                        </>
                      )}

                      {isDriver && (
                        <Link
                          to="/logistics/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-xs text-blue-700 hover:bg-blue-50 font-semibold transition-colors"
                        >
                          🚚 View Assigned Shipments
                        </Link>
                      )}

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LogOut size={13} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-white hover:text-amber-300 px-3 py-1.5 font-bold transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4 py-1.5 rounded-full shadow-md transition-all"
                >
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-2 focus:outline-none cursor-pointer"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden bg-emerald-950/95 border-b border-emerald-800/80 px-4 pt-2 pb-6 space-y-2 text-sm font-bold animate-in fade-in duration-150">
          {isFarmer ? (
            <>
              <Link to="/farmer/dashboard" onClick={() => setIsMenuOpen(false)} className="block py-2 text-amber-300">🧑‍🌾 Farmer Dashboard</Link>
              <Link to="/market-prices" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-amber-300">APMC Mandi Rates</Link>
              <Link to="/agri-doctor" onClick={() => setIsMenuOpen(false)} className="block py-2 text-emerald-300">Kisan Doctor</Link>
              <Link to="/dialphone" onClick={() => setIsMenuOpen(false)} className="block py-2 text-amber-300">2G Dialphone</Link>
            </>
          ) : isDriver ? (
            <>
              <Link to="/logistics/dashboard" onClick={() => setIsMenuOpen(false)} className="block py-2 text-blue-300">🚚 Logistics Dashboard</Link>
              <Link to="/ai-insights" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-amber-300">Route Optimizer</Link>
            </>
          ) : (
            <>
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-amber-300">Home</Link>
              <Link to="/marketplace" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-amber-300">Marketplace</Link>
              <Link to="/bulk-buyer" onClick={() => setIsMenuOpen(false)} className="block py-2 text-purple-300">🏢 Bulk Wholesale Portal</Link>
              <Link to="/cart" onClick={() => setIsMenuOpen(false)} className="block py-2 text-emerald-300">🛍️ Shopping Cart</Link>
              <Link to="/buyer/dashboard" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-amber-300">📦 My Orders</Link>
            </>
          )}

          <Link to="/about" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-300">About Mission</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
