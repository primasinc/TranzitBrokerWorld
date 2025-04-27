import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from '../../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const PrivateRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    // Add a loading state while checking authentication
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute; 