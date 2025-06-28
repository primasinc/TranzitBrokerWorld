import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import styles from './ShipperLayout.module.css';
import NotificationsTray, { useUnreadNotifications } from '../pages/carrier/NotificationsTray';

const ShipperLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const unreadCount = useUnreadNotifications();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      {/* Mobile menu button */}
      <button 
        className={styles.mobileMenuButton}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle menu"
      >
        {isSidebarOpen ? (
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
      {isSidebarOpen && <div className={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)} />}
      <nav className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <h2>Shipper Portal</h2>
        </div>
        <NavLink 
          to="/shipper/dashboard" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsSidebarOpen(false)}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/shipper/updates" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsSidebarOpen(false)}
        >
          Driver Updates
        </NavLink>
        <NavLink 
          to="/shipper/schedule" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsSidebarOpen(false)}
        >
          Shipping Schedule
        </NavLink>
        <NavLink 
          to="/shipper/orders" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsSidebarOpen(false)}
        >
          Purchase Orders
        </NavLink>
        <NavLink 
          to="/shipper/partners" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsSidebarOpen(false)}
        >
          Carrier Partners
        </NavLink>
        <NavLink 
          to="/shipper/invoices" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsSidebarOpen(false)}
        >
          Pay Invoices
        </NavLink>
        <NavLink 
          to="/shipper/archive" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsSidebarOpen(false)}
        >
          Shipment Archive
        </NavLink>
        <NavLink 
          to="/shipper/directory" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsSidebarOpen(false)}
        >
          Carrier Directory
        </NavLink>
        <NavLink 
          to="/shipper/settings" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
          onClick={() => setIsSidebarOpen(false)}
        >
          Settings
        </NavLink>
      </nav>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Shipper Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <button 
              className={styles.bellButton}
              onClick={() => setShowNotifications(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative' }}
            >
              <span role="img" aria-label="Notifications">🔔</span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'red',
                  color: 'white',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  zIndex: 10
                }}>{unreadCount}</span>
              )}
            </button>
            {showNotifications && <NotificationsTray onClose={() => setShowNotifications(false)} />}
            <div className={styles.menuContainer}>
              <button 
                className={styles.hamburgerButton}
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              >
                <div className={styles.hamburgerIcon}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
              {isAccountMenuOpen && (
                <div className={styles.dropdownMenu}>
                  <button onClick={() => navigate('/shipper/profile')}>Account</button>
                  <button 
                    onClick={handleLogout}
                    className={styles.logoutButton}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className={styles.pageContent}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ShipperLayout; 