import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import OfflineBanner from './components/common/OfflineBanner';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Marketplace from './pages/Marketplace';
import ProductPage from './pages/ProductPage';
import Cart from './pages/Cart';
import FarmerDashboard from './pages/FarmerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import LogisticsDashboard from './pages/LogisticsDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MarketPrices from './pages/MarketPrices';
import AIInsights from './pages/AIInsights';
import DialphoneGateway from './pages/DialphoneGateway';
import AgriDoctor from './pages/AgriDoctor';
import About from './pages/About';
import KisanCopilot from './components/common/KisanCopilot';

function App() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <Toaster 
          position="top-right" 
          toastOptions={{
            className: 'dark:bg-slate-900 dark:text-gray-100 dark:border dark:border-slate-800',
            duration: 3500
          }}
        />
        <OfflineBanner />
        <Navbar />
        <main id="main-content" className="flex-grow focus:outline-none" tabIndex={-1}>
          <ErrorBoundary>
            <Routes>
              {/* Public Accessible Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/bulk-buyer" element={<Marketplace defaultPersona="bulk" />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/market-prices" element={<MarketPrices />} />
              <Route path="/ai-insights" element={<AIInsights />} />
              <Route path="/dialphone" element={<DialphoneGateway />} />
              <Route path="/agri-doctor" element={<AgriDoctor />} />
              <Route path="/about" element={<About />} />

              {/* 1. ROLE: FARMER PROTECTED ROUTES */}
              <Route 
                path="/farmer/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['farmer', 'fpo']}>
                    <FarmerDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* 2. ROLE: CONSUMER & BULK BUYER PROTECTED ROUTES */}
              <Route 
                path="/cart" 
                element={
                  <ProtectedRoute allowedRoles={['consumer', 'buyer']}>
                    <Cart />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/buyer/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['consumer', 'buyer']}>
                    <BuyerDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* 3. ROLE: LOGISTICS PARTNER & DRIVER PROTECTED ROUTES */}
              <Route 
                path="/logistics/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['logistics']}>
                    <LogisticsDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* SUPERUSER: ADMIN ROUTE */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </ErrorBoundary>
        </main>
        <KisanCopilot />
        <Footer />
      </div>
  );
}

export default App;

