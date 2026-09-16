import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer 
      role="contentinfo" 
      aria-label="Site footer"
      className="bg-primary-dark dark:bg-slate-950 text-white pt-12 pb-8 border-t border-emerald-800/60 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-white">
              <span>🌾</span> For Farmers, For Us
            </h3>
            <p className="text-emerald-100 dark:text-gray-400 text-xs sm:text-sm mb-4 leading-relaxed">
              Empowering Indian agriculture by connecting rural farmers directly with urban consumers and bulk retailers. Zero middlemen, fair prices, direct farm-gate cold dispatch.
            </p>
            <div className="flex space-x-3">
              <a href="#" aria-label="Facebook" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white transition-colors"><Facebook size={16} /></a>
              <a href="#" aria-label="Twitter" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white transition-colors"><Twitter size={16} /></a>
              <a href="#" aria-label="Instagram" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white transition-colors"><Instagram size={16} /></a>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-black mb-4 text-amber-300 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-xs text-emerald-100 dark:text-gray-400 font-medium">
              <li><Link to="/about" className="hover:text-white transition-colors">About Mission</Link></li>
              <li><Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link to="/bulk-buyer" className="hover:text-white transition-colors">Bulk Wholesale</Link></li>
              <li><Link to="/market-prices" className="hover:text-white transition-colors">APMC Mandi Rates</Link></li>
              <li><Link to="/ai-insights" className="hover:text-white transition-colors">AI Demand Insights</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-black mb-4 text-amber-300 uppercase tracking-wider">For Farmers</h4>
            <ul className="space-y-2 text-xs text-emerald-100 dark:text-gray-400 font-medium">
              <li><Link to="/register" className="hover:text-white transition-colors">Join as a Farmer</Link></li>
              <li><Link to="/dialphone" className="hover:text-white transition-colors">2G Voice Phone Gateway</Link></li>
              <li><Link to="/agri-doctor" className="hover:text-white transition-colors">Kisan Agri-Doctor</Link></li>
              <li><Link to="/farmer/dashboard" className="hover:text-white transition-colors">Seller Dashboard</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-black mb-4 text-amber-300 uppercase tracking-wider">Contact & Support</h4>
            <ul className="space-y-3 text-xs text-emerald-100 dark:text-gray-400 font-medium">
              <li className="flex items-start">
                <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0 text-amber-300" aria-hidden="true" />
                <span>Agri-Tech Hub, Electronic City, Bengaluru, Karnataka 560100</span>
              </li>
              <li className="flex items-center">
                <Phone size={16} className="mr-2 flex-shrink-0 text-amber-300" aria-hidden="true" />
                <span>+91 1800-KISAN-SETU (Toll Free)</span>
              </li>
              <li className="flex items-center">
                <Mail size={16} className="mr-2 flex-shrink-0 text-amber-300" aria-hidden="true" />
                <span>support@forfarmersforus.in</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-emerald-800/80 dark:border-slate-800 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-emerald-200/80 dark:text-gray-500 font-medium">
          <p>© 2026 For Farmers, For Us (KisanSetu). SIH 2026 Production Architecture.</p>
          <p className="flex items-center gap-1.5 text-amber-300">
            <Sparkles size={13} /> Direct Farm-to-Consumer Rail
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

