import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './CarrierLayout.module.css';
import NotificationsTray from '../pages/carrier/NotificationsTray';

const CarrierLayout: React.FC = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  return (
    <div className={styles.layout}>
      <nav className={styles.sidebar}>
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
          to="/carrier/settings" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Settings
        </NavLink>
      </nav>
      <main className={styles.main}>
        <div className={styles.topRightTray}>
          <button className={styles.bellButton} onClick={() => setShowNotifications(v => !v)}>
            <span role="img" aria-label="Notifications">🔔</span>
          </button>
          {showNotifications && <NotificationsTray onClose={() => setShowNotifications(false)} />}
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default CarrierLayout; 