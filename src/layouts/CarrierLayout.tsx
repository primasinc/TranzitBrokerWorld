import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './CarrierLayout.module.css';
import NotificationsTray, { useUnreadNotifications } from '../pages/carrier/NotificationsTray';

const CarrierLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();

  return (
    <div className={styles.layout}>
      {/* Sidebar overlay for mobile */}
      {isMenuOpen && <div className={styles.sidebarOverlay} onClick={() => setIsMenuOpen(false)} />}
      <nav className={styles.sidebar + (isMenuOpen ? ' ' + styles.sidebarOpen : '')}>
        <div className={styles.logo}>
          {/* Add your logo here */}
          <h2>Carrier Portal</h2>
        </div>
        <NavLink 
          to="/carrier/home" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Home
        </NavLink>
        <NavLink 
          to="/carrier/available-loads" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Available Loads
        </NavLink>
        <NavLink 
          to="/carrier/my-loads" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          My Loads
        </NavLink>
        <NavLink 
          to="/carrier/documents" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Documents
        </NavLink>
        <NavLink 
          to="/carrier/payments" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Payments
        </NavLink>
        <NavLink 
          to="/carrier/partners" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Shipper Partners
        </NavLink>
        <NavLink 
          to="/carrier/settings" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
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