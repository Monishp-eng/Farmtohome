import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * ProtectedRoute component for 3-Tier Role Authorization:
 * 1. 'farmer' (Farmers, FPOs)
 * 2. 'consumer' (Individual Consumers, Bulk Wholesale Buyers)
 * 3. 'logistics' (Fleet Drivers, Transport Partners)
 * (Superuser 'admin' has universal override)
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm font-bold text-gray-500">Checking authorization...</div>;
  }

  if (!isAuthenticated || !user) {
    toast.error('Please log in to access this page');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = (user.role || '').toLowerCase();
  const normalizedRole = 
    (userRole === 'fpo') ? 'farmer' :
    (userRole === 'buyer') ? 'consumer' :
    (userRole === 'driver') ? 'logistics' : userRole;

  const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

  const hasAccess = 
    userRole === 'admin' || 
    normalizedAllowed.includes(userRole) || 
    normalizedAllowed.includes(normalizedRole);

  if (!hasAccess) {
    const roleLabels = {
      farmer: 'Farmers & Producers',
      consumer: 'Consumers & Bulk Buyers',
      logistics: 'Logistics Partners',
      admin: 'Administrators'
    };

    const targetLabel = allowedRoles.map(r => roleLabels[r] || r).join(' or ');
    toast.error(`Access Restricted: This page is only accessible by ${targetLabel}`);

    // Redirect to user's natural workspace
    if (normalizedRole === 'farmer') return <Navigate to="/farmer/dashboard" replace />;
    if (normalizedRole === 'logistics') return <Navigate to="/logistics/dashboard" replace />;
    if (normalizedRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/marketplace" replace />;
  }

  return children;
};

export default ProtectedRoute;
