import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface PrivateRouteProps {
  userType: 'shipper' | 'carrier';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ userType }) => {
  // TODO: Add actual authentication check
  const isAuthenticated = true; // For testing purposes
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute; 