import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './CarrierLayout.module.css';
import NotificationsTray, { useUnreadNotifications } from '../pages/carrier/NotificationsTray';
import { FiMenu, FiX } from 'react-icons/fi';

const CarrierLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();

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
    </div>
  );
};

export default CarrierLayout; 