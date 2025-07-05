import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './CarrierLayout.module.css';
import NotificationsTray, { useUnreadNotifications } from '../pages/carrier/NotificationsTray';
import { FiMenu, FiX } from 'react-icons/fi';
import { useLocationContext } from '../contexts/LocationContext';

const CarrierLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();
  const { location, error: locationError, permissionState, retry } = useLocationContext();

  return (
    <div className={styles.layout}>
      {/* Mobile menu button */}
      <button 
        className={styles.mobileMenuButton}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMenuOpen ? (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" stroke="white" strokeWidth="2"/>
    <line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeWidth="2"/>
  </svg>
) : (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <line x1="3" y1="12" x2="21" y2="12" stroke="white" strokeWidth="2"/>
    <line x1="3" y1="6" x2="21" y2="6" stroke="white" strokeWidth="2"/>
    <line x1="3" y1="18" x2="21" y2="18" stroke="white" strokeWidth="2"/>
  </svg>
)}
      </button>

      {/* Sidebar overlay for mobile */}
      {isMenuOpen && <div className={styles.sidebarOverlay} onClick={() => setIsMenuOpen(false)} />}
      
      <nav className={`${styles.sidebar} ${isMenuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          {/* Add your logo here */}
          <h2>Carrier Portal</h2>
        </div>
        <NavLink 
          to="/carrier/home" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsMenuOpen(false)}
        >
          Home
        </NavLink>
        <NavLink 
          to="/carrier/available-loads" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsMenuOpen(false)}
        >
          Available Loads
        </NavLink>
        <NavLink 
          to="/carrier/my-loads" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsMenuOpen(false)}
        >
          My Loads
        </NavLink>
        <NavLink 
          to="/carrier/documents" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsMenuOpen(false)}
        >
          Documents
        </NavLink>
        <NavLink 
          to="/carrier/payments" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsMenuOpen(false)}
        >
          Payments
        </NavLink>
        <NavLink 
          to="/carrier/partners" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsMenuOpen(false)}
        >
          Shipper Partners
        </NavLink>
        <NavLink 
          to="/carrier/settings" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsMenuOpen(false)}
        >
          Settings
        </NavLink>
      </nav>
      
      <main className={styles.main}>
        {/* Layout header removed as requested. Only page-level header remains. */}
        <div className={styles.pageContent}>
          <Outlet />
        </div>
      </main>

      {/* Location authentication modal */}
      {!location && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.45)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 32,
            maxWidth: 400,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            textAlign: 'center',
          }}>
            <h2>Location Required</h2>
            <p style={{ marginBottom: 16 }}>
              This app requires your location to function. Please allow location access when prompted.<br/>
              {locationError && <span style={{ color: '#b00' }}>{locationError}</span>}
            </p>
            <button onClick={retry} style={{
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 24px',
              fontSize: 16,
              cursor: 'pointer',
            }}>Retry</button>
            <div style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
              If you previously denied location, please enable it in your browser settings and click Retry.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierLayout; 