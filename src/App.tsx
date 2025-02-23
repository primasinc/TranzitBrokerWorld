import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import CarrierLayout from './layouts/CarrierLayout';

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

// Carrier Pages
import HomeFeed from './pages/carrier/HomeFeed';
import LoadDetails from './pages/carrier/LoadDetails';
import CarrierLoads from './pages/carrier/Loads';
import CarrierSettings from './pages/carrier/Settings';
import CarrierProfile from './pages/carrier/Profile';
import AvailableLoads from './pages/carrier/AvailableLoads';
import MyLoads from './pages/carrier/MyLoads';
import Documents from './pages/carrier/Documents';
import Payments from './pages/carrier/Payments';
import Settings from './pages/carrier/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Shipper Routes */}
        <Route path="/shipper" element={<PrivateRoute userType="shipper" />}>
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
        </Route>

        {/* Carrier Routes */}
        <Route path="/carrier" element={<PrivateRoute userType="carrier" />}>
          <Route element={<CarrierLayout />}>
            <Route index element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<HomeFeed />} />
            <Route path="available-loads" element={<AvailableLoads />} />
            <Route path="my-loads" element={<MyLoads />} />
            <Route path="documents" element={<Documents />} />
            <Route path="payments" element={<Payments />} />
            <Route path="settings" element={<Settings />} />
            <Route path="loads" element={<CarrierLoads />} />
            <Route path="loads/:id" element={<LoadDetails />} />
            <Route path="profile" element={<CarrierProfile />} />
          </Route>
        </Route>

        {/* Shared Routes */}
        <Route path="/profile/:id" element={<ViewProfile />} />

        {/* Catch-all redirect */}
        <Route path="/" element={<Navigate to="/carrier/dashboard" />} />
        <Route path="*" element={<Navigate to="/carrier/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
