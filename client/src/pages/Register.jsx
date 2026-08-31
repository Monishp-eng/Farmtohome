import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, ShoppingBag, Truck, Building2, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, HeartHandshake } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'consumer', // 'consumer', 'farmer', 'buyer', 'logistics'
    location: 'Salem',
    state: 'Tamil Nadu'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleSelect = (role) => {
    setFormData({ ...formData, role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.phone && formData.phone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      const result = await register(submitData);

      if (result.success) {
        toast.success('Registration successful! Welcome to the community.');
        const role = formData.role.toLowerCase();
        if (role === 'farmer' || role === 'fpo') navigate('/farmer/dashboard');
        else if (role === 'consumer' || role === 'buyer') navigate('/marketplace');
        else if (role === 'logistics') navigate('/logistics/dashboard');
        else navigate('/marketplace');
      } else {
        toast.error(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 via-amber-50/30 to-green-50">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: Hero Value Proposition */}
        <div className="lg:col-span-4 bg-gradient-to-br from-primary-dark via-primary to-emerald-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-amber-400/30">
              <Sparkles size={12} /> Direct Farmer-to-Consumer
            </div>

            <h2 className="text-2xl font-black leading-tight mb-3">
              Join India's Most Transparent Agricultural Network.
            </h2>

            <p className="text-emerald-100 text-xs leading-relaxed mb-6">
              Whether you harvest crops or buy for your household, you are building a fairer agricultural future.
            </p>

            <div className="space-y-3 text-xs text-emerald-100">
              <div className="flex items-start gap-2.5 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                <CheckCircle2 size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white">For Consumers & Families:</strong>
                  Fresh produce straight from verified farms with transparent pricing.
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                <CheckCircle2 size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white">For Farmers & FPOs:</strong>
                  Keep 98% of your money. Zero commission, direct payments & AI crop doctor.
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/20 mt-6 text-[11px] text-emerald-200 flex items-center gap-2">
            <HeartHandshake size={16} className="text-amber-300" />
            <span>Fair Trade • Zero Middlemen • 100% Traceable</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-8 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Create Your Account</h3>
            <p className="text-xs text-gray-500 mt-1">
              Already a member?{' '}
              <Link to="/login" className="font-bold text-primary hover:text-primary-dark hover:underline">
                Sign In Here
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Visual Role Cards */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                I am joining as:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Role 1: Consumer */}
                <div
                  onClick={() => handleRoleSelect('consumer')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.role === 'consumer'
                      ? 'border-primary bg-green-50/70 shadow-sm ring-2 ring-primary/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-primary">
                      <ShoppingBag size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">Consumer</h4>
                      <span className="text-[10px] text-gray-500">Buy Farm Fresh</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Direct farm produce for families, chefs & local buyers.
                  </p>
                </div>

                {/* Role 2: Farmer */}
                <div
                  onClick={() => handleRoleSelect('farmer')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.role === 'farmer'
                      ? 'border-primary bg-green-50/70 shadow-sm ring-2 ring-primary/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-primary">
                      <Sprout size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">Farmer / Kisan</h4>
                      <span className="text-[10px] text-gray-500">Sell Harvest</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    List crops directly, get 98% earnings & MSP insights.
                  </p>
                </div>

                {/* Role 3: Logistics / FPO */}
                <div
                  onClick={() => handleRoleSelect('logistics')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.role === 'logistics'
                      ? 'border-primary bg-green-50/70 shadow-sm ring-2 ring-primary/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-primary">
                      <Truck size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">Logistics</h4>
                      <span className="text-[10px] text-gray-500">Farm Transit</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Deliver fresh harvest directly from farm gates to doorsteps.
                  </p>
                </div>
              </div>
            </div>

            {/* Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar or Ananya Sen"
                  className="w-full text-xs px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="phone">
                  Mobile Number (10 Digits)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="w-full text-xs px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. you@example.com"
                  className="w-full text-xs px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="location">
                  District / Village
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Salem, Nashik, Pune"
                  className="w-full text-xs px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full text-xs px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full text-xs px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? 'Creating Account...' : (
                <>
                  Complete Registration <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Register;
