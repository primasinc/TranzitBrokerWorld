import React, { useState, useEffect, useMemo } from 'react';
import MapboxMap from '../../components/common/MapboxMap';
import styles from './AvailableLoads.module.css';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, query, where, collection, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import LoadRequestCard from '../../components/carrier/LoadRequestCard';
import { useAvailableLoads, AvailableLoad } from '../../hooks/useAvailableLoads';
import mapboxgl from 'mapbox-gl';
import { sendLoadRequestToCarrier, acceptLoadForPO } from '../../services/notificationService';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { MobileOptimizedList } from '../../components/common/MobileOptimizedList';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';

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

const VIEW_TYPES: Record<'MAP' | 'LIST', 'map' | 'list'> = {
  MAP: 'map',
  LIST: 'list',
};

function isViewType(val: any): val is 'map' | 'list' {
  return val === 'map' || val === 'list';
}

const TABS = {
  MARKETPLACE: 'Marketplace Loads',
  PARTNER: 'Partner Requests',
} as const;
type TabType = keyof typeof TABS;

const DEBUG_COORDS: [number, number] = [-85.7014272, 38.0567552]; // Louisville, KY area

function mapAvailableLoadToLoad(load: AvailableLoad): Load | null {
  // Defensive: Only map if pickupLocation and position are valid
  if (!load.pickupLocation || !Array.isArray(load.pickupLocation.position)) return null;
  return {
    id: load.id,
    position: load.pickupLocation.position,
    title: load.title,
    pickup: load.pickupLocation.address,
    delivery: load.deliveryLocation?.address || '',
    rate: load.rate ?? 0,
    distance: '', // Add logic if you want to calculate
    weight: '',   // Add to AvailableLoad if available
    dimensions: '' // Add to AvailableLoad if available
  };
}

// Helper to create a GeoJSON circle polygon in miles
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
    type: 'Feature' as 'Feature',
    geometry: {
      type: 'Polygon' as 'Polygon',
      coordinates: [ret]
    },
    properties: {}
  };
}

// Helper to check if a partner request is still valid
export async function isValidPartnerRequest(request: any): Promise<boolean> {
  // Check status
  if (!request.status || request.status !== 'pending') return false;
  // Check for related PO existence and status
  if (request.poNumber) {
    const poSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', request.poNumber)));
    if (poSnapshot.empty) return false;
    const poData = poSnapshot.docs[0].data();
    if (['cancelled', 'completed'].includes((poData.status || '').toLowerCase())) return false;
  }
  // Check for related load existence and status
  if (request.loadId) {
    const loadDoc = await getDoc(doc(db, 'loads', request.loadId));
    if (!loadDoc.exists()) return false;
    const loadData = loadDoc.data();
    if (['cancelled', 'completed'].includes((loadData.status || '').toLowerCase())) return false;
  }
  return true;
}

const AvailableLoads: React.FC = () => {
  console.log('AvailableLoads component loaded');
  const [viewType, setViewType] = useState<'map' | 'list'>('list');
  const [selectedLoad, setSelectedLoad] = useState<AvailableLoad | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<[number, number]>([-87.6298, 41.8781]);
  const [radiusMiles] = useState<number>(100);
  const [userId, setUserId] = useState<string | null>(null);
  const [eldApiKey, setEldApiKey] = useState<string | null>(null);
  const [eldApiId, setEldApiId] = useState<string | null>(null);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('MARKETPLACE');
  const [partnerRequests, setPartnerRequests] = useState<any[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();

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

  // Get optimal page size based on device conditions
  const optimalPageSize = getOptimalPageSize(10);

  // Mobile-specific state
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mapZoom, setMapZoom] = useState(10);

  // Use mobile-optimized loads hook
  const { 
    loads: availableLoads, 
    loading: loadsLoading, 
    error: loadsError, 
    hasMore, 
    loadMore 
  } = useAvailableLoads(userLocation, radiusMiles, optimalPageSize);

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      measurePerformance('available_loads_page_load', startTime);
    };
  }, [measurePerformance]);

  // Debug map container dimensions
  useEffect(() => {
    if (viewType === 'map') {
      const logContainerDimensions = () => {
        const mapSection = document.querySelector(`.${styles.mapSection}`);
        const mapContainer = document.querySelector(`.${styles.mapContainer}`);
        
        if (mapSection) {
          const sectionRect = mapSection.getBoundingClientRect();
          console.log('Map section dimensions:', {
            width: sectionRect.width,
            height: sectionRect.height,
            top: sectionRect.top,
            left: sectionRect.left
          });
        }
        
        if (mapContainer) {
          const containerRect = mapContainer.getBoundingClientRect();
          console.log('Map container dimensions:', {
            width: containerRect.width,
            height: containerRect.height,
            top: containerRect.top,
            left: containerRect.left
          });
        }
      };

      // Log immediately and after a delay
      logContainerDimensions();
      setTimeout(logContainerDimensions, 500);
      setTimeout(logContainerDimensions, 1000);
    }
  }, [viewType, styles.mapSection, styles.mapContainer]);

  // Check if we should fetch data based on conditions
  useEffect(() => {
    if (!shouldFetchData('loads')) {
      console.log('Skipping loads fetch due to poor conditions');
      return;
    }
  }, [shouldFetchData]);

  // Get user location - optional for carriers
  useEffect(() => {
    // Only request location if user is authenticated
    if (!user) {
      console.log('User not authenticated, skipping location request');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
          setLocationError(null);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Keep default location - don't block the app
          console.log('Using default location due to geolocation error');
          setLocationError(null); // Don't show error, just use default
        },
        {
          enableHighAccuracy: true, // High accuracy for carriers
          timeout: 10000, // 10 second timeout
          maximumAge: 300000 // 5 minutes cache
        }
      );
    } else {
      console.log('Geolocation not supported, using default location');
    }
  }, [user]); // Only run when user changes

  const handleLogout = () => navigate('/login');
  const handleProfile = () => navigate('/carrier/profile');
  const handleSettings = () => navigate('/carrier/settings');

  const handleAcceptLoad = async (load: Load) => {
    if (!user || !user.uid) return;
    try {
      // Fetch shipperId from the load (assume it's stored in Firestore, or fetch from PO if needed)
      const loadDoc = await getDoc(doc(db, 'loads', load.id));
      const loadData = loadDoc.data();
      if (!loadData) throw new Error('Load data not found.');
      const shipperId = loadData?.shipperId || loadData?.createdBy || '';
      if (!shipperId) throw new Error('Shipper ID not found for this load.');
      // Find the purchase order by poNumber
      let purchaseOrderId = '';
      if (loadData?.poNumber) {
        const poSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', loadData.poNumber)));
        if (!poSnapshot.empty) {
          purchaseOrderId = poSnapshot.docs[0].id;
        }
      }
      if (!purchaseOrderId) {
        console.error('Purchase Order not found for this load. Cannot send notification.');
        alert('Purchase Order not found for this load. Please try again.');
        return;
      }
      // Send notification to shipper with correct purchaseOrderId
      await sendLoadRequestToCarrier(user.uid, shipperId, purchaseOrderId, {
        pickupLocation: { address: load.pickup, city: '', state: '', zipCode: '', date: '', time: '' },
        deliveryLocation: { address: load.delivery, city: '', state: '', zipCode: '', date: '', time: '' },
        dimensions: { length: 0, width: 0, height: 0 },
        weight: 0,
        rate: load.rate,
        shipperCompany: '',
        poNumber: loadData.poNumber || ''
      });
      // --- Ensure backend workflow is triggered for marketplace loads ---
      await acceptLoadForPO(loadData.poNumber, user.uid, false);
    } catch (err) {
      alert('Failed to accept load: ' + (err as Error).message);
    }
  };

  const handleLoadSelect = (load: AvailableLoad) => {
    setSelectedLoad(load);
    if (viewType === 'list') {
      // On mobile, navigate to details page instead of showing sidebar
      navigate(`/carrier/loads/${load.id}`);
    }
  };

  const handleRefresh = async () => {
    // Force refresh of loads data
    window.location.reload();
  };

  // Mobile map controls
  const handleMapZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 1, 18));
  };

  const handleMapZoomOut = () => {
    setMapZoom(prev => Math.max(prev - 1, 4));
  };

  const handleMapFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen);
  };

  const handleMapReset = () => {
    setMapZoom(10);
    // Reset map to user location if available
    if (userLocation) {
      // This will be handled by the MapboxMap component
    }
  };

  // Render load item for mobile list
  const renderLoadItem = (load: AvailableLoad, index: number) => (
    <div 
      key={load.id}
      className={`${styles.loadCard} ${selectedLoad?.id === load.id ? styles.selected : ''}`}
      onClick={() => handleLoadSelect(load)}
    >
      <div className={styles.loadHeader}>
        <h3>{load.title}</h3>
        <span className={styles.rate}>${load.rate?.toLocaleString()}</span>
      </div>
      
      <div className={styles.loadInfo}>
        <div>
          <label>Pickup:</label>
          <span>{load.pickupLocation.address}</span>
        </div>
        <div>
          <label>Delivery:</label>
          <span>{load.deliveryLocation.address}</span>
        </div>
      </div>

      <div className={styles.loadActions}>
        <button 
          className={styles.viewButton}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/carrier/loads/${load.id}`);
          }}
        >
          View Details
        </button>
        <button 
          className={styles.bookButton}
          onClick={(e) => {
            e.stopPropagation();
            // Handle booking logic
            console.log('Book load:', load.id);
          }}
        >
          Book Load
        </button>
      </div>
    </div>
  );

  // Show loading state
  if (loadsLoading && availableLoads.length === 0) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.mainContent}>
          <div className={styles.loading}>
            <div className="loading-spinner"></div>
            <p>Loading available loads...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadsError) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.mainContent}>
          <div className={styles.error}>
            <h3>Error Loading Loads</h3>
            <p>{loadsError}</p>
            <button onClick={handleRefresh}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.mainContent}>
        {/* Header */}
        <div className={styles.headerCard}>
          <div className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <h1>Available Loads</h1>
              <p>Find loads near your location</p>
            </div>
            <div className={styles.headerRight}>
              {/* Notification bell */}
              <button
                className={styles.bellButton}
                onClick={() => setShowNotifications(v => !v)}
              >
                <span role="img" aria-label="Notifications">🔔</span>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'red',
                    color: 'white',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    zIndex: 10
                  }}>{unreadCount}</span>
                )}
              </button>
              {showNotifications && <NotificationsTray onClose={() => setShowNotifications(false)} />}
              
              {/* Hamburger menu */}
              <div className={styles.menuContainer}>
                <button 
                  className={styles.hamburgerButton}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
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

        {/* View Toggle Controls */}
        <div className={styles.viewToggleContainer}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleButton} ${viewType === 'list' ? styles.active : ''}`}
              onClick={() => setViewType('list')}
            >
              List
            </button>
            <button
              className={`${styles.toggleButton} ${viewType === 'map' ? styles.active : ''}`}
              onClick={() => setViewType('map')}
            >
              Map
            </button>
          </div>
        </div>

        {/* Content */}
        {viewType === 'map' ? (
          // Map view - mobile optimized
          <div className={styles.mapSection}>
            <div className={styles.mapContainer}>
              <MapboxMap 
                center={userLocation}
                zoom={mapZoom}
                markers={availableLoads.map(load => ({
                  id: load.id,
                  position: load.pickupLocation.position,
                  type: 'shipper' as const,
                  icon: 'circle',
                  onClick: () => handleLoadSelect(load)
                }))}
                onMapLoad={(map) => {
                  console.log('Map loaded successfully on AvailableLoads page');
                  console.log('Map container dimensions:', map.getContainer().getBoundingClientRect());
                  console.log('Map center:', map.getCenter());
                  console.log('Map zoom:', map.getZoom());
                }}
              />
              {/* Mobile map controls */}
              <div className={styles.mapControls}>
                <button 
                  className={styles.mapControlButton}
                  onClick={handleMapZoomIn}
                  title="Zoom In"
                >
                  +
                </button>
                <button 
                  className={styles.mapControlButton}
                  onClick={handleMapZoomOut}
                  title="Zoom Out"
                >
                  −
                </button>
                <button 
                  className={styles.mapControlButton}
                  onClick={handleMapReset}
                  title="Reset View"
                >
                  ⌂
                </button>
                <button 
                  className={styles.mapControlButton}
                  onClick={handleMapFullscreen}
                  title="Fullscreen"
                >
                  ⛶
                </button>
              </div>
            </div>
            {selectedLoad && (
              <div className={styles.selectedLoadDetails}>
                <h3>{selectedLoad.title}</h3>
                <p><strong>Rate:</strong> ${selectedLoad.rate?.toLocaleString()}</p>
                <p><strong>Pickup:</strong> {selectedLoad.pickupLocation.address}</p>
                <p><strong>Delivery:</strong> {selectedLoad.deliveryLocation.address}</p>
                <button 
                  className={styles.detailsButton}
                  onClick={() => navigate(`/carrier/loads/${selectedLoad.id}`)}
                >
                  View Full Details
                </button>
              </div>
            )}
          </div>
        ) : (
          // List view - mobile optimized
          <div className={styles.listView}>
            {availableLoads.length === 0 ? (
              <div className={styles.noLoads}>
                <h3>No Available Loads</h3>
                <p>No loads found in your area. Try expanding your search radius or check back later.</p>
              </div>
            ) : (
              <MobileOptimizedList
                items={availableLoads}
                renderItem={renderLoadItem}
                keyExtractor={(item) => item.id}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loading={loadsLoading}
                itemHeight={120}
                containerHeight={window.innerHeight - 200}
                enableVirtualization={!isLowBandwidth}
                enablePullToRefresh={true}
                onRefresh={handleRefresh}
                className={styles.mobileLoadsList}
              />
            )}
          </div>
        )}

        {/* Mobile performance indicator */}
        {(isLowBandwidth || isLowBattery) && (
          <div className={styles.performanceIndicator}>
            {isLowBandwidth && <span>📶 Slow connection</span>}
            {isLowBattery && <span>🔋 Low battery</span>}
          </div>
        )}
      </div>
    </div>
  );
};

function PartnerRequestsList({ partnerRequests }: { partnerRequests: any[] }) {
  const [validRequests, setValidRequests] = React.useState<any[]>([]);
  React.useEffect(() => {
    let isMounted = true;
    async function filterRequests() {
      const filtered = [];
      for (const req of partnerRequests) {
        if (await isValidPartnerRequest(req)) filtered.push(req);
      }
      if (isMounted) setValidRequests(filtered);
    }
    filterRequests();
    return () => { isMounted = false; };
  }, [partnerRequests]);
  if (validRequests.length === 0) return <div>No partner requests at this time.</div>;
  return (
    <>
      {validRequests.map((request) => (
        <LoadRequestCard
          key={request.id}
          notification={request}
          onStatusUpdate={() => {}}
        />
      ))}
    </>
  );
}

export default AvailableLoads;