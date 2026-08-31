import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

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
    <AuthProvider>
      <div className="min-h-screen flex flex-col font-sans bg-gray-50">
        <Toaster position="top-right" />
        <Navbar />
        <main className="flex-grow">
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
        </main>
        <KisanCopilot />
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
