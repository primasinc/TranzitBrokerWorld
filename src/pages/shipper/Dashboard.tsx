import React, { useState } from 'react';
import { GoogleMap, Marker, Circle } from '@react-google-maps/api';
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

interface AvailableCarrier {
  id: string;
  name: string;
  rating: number;
  equipmentType: string;
  distance: number; // in miles
  position: google.maps.LatLngLiteral;
  availableDate: string;
}

const ShipperDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [showActiveShipments, setShowActiveShipments] = useState(true);
  const [radiusInMiles, setRadiusInMiles] = useState(50);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral>({ lat: 41.8781, lng: -87.6298 }); // Default to Chicago

  // Mock shipments data
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
    {
      id: 'SH002',
      carrier: 'XYZ Logistics',
      origin: 'Dallas, TX',
      destination: 'Atlanta, GA',
      status: 'Scheduled',
      eta: '2024-02-26 10:00',
      cost: 1800,
      position: { lat: 32.7767, lng: -96.7970 }
    },
    {
      id: 'SH003',
      carrier: 'Fast Freight Inc',
      origin: 'Los Angeles, CA',
      destination: 'Seattle, WA',
      status: 'In Transit',
      eta: '2024-02-24 16:30',
      cost: 3200,
      position: { lat: 34.0522, lng: -118.2437 }
    }
  ];

  // Mock available carriers data
  const availableCarriers: AvailableCarrier[] = [
    {
      id: 'C001',
      name: 'Reliable Transport',
      rating: 4.8,
      equipmentType: 'Dry Van',
      distance: 15,
      position: { lat: 41.9742, lng: -87.6582 },
      availableDate: '2024-02-23'
    },
    {
      id: 'C002',
      name: 'Speedy Delivery',
      rating: 4.5,
      equipmentType: 'Refrigerated',
      distance: 28,
      position: { lat: 41.7508, lng: -87.5247 },
      availableDate: '2024-02-24'
    },
    {
      id: 'C003',
      name: 'Midwest Haulers',
      rating: 4.2,
      equipmentType: 'Flatbed',
      distance: 42,
      position: { lat: 41.6646, lng: -87.8611 },
      availableDate: '2024-02-23'
    },
    {
      id: 'C004',
      name: 'Long Distance Logistics',
      rating: 4.7,
      equipmentType: 'Dry Van',
      distance: 55,
      position: { lat: 42.0451, lng: -87.9083 },
      availableDate: '2024-02-25'
    }
  ];

  // Filter carriers based on radius
  const filteredCarriers = availableCarriers.filter(carrier => carrier.distance <= radiusInMiles);

  const metrics = {
    activeShipments: 12,
    delayedShipments: 2,
    onTimeDelivery: 95,
    averageCost: 2300
  };

  // Handle radius change
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRadiusInMiles(parseInt(e.target.value));
  };

  // Toggle between active shipments and available carriers
  const toggleView = () => {
    setShowActiveShipments(!showActiveShipments);
  };

  // Render stars for carrier rating
  const renderStars = (rating: number) => {
    return "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));
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
          <div className={styles.trackingHeader}>
            <h2>{showActiveShipments ? 'Active Shipments' : 'Available Carriers'}</h2>
            <div className={styles.trackingControls}>
              <div className={styles.toggleContainer}>
                <label className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={showActiveShipments}
                    onChange={toggleView}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
                <span className={styles.toggleLabel}>
                  {showActiveShipments ? 'Show Available Carriers' : 'Show Active Shipments'}
                </span>
              </div>
              
              {!showActiveShipments && (
                <div className={styles.radiusSelector}>
                  <label htmlFor="radius">Radius: {radiusInMiles} miles</label>
                  <input
                    type="range"
                    id="radius"
                    min="10"
                    max="100"
                    step="5"
                    value={radiusInMiles}
                    onChange={handleRadiusChange}
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className={styles.mapContainer}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '400px' }}
              center={userLocation}
              zoom={showActiveShipments ? 4 : 9}
            >
              {showActiveShipments ? (
                // Show active shipments
                shipments.map((shipment) => (
                  <Marker 
                    key={shipment.id}
                    position={shipment.position}
                    title={shipment.carrier}
                  />
                ))
              ) : (
                // Show available carriers and radius circle
                <>
                  <Circle
                    center={userLocation}
                    radius={radiusInMiles * 1609.34} // Convert miles to meters
                    options={{
                      fillColor: 'rgba(66, 133, 244, 0.1)',
                      fillOpacity: 0.4,
                      strokeColor: '#4285F4',
                      strokeOpacity: 0.8,
                      strokeWeight: 2,
                    }}
                  />
                  <Marker
                    position={userLocation}
                    title="Your Location"
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    }}
                  />
                  {filteredCarriers.map((carrier) => (
                    <Marker 
                      key={carrier.id}
                      position={carrier.position}
                      title={carrier.name}
                    />
                  ))}
                </>
              )}
            </GoogleMap>
          </div>
        </div>

        <div className={styles.recentShipments}>
          <div className={styles.sectionHeader}>
            <h2>{showActiveShipments ? 'Recent Shipments' : 'Available Carriers'}</h2>
            {showActiveShipments && (
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
            )}
          </div>

          <div className={styles.shipmentList}>
            {showActiveShipments ? (
              // Show active shipments list
              shipments.map(shipment => (
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
              ))
            ) : (
              // Show available carriers list
              filteredCarriers.map(carrier => (
                <div key={carrier.id} className={styles.carrierCard}>
                  <div className={styles.carrierHeader}>
                    <h3>{carrier.name}</h3>
                    <span className={styles.distance}>{carrier.distance} miles away</span>
                  </div>
                  <div className={styles.carrierRating}>
                    <span className={styles.stars}>{renderStars(carrier.rating)}</span>
                    <span>{carrier.rating.toFixed(1)}</span>
                  </div>
                  <div className={styles.carrierDetails}>
                    <div>
                      <label>Equipment:</label>
                      <span>{carrier.equipmentType}</span>
                    </div>
                    <div>
                      <label>Available:</label>
                      <span>{carrier.availableDate}</span>
                    </div>
                  </div>
                  <button className={styles.contactButton}>Contact Carrier</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipperDashboard;