import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Dashboard.module.css';
import MapboxMap from '../../components/common/MapboxMap';
import mapboxgl from 'mapbox-gl';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';

interface Load {
  id: string;
  carrier: string;
  origin: string;
  destination: string;
  status: 'Active' | 'Carrier Pending' | 'In Progress' | 'Delayed' | 'Delivered' | 'Cancelled';
  eta: string;
  cost: number;
  position: [number, number]; // [longitude, latitude] for Mapbox
  date: string;
  type: string;
  poNumber: string;
  pickup?: string;
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

interface RejectedLoad {
  id: string;
  poNumber: string;
  pickupLocation: string;
  deliveryLocation: string;
  rate: number;
  rejectionTime: Date;
  rejectionReason?: string;
  loadId: string;
}

const ACTIVE_STATUSES = ['Active', 'Carrier Pending', 'In Progress', 'Delayed'];

// Helper to create a GeoJSON circle polygon in miles (copied from carrier AvailableLoads)
function createGeoJSONCircle(center: [number, number], radiusInMiles: number, points = 64) {
  const coords = {
    latitude: center[1],
    longitude: center[0]
  };
  const km = radiusInMiles * 1.60934;
  const ret = [];
  const distanceX = km / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
  const distanceY = km / 110.574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [ret]
    },
    properties: {}
  };
}

const BrokerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [showActiveLoads, setShowActiveLoads] = useState(true);
  const [radiusInMiles, setRadiusInMiles] = useState(50);
  const [userLocation, setUserLocation] = useState<[number, number]>([-87.6298, 41.8781]); // Chicago coordinates
  const [metrics, setMetrics] = useState({
    activeLoads: 0,
    onTimeDelivery: 0,
    averageCost: 0
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCarriers, setAvailableCarriers] = useState<any[]>([]);
  const [showAvailableCarriers, setShowAvailableCarriers] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [isLocationReady, setIsLocationReady] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mapZoom, setMapZoom] = useState(10);
  const [hideMap, setHideMap] = useState(false);
  const [rejectedLoads, setRejectedLoads] = useState<RejectedLoad[]>([]);
  
  // Load details modal state
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);

  const handleMapLoad = useCallback((map: mapboxgl.Map) => {
    setMapInstance(map);
  }, []);

  // Mobile optimization
  const { 
    isLowBandwidth, 
    isLowBattery, 
    getOptimalPageSize, 
    shouldFetchData, 
    measurePerformance 
  } = useMobileOptimization({
    enableOfflineMode: true,
    enableLowBandwidthMode: true,
    enableBatteryOptimization: true
  });

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isMobileScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mock loads data for now
  const mockLoads: Load[] = [
    {
      id: 'LD001',
      carrier: 'ABC Trucking',
      origin: 'Chicago, IL',
      destination: 'New York, NY',
      status: 'Active',
      eta: '2024-01-15',
      cost: 2500,
      position: [-87.6298, 41.8781],
      date: '2024-01-10',
      type: 'Full Truckload',
      poNumber: 'PO-001',
      pickup: '2024-01-10'
    }
  ];

  // Update metrics when component mounts
  useEffect(() => {
    setMetrics({
      activeLoads: mockLoads.filter(load => load.status === 'Active').length,
      onTimeDelivery: 95, // Mock percentage
      averageCost: 2500 // Mock average
    });
  }, []);

  const toggleView = () => {
    setShowActiveLoads(!showActiveLoads);
    setShowAvailableCarriers(!showAvailableCarriers);
  };

  const handleMetricClick = (metricType: string) => {
    if (metricType === 'active') {
      setShowActiveLoads(true);
      setShowAvailableCarriers(false);
    }
  };

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // Mock test data generation for now
      console.log('Generating test data...');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate test data');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    
    setIsGeocoding(true);
    try {
      const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchInput)}.json?access_token=${accessToken}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setUserLocation([lng, lat]);
      } else {
        alert('Address not found. Please try another.');
      }
    } catch (err) {
      alert('Error searching address.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRadiusInMiles(Number(e.target.value));
  };

  const getMapMarkers = () => {
    return mockLoads.map(load => ({
      id: load.id,
      position: load.position,
      type: 'load' as const,
    }));
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  };

  const handleViewLoadDetails = (load: any) => {
    setSelectedLoad(load);
    setShowLoadModal(true);
  };

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
          <h3>Active Loads</h3>
          <div className={styles.metricValue}>
            {mockLoads.filter(load => 
              load.status === 'Active' || load.status === 'Carrier Pending'
            ).length}
          </div>
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
            <h2>{showActiveLoads ? 'Active Loads' : 'Available Carriers'}</h2>
            <div className={styles.trackingControls}>
              <div className={styles.toggleContainer}>
                <label className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={showActiveLoads}
                    onChange={toggleView}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
                <span className={styles.toggleLabel}>
                  {showActiveLoads ? 'Show Available Carriers' : 'Show Active Loads'}
                </span>
              </div>
            </div>
          </div>
          
          <div className={`${styles.mapContainer} ${isMapFullscreen ? styles.mapFullscreen : ''}`}>
            {isLocationReady && !hideMap ? (
              <>
                {isMobile && (
                  <button 
                    className={styles.fullscreenToggle}
                    onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                    aria-label={isMapFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isMapFullscreen ? '✕' : '⛶'}
                  </button>
                )}
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <MapboxMap
                    center={userLocation}
                    zoom={showActiveLoads ? (isMobile ? 6 : 4) : (isMobile ? 11 : 9)}
                    markers={showAvailableCarriers ? availableCarriers.map(carrier => ({
                      id: carrier.id,
                      position: carrier.position,
                      type: 'carrier',
                    })) : getMapMarkers()}
                    onMapLoad={handleMapLoad}
                  />
                </div>
              </>
            ) : !isLocationReady ? (
              <div className={styles.mapLoading}>
                <div className={styles.spinner}></div>
                <p>Locating...</p>
              </div>
            ) : null}
          </div>
          
          {/* Controls below the map, outside of .mapContainer */}
          {!showActiveLoads && (
            <div className={styles.mobileControls}>
              <form onSubmit={handleAddressSearch} className={styles.searchForm}>
                <input
                  type="text"
                  placeholder="Search address or city..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className={styles.searchInput}
                  disabled={isGeocoding}
                />
                <button type="submit" className={styles.searchButton} disabled={isGeocoding}>
                  {isGeocoding ? 'Searching...' : 'Search'}
                </button>
              </form>
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
                  className={styles.radiusSlider}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.activeShipments}>
          <div className={styles.sectionHeader}>
            <h2>{showActiveLoads ? 'Active Loads' : 'Available Carriers'}</h2>
          </div>

          <div className={styles.shipmentList}>
            {showActiveLoads ? (
              // Show active loads and carrier pending loads, with rejected loads at top
              mockLoads
                .filter(load => 
                  load.status === 'Active' || load.status === 'Carrier Pending'
                )
                .sort((a, b) => {
                  // Sort by priority: rejected loads first, then by date
                  const aIsRejected = rejectedLoads.some(rejected => rejected.poNumber === a.poNumber);
                  const bIsRejected = rejectedLoads.some(rejected => rejected.poNumber === b.poNumber);
                  
                  if (aIsRejected && !bIsRejected) return -1;
                  if (!aIsRejected && bIsRejected) return 1;
                  
                  // Then sort by date (newest first)
                  return new Date(b.date).getTime() - new Date(a.date).getTime();
                })
                .map(load => {
                  const isRejected = rejectedLoads.some(rejected => rejected.poNumber === load.poNumber);
                  const rejectedLoad = rejectedLoads.find(r => r.poNumber === load.poNumber);
                  
                  return (
                    <div key={load.id} className={`${styles.shipmentCard} ${isRejected ? styles.rejectedShipment : ''}`}>
                      <div className={styles.shipmentHeader}>
                        <div className={styles.shipmentTitle}>
                          <h3>{load.carrier}</h3>
                          {isRejected && <span className={styles.rejectionBadge}>🚨 REJECTED</span>}
                        </div>
                        <span className={`${styles.status} ${styles[load.status.toLowerCase()]}`}>
                          {isRejected ? 'Rejected' : load.status}
                        </span>
                      </div>
                      
                      <div className={styles.shipmentRoute}>
                        <div className={styles.routeInfo}>
                          <span className={styles.routeLabel}>From:</span>
                          <span className={styles.routeValue}>{load.pickup || 'N/A'}</span>
                        </div>
                        <div className={styles.routeArrow}>→</div>
                        <div className={styles.routeInfo}>
                          <span className={styles.routeLabel}>To:</span>
                          <span className={styles.routeValue}>{load.destination}</span>
                        </div>
                      </div>
                      
                      <div className={styles.shipmentDetails}>
                        <div className={styles.detailRow}>
                          <div className={styles.detailItem}>
                            <label>PO Number:</label>
                            <span className={styles.poNumber}>{load.poNumber}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <label>Type:</label>
                            <span>{load.type}</span>
                          </div>
                        </div>
                        <div className={styles.detailRow}>
                          <div className={styles.detailItem}>
                            <label>Date:</label>
                            <span>{load.date}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <label>Cost:</label>
                            <span className={styles.cost}>${load.cost.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className={styles.detailRow}>
                          <div className={styles.detailItem}>
                            <label>ETA:</label>
                            <span>{load.eta}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <label>Status:</label>
                            <span>{load.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={styles.shipmentActions}>
                        <button 
                          className={styles.viewButton}
                          onClick={() => handleViewLoadDetails(load)}
                        >
                          View Details
                        </button>
                        <button 
                          className={styles.selectCarrierButton}
                          onClick={() => navigate(`/broker/loads/${load.id}`)}
                        >
                          Select Carrier
                        </button>
                      </div>
                    </div>
                  );
                })
            ) : (
              // Show available carriers
              <div className={styles.carrierCard}>
                <div className={styles.carrierHeader}>
                  <h3>ABC Trucking</h3>
                  <span className={styles.distance}>25 miles away</span>
                </div>
                <div className={styles.carrierRating}>
                  <span className={styles.stars}>{renderStars(4.5)}</span>
                  <span>4.5/5</span>
                </div>
                <div className={styles.carrierDetails}>
                  <p><strong>Equipment:</strong> Flatbed</p>
                  <p><strong>Available:</strong> Today</p>
                  <p><strong>Insurance:</strong> Yes</p>
                  <p><strong>MC Number:</strong> MC123456</p>
                  <p><strong>DOT Number:</strong> DOT789012</p>
                </div>
                <button className={styles.contactButton}>Contact Carrier</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Load Details Modal */}
      {showLoadModal && selectedLoad && (
        <div 
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLoadModal(false);
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Load Details</h2>
              <button 
                onClick={() => setShowLoadModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.shipmentInfo}>
                <div className={styles.shipmentHeader}>
                  <h3>{selectedLoad.carrier}</h3>
                  <span className={`${styles.status} ${styles[selectedLoad.status.toLowerCase()]}`}>
                    {selectedLoad.status}
                  </span>
                </div>
                
                <div className={styles.shipmentRoute}>
                  <div className={styles.routeInfo}>
                    <span className={styles.routeLabel}>From:</span>
                    <span className={styles.routeValue}>{selectedLoad.pickup || selectedLoad.origin || 'N/A'}</span>
                  </div>
                  <div className={styles.routeArrow}>→</div>
                  <div className={styles.routeInfo}>
                    <span className={styles.routeLabel}>To:</span>
                    <span className={styles.routeValue}>{selectedLoad.destination}</span>
                  </div>
                </div>
                
                <div className={styles.shipmentDetails}>
                  <div className={styles.detailRow}>
                    <div className={styles.detailItem}>
                      <label>PO Number:</label>
                      <span className={styles.poNumber}>{selectedLoad.poNumber}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Type:</label>
                      <span>{selectedLoad.type}</span>
                    </div>
                  </div>
                  <div className={styles.detailRow}>
                    <div className={styles.detailItem}>
                      <label>Date:</label>
                      <span>{selectedLoad.date}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Cost:</label>
                      <span className={styles.cost}>${selectedLoad.cost.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={styles.detailRow}>
                    <div className={styles.detailItem}>
                      <label>ETA:</label>
                      <span>{selectedLoad.eta}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Status:</label>
                      <span>{selectedLoad.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.modalActions}>
                <button 
                  className={styles.viewButton}
                  onClick={() => navigate(`/broker/loads/${selectedLoad.id}`)}
                >
                  View Full Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerDashboard;
