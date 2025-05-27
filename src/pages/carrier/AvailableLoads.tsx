import React, { useState } from 'react';
import MapboxMap from '../../components/common/MapboxMap';
import styles from './AvailableLoads.module.css';
import { useNavigate } from 'react-router-dom';

interface Load {
  id: string;
  position: [number, number];
  title: string;
  pickup: string;
  delivery: string;
  rate: number;
  distance: string;
  weight: string;
  dimensions: string;
}

const AvailableLoads: React.FC = () => {
  const [viewType, setViewType] = useState<'map' | 'list'>('map');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const loads: Load[] = [
    {
      id: '1',
      position: [-87.6298, 41.8781], // [longitude, latitude] for Mapbox
      title: 'Chicago to New York',
      pickup: 'Chicago, IL',
      delivery: 'New York, NY',
      rate: 3500,
      distance: '787 miles',
      weight: '15,000 lbs',
      dimensions: '53\' Trailer'
    },
    {
      id: '2',
      position: [-118.2437, 34.0522], // [longitude, latitude] for Mapbox
      title: 'LA to San Francisco',
      pickup: 'Los Angeles, CA',
      delivery: 'San Francisco, CA',
      rate: 1800,
      distance: '383 miles',
      weight: '10,000 lbs',
      dimensions: '48\' Trailer'
    },
    // Add more sample loads as needed
  ];

  const handleLogout = () => navigate('/login');
  const handleProfile = () => navigate('/carrier/profile');
  const handleSettings = () => navigate('/carrier/settings');

  const renderLoadCard = (load: Load) => (
    <div 
      key={load.id} 
      className={`${styles.loadCard} ${selectedLoad?.id === load.id ? styles.selected : ''}`}
      onClick={() => setSelectedLoad(load)}
    >
      <h3>{load.title}</h3>
      <div className={styles.loadDetails}>
        <p><strong>Pickup:</strong> {load.pickup}</p>
        <p><strong>Delivery:</strong> {load.delivery}</p>
        <p><strong>Rate:</strong> ${load.rate.toLocaleString()}</p>
        <p><strong>Distance:</strong> {load.distance}</p>
        <p><strong>Weight:</strong> {load.weight}</p>
        <p><strong>Dimensions:</strong> {load.dimensions}</p>
      </div>
      <button className={styles.detailsButton}>View Details</button>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerCard}>
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <h1>Available Loads</h1>
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
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.bellButton}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative' }}
              tabIndex={0}
              aria-label="Notifications"
            >
              <span role="img" aria-label="Notifications">🔔</span>
            </button>
            <div className={styles.menuContainer}>
              <button 
                className={styles.hamburgerButton}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                <div className={styles.hamburgerIcon}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
              {isMenuOpen && (
                <div className={styles.dropdownMenu}>
                  <button onClick={handleProfile}>Account</button>
                  <button onClick={handleSettings}>Settings</button>
                  <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewType === 'map' ? (
        <div className={styles.mapSection}>
          <div className={styles.mapContainer}>
            <MapboxMap
              center={[-98.5795, 39.8283]} // US center
              zoom={4}
              markers={loads.map(load => ({
                id: load.id,
                position: load.position,
                type: 'shipper',
                onClick: () => setSelectedLoad(load)
              }))}
            />
          </div>
          {selectedLoad && (
            <div className={styles.selectedLoadDetails}>
              {renderLoadCard(selectedLoad)}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.listView}>
          {loads.map(renderLoadCard)}
        </div>
      )}
    </div>
  );
};

export default AvailableLoads; 