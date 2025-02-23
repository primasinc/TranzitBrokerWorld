import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import styles from './HomeFeed.module.css';

interface Load {
  id: string;
  position: google.maps.LatLngLiteral;
  title: string;
  pickup: string;
  delivery: string;
}

const defaultCenter = {
  lat: 39.8283,  // Center of US roughly
  lng: -98.5795
};

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const HomeFeed: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewType, setViewType] = useState<'map' | 'list'>('map');
  const navigate = useNavigate();

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

  // Sample loads data
  const loads: Load[] = [
    {
      id: '1',
      position: { lat: 41.8781, lng: -87.6298 }, // Chicago
      title: 'Chicago to New York',
      pickup: 'Chicago, IL',
      delivery: 'New York, NY'
    },
    {
      id: '2',
      position: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
      title: 'LA to San Francisco',
      pickup: 'Los Angeles, CA',
      delivery: 'San Francisco, CA'
    },
    // Add more sample loads as needed
  ];

  const handleLogout = () => {
    // TODO: Add actual logout logic here when we implement Firebase
    // For now, just navigate to login
    navigate('/login');
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
                <button onClick={() => navigate('/carrier/profile')}>Account</button>
                <button onClick={() => navigate('/carrier/settings')}>Settings</button>
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
            <h2>Available Loads</h2>
            <div className={styles.viewToggle}>
              <button 
                className={`${styles.toggleButton} ${viewType === 'map' ? styles.active : ''}`}
                onClick={() => setViewType('map')}
              >
                Map View
              </button>
              <button 
                className={`${styles.toggleButton} ${viewType === 'list' ? styles.active : ''}`}
                onClick={() => setViewType('list')}
              >
                List View
              </button>
            </div>

            {viewType === 'map' ? (
              <div className={styles.mapContainer}>
                <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY!}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={defaultCenter}
                    zoom={4}
                  >
                    {loads.map((load) => (
                      <Marker
                        key={load.id}
                        position={load.position}
                        title={load.title}
                        onClick={() => {
                          // Handle click on marker
                          console.log('Load selected:', load);
                        }}
                      />
                    ))}
                  </GoogleMap>
                </LoadScript>
              </div>
            ) : (
              <div className={styles.listView}>
                {loads.map((load) => (
                  <div key={load.id} className={styles.loadCard}>
                    <h3>{load.title}</h3>
                    <p>Pickup: {load.pickup}</p>
                    <p>Delivery: {load.delivery}</p>
                    <button onClick={() => console.log('View details:', load)}>
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default HomeFeed; 