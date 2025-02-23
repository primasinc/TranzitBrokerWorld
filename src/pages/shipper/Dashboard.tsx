import React, { useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import styles from './Dashboard.module.css';

interface Shipment {
  id: string;
  carrier: string;
  origin: string;
  destination: string;
  status: 'In Transit' | 'Scheduled' | 'Delivered' | 'Delayed';
  eta: string;
  cost: number;
  position: google.maps.LatLngLiteral;
}

const ShipperDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const shipments: Shipment[] = [
    {
      id: 'SH001',
      carrier: 'ABC Trucking',
      origin: 'Chicago, IL',
      destination: 'New York, NY',
      status: 'In Transit',
      eta: '2024-02-25 14:00',
      cost: 2500,
      position: { lat: 41.8781, lng: -87.6298 }
    },
    // Add more shipments...
  ];

  const metrics = {
    activeShipments: 12,
    delayedShipments: 2,
    onTimeDelivery: 95,
    averageCost: 2300
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <h3>Active Shipments</h3>
          <div className={styles.metricValue}>{metrics.activeShipments}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>Delayed Shipments</h3>
          <div className={styles.metricValue}>{metrics.delayedShipments}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>On-Time Delivery</h3>
          <div className={styles.metricValue}>{metrics.onTimeDelivery}%</div>
        </div>
        <div className={styles.metricCard}>
          <h3>Average Cost/Load</h3>
          <div className={styles.metricValue}>${metrics.averageCost}</div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.shipmentTracking}>
          <h2>Active Shipments</h2>
          <div className={styles.mapContainer}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '400px' }}
              center={{ lat: 39.8283, lng: -98.5795 }}
              zoom={4}
            >
              {shipments.map((shipment) => (
                <Marker 
                  key={shipment.id}
                  position={shipment.position}
                  title={shipment.carrier}
                />
              ))}
            </GoogleMap>
          </div>
        </div>

        <div className={styles.recentShipments}>
          <div className={styles.sectionHeader}>
            <h2>Recent Shipments</h2>
            <div className={styles.periodSelector}>
              <button 
                className={selectedPeriod === 'week' ? styles.active : ''}
                onClick={() => setSelectedPeriod('week')}
              >
                Week
              </button>
              <button 
                className={selectedPeriod === 'month' ? styles.active : ''}
                onClick={() => setSelectedPeriod('month')}
              >
                Month
              </button>
            </div>
          </div>

          <div className={styles.shipmentList}>
            {shipments.map(shipment => (
              <div key={shipment.id} className={styles.shipmentCard}>
                <div className={styles.shipmentHeader}>
                  <h3>{shipment.carrier}</h3>
                  <span className={`${styles.status} ${styles[shipment.status.toLowerCase()]}`}>
                    {shipment.status}
                  </span>
                </div>
                <div className={styles.shipmentDetails}>
                  <div>
                    <label>From:</label>
                    <span>{shipment.origin}</span>
                  </div>
                  <div>
                    <label>To:</label>
                    <span>{shipment.destination}</span>
                  </div>
                  <div>
                    <label>ETA:</label>
                    <span>{shipment.eta}</span>
                  </div>
                  <div>
                    <label>Cost:</label>
                    <span>${shipment.cost}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipperDashboard;