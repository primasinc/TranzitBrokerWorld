import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import styles from './ShipperLayout.module.css';

const ShipperLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>
          <h2>Shipper Portal</h2>
        </div>
        <NavLink 
          to="/shipper/dashboard" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/shipper/updates" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Driver Updates
        </NavLink>
        <NavLink 
          to="/shipper/schedule" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Shipping Schedule
        </NavLink>
        <NavLink 
          to="/shipper/orders" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Purchase Orders
        </NavLink>
        <NavLink 
          to="/shipper/partners" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Carrier Partners
        </NavLink>
        <NavLink 
          to="/shipper/invoices" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Pay Invoices
        </NavLink>
        <NavLink 
          to="/shipper/archive" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Shipment Archive
        </NavLink>
        <NavLink 
          to="/shipper/directory" 
          className={({ isActive }) => isActive ? styles.activeLink : styles.link}
        >
          Carrier Directory
        </NavLink>
      </nav>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Shipper Dashboard</h1>
          <div className={styles.menuContainer}>
            <button 
              className={styles.hamburgerButton}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className={styles.hamburgerIcon}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
            
            {isMenuOpen && (
              <div className={styles.dropdownMenu}>
                <button onClick={() => navigate('/shipper/profile')}>Account</button>
                <button onClick={() => navigate('/shipper/settings')}>Settings</button>
                <button 
                  onClick={handleLogout}
                  className={styles.logoutButton}
                >
                  Logout
                </button>
              </div>
            )}
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