import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoads } from '../../context/LoadsContext';
import { 
  fetchAvailableCarriers, 
  fetchRejectedLoads,
  AvailableCarrier,
  RejectedLoad,
  subscribeToBrokerLoadTracking,
  subscribeToBrokerInvoices,
  getBrokerInvoiceAnalytics,
  migrateBrokerDataToOptimizedCollections,
  verifyDataMigrationIntegrity
} from '../../services/brokerService';


import styles from './Dashboard.module.css';
import MapboxMap from '../../components/common/MapboxMap';
import mapboxgl from 'mapbox-gl';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { MobileOptimizedList } from '../../components/common/MobileOptimizedList';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  geocodeLoadLocation, 
  getBrokerDefaultLocation 
} from '../../utils/geocodingService';

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
  const [userLocation, setUserLocation] = useState<[number, number]>([-94.5786, 39.0997]); // Central US fallback (Kansas City)

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
  const [outstandingPayments, setOutstandingPayments] = useState<number>(0);
  const [brokerProfit, setBrokerProfit] = useState<number>(0);
  const [carrierPartners, setCarrierPartners] = useState<number>(0);
    const [onTimeDelivery, setOnTimeDelivery] = useState<number>(0);
    
    // Load details modal state
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Data migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [migrationResults, setMigrationResults] = useState<any>(null);

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

  // Calculate outstanding payments from invoices (optimized with memoization)
  const calculateOutstandingPayments = useCallback(async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'brokerInvoices'), 
        where('brokerId', '==', user.uid),
        where('status', '!=', 'Paid')
      );
      const snapshot = await getDocs(q);
      const total = snapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.amount || 0);
      }, 0);
      setOutstandingPayments(total);
    } catch (error) {
      console.error('Error calculating outstanding payments:', error);
      setOutstandingPayments(0);
    }
  }, [user]);

  // Calculate broker profit (only paid invoices from current calendar year) - optimized
  const calculateBrokerProfit = useCallback(async () => {
    if (!user) return;
    try {
      // Get current year start and end dates
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1); // January 1st
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // December 31st
      
      const q = query(
        collection(db, 'brokerInvoices'),
        where('brokerId', '==', user.uid),
        where('status', '==', 'Paid'),
        where('paidDate', '>=', yearStart),
        where('paidDate', '<=', yearEnd)
      );
      
      const snapshot = await getDocs(q);
      const total = snapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.amount || 0);
      }, 0);
      
      setBrokerProfit(total);
    } catch (error) {
      console.error('Error calculating broker profit:', error);
      setBrokerProfit(0);
    }
  }, [user]);

  // Calculate carrier partners count (optimized)
  const calculateCarrierPartners = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'carrierPartners'),
        where('brokerId', '==', user.uid),
        where('status', '==', 'Active')
      );
      
      const snapshot = await getDocs(q);
      setCarrierPartners(snapshot.docs.length);
    } catch (error) {
      console.error('Error calculating carrier partners:', error);
      setCarrierPartners(0);
    }
  }, [user]);

  // Calculate on-time delivery percentage from completed loads (optimized)
  const calculateOnTimeDelivery = useCallback(async () => {
    if (!user) return;
    try {
      // Get completed loads from the last 12 months for accurate calculation
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      const q = query(
        collection(db, 'brokerLoads'),
        where('brokerId', '==', user.uid),
        where('status', '==', 'Completed'),
        where('completionDate', '>=', twelveMonthsAgo)
      );
      
      const snapshot = await getDocs(q);
      const completedLoads = snapshot.docs.map(doc => doc.data());
      
      if (completedLoads.length === 0) {
        setOnTimeDelivery(0);
        return;
      }
      
      let onTimeCount = 0;
      let totalCount = 0;
      
      completedLoads.forEach(load => {
        if (load.scheduledDeliveryDate && load.actualDeliveryDate) {
          const scheduled = new Date(load.scheduledDeliveryDate);
          const actual = new Date(load.actualDeliveryDate);
          
          // Consider on-time if delivered within 24 hours of scheduled time
          const timeDiff = Math.abs(actual.getTime() - scheduled.getTime());
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          if (hoursDiff <= 24) {
            onTimeCount++;
          }
          totalCount++;
        }
      });
      
      const percentage = totalCount > 0 ? (onTimeCount / totalCount) * 100 : 0;
      setOnTimeDelivery(Math.round(percentage * 10) / 10); // Round to 1 decimal place
    } catch (error) {
      console.error('Error calculating on-time delivery:', error);
      setOnTimeDelivery(0);
    }
  }, [user]);

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

  // Calculate outstanding payments when component mounts
  useEffect(() => {
    calculateOutstandingPayments();
  }, [user]);

  // Calculate broker profit when component mounts
  useEffect(() => {
    calculateBrokerProfit();
  }, [user]);

  // Calculate carrier partners when component mounts
  useEffect(() => {
    calculateCarrierPartners();
  }, [user]);

  // Calculate on-time delivery when component mounts
  useEffect(() => {
    calculateOnTimeDelivery();
  }, [calculateOnTimeDelivery]);

  // Comprehensive analytics integration with broker service
  const refreshAllMetrics = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get comprehensive analytics from broker service
      const analytics = await getBrokerInvoiceAnalytics(user.uid, 'month');
      
      // Update dashboard metrics with real-time data
      if (analytics) {
        setOutstandingPayments(analytics.unpaidAmount || 0);
        setBrokerProfit(analytics.paidAmount || 0);
        
        // Update on-time delivery if available in analytics
        if (analytics.onTimeDeliveryPercentage !== undefined) {
          setOnTimeDelivery(analytics.onTimeDeliveryPercentage);
        }
      }
    } catch (error) {
      console.error('Error refreshing comprehensive metrics:', error);
      // Fallback to individual calculations
      calculateOutstandingPayments();
      calculateBrokerProfit();
      calculateOnTimeDelivery();
    }
  }, [user, calculateOutstandingPayments, calculateBrokerProfit, calculateOnTimeDelivery]);

  // Data migration functions for collection optimization
  const handleDataMigration = useCallback(async () => {
    if (!user) return;
    
    setIsMigrating(true);
    setMigrationStatus('Starting data migration...');
    
    try {
      // Run the migration
      const results = await migrateBrokerDataToOptimizedCollections(user.uid);
      setMigrationResults(results);
      
      if (results.errors.length === 0) {
        setMigrationStatus(`Migration completed successfully! Migrated ${results.purchaseOrdersMigrated} POs, ${results.loadsMigrated} loads, and ${results.invoicesMigrated} invoices.`);
      } else {
        setMigrationStatus(`Migration completed with ${results.errors.length} errors. Check results for details.`);
      }
      
      // Verify integrity after migration
      const integrity = await verifyDataMigrationIntegrity(user.uid);
      console.log('Migration integrity verification:', integrity);
      
    } catch (error) {
      console.error('Error during data migration:', error);
      setMigrationStatus(`Migration failed: ${error}`);
    } finally {
      setIsMigrating(false);
    }
  }, [user]);

  const handleVerifyMigration = useCallback(async () => {
    if (!user) return;
    
    try {
      const integrity = await verifyDataMigrationIntegrity(user.uid);
      setMigrationResults({ integrity });
      setMigrationStatus('Migration integrity verification completed. Check results for details.');
    } catch (error) {
      console.error('Error verifying migration integrity:', error);
      setMigrationStatus(`Verification failed: ${error}`);
    }
  }, [user]);





  // Real-time broker load tracking integration
  useEffect(() => {
    if (!user) return;

    let unsubscribeLoadTracking: (() => void) | undefined;
    let unsubscribeInvoices: (() => void) | undefined;

    const initRealTimeTracking = async () => {
      try {
        // Subscribe to real-time load tracking
        unsubscribeLoadTracking = subscribeToBrokerLoadTracking(user.uid, (trackingData) => {
          // Update map markers with real-time tracking data
          if (trackingData.length > 0) {
            // Trigger map refresh with new tracking data
            if (mapInstance) {
              mapInstance.triggerRepaint();
            }
          }
        });

        // Subscribe to real-time invoice updates
        unsubscribeInvoices = subscribeToBrokerInvoices(user.uid, (invoices) => {
          // Recalculate metrics when invoices change
          calculateOutstandingPayments();
          calculateBrokerProfit();
        });

      } catch (error) {
        console.error('Error initializing real-time tracking:', error);
      }
    };

    // Initialize real-time tracking after a short delay
    const timer = setTimeout(initRealTimeTracking, 2000);

    return () => {
      clearTimeout(timer);
      if (unsubscribeLoadTracking) unsubscribeLoadTracking();
      if (unsubscribeInvoices) unsubscribeInvoices();
    };
  }, [user, mapInstance]);

  // Real-time geocoding of load locations
  useEffect(() => {
    if (!loads.length || !process.env.REACT_APP_MAPBOX_TOKEN) return;

    const geocodeLoads = async () => {
      const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
      if (!accessToken) return;

      // Geocode loads that have pickup locations but no coordinates
      const loadsToGeocode = loads.filter(load => 
        load.pickup && 
        (load.status === 'Active' || load.status === 'Carrier Pending')
      );

      for (const load of loadsToGeocode) {
        try {
          const coordinates = await geocodeLoadLocation(load, accessToken);
          if (coordinates) {
            // Update the load with real coordinates
            // This will trigger a re-render of the map markers
            console.log(`Geocoded load ${load.id}:`, coordinates);
          }
        } catch (error) {
          console.error(`Error geocoding load ${load.id}:`, error);
        }
      }
    };

    geocodeLoads();
  }, [loads]);



  // Convert loads and carriers to Mapbox markers
  const getMapMarkers = () => {
    if (showActiveLoads) {
      const activeLoads = loads.filter(l => l.status === 'Active' || l.status === 'Carrier Pending');
      
      return activeLoads.map(load => {
        let position: [number, number] = [-94.5786, 39.0997]; // Default to Central US
        
        if (load.pickup) {
          // Use default position for now
          position = [-94.5786, 39.0997];
        }
        
        return {
          id: load.id,
          position,
          type: 'carrier' as const,
          onClick: () => {
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
        }
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
        // Use the real geocoding service instead of manual API calls
        const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
        if (accessToken) {
          const brokerLocation = await getBrokerDefaultLocation(user.uid);
          setFinalLocation(brokerLocation[0], brokerLocation[1]);
          return; // Exit after successful geocoding
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
            <div className={styles.metricValue}>{onTimeDelivery}%</div>
          </div>
                                       <div className={styles.metricCard}>
             <h3>Broker Profit</h3>
             <div className={styles.metricValue}>${brokerProfit.toLocaleString()}</div>
           </div>
                   <div className={styles.metricCard}>
            <h3>Outstanding Payments</h3>
            <div className={styles.metricValue}>${outstandingPayments.toLocaleString()}</div>
          </div>
                   <div className={styles.metricCard}>
            <h3>Carrier Partners</h3>
            <div className={styles.metricValue}>{carrierPartners}</div>
          </div>
                   <div className={styles.metricCard}>
            <h3>Total Loads</h3>
            <div className={styles.metricValue}>{loads.length}</div>
          </div>
                     
             </div>

       {/* Data Migration Status */}
       {(migrationStatus || migrationResults) && (
         <div className={styles.migrationStatus}>
           {migrationStatus && (
             <div className={styles.migrationMessage}>
               <span>{migrationStatus}</span>
             </div>
           )}
           {migrationResults && (
             <div className={styles.migrationResults}>
               <h4>Migration Results:</h4>
               <pre>{JSON.stringify(migrationResults, null, 2)}</pre>
             </div>
           )}
         </div>
       )}

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
