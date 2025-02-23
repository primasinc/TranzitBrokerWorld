import React, { useState } from 'react';
import styles from './HomeFeed.module.css';

const HomeFeed: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', path: '/carrier/dashboard' },
    { icon: '🚚', label: 'Available Loads', path: '/carrier/loads/available' },
    { icon: '📅', label: 'Scheduled Loads', path: '/carrier/loads/scheduled' },
    { icon: '💰', label: 'Pay/Invoices', path: '/carrier/invoices' },
    { icon: '🏦', label: 'Factoring', path: '/carrier/factoring' },
    { icon: '📘', label: 'Shipper Directory', path: '/carrier/shippers' },
    { icon: '⛽', label: 'Fuel', path: '/carrier/fuel' },
    { icon: '📚', label: 'Resources', path: '/carrier/resources' },
  ];

  const currentLoad = {
    poNumber: 'PO-12345',
    shipperName: 'ABC Logistics',
    contact: 'John Doe | 555-0123',
    pickup: {
      location: '123 Pickup St, City, ST',
      time: '2024-02-23 14:00',
    },
    delivery: {
      location: '456 Delivery Ave, City, ST',
      time: '2024-02-24 10:00',
    },
    product: {
      description: 'Electronics',
      size: '48" x 48" x 48"',
      weight: '2000 lbs',
    },
    notes: 'Handle with care. Liftgate required.',
  };

  return (
    <div className={styles.dashboard}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {sidebarItems.map((item) => (
          <div key={item.path} className={styles.sidebarItem}>
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1>Carrier Dashboard</h1>
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
                <button>Account</button>
                <button>Settings</button>
                <button>Logout</button>
              </div>
            )}
          </div>
        </header>

        <div className={styles.content}>
          {/* Current Load Information */}
          <section className={styles.currentLoad}>
            <h2>Current Load Information</h2>
            <div className={styles.loadDetails}>
              <div className={styles.loadInfo}>
                <p><strong>PO Number:</strong> {currentLoad.poNumber}</p>
                <p><strong>Shipper Name:</strong> {currentLoad.shipperName}</p>
                <p><strong>Contact Information:</strong> {currentLoad.contact}</p>
              </div>
              
              <div className={styles.locations}>
                <div>
                  <h3>Pickup Location</h3>
                  <p>{currentLoad.pickup.location}</p>
                  <p>{currentLoad.pickup.time}</p>
                </div>
                <div>
                  <h3>Delivery Location</h3>
                  <p>{currentLoad.delivery.location}</p>
                  <p>{currentLoad.delivery.time}</p>
                </div>
              </div>

              <div className={styles.productInfo}>
                <h3>Product Description</h3>
                <p>{currentLoad.product.description}</p>
                <div className={styles.dimensions}>
                  <p><strong>Size:</strong> {currentLoad.product.size}</p>
                  <p><strong>Weight:</strong> {currentLoad.product.weight}</p>
                </div>
                <p><strong>Notes:</strong> {currentLoad.notes}</p>
              </div>
            </div>
          </section>

          {/* Available Loads */}
          <section className={styles.availableLoads}>
            <h2>Map or List of available Loads</h2>
            <div className={styles.viewToggle}>
              <button className={styles.active}>Map</button>
              <button>List</button>
            </div>
            
            <div className={styles.filters}>
              <h3>Filter By:</h3>
              <div className={styles.filterOptions}>
                <button>City</button>
                <button>State</button>
                <button>Length</button>
                <button>Weight</button>
                <button>LTL</button>
                <button>TL</button>
                <button>Vehicle Type</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default HomeFeed; 