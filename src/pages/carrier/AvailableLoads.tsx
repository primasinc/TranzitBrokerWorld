import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import styles from './AvailableLoads.module.css';

interface Load {
  id: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupDate: string;
  deliveryDate: string;
  weight: string;
  rate: number;
  distance: string;
  equipment: string;
  coordinates: {
    pickup: google.maps.LatLngLiteral;
    delivery: google.maps.LatLngLiteral;
  };
}

const AvailableLoads: React.FC = () => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

  const loads: Load[] = [
    {
      id: "L001",
      pickupLocation: "Chicago, IL",
      deliveryLocation: "New York, NY",
      pickupDate: "2024-03-01",
      deliveryDate: "2024-03-03",
      weight: "15,000 lbs",
      rate: 2500.00,
      distance: "789 miles",
      equipment: "53' Dry Van",
      coordinates: {
        pickup: { lat: 41.8781, lng: -87.6298 },
        delivery: { lat: 40.7128, lng: -74.0060 }
      }
    },
    // Add more loads
  ];

  const mapContainerStyle = {
    width: '100%',
    height: '600px'
  };

  const defaultCenter = {
    lat: 39.8283,
    lng: -98.5795
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Available Loads</h1>
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.toggleButton} ${viewMode === 'map' ? styles.active : ''}`}
            onClick={() => setViewMode('map')}
          >
            Map View
          </button>
          <button 
            className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by location..."
          className={styles.searchInput}
        />
        <select className={styles.filterSelect}>
          <option value="">Equipment Type</option>
          <option value="dryvan">Dry Van</option>
          <option value="reefer">Reefer</option>
          <option value="flatbed">Flatbed</option>
        </select>
        <select className={styles.filterSelect}>
          <option value="">Distance</option>
          <option value="local">Local (&lt; 100 miles)</option>
          <option value="regional">Regional (100-500 miles)</option>
          <option value="longhaul">Long Haul (500+ miles)</option>
        </select>
      </div>

      {viewMode === 'map' ? (
        <div className={styles.mapView}>
          <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY!}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={4}
            >
              {loads.map((load) => (
                <React.Fragment key={load.id}>
                  <Marker
                    position={load.coordinates.pickup}
                    title={`Pickup: ${load.pickupLocation}`}
                    onClick={() => setSelectedLoad(load)}
                  />
                  <Marker
                    position={load.coordinates.delivery}
                    title={`Delivery: ${load.deliveryLocation}`}
                    onClick={() => setSelectedLoad(load)}
                  />
                </React.Fragment>
              ))}
            </GoogleMap>
          </LoadScript>
          
          {selectedLoad && (
            <div className={styles.loadDetails}>
              <h3>Load Details</h3>
              <p>From: {selectedLoad.pickupLocation}</p>
              <p>To: {selectedLoad.deliveryLocation}</p>
              <p>Rate: ${selectedLoad.rate.toFixed(2)}</p>
              <p>Distance: {selectedLoad.distance}</p>
              <button className={styles.bookButton}>Book Load</button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.listView}>
          {loads.map((load) => (
            <div key={load.id} className={styles.loadCard}>
              <div className={styles.loadHeader}>
                <h3>{load.pickupLocation} → {load.deliveryLocation}</h3>
                <span className={styles.rate}>${load.rate.toFixed(2)}</span>
              </div>
              
              <div className={styles.loadInfo}>
                <div>
                  <label>Pickup:</label>
                  <span>{load.pickupDate}</span>
                </div>
                <div>
                  <label>Delivery:</label>
                  <span>{load.deliveryDate}</span>
                </div>
                <div>
                  <label>Distance:</label>
                  <span>{load.distance}</span>
                </div>
                <div>
                  <label>Equipment:</label>
                  <span>{load.equipment}</span>
                </div>
                <div>
                  <label>Weight:</label>
                  <span>{load.weight}</span>
                </div>
              </div>

              <div className={styles.loadActions}>
                <button className={styles.viewButton}>View Details</button>
                <button className={styles.bookButton}>Book Load</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableLoads; 