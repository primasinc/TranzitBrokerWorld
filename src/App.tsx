import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
// import { LoadScript } from '@react-google-maps/api';
// import Layout from './components/Layout';
// import PrivateRoute from './components/PrivateRoute';  // Comment out or remove this line
import CarrierLayout from './layouts/CarrierLayout';
import ShipperLayout from './layouts/ShipperLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Test Pages
import TestKonexial from './pages/TestKonexial';
import TestCurrentLoad from './pages/TestCurrentLoad';
import TestDriverFlow from './pages/TestDriverFlow';

// Shipper Pages
import ShipperDashboard from './pages/shipper/Dashboard';
import LoadsOverview from './pages/shipper/LoadsOverview';
import NewLoad from './pages/shipper/NewLoad';
import ViewPeople from './pages/shipper/ViewPeople';
import ViewProfile from './pages/shared/ViewProfile';
import ActiveSearches from './pages/shipper/ActiveSearches';
import InProgress from './pages/shipper/InProgress';
import Completed from './pages/shipper/Completed';
import DriverUpdates from './pages/shipper/DriverUpdates';
import ShippingSchedule from './pages/shipper/ShippingSchedule';
import PurchaseOrders from './pages/shipper/PurchaseOrders';
import CarrierPartners from './pages/shipper/CarrierPartners';
import PayInvoices from './pages/shipper/PayInvoices';
import ShipmentArchive from './pages/shipper/ShipmentArchive';
import CarrierDirectory from './pages/shipper/CarrierDirectory';
import CarrierDetails from './pages/shipper/CarrierDetails';
import { TestPurchaseOrder } from './pages/shipper/TestPurchaseOrder';
import ShipperProfilePage from './pages/shipper/Profile';
import ShipperSettings from './pages/shipper/Settings';

// Carrier Pages
import HomeFeed from './pages/carrier/HomeFeed';
import LoadDetails from './pages/carrier/LoadDetails';
import AvailableLoads from './pages/carrier/AvailableLoads';
import MyLoads from './pages/carrier/MyLoads';
import Documents from './pages/carrier/Documents';
import Payments from './pages/carrier/Payments';
import Settings from './pages/carrier/Settings';
import CarrierProvider from './context/CarrierContext';
import CarrierProfilePage from './pages/carrier/Profile';
import Notifications from './pages/carrier/Notifications';
import ShipperPartners from './pages/carrier/ShipperPartners';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ShipmentsProvider } from './context/ShipmentsContext';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import TechnologyPage from './pages/TechnologyPage';
import AboutPage from './pages/AboutPage';
import OAuthCallback from './pages/OAuthCallback';
import { LocationProvider } from './contexts/LocationContext';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/common/AdminRoute';
import AdminSetup from './pages/AdminSetup';
import AdminManagement from './pages/AdminManagement';
import AdminAccess from './pages/AdminAccess';
import MonitoringDashboard from './components/admin/MonitoringDashboard';
import FeatureFlagManager from './components/admin/FeatureFlagManager';
import CacheManager from './components/admin/CacheManager';
import RateLimitManager from './components/admin/RateLimitManager';
import SubscriptionTierManager from './components/admin/SubscriptionTierManager';
import AdvancedPerformanceDashboard from './components/admin/AdvancedPerformanceDashboard';
import './utils/quickAdminSetup';

const ViewProfileWrapper = () => {
  const { id } = useParams();
  return <ViewProfile id={id || ''} />;
};

// Simple location notification component
function LocationNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Try to get location silently
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus('available');
          // Don't show notification if location is working
        },
        (error) => {
          setLocationStatus('unavailable');
          setShowNotification(true);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes cache
        }
      );
    } else {
      setLocationStatus('unavailable');
      setShowNotification(true);
    }
  }, [user]);

  if (!showNotification || locationStatus !== 'unavailable') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      padding: '15px',
      maxWidth: '300px',
      zIndex: 1000,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ fontSize: '20px' }}>📍</div>
        <div>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>
            Location Not Available
          </h4>
          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
            The app is not tracking your location. You can still use all features.
          </p>
          <button
            onClick={() => setShowNotification(false)}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CarrierProvider>
        <ShipmentsProvider>
          <LocationProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/technology" element={<TechnologyPage />} />
                <Route path="/about" element={<AboutPage />} />
                
                {/* Test Routes */}
                <Route path="/test-konexial" element={<TestKonexial />} />
                <Route path="/test-current-load" element={<TestCurrentLoad />} />
                <Route path="/test-driver-flow" element={<TestDriverFlow />} />

                {/* Carrier Routes */}
                <Route path="/carrier" element={<CarrierLayout />}>
                  <Route index element={<Navigate to="home" />} />
                  <Route path="home" element={<HomeFeed />} />
                  <Route path="available-loads" element={<AvailableLoads />} />
                  <Route path="my-loads" element={<MyLoads />} />
                  <Route path="loads/:id" element={<LoadDetails />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="partners" element={<ShipperPartners />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<CarrierProfilePage />} />
                </Route>

                {/* Shipper Routes */}
                <Route path="/shipper" element={<ShipperLayout />}>
                  <Route index element={<Navigate to="dashboard" />} />
                  <Route path="dashboard" element={<ShipperDashboard />} />
                  <Route path="loads" element={<LoadsOverview />} />
                  <Route path="loads/new" element={<NewLoad />} />
                  <Route path="people" element={<ViewPeople />} />
                  <Route path="active-searches" element={<ActiveSearches />} />
                  <Route path="in-progress" element={<InProgress />} />
                  <Route path="completed" element={<Completed />} />
                  <Route path="updates" element={<DriverUpdates />} />
                  <Route path="schedule" element={<ShippingSchedule />} />
                  <Route path="orders" element={<PurchaseOrders />} />
                  <Route path="partners" element={<CarrierPartners />} />
                  <Route path="invoices" element={<PayInvoices />} />
                  <Route path="archive" element={<ShipmentArchive />} />
                  <Route path="directory" element={<CarrierDirectory />} />
                  <Route path="carrier-partners/:partnerId" element={<CarrierDetails />} />
                  <Route path="test-po" element={<TestPurchaseOrder />} />
                  <Route path="profile" element={<ShipperProfilePage />} />
                  <Route path="settings" element={<ShipperSettings />} />
                </Route>

                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
                <Route path="/admin-setup" element={<AdminSetup />} />
                <Route path="/admin-access" element={<AdminAccess />} />
                <Route path="/admin-management" element={
                  <AdminRoute>
                    <AdminManagement />
                  </AdminRoute>
                } />
                <Route path="/admin/monitoring" element={
                  <AdminRoute>
                    <MonitoringDashboard />
                  </AdminRoute>
                } />
                <Route path="/admin/feature-flags" element={
                  <AdminRoute>
                    <FeatureFlagManager />
                  </AdminRoute>
                } />
                <Route path="/admin/cache" element={
                  <AdminRoute>
                    <CacheManager />
                  </AdminRoute>
                } />
                <Route path="/admin/rate-limits" element={
                  <AdminRoute>
                    <RateLimitManager />
                  </AdminRoute>
                } />
                <Route path="/admin/subscription-tiers" element={
                  <AdminRoute>
                    <SubscriptionTierManager />
                  </AdminRoute>
                } />
                <Route path="/subscription-tiers" element={<SubscriptionTierManager />} />
                <Route path="/admin/advanced-performance" element={
                  <AdminRoute>
                    <AdvancedPerformanceDashboard />
                  </AdminRoute>
                } />

                {/* Shared Routes */}
                <Route path="/profile/:id" element={<ViewProfileWrapper />} />
                {/* OAuth Callback Route */}
                <Route path="/oauth/callback" element={<OAuthCallback />} />
              </Routes>
            </BrowserRouter>
          </LocationProvider>
        </ShipmentsProvider>
      </CarrierProvider>
      <LocationNotification />
    </AuthProvider>
  );
}

export default App;
