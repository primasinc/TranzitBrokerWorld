import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

interface Shipment {
  poNumber: string;
  loadingDate: string;
  carrierOnLoad: string;
  pickLocation: string;
  deliveryLocation: string;
  deliveryDate: string;
  productDescription: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', path: '/shipper/dashboard' },
    { icon: '🔄', label: 'Driver Updates', path: '/shipper/updates' },
    { icon: '📅', label: 'Shipping Schedule', path: '/shipper/schedule' },
    { icon: '📝', label: 'Purchase Orders', path: '/shipper/orders' },
    { icon: '🤝', label: 'Carrier Partners', path: '/shipper/partners' },
    { icon: '💰', label: 'Pay/Invoices', path: '/shipper/invoices' },
    { icon: '📦', label: 'Shipment Archive', path: '/shipper/archive' },
    { icon: '📘', label: 'Carrier Directory', path: '/shipper/directory' },
  ];

  // Sample data - replace with actual data later
  const shipments: Shipment[] = [
    {
      poNumber: 'PO-12345',
      loadingDate: '2024-02-23',
      carrierOnLoad: 'ABC Trucking',
      pickLocation: 'Chicago, IL',
      deliveryLocation: 'Detroit, MI',
      deliveryDate: '2024-02-24',
      productDescription: 'Electronics',
      status: 'In Transit'
    },
    // Add more sample shipments as needed
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className={styles.dashboard}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {sidebarItems.map((item) => (
          <div 
            key={item.path} 
            className={styles.sidebarItem}
            onClick={() => navigate(item.path)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
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
                <button onClick={() => navigate('/shipper/account')}>My Account</button>
                <button onClick={() => navigate('/shipper/settings')}>Settings</button>
                <button 
                  onClick={handleLogout}
                  className={styles.logoutButton}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        <section className={styles.shipmentsSection}>
          <h2>Live Status of Current Shipments</h2>
          <div className={styles.tableContainer}>
            <table className={styles.shipmentsTable}>
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Loading Date</th>
                  <th>Carrier On Load (COL)</th>
                  <th>Pick Location</th>
                  <th>Delivery Location</th>
                  <th>Delivery Date</th>
                  <th>Product Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.poNumber}>
                    <td>{shipment.poNumber}</td>
                    <td>{shipment.loadingDate}</td>
                    <td>{shipment.carrierOnLoad}</td>
                    <td>{shipment.pickLocation}</td>
                    <td>{shipment.deliveryLocation}</td>
                    <td>{shipment.deliveryDate}</td>
                    <td>{shipment.productDescription}</td>
                    <td>{shipment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;