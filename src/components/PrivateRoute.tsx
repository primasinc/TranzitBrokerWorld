import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface PrivateRouteProps {
  userType: 'carrier' | 'shipper';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ userType }) => {
  // TODO: Add actual authentication check
  const isAuthenticated = true; // Temporary, replace with real auth check

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
};

export default PrivateRoute; 