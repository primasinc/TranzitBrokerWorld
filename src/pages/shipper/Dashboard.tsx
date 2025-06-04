import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToShipperMetrics } from '../../services/shipmentService';
import { generateTestData } from '../../utils/seedTestData';
import styles from './Dashboard.module.css';
import MapboxMap from '../../components/common/MapboxMap';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useShipments } from '../../context/ShipmentsContext';

interface Shipment {
  id: string;
  carrier: string;
  origin: string;
  destination: string;
  status: 'In Transit' | 'Scheduled' | 'Delivered' | 'Delayed' | 'Cancelled';
  eta: string;
  cost: number;
  position: [number, number]; // [longitude, latitude] for Mapbox
  date: string;
  type: string;
  poNumber: string;
}

interface AvailableCarrier {
  id: string;
  name: string;
  rating: number;
  equipmentType: string;
  distance: number; // in miles
  position: [number, number]; // [longitude, latitude] for Mapbox
  availableDate: string;
}

const ACTIVE_STATUSES = ['Active', 'Carrier Pending', 'In Progress', 'Delayed'];

const ShipperDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [showActiveShipments, setShowActiveShipments] = useState(true);
  const [radiusInMiles, setRadiusInMiles] = useState(50);
  const [userLocation, setUserLocation] = useState<[number, number]>([-87.6298, 41.8781]); // Chicago coordinates
  const [metrics, setMetrics] = useState({
    activeShipments: 0,
    delayedShipments: 0,
    onTimeDelivery: 0,
    averageCost: 0
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { shipments } = useShipments();
  const [availableCarriers, setAvailableCarriers] = useState<any[]>([]);
  const [showAvailableCarriers, setShowAvailableCarriers] = useState(false);

  // Mock shipments data
  const mockShipments: Shipment[] = [
    {
      id: 'SH001',
      carrier: 'ABC Trucking',
      origin: 'Chicago, IL',
      destination: 'New York, NY',
      status: 'In Transit',
      eta: '2024-02-25 14:00',
      cost: 2500,
      position: [-87.6298, 41.8781], // [longitude, latitude] for Chicago
      date: '2024-02-23',
      type: 'Dry Van',
      poNumber: 'PO12345'
    },
    {
      id: 'SH002',
      carrier: 'XYZ Logistics',
      origin: 'Dallas, TX',
      destination: 'Atlanta, GA',
      status: 'Scheduled',
      eta: '2024-02-26 10:00',
      cost: 1800,
      position: [-96.7970, 32.7767], // [longitude, latitude] for Dallas
      date: '2024-02-24',
      type: 'Refrigerated',
      poNumber: 'PO12346'
    },
    {
      id: 'SH003',
      carrier: 'Fast Freight Inc',
      origin: 'Los Angeles, CA',
      destination: 'Seattle, WA',
      status: 'In Transit',
      eta: '2024-02-24 16:30',
      cost: 3200,
      position: [-118.2437, 34.0522], // [longitude, latitude] for LA
      date: '2024-02-23',
      type: 'Flatbed',
      poNumber: 'PO12347'
    }
  ];

  // Mock available carriers data
  const availableCarriersData: AvailableCarrier[] = [
    {
      id: 'C001',
      name: 'Reliable Transport',
      rating: 4.8,
      equipmentType: 'Dry Van',
      distance: 15,
      position: [-87.6582, 41.9742], // [longitude, latitude] for carrier location
      availableDate: '2024-02-23'
    },
    {
      id: 'C002',
      name: 'Speedy Delivery',
      rating: 4.5,
      equipmentType: 'Refrigerated',
      distance: 28,
      position: [-87.5247, 41.7508], // [longitude, latitude] for carrier location
      availableDate: '2024-02-24'
    },
    {
      id: 'C003',
      name: 'Midwest Haulers',
      rating: 4.2,
      equipmentType: 'Flatbed',
      distance: 42,
      position: [-87.8611, 41.6646], // [longitude, latitude] for carrier location
      availableDate: '2024-02-23'
    },
    {
      id: 'C004',
      name: 'Long Distance Logistics',
      rating: 4.7,
      equipmentType: 'Dry Van',
      distance: 55,
      position: [-87.9083, 42.0451], // [longitude, latitude] for carrier location
      availableDate: '2024-02-25'
    }
  ];

  // Filter carriers based on radius
  const filteredCarriers = availableCarriersData.filter(carrier => carrier.distance <= radiusInMiles);

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

  // Handle metric card clicks
  const handleMetricClick = (type: 'active' | 'delayed') => {
    navigate('/shipper/schedule', { 
      state: { 
        filter: type,
        period: selectedPeriod 
      }
    });
  };

  const handleGenerateTestData = async () => {
    if (!user) {
      setError('Please log in to generate test data.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    const userId = (user as any)?.uid || (user as any)?.email || '';
    console.log('Starting test data generation for user:', userId);
    const success = await generateTestData(userId);
    
    if (success) {
      console.log('Test data generation completed successfully');
    } else {
      console.error('Failed to generate test data');
      setError('Failed to generate test data. Please try again.');
    }

    setIsGenerating(false);
  };

  // Convert shipments and carriers to Mapbox markers
  const getMapMarkers = () => {
    if (showActiveShipments) {
      return mockShipments.map(shipment => ({
        id: shipment.id,
        position: shipment.position,
        type: 'carrier' as const,
        onClick: () => {
          // Handle shipment marker click
          console.log('Shipment clicked:', shipment);
        }
      }));
    } else {
      return [
        // User location marker
        {
          id: 'user',
          position: userLocation,
          type: 'shipper' as const,
          onClick: () => {
            console.log('User location clicked');
          }
        },
        // Available carriers markers
        ...filteredCarriers.map(carrier => ({
          id: carrier.id,
          position: carrier.position,
          type: 'carrier' as const,
          onClick: () => {
            console.log('Carrier clicked:', carrier);
          }
        }))
      ];
    }
  };

  const delayedShipmentsCount = shipments.filter(s => s.status === 'Delayed').length;

  // Calculate metrics based on shipments from context (shipping schedule)
  useEffect(() => {
    if (!shipments || shipments.length === 0) {
      setMetrics({
        activeShipments: 0,
        delayedShipments: 0,
        onTimeDelivery: 0,
        averageCost: 0
      });
      return;
    }

    // Active shipments: not completed or cancelled
    const activeShipments = shipments.filter(s => s.status === 'Active').length;
    const delayedShipments = shipments.filter(s => s.status === 'Delayed').length;
    // On-time delivery: completed and not delayed (customize as needed)
    const completedShipments = shipments.filter(s => s.status === 'Completed');
    const onTimeDeliveries = completedShipments.length; // Adjust if you have a flag for on-time
    const onTimeDelivery = completedShipments.length > 0 ? (onTimeDeliveries / completedShipments.length) * 100 : 0;
    // Average cost: use cost field
    const totalCost = shipments.reduce((sum, s) => sum + (s.cost || 0), 0);
    const averageCost = shipments.length > 0 ? totalCost / shipments.length : 0;

    setMetrics({
      activeShipments,
      delayedShipments,
      onTimeDelivery,
      averageCost
    });
  }, [shipments]);

  useEffect(() => {
    if (!showAvailableCarriers) return;
    const fetchCarriers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const carriers: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (
          data.eldApiKey &&
          data.status === 'online' &&
          data.location &&
          data.role === 'carrier' // Optional: if you have a role field
        ) {
          carriers.push({
            id: doc.id,
            position: data.location,
            eldApiKey: data.eldApiKey,
            name: data.companyName,
          });
        }
      });
      setAvailableCarriers(carriers);
    };
    fetchCarriers();
  }, [showAvailableCarriers]);

  return (
    <div className={styles.dashboard}>
      {process.env.NODE_ENV === 'development' && (
        <>
          <button 
            className={`${styles.devButton} ${isGenerating ? styles.loading : ''}`}
            onClick={handleGenerateTestData}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Test Data'}
          </button>
          {error && <div className={styles.error}>{error}</div>}
        </>
      )}
      <div className={styles.metricsGrid}>
        <div 
          className={`${styles.metricCard} ${styles.clickable}`}
          onClick={() => handleMetricClick('active')}
          role="button"
          tabIndex={0}
        >
          <h3>Active Shipments</h3>
          <div className={styles.metricValue}>{shipments.length}</div>
        </div>
        <div 
          className={`${styles.metricCard} ${styles.clickable}`}
          onClick={() => handleMetricClick('delayed')}
          role="button"
          tabIndex={0}
        >
          <h3>Delayed Shipments</h3>
          <div className={styles.metricValue}>{delayedShipmentsCount}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>On-Time Delivery</h3>
          <div className={styles.metricValue}>{metrics.onTimeDelivery.toFixed(1)}%</div>
        </div>
        <div className={styles.metricCard}>
          <h3>Average Cost/Load</h3>
          <div className={styles.metricValue}>${metrics.averageCost.toLocaleString()}</div>
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
            <MapboxMap
              center={userLocation}
              zoom={showActiveShipments ? 4 : 9}
              markers={showAvailableCarriers ? availableCarriers.map(carrier => ({
                id: carrier.id,
                position: carrier.position,
                type: 'carrier',
              })) : getMapMarkers()}
              onMapLoad={(map) => {
                // If showing available carriers, add a circle for the radius
                if (!showActiveShipments) {
                  const radiusInMeters = radiusInMiles * 1609.34;
                  map.addSource('radius', {
                    type: 'geojson',
                    data: {
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: userLocation
                      },
                      properties: {
                        radius: radiusInMeters
                      }
                    }
                  });

                  map.addLayer({
                    id: 'radius',
                    type: 'circle',
                    source: 'radius',
                    paint: {
                      'circle-radius': ['/', ['get', 'radius'], ['cos', ['*', ['get', 'lat'], 0.0174533]]],
                      'circle-color': '#4285F4',
                      'circle-opacity': 0.1,
                      'circle-stroke-width': 2,
                      'circle-stroke-color': '#4285F4'
                    }
                  });
                }
              }}
            />
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
              // Show active shipments list from real data, omitting cancelled
              shipments
                .filter(shipment => shipment.status !== 'Cancelled')
                .map(shipment => (
                  <div key={shipment.id} className={styles.shipmentCard}>
                    <div className={styles.shipmentHeader}>
                      <h3>{shipment.carrier}</h3>
                      <span className={`${styles.status} ${styles[shipment.status.toLowerCase()]}`}>
                        {shipment.status}
                      </span>
                    </div>
                    <div className={styles.shipmentDetails}>
                      <div>
                        <label>Type:</label>
                        <span>{shipment.type}</span>
                      </div>
                      <div>
                        <label>Carrier:</label>
                        <span>{shipment.carrier}</span>
                      </div>
                      <div>
                        <label>Date:</label>
                        <span>{shipment.date}</span>
                      </div>
                      <div>
                        <label>Cost:</label>
                        <span>${shipment.cost}</span>
                      </div>
                      <div>
                        <label>PO Number:</label>
                        <span>{shipment.poNumber}</span>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              // Show available carriers list
              availableCarriers.map(carrier => (
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