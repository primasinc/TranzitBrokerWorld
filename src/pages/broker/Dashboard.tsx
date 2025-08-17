import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoads } from '../../context/LoadsContext';
import { 
  subscribeToBrokerMetrics, 
  fetchAvailableCarriers, 
  fetchRejectedLoads,
  AvailableCarrier,
  RejectedLoad,
  BrokerMetrics
} from '../../services/brokerService';
import styles from './Dashboard.module.css';
import MapboxMap from '../../components/common/MapboxMap';
import mapboxgl from 'mapbox-gl';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { MobileOptimizedList } from '../../components/common/MobileOptimizedList';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

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
  const { loads } = useLoads();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [showActiveLoads, setShowActiveLoads] = useState(true);
  const [radiusInMiles, setRadiusInMiles] = useState(50);
  const [userLocation, setUserLocation] = useState<[number, number]>([-87.6298, 41.8781]); // Chicago coordinates
  const [metrics, setMetrics] = useState<BrokerMetrics>({
    activeLoads: 0,
    onTimeDelivery: 0,
    averageCost: 0,
    totalRevenue: 0,
    carrierCount: 0,
    loadCount: 0,
    completedLoads: 0,
    pendingLoads: 0
  });
  const [availableCarriers, setAvailableCarriers] = useState<AvailableCarrier[]>([]);
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

  // Filter carriers based on radius
  const filteredCarriers = availableCarriers.filter(carrier => carrier.distance <= radiusInMiles);

  // Handle radius change
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRadiusInMiles(parseInt(e.target.value));
  };

  // Toggle between active loads and available carriers
  const toggleView = () => {
    setShowActiveLoads(!showActiveLoads);
  };

  // Render stars for carrier rating
  const renderStars = (rating: number) => {
    return "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));
  };

  // Handle metric card clicks
  const handleMetricClick = (type: 'active' | 'delayed') => {
    navigate('/broker/schedule', { 
      state: { 
        filter: type,
        period: selectedPeriod 
      }
    });
  };

  // Fetch rejected loads that need new carriers
  const fetchRejectedLoadsData = useCallback(async () => {
    if (!user) return;
    
    try {
      const unsubscribe = fetchRejectedLoads(user.uid, (rejectedLoadsData) => {
        setRejectedLoads(rejectedLoadsData);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching rejected loads:', error);
    }
  }, [user]);

  const handleSelectNewCarrier = (rejectedLoad: RejectedLoad) => {
    navigate('/broker/partners', {
      state: {
        poData: {
          poNumber: rejectedLoad.poNumber,
          pickupLocation: rejectedLoad.pickupLocation,
          deliveryLocation: rejectedLoad.deliveryLocation,
          rate: rejectedLoad.rate
        },
        fromRejection: true,
        rejectedLoadId: rejectedLoad.id
      }
    });
  };

  const handleViewLoadDetails = (load: any) => {
    setSelectedLoad(load);
    setShowLoadModal(true);
  };

  // Fetch rejected loads when component mounts
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initRejectedLoads = async () => {
      try {
        const unsub = await fetchRejectedLoadsData();
        if (unsub) {
          unsubscribe = unsub;
        }
      } catch (error) {
        console.error('[Dashboard] Error initializing rejected loads:', error);
      }
    };
    
    // Delay the initialization to avoid interfering with map initialization
    const timer = setTimeout(initRejectedLoads, 1000);
    
    return () => {
      clearTimeout(timer);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchRejectedLoadsData]);

  // Subscribe to broker metrics
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToBrokerMetrics(user.uid, (brokerMetrics) => {
      setMetrics(brokerMetrics);
    });

    return () => unsubscribe();
  }, [user]);

  // Convert loads and carriers to Mapbox markers
  const getMapMarkers = () => {
    if (showActiveLoads) {
      // Use actual loads data from context instead of mock data
      const activeLoads = loads.filter(l => l.status === 'Active' || l.status === 'Carrier Pending');
      
      return activeLoads.map(load => {
        // Generate position coordinates based on pickup location or use default
        let position: [number, number] = [-87.6298, 41.8781]; // Default to Chicago
        
        // Try to geocode the pickup location if available
        if (load.pickup) {
          // For now, use a simple mapping of common cities to coordinates
          const cityCoords: { [key: string]: [number, number] } = {
            'Chicago, IL': [-87.6298, 41.8781],
            'New York, NY': [-74.0060, 40.7128],
            'Los Angeles, CA': [-118.2437, 34.0522],
            'Dallas, TX': [-96.7970, 32.7767],
            'Atlanta, GA': [-84.3880, 33.7490],
            'Seattle, WA': [-122.3321, 47.6062],
            'Miami, FL': [-80.1918, 25.7617],
            'Denver, CO': [-104.9903, 39.7392],
            'Phoenix, AZ': [-112.0740, 33.4484],
            'Philadelphia, PA': [-75.1652, 39.9526]
          };
          
          // Check if we have coordinates for this city
          for (const [city, coords] of Object.entries(cityCoords)) {
            if (load.pickup.toLowerCase().includes(city.toLowerCase().split(',')[0])) {
              position = coords;
              break;
            }
          }
        }
        
        return {
          id: load.id,
          position,
          type: 'carrier' as const,
          onClick: () => {
            // Handle load marker click - show load details
            handleViewLoadDetails(load);
          }
        };
      });
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
          position: carrier.location,
          type: 'carrier' as const,
          onClick: () => {
            console.log('Carrier clicked:', carrier);
          }
        }))
      ];
    }
  };

  // Fetch available carriers when needed
  useEffect(() => {
    if (!showAvailableCarriers || !isLocationReady) return;
    
    const fetchCarriers = async () => {
      try {
        const carriers = await fetchAvailableCarriers(userLocation, radiusInMiles);
        setAvailableCarriers(carriers);
      } catch (error) {
        console.error('Error fetching carriers:', error);
      }
    };
    
    fetchCarriers();
  }, [showAvailableCarriers, isLocationReady, userLocation, radiusInMiles]);

  // Get user location - runs once on component mount
  useEffect(() => {
    if (!user) {
      // If no user, use default location and proceed.
      setIsLocationReady(true);
      return;
    }

    let locationSet = false;

    const setFinalLocation = (lng: number, lat: number) => {
      if (!locationSet) {
        setUserLocation([lng, lat]);
        setIsLocationReady(true);
        locationSet = true;
      }
    };

    const fetchProfileAddress = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const addressParts = [data.address, data.city, data.state, data.zip].filter(Boolean);
          if (addressParts.length > 0) {
            const fullAddress = addressParts.join(', ');
            const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${accessToken}`
            );
            const geoData = await response.json();
            if (geoData.features && geoData.features.length > 0) {
              const [lng, lat] = geoData.features[0].center;
              setFinalLocation(lng, lat);
              return; // Exit after successful geocoding
            }
          }
        }
      } catch (err) {
        console.error("Error geocoding profile address:", err);
      }
      
      // Fallback to default if geocoding fails, no address, or location already set
      if (!locationSet) {
        setIsLocationReady(true);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFinalLocation(position.coords.longitude, position.coords.latitude);
        },
        (error) => {
          console.warn('Geolocation failed. Falling back to profile address.');
          fetchProfileAddress();
        },
        { timeout: 8000, maximumAge: 600000, enableHighAccuracy: false }
      );
    } else {
      console.log('Geolocation not supported. Falling back to profile address.');
      fetchProfileAddress();
    }
  }, [user]);

  // Handle map layers based on view state - separate from map initialization
  useEffect(() => {
    if (!mapInstance) return;

    // Defensive: check mapInstance exists and all methods exist before calling
    const safeGetLayer = (id: string) => mapInstance && typeof mapInstance.getLayer === 'function' && mapInstance.getLayer(id);
    const safeRemoveLayer = (id: string) => mapInstance && typeof mapInstance.removeLayer === 'function' && mapInstance.removeLayer(id);
    const safeGetSource = (id: string) => mapInstance && typeof mapInstance.getSource === 'function' && mapInstance.getSource(id);
    const safeRemoveSource = (id: string) => mapInstance && typeof mapInstance.removeSource === 'function' && mapInstance.removeSource(id);
    const safeAddSource = (id: string, source: any) => mapInstance && typeof mapInstance.addSource === 'function' && mapInstance.addSource(id, source);
    const safeAddLayer = (layer: any) => mapInstance && typeof mapInstance.addLayer === 'function' && mapInstance.addLayer(layer);
    const safeFitBounds = (bounds: any, options?: any) => mapInstance && typeof mapInstance.fitBounds === 'function' && mapInstance.fitBounds(bounds, options);

    if (!showActiveLoads) {
      // Add radius circle for available carriers view
      if (safeGetLayer('radius')) safeRemoveLayer('radius');
      if (safeGetLayer('radius-outline')) safeRemoveLayer('radius-outline');
      if (safeGetSource('radius')) safeRemoveSource('radius');
      
      const circleGeoJSON = createGeoJSONCircle(userLocation, radiusInMiles);
      safeAddSource('radius', {
        type: 'geojson',
        data: circleGeoJSON
      });
      safeAddLayer({
        id: 'radius',
        type: 'fill',
        source: 'radius',
        paint: {
          'fill-color': '#4285F4',
          'fill-opacity': 0.12
        }
      });
      safeAddLayer({
        id: 'radius-outline',
        type: 'line',
        source: 'radius',
        paint: {
          'line-color': '#4285F4',
          'line-width': 2
        }
      });
      
      // Fit map to the bounds of the circle
      const coordinates = circleGeoJSON.geometry.coordinates[0];
      const bounds = new mapboxgl.LngLatBounds(
        new mapboxgl.LngLat(coordinates[0][0], coordinates[0][1]),
        new mapboxgl.LngLat(coordinates[Math.floor(coordinates.length / 2)][0], coordinates[Math.floor(coordinates.length / 2)][1])
      );
      coordinates.forEach(coord => bounds.extend(new mapboxgl.LngLat(coord[0], coord[1])));
      safeFitBounds(bounds, { padding: isMobile ? 20 : 40, maxZoom: isMobile ? 14 : 12 });
    } else {
      // Remove radius if present
      if (safeGetLayer('radius')) safeRemoveLayer('radius');
      if (safeGetLayer('radius-outline')) safeRemoveLayer('radius-outline');
      if (safeGetSource('radius')) safeRemoveSource('radius');
    }
  }, [mapInstance, showActiveLoads, userLocation, radiusInMiles, isMobile]);

  // Function to geocode address using Mapbox
  const handleAddressSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchInput) return;
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

  return (
    <div className={styles.dashboard}>
      <div className={styles.metricsGrid}>
        <div 
          className={`${styles.metricCard} ${styles.clickable}`}
          onClick={() => handleMetricClick('active')}
          role="button"
          tabIndex={0}
        >
          <h3>Active Loads</h3>
          <div className={styles.metricValue}>
            {loads.filter(load => 
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
        <div className={styles.metricCard}>
          <h3>Total Revenue</h3>
          <div className={styles.metricValue}>${metrics.totalRevenue.toLocaleString()}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>Carrier Partners</h3>
          <div className={styles.metricValue}>{metrics.carrierCount}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>Total Loads</h3>
          <div className={styles.metricValue}>{metrics.loadCount}</div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.loadTracking}>
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
                      position: carrier.location,
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

        <div className={styles.activeLoads}>
          <div className={styles.sectionHeader}>
            <h2>{showActiveLoads ? 'Active Loads' : 'Available Carriers'}</h2>
          </div>

          <div className={styles.loadList}>
            {showActiveLoads ? (
              // Show active loads and carrier pending loads, with rejected loads at top
              loads
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
                    <div key={load.id} className={`${styles.loadCard} ${isRejected ? styles.rejectedLoad : ''}`}>
                      <div className={styles.loadHeader}>
                        <div className={styles.loadTitle}>
                          <h3>{load.carrier}</h3>
                          {isRejected && <span className={styles.rejectionBadge}>🚨 REJECTED</span>}
                        </div>
                        <span className={`${styles.status} ${styles[load.status.toLowerCase()]}`}>
                          {isRejected ? 'Rejected' : load.status}
                        </span>
                      </div>
                      
                      <div className={styles.loadRoute}>
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
                      
                      <div className={styles.loadDetails}>
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
                        {isRejected && rejectedLoad && (
                          <div className={styles.detailRow}>
                            <div className={styles.detailItem}>
                              <label>Rejected:</label>
                              <span>{rejectedLoad.rejectionTime.toLocaleString()}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <label>Reason:</label>
                              <span>{rejectedLoad.rejectionReason}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.loadActions}>
                        <button 
                          className={styles.viewButton}
                          onClick={() => handleViewLoadDetails(load)}
                        >
                          View Details
                        </button>
                        {isRejected && (
                          <button 
                            className={styles.selectCarrierButton}
                            onClick={() => handleSelectNewCarrier(rejectedLoads.find(r => r.poNumber === load.poNumber)!)}
                          >
                            Select New Carrier
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            ) : (
              // Show available carriers list with mobile optimization
              <MobileOptimizedList
                items={availableCarriers}
                renderItem={(carrier) => (
                  <div className={styles.carrierCard}>
                    <div className={styles.carrierHeader}>
                      <h3>{carrier.companyName}</h3>
                      <span className={styles.distance}>{carrier.distance} miles away</span>
                    </div>
                    <div className={styles.carrierRating}>
                      <span className={styles.stars}>{renderStars(carrier.rating)}</span>
                      <span>{carrier.rating.toFixed(1)}</span>
                    </div>
                    <div className={styles.carrierDetails}>
                      <div>
                        <label>Equipment:</label>
                        <span>{carrier.equipmentTypes.join(', ')}</span>
                      </div>
                      <div>
                        <label>Available:</label>
                        <span>{carrier.availableDate}</span>
                      </div>
                      <div>
                        <label>Status:</label>
                        <span className={`${styles.status} ${styles[carrier.status]}`}>
                          {carrier.status}
                        </span>
                      </div>
                    </div>
                    <button className={styles.contactButton}>Contact Carrier</button>
                  </div>
                )}
                keyExtractor={(carrier) => carrier.id}
                itemHeight={120}
                containerHeight={isMobile ? 300 : 400}
                enableVirtualization={isMobile}
                enablePullToRefresh={isMobile}
                onRefresh={async () => {
                  // Refresh carriers data
                  try {
                    const carriers = await fetchAvailableCarriers(userLocation, radiusInMiles);
                    setAvailableCarriers(carriers);
                  } catch (error) {
                    console.error('Error refreshing carriers:', error);
                  }
                }}
                className={styles.mobileCarriersList}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile performance indicator */}
      {(isLowBandwidth || isLowBattery) && (
        <div className={styles.performanceIndicator}>
          {isLowBandwidth && <span>📶 Slow connection - Optimized loading</span>}
          {isLowBattery && <span>🔋 Low battery - Reduced animations</span>}
        </div>
      )}

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
              <div className={styles.loadInfo}>
                <div className={styles.loadHeader}>
                  <h3>{selectedLoad.carrier}</h3>
                  <span className={`${styles.status} ${styles[selectedLoad.status.toLowerCase().replace(/\s+/g, '')] || styles.scheduled}`}>
                    {selectedLoad.status}
                  </span>
                </div>
                
                <div className={styles.loadRoute}>
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
                
                <div className={styles.loadDetails}>
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
                  {selectedLoad.eta && (
                    <div className={styles.detailRow}>
                      <div className={styles.detailItem}>
                        <label>ETA:</label>
                        <span>{selectedLoad.eta}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={styles.modalActions}>
                  <button 
                    className={styles.viewButton}
                    onClick={() => {
                      setShowLoadModal(false);
                      navigate('/broker/schedule', {
                        state: {
                          selectedLoad: {
                            poNumber: selectedLoad.poNumber,
                            date: selectedLoad.date,
                            pickup: selectedLoad.pickup || selectedLoad.origin || '',
                            destination: selectedLoad.destination,
                            carrier: selectedLoad.carrier,
                            status: selectedLoad.status,
                            type: selectedLoad.type,
                            cost: selectedLoad.cost
                          }
                        }
                      });
                    }}
                  >
                    View Full Details
                  </button>
                  <button 
                    className={styles.closeModalButton}
                    onClick={() => setShowLoadModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerDashboard;
