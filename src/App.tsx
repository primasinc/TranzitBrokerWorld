import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
// import Layout from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import CarrierLayout from './layouts/CarrierLayout';
import ShipperLayout from './layouts/ShipperLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

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

// Carrier Pages
import HomeFeed from './pages/carrier/HomeFeed';
import LoadDetails from './pages/carrier/LoadDetails';
import AvailableLoads from './pages/carrier/AvailableLoads';
import MyLoads from './pages/carrier/MyLoads';
import Documents from './pages/carrier/Documents';
import Payments from './pages/carrier/Payments';
import Settings from './pages/carrier/Settings';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <LoadScript 
        googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY!}
        libraries={['marker']}
      >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/carrier/home" replace />} />
            
            {/* Carrier Routes */}
            <Route path="/carrier" element={<CarrierLayout />}>
              <Route index element={<Navigate to="/carrier/home" replace />} />
              <Route path="home" element={<HomeFeed />} />
              <Route path="available-loads" element={<AvailableLoads />} />
              <Route path="my-loads" element={<MyLoads />} />
              <Route path="loads/:id" element={<LoadDetails />} />
              <Route path="documents" element={<Documents />} />
              <Route path="payments" element={<Payments />} />
              <Route path="settings" element={<Settings />} />
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
              <Route path="carrier-partners/:id" element={<CarrierDetails />} />
            </Route>

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Shared Routes */}
            <Route path="/profile/:id" element={<ViewProfile />} />
          </Routes>
        </BrowserRouter>
      </LoadScript>
    </AuthProvider>
  );
}

export default App;
