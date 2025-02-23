import React, { useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import styles from './AvailableLoads.module.css';

interface Load {
  id: string;
  position: google.maps.LatLngLiteral;
  title: string;
  pickup: string;
  delivery: string;
  rate: number;
  distance: string;
  weight: string;
  dimensions: string;
}

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795
};

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const AvailableLoads: React.FC = () => {
  const [viewType, setViewType] = useState<'map' | 'list'>('map');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key is missing');
    return <div>Error loading map</div>;
  }

  const loads: Load[] = [
    {
      id: '1',
      position: { lat: 41.8781, lng: -87.6298 },
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
      position: { lat: 34.0522, lng: -118.2437 },
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
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

      {viewType === 'map' ? (
        <div className={styles.mapSection}>
          <div className={styles.mapContainer}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={4}
              options={{
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              }}
            >
              {loads.map((load) => (
                <Marker
                  key={load.id}
                  position={load.position}
                  title={load.title}
                  onClick={() => setSelectedLoad(load)}
                />
              ))}
            </GoogleMap>
          </div>
          {selectedLoad && (
            <div className={styles.loadDetails}>
              <h2>{selectedLoad.title}</h2>
              <div className={styles.detailsGrid}>
                <div>
                  <strong>Pickup:</strong> {selectedLoad.pickup}
                </div>
                <div>
                  <strong>Delivery:</strong> {selectedLoad.delivery}
                </div>
                <div>
                  <strong>Rate:</strong> ${selectedLoad.rate}
                </div>
                <div>
                  <strong>Distance:</strong> {selectedLoad.distance}
                </div>
                <div>
                  <strong>Weight:</strong> {selectedLoad.weight}
                </div>
                <div>
                  <strong>Dimensions:</strong> {selectedLoad.dimensions}
                </div>
              </div>
              <button className={styles.bookButton}>Book Load</button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.listView}>
          {loads.map((load) => (
            <div key={load.id} className={styles.loadCard}>
              <h3>{load.title}</h3>
              <div className={styles.loadInfo}>
                <div>
                  <strong>Pickup:</strong> {load.pickup}
                </div>
                <div>
                  <strong>Delivery:</strong> {load.delivery}
                </div>
                <div>
                  <strong>Rate:</strong> ${load.rate}
                </div>
                <div>
                  <strong>Distance:</strong> {load.distance}
                </div>
                <div>
                  <strong>Weight:</strong> {load.weight}
                </div>
                <div>
                  <strong>Dimensions:</strong> {load.dimensions}
                </div>
              </div>
              <button className={styles.bookButton}>Book Load</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableLoads; 