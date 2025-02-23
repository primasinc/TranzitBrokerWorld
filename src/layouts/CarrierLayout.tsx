import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './CarrierLayout.module.css';

const CarrierLayout: React.FC = () => {
  return (
    <div className={styles.layout}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>
          {/* Add your logo here */}
          <h2>Carrier Portal</h2>
        </div>
        <NavLink 
          to="/carrier/dashboard" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Dashboard
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
        <Outlet />
      </main>
    </div>
  );
};

export default CarrierLayout; 