import React, { useState, useEffect, useMemo } from 'react';
import MapboxMap from '../../components/common/MapboxMap';
import styles from './AvailableLoads.module.css';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, query, where, collection, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import LoadRequestCard from '../../components/carrier/LoadRequestCard';
import { useAvailableLoads } from '../../hooks/useAvailableLoads';
import mapboxgl from 'mapbox-gl';
import { sendLoadRequestToCarrier, acceptLoadForPO } from '../../services/notificationService';

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

function mapAvailableLoadToLoad(load: import('../../hooks/useAvailableLoads').AvailableLoad): Load | null {
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
  const [viewType, setViewType] = useState<'map' | 'list'>('map');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [carrierLocation, setCarrierLocation] = useState<[number, number] | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<number>(100);
  const [userId, setUserId] = useState<string | null>(null);
  const [eldApiKey, setEldApiKey] = useState<string | null>(null);
  const [eldApiId, setEldApiId] = useState<string | null>(null);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('MARKETPLACE');
  const [partnerRequests, setPartnerRequests] = useState<any[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { loads: availableLoads, loading: loadsLoading, error: loadsError } = useAvailableLoads(carrierLocation, radiusMiles);

  const [popupLoad, setPopupLoad] = useState<Load | null>(null);
  const [accepting, setAccepting] = useState(false);

  const mapMarkers = useMemo(() => {
    const markers = availableLoads
      .map(l => mapAvailableLoadToLoad(l))
      .filter((l): l is Load => !!l && Array.isArray(l.position))
      .map(l => {
        console.log('Map marker for load:', l.title, 'at', l.position);
        return {
          id: l.id,
          position: l.position,
          type: 'shipper' as const,
          icon: 'circle', // Use a colored circle icon
          onClick: () => setPopupLoad(l)
        };
      });
    return markers;
  }, [availableLoads, setPopupLoad]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user);
      if (user) {
        setUserId(user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('User doc data:', JSON.stringify(data, null, 2));
          if (data.eldApiKey) setEldApiKey(data.eldApiKey);
          if (data.eldApiId) setEldApiId(data.eldApiId);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Fetch partner requests (notifications)
    setPartnerLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('carrierId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: any[] = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      setPartnerRequests(requests);
      setPartnerLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Prompt for geolocation immediately and block UI if denied
  useEffect(() => {
    let watchId: number | null = null;
    function requestLocation() {
      setLocationError(null);
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCarrierLocation([position.coords.longitude, position.coords.latitude]);
            setLocationError(null);
        },
        (error) => {
            setLocationError('Location access is required to use this app. Please enable location services and reload.');
        },
        { enableHighAccuracy: true }
      );
      } else {
        setLocationError('Geolocation is not supported by your browser.');
      }
    }
    requestLocation();
    return () => {
      if (watchId !== null && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Debug logging for geolocation and loads
  useEffect(() => {
    console.log('carrierLocation:', carrierLocation);
  }, [carrierLocation]);
  useEffect(() => {
    console.log('availableLoads:', availableLoads);
  }, [availableLoads]);

  const handleLogout = () => navigate('/login');
  const handleProfile = () => navigate('/carrier/profile');
  const handleSettings = () => navigate('/carrier/settings');

  const handleAcceptLoad = async (load: Load) => {
    if (!user || !user.uid) return;
    setAccepting(true);
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
        setAccepting(false);
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
      setPopupLoad(null);
    } catch (err) {
      alert('Failed to accept load: ' + (err as Error).message);
    } finally {
      setAccepting(false);
    }
  };

  const renderLoadCard = (load: Load) => (
    <div 
      key={load.id} 
      className={`${styles.loadCard} ${selectedLoad?.id === load.id ? styles.selected : ''}`}
      onClick={() => setSelectedLoad(load)}
    >
      <h3>{load.title}</h3>
      <div className={styles.loadDetails}>
        <p><strong>Pickup:</strong> {load.pickup}</p>
        <p><strong>Delivery:</strong> {load.delivery}</p>
        <p><strong>Rate:</strong> ${load.rate.toLocaleString()}</p>
        <p><strong>Distance:</strong> {load.distance}</p>
        <p><strong>Weight:</strong> {load.weight}</p>
        <p><strong>Dimensions:</strong> {load.dimensions}</p>
      </div>
      <button className={styles.detailsButton}>View Details</button>
    </div>
  );

  if (locationError) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(255,255,255,0.98)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <h2>Location Required</h2>
        <p>{locationError}</p>
        <button
          style={{ padding: '12px 24px', fontSize: 18, marginTop: 24 }}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <div className={styles.headerCard}>
          <header className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <h1>Available Loads</h1>
            </div>
            <div className={styles.headerRight}>
              <button
                className={styles.bellButton}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative' }}
                tabIndex={0}
                aria-label="Notifications"
              >
                <span role="img" aria-label="Notifications">🔔</span>
              </button>
              <div className={styles.menuContainer}>
                <button 
                  className={styles.hamburgerButton}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Menu"
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
          </header>
        </div>
        {/* Tabs for Partner Requests and Marketplace Loads */}
        <div className={styles.viewToggle} style={{ marginBottom: 16 }}>
          <button
            className={`${styles.toggleButton} ${activeTab === 'MARKETPLACE' ? styles.active : ''}`}
            onClick={() => setActiveTab('MARKETPLACE')}
          >
            Marketplace Loads
          </button>
          <button
            className={`${styles.toggleButton} ${activeTab === 'PARTNER' ? styles.active : ''}`}
            onClick={() => setActiveTab('PARTNER')}
          >
            Partner Requests
          </button>
        </div>
        {/* Tab Content */}
        {activeTab === 'MARKETPLACE' ? (
          <div className={styles.mapSection}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Radius slider */}
              <div style={{ width: '100%', maxWidth: 400, margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                <label htmlFor="radius-slider" style={{ fontWeight: 500 }}>Radius:</label>
                <input
                  id="radius-slider"
                  type="range"
                  min={0}
                  max={400}
                  step={10}
                  value={radiusMiles}
                  onChange={e => setRadiusMiles(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: 48 }}>{radiusMiles} mi</span>
              </div>
              <div className={styles.mapContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <MapboxMap
                  center={carrierLocation ? carrierLocation : [-98.5795, 39.8283]}
                  zoom={carrierLocation ? 10 : 4}
                  eldApiKey={eldApiKey || undefined}
                  showKonexialVehicles={true}
                  enableRealtime={true}
                  markers={mapMarkers}
                  onMapLoad={map => {
                    if (map.getLayer('radius')) map.removeLayer('radius');
                    if (map.getSource('radius')) map.removeSource('radius');
                    if (carrierLocation && radiusMiles > 0) {
                      // Create a true geographic circle polygon
                      const circleGeoJSON = createGeoJSONCircle(carrierLocation, radiusMiles);
                      map.addSource('radius', {
                        type: 'geojson',
                        data: circleGeoJSON
                      });
                      map.addLayer({
                        id: 'radius',
                        type: 'fill',
                        source: 'radius',
                        paint: {
                          'fill-color': '#4285F4',
                          'fill-opacity': 0.12
                        }
                      });
                      map.addLayer({
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
                      // Use first and opposite point for bounds, convert to LngLat
                      const bounds = new mapboxgl.LngLatBounds(
                        new mapboxgl.LngLat(coordinates[0][0], coordinates[0][1]),
                        new mapboxgl.LngLat(coordinates[Math.floor(coordinates.length / 2)][0], coordinates[Math.floor(coordinates.length / 2)][1])
                      );
                      coordinates.forEach(coord => bounds.extend(new mapboxgl.LngLat(coord[0], coord[1])));
                      map.fitBounds(bounds, { padding: 40, maxZoom: 12 });
                    }
                  }}
                />
              </div>
            </div>
            {selectedLoad && (
              <div className={styles.selectedLoadDetails}>
                {renderLoadCard(selectedLoad)}
              </div>
            )}
            {popupLoad && (
              <div style={{
                position: 'fixed',
                left: '50%',
                top: '20%',
                transform: 'translate(-50%, 0)',
                zIndex: 2000,
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                padding: 28,
                minWidth: 340,
                maxWidth: 400,
                border: '1px solid #e0e0e0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}>
                <button style={{ position: 'absolute', top: 10, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }} onClick={() => setPopupLoad(null)}>&times;</button>
                <h2 style={{ margin: '0 0 8px 0' }}>{popupLoad.title}</h2>
                <p style={{ margin: 0 }}><strong>Pickup:</strong> {popupLoad.pickup}</p>
                <p style={{ margin: 0 }}><strong>Delivery:</strong> {popupLoad.delivery}</p>
                <p style={{ margin: 0 }}><strong>Rate:</strong> {popupLoad.rate ? `$${popupLoad.rate.toLocaleString()}` : '—'}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                  <button style={{ background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} onClick={() => handleAcceptLoad(popupLoad)} disabled={accepting}>{accepting ? 'Accepting...' : 'Accept'}</button>
                  <button style={{ background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Reject</button>
                  <button style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Make Offer</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.listView}>
            {partnerLoading ? (
              <div>Loading partner requests...</div>
            ) : (
              <React.Suspense fallback={<div>Loading...</div>}>
                <PartnerRequestsList partnerRequests={partnerRequests} />
              </React.Suspense>
            )}
          </div>
        )}
      </main>
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