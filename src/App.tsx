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
import { AuthProvider } from './contexts/AuthContext';
import { ShipmentsProvider } from './context/ShipmentsContext';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import TechnologyPage from './pages/TechnologyPage';
import AboutPage from './pages/AboutPage';
import OAuthCallback from './pages/OAuthCallback';

const ViewProfileWrapper = () => {
  const { id } = useParams();
  return <ViewProfile id={id || ''} />;
};

// Global LocationEnforcer wrapper
function LocationEnforcer({ children }: { children: React.ReactNode }) {
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    let watchId: number | null = null;
    function requestLocation() {
      setLocationError(null);
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setLocationGranted(true);
            setLocationError(null);
          },
          (error) => {
            setLocationGranted(false);
            setLocationError('Location access is required to use this app. Please enable location services and reload.');
          },
          { enableHighAccuracy: true }
        );
      } else {
        setLocationGranted(false);
        setLocationError('Geolocation is not supported by your browser.');
      }
    }
    requestLocation();
    return () => {
      if (watchId !== null && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  if (locationError || !locationGranted) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(255,255,255,0.98)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <h2>Location Required</h2>
        <p>{locationError || 'Location access is required to use this app.'}</p>
        <button
          style={{ padding: '12px 24px', fontSize: 18, marginTop: 24 }}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <CarrierProvider>
        <ShipmentsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/technology" element={<TechnologyPage />} />
              <Route path="/about" element={<AboutPage />} />
              
              {/* Test Routes */}
              <Route path="/test-konexial" element={<TestKonexial />} />

              {/* Carrier Routes */}
              <Route path="/carrier" element={<LocationEnforcer><CarrierLayout /></LocationEnforcer>}>
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
              <Route path="/shipper" element={<LocationEnforcer><ShipperLayout /></LocationEnforcer>}>
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
              </Route>

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Shared Routes */}
              <Route path="/profile/:id" element={<ViewProfileWrapper />} />
              {/* OAuth Callback Route */}
              <Route path="/oauth/callback" element={<OAuthCallback />} />
            </Routes>
          </BrowserRouter>
        </ShipmentsProvider>
      </CarrierProvider>
    </AuthProvider>
  );
}

export default App;
