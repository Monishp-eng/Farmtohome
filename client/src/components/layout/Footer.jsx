import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-primary-dark text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">🌾</span> For Farmers, For Us
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Empowering Indian agriculture by connecting farmers directly with buyers. No middlemen, better prices, fresher produce.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white"><Facebook size={20} /></a>
              <a href="#" className="text-gray-300 hover:text-white"><Twitter size={20} /></a>
              <a href="#" className="text-gray-300 hover:text-white"><Instagram size={20} /></a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/marketplace" className="hover:text-white">Marketplace</Link></li>
              <li><Link to="/market-prices" className="hover:text-white">Market Prices</Link></li>
              <li><Link to="/ai-insights" className="hover:text-white">AI Insights</Link></li>
              <li><Link to="/faq" className="hover:text-white">FAQs</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">For Farmers</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link to="/register" className="hover:text-white">Join as a Farmer</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white">How it Works</Link></li>
              <li><Link to="/farmer/dashboard" className="hover:text-white">Seller Dashboard</Link></li>
              <li><Link to="/market-prices" className="hover:text-white">Check Crop Prices</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start">
                <MapPin size={16} className="mr-2 mt-1 flex-shrink-0" />
                <span>123 Agri-Tech Park, Sector 45, Bengaluru, Karnataka 560001</span>
              </li>
              <li className="flex items-center">
                <Phone size={16} className="mr-2 flex-shrink-0" />
                <span>+91 1800-123-4567</span>
              </li>
              <li className="flex items-center">
                <Mail size={16} className="mr-2 flex-shrink-0" />
                <span>support@forfarmersforus.in</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-600 pt-8 mt-8 text-center text-sm text-gray-400">
          <p>© 2024 For Farmers, For Us. Empowering Indian Agriculture. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
