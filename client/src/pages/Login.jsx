import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, ShoppingBag, Truck, ShieldCheck, ArrowRight, Eye, EyeOff, CheckCircle2, Sparkles, HeartHandshake } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('consumer'); // 'farmer', 'consumer', 'logistics'
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Quick Demo Logins for effortless testing
  const demoAccounts = {
    farmer: { email: 'ramesh@example.com', password: 'password123', label: '🧑‍🌾 Login as Farmer (Ramesh)' },
    consumer: { email: 'priya@example.com', password: 'password123', label: '🛒 Login as Consumer (Priya)' },
    buyer: { email: 'freshmart@example.com', password: 'password123', label: '🏪 Login as Bulk Buyer (FreshMart)' },
    logistics: { email: 'kiran@example.com', password: 'password123', label: '🚚 Login as Driver (Kiran)' }
  };

  const handleDemoFill = (roleKey) => {
    const acc = demoAccounts[roleKey];
    if (acc) {
      setEmail(acc.email);
      setPassword(acc.password);
      setSelectedRole(roleKey === 'buyer' ? 'consumer' : roleKey);
      toast.success(`Demo credentials loaded for ${acc.label}! Click Sign In.`);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success(`Welcome back!`);
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const role = storedUser?.role?.toLowerCase();

        if (role === 'farmer' || role === 'fpo') navigate('/farmer/dashboard');
        else if (role === 'consumer' || role === 'buyer') navigate('/marketplace');
        else if (role === 'logistics') navigate('/logistics/dashboard');
        else if (role === 'admin') navigate('/admin/dashboard');
        else navigate('/marketplace');
      } else {
        toast.error(result.message || 'Invalid credentials. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 via-amber-50/30 to-green-50">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: Hero Value Proposition (Farmer to Consumer Direct) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-primary-dark via-primary to-emerald-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-amber-400/30">
              <Sparkles size={13} /> Direct Farm-to-Table Bridge
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-4">
              Connecting Hardworking Farmers Directly with Conscious Consumers.
            </h2>

            <p className="text-emerald-100 text-sm leading-relaxed mb-6">
              Zero middlemen. Fair direct pricing. 98% of your money goes straight to the farmer, while consumers get farm-fresh produce harvested today.
            </p>

            <div className="space-y-3.5 text-xs text-emerald-100">
              <div className="flex items-center gap-2.5 bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                <CheckCircle2 size={18} className="text-amber-300 flex-shrink-0" />
                <span><strong>98% Direct Farmer Earnings</strong> (2% transparent fee)</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                <CheckCircle2 size={18} className="text-amber-300 flex-shrink-0" />
                <span><strong>100% Farm Origin Traceability</strong> on all produce</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                <CheckCircle2 size={18} className="text-amber-300 flex-shrink-0" />
                <span><strong>2G Dialphone & SMS Accessible</strong> for rural farmers</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/20 mt-6 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <HeartHandshake size={20} className="text-amber-300" />
              <span>For Farmers, For Us</span>
            </div>
            <span className="font-mono">Toll-Free: 1800-547-2600</span>
          </div>
        </div>

        {/* Right Side: Interactive Sign In Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Sign In to Your Account</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              New to our community?{' '}
              <Link to="/register" className="font-bold text-primary hover:text-primary-dark hover:underline">
                Create a Free Account
              </Link>
            </p>
          </div>

          {/* Role Filter Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Select Your Role:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('consumer')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  selectedRole === 'consumer'
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <ShoppingBag size={14} /> Consumer / Buyer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('farmer')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  selectedRole === 'farmer'
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Sprout size={14} /> Farmer / Kisan
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('logistics')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  selectedRole === 'logistics'
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Truck size={14} /> Logistics Driver
              </button>
            </div>
          </div>

          {/* Quick 1-Click Demo Fill Bar */}
          <div className="mb-6 bg-amber-50/80 border border-amber-200 rounded-2xl p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-600" /> One-Click Quick Demo Sign In:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoFill('consumer')}
                className="text-[10px] font-bold bg-white text-gray-800 hover:bg-amber-100 border border-amber-300 py-1.5 px-2 rounded-lg transition-colors truncate"
                title="Login as Consumer"
              >
                🛒 Consumer
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('farmer')}
                className="text-[10px] font-bold bg-white text-gray-800 hover:bg-amber-100 border border-amber-300 py-1.5 px-2 rounded-lg transition-colors truncate"
                title="Login as Farmer"
              >
                🧑‍🌾 Farmer
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('buyer')}
                className="text-[10px] font-bold bg-white text-gray-800 hover:bg-amber-100 border border-amber-300 py-1.5 px-2 rounded-lg transition-colors truncate"
                title="Login as Bulk Buyer"
              >
                🏪 Bulk Buyer
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('logistics')}
                className="text-[10px] font-bold bg-white text-gray-800 hover:bg-amber-100 border border-amber-300 py-1.5 px-2 rounded-lg transition-colors truncate"
                title="Login as Driver"
              >
                🚚 Driver
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="email">
                Email Address or Phone
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ananya.sen@gmail.com"
                className="w-full text-sm px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-primary hover:underline">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? 'Signing In...' : (
                <>
                  Sign In to Marketplace <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          {/* Dialphone Alternate Notice */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              No internet or smartphone? Use our{' '}
              <Link to="/dialphone" className="font-bold text-amber-700 hover:underline">
                2G Dialphone & SMS Helpline (1800-547-2600)
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
