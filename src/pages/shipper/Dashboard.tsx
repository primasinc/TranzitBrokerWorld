import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToShipperMetrics } from '../../services/shipmentService';
import { generateTestData } from '../../utils/seedTestData';
import styles from './Dashboard.module.css';
import MapboxMap from '../../components/common/MapboxMap';
import { db } from '../../firebase';
import { collection, getDocs, getDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { useShipments } from '../../context/ShipmentsContext';
import mapboxgl from 'mapbox-gl';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { MobileOptimizedList } from '../../components/common/MobileOptimizedList';

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
  pickup?: string; // Added pickup field
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

const ShipperDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [showActiveShipments, setShowActiveShipments] = useState(true);
  const [radiusInMiles, setRadiusInMiles] = useState(50);
  const [userLocation, setUserLocation] = useState<[number, number]>([-87.6298, 41.8781]); // Chicago coordinates
  const [metrics, setMetrics] = useState({
    activeShipments: 0,
    onTimeDelivery: 0,
    averageCost: 0
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { shipments } = useShipments();
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
  
  // Shipment details modal state
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [showShipmentModal, setShowShipmentModal] = useState(false);

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
    
    try {
      const success = await generateTestData(userId);
      
      if (success) {
        console.log('Test data generation completed successfully');
        alert('Test data generated successfully!');
      } else {
        console.error('Failed to generate test data');
        setError('Failed to generate test data. Please try again.');
      }
    } catch (err) {
      setError('Failed to generate test data: ' + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch rejected loads that need new carriers
  const fetchRejectedLoads = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get notifications for this shipper that are carrier rejections
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('shipperId', '==', user.uid),
        where('type', '==', 'carrier_decline'),
        where('read', '==', false)
      );
      
      const unsubscribe = onSnapshot(notificationsQuery, async (snapshot) => {
        const rejectedLoadsData: RejectedLoad[] = [];
        
        for (const notificationDoc of snapshot.docs) {
          const notificationData = notificationDoc.data();
          
          // Only process notifications that are actually rejections
          if (notificationData.status !== 'declined') continue;
          
          // Validate that the PO number exists and belongs to this shipper
          if (notificationData.poNumber) {
            try {
              const poQuery = query(
                collection(db, 'purchaseOrders'),
                where('poNumber', '==', notificationData.poNumber),
                where('userId', '==', user.uid)
              );
              const poSnapshot = await getDocs(poQuery);
              
              // Only include if the purchase order exists and belongs to this shipper
              if (!poSnapshot.empty) {
                const poData = poSnapshot.docs[0].data();
                
                // Get load details from the purchase order instead of notification
                rejectedLoadsData.push({
                  id: notificationDoc.id,
                  poNumber: notificationData.poNumber,
                  pickupLocation: poData.vendorInfo?.cityStateZip || poData.pickupLocation?.address || 'Unknown',
                  deliveryLocation: poData.shipTo?.cityStateZip || 'Unknown',
                  rate: poData.rate || poData.total || 0,
                  rejectionTime: notificationData.createdAt?.toDate() || new Date(),
                  rejectionReason: notificationData.message || 'Carrier rejected the load',
                  loadId: notificationData.loadId || ''
                });
              }
            } catch (error) {
              console.error('[Dashboard] Error validating PO for rejection:', error);
            }
          }
        }
        
        setRejectedLoads(rejectedLoadsData);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching rejected loads:', error);
    }
  }, [user]);

  const handleSelectNewCarrier = (rejectedLoad: RejectedLoad) => {
    navigate('/shipper/partners', {
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

  const handleViewShipmentDetails = (shipment: any) => {
    setSelectedShipment(shipment);
    setShowShipmentModal(true);
  };

  // Fetch rejected loads when component mounts
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initRejectedLoads = async () => {
      try {
        const unsub = await fetchRejectedLoads();
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
  }, [fetchRejectedLoads]);

  // Convert shipments and carriers to Mapbox markers
  const getMapMarkers = () => {
    if (showActiveShipments) {
      // Use actual shipments data from context instead of mockShipments
      const activeShipments = shipments.filter(s => s.status === 'Active' || s.status === 'Carrier Pending');
      
      return activeShipments.map(shipment => {
        // Generate position coordinates based on pickup location or use default
        let position: [number, number] = [-87.6298, 41.8781]; // Default to Chicago
        
        // Try to geocode the pickup location if available
        if (shipment.pickup) {
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
            if (shipment.pickup.toLowerCase().includes(city.toLowerCase().split(',')[0])) {
              position = coords;
              break;
            }
          }
        }
        
        return {
          id: shipment.id,
          position,
          type: 'carrier' as const,
          onClick: () => {
            // Handle shipment marker click - show shipment details
            handleViewShipmentDetails(shipment);
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
          position: carrier.position,
          type: 'carrier' as const,
          onClick: () => {
            console.log('Carrier clicked:', carrier);
          }
        }))
      ];
    }
  };

  // Calculate metrics based on shipments from context (shipping schedule)
  useEffect(() => {
    if (!shipments || shipments.length === 0) {
      setMetrics({
        activeShipments: 0,
        onTimeDelivery: 0,
        averageCost: 0
      });
      return;
    }

    // Active shipments: not completed or cancelled
    const activeShipments = shipments.filter(s => s.status === 'Active').length;
    // On-time delivery: completed and not delayed (customize as needed)
    const completedShipments = shipments.filter(s => s.status === 'Completed');
    const onTimeDeliveries = completedShipments.length; // Adjust if you have a flag for on-time
    const onTimeDelivery = completedShipments.length > 0 ? (onTimeDeliveries / completedShipments.length) * 100 : 0;
    // Average cost: use cost field
    const totalCost = shipments.reduce((sum, s) => sum + (s.cost || 0), 0);
    const averageCost = shipments.length > 0 ? totalCost / shipments.length : 0;

    setMetrics({
      activeShipments,
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
    // MapboxGL typings: addSource(id: string, source: any)
    const safeAddSource = (id: string, source: any) => mapInstance && typeof mapInstance.addSource === 'function' && mapInstance.addSource(id, source);
    // addLayer(layer: any)
    const safeAddLayer = (layer: any) => mapInstance && typeof mapInstance.addLayer === 'function' && mapInstance.addLayer(layer);
    // fitBounds(bounds: any, options?: any)
    const safeFitBounds = (bounds: any, options?: any) => mapInstance && typeof mapInstance.fitBounds === 'function' && mapInstance.fitBounds(bounds, options);

    if (!showActiveShipments) {
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
  }, [mapInstance, showActiveShipments, userLocation, radiusInMiles, isMobile]);

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
          <div className={styles.metricValue}>
            {shipments.filter(shipment => 
              shipment.status === 'Active' || shipment.status === 'Carrier Pending'
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
                    zoom={showActiveShipments ? (isMobile ? 6 : 4) : (isMobile ? 11 : 9)}
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
          {!showActiveShipments && (
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
            <h2>{showActiveShipments ? 'Active Shipments' : 'Available Carriers'}</h2>
          </div>

          <div className={styles.shipmentList}>
            {showActiveShipments ? (
              // Show active shipments and carrier pending shipments, with rejected loads at top
              shipments
                .filter(shipment => 
                  shipment.status === 'Active' || shipment.status === 'Carrier Pending'
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
                .map(shipment => {
                  const isRejected = rejectedLoads.some(rejected => rejected.poNumber === shipment.poNumber);
                  const rejectedLoad = rejectedLoads.find(r => r.poNumber === shipment.poNumber);
                  
                  return (
                    <div key={shipment.id} className={`${styles.shipmentCard} ${isRejected ? styles.rejectedShipment : ''}`}>
                      <div className={styles.shipmentHeader}>
                        <div className={styles.shipmentTitle}>
                          <h3>{shipment.carrier}</h3>
                          {isRejected && <span className={styles.rejectionBadge}>🚨 REJECTED</span>}
                        </div>
                        <span className={`${styles.status} ${styles[shipment.status.toLowerCase()]}`}>
                          {isRejected ? 'Rejected' : shipment.status}
                        </span>
                      </div>
                      
                      <div className={styles.shipmentRoute}>
                        <div className={styles.routeInfo}>
                          <span className={styles.routeLabel}>From:</span>
                          <span className={styles.routeValue}>{shipment.pickup || 'N/A'}</span>
                        </div>
                        <div className={styles.routeArrow}>→</div>
                        <div className={styles.routeInfo}>
                          <span className={styles.routeLabel}>To:</span>
                          <span className={styles.routeValue}>{shipment.destination}</span>
                        </div>
                      </div>
                      
                      <div className={styles.shipmentDetails}>
                        <div className={styles.detailRow}>
                          <div className={styles.detailItem}>
                            <label>PO Number:</label>
                            <span className={styles.poNumber}>{shipment.poNumber}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <label>Type:</label>
                            <span>{shipment.type}</span>
                          </div>
                        </div>
                        <div className={styles.detailRow}>
                          <div className={styles.detailItem}>
                            <label>Date:</label>
                            <span>{shipment.date}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <label>Cost:</label>
                            <span className={styles.cost}>${shipment.cost.toLocaleString()}</span>
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
                      
                      <div className={styles.shipmentActions}>
                        <button 
                          className={styles.viewButton}
                          onClick={() => handleViewShipmentDetails(shipment)}
                        >
                          View Details
                        </button>
                        {isRejected && (
                          <button 
                            className={styles.selectCarrierButton}
                            onClick={() => handleSelectNewCarrier(rejectedLoads.find(r => r.poNumber === shipment.poNumber)!)}
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
                )}
                keyExtractor={(carrier) => carrier.id}
                itemHeight={120}
                containerHeight={isMobile ? 300 : 400}
                enableVirtualization={isMobile}
                enablePullToRefresh={isMobile}
                onRefresh={async () => {
                  // Refresh carriers data
                  await new Promise(resolve => setTimeout(resolve, 1000));
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

      {/* Shipment Details Modal */}
      {showShipmentModal && selectedShipment && (
        <div 
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShipmentModal(false);
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Shipment Details</h2>
              <button 
                onClick={() => setShowShipmentModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.shipmentInfo}>
                <div className={styles.shipmentHeader}>
                  <h3>{selectedShipment.carrier}</h3>
                  <span className={`${styles.status} ${styles[selectedShipment.status.toLowerCase().replace(/\s+/g, '')] || styles.scheduled}`}>
                    {selectedShipment.status}
                  </span>
                </div>
                
                <div className={styles.shipmentRoute}>
                  <div className={styles.routeInfo}>
                    <span className={styles.routeLabel}>From:</span>
                    <span className={styles.routeValue}>{selectedShipment.pickup || selectedShipment.origin || 'N/A'}</span>
                  </div>
                  <div className={styles.routeArrow}>→</div>
                  <div className={styles.routeInfo}>
                    <span className={styles.routeLabel}>To:</span>
                    <span className={styles.routeValue}>{selectedShipment.destination}</span>
                  </div>
                </div>
                
                <div className={styles.shipmentDetails}>
                  <div className={styles.detailRow}>
                    <div className={styles.detailItem}>
                      <label>PO Number:</label>
                      <span className={styles.poNumber}>{selectedShipment.poNumber}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Type:</label>
                      <span>{selectedShipment.type}</span>
                    </div>
                  </div>
                  <div className={styles.detailRow}>
                    <div className={styles.detailItem}>
                      <label>Date:</label>
                      <span>{selectedShipment.date}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Cost:</label>
                      <span className={styles.cost}>${selectedShipment.cost.toLocaleString()}</span>
                    </div>
                  </div>
                  {selectedShipment.eta && (
                    <div className={styles.detailRow}>
                      <div className={styles.detailItem}>
                        <label>ETA:</label>
                        <span>{selectedShipment.eta}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={styles.modalActions}>
                  <button 
                    className={styles.viewButton}
                    onClick={() => {
                      setShowShipmentModal(false);
                      navigate('/shipper/schedule', {
                        state: {
                          selectedShipment: {
                            poNumber: selectedShipment.poNumber,
                            date: selectedShipment.date,
                            pickup: selectedShipment.pickup || selectedShipment.origin || '',
                            destination: selectedShipment.destination,
                            carrier: selectedShipment.carrier,
                            status: selectedShipment.status,
                            type: selectedShipment.type,
                            cost: selectedShipment.cost
                          }
                        }
                      });
                    }}
                  >
                    View Full Details
                  </button>
                  <button 
                    className={styles.closeModalButton}
                    onClick={() => setShowShipmentModal(false)}
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

export default ShipperDashboard;