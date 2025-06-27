import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MapboxMap from '../../components/common/MapboxMap';
import styles from './HomeFeed.module.css';
import LoadRequestCard from '../../components/carrier/LoadRequestCard';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';
import { useAvailableLoads } from '../../hooks/useAvailableLoads';
import { isValidPartnerRequest } from './AvailableLoads';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';

interface AvailableLoad {
  id: string;
  pickupLocation: {
    address: string;
    position: [number, number];
  };
  deliveryLocation: {
    address: string;
    position: [number, number];
  };
  title: string;
  // ... other existing properties ...
}

const TABS = {
  MARKETPLACE: 'Marketplace Loads',
  PARTNER: 'Partner Requests',
} as const;
type TabType = keyof typeof TABS;

const HomeFeed: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewType, setViewType] = useState<'map' | 'list'>('map');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<[number, number]>([-87.6298, 41.8781]); // Default to Chicago
  const [radiusMiles] = useState<number>(100); // You can make this configurable if needed
  const [activeTab, setActiveTab] = useState<TabType>('MARKETPLACE');
  const [partnerRequests, setPartnerRequests] = useState<any[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [validRequests, setValidRequests] = React.useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const { 
    networkInfo, 
    batteryInfo, 
    isLowBandwidth, 
    isLowBattery, 
    getOptimalPageSize,
    shouldFetchData 
  } = useMobileOptimization();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice || window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    loads: availableLoads,
    loading: loadsLoading,
    error: loadsError,
    hasMore: hasMoreLoads,
    loadMore: loadMoreLoads
  } = useAvailableLoads(
    userLocation, // Pass user location for location-based filtering
    100, // radiusMiles
    getOptimalPageSize(isLowBandwidth || isLowBattery ? 5 : 10) // Dynamic page size based on conditions
  );

  useEffect(() => {
    if (!user) return;
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

  // Get user location - optional for carriers
  useEffect(() => {
    // Only request location if user is authenticated
    if (!user) {
      console.log('User not authenticated, skipping location request');
      return;
    }

    let watchId: number | null = null;
    function requestLocation() {
      setLocationError(null);
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setUserLocation([position.coords.longitude, position.coords.latitude]);
            setLocationError(null);
          },
          (error) => {
            console.warn('Geolocation error:', error);
            // Don't block the app - just use default location
            setLocationError(null);
          },
          { 
            enableHighAccuracy: true, // High accuracy for carriers
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
          }
        );
      } else {
        console.log('Geolocation not supported, using default location');
      }
    }
    requestLocation();
    return () => {
      if (watchId !== null && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]); // Only run when user changes

  React.useEffect(() => {
    let isMounted = true;
    async function filterAndDedupe() {
      const seen = new Set();
      const valid: any[] = [];
      for (const req of partnerRequests.filter(r => r.status === 'pending')) {
        if (await isValidPartnerRequest(req)) {
          const poNum = req.loadDetails?.poNumber || req.poNumber;
          if (!seen.has(poNum)) {
            seen.add(poNum);
            valid.push(req);
          }
        }
      }
      if (isMounted) setValidRequests(valid);
    }
    filterAndDedupe();
    return () => { isMounted = false; };
  }, [partnerRequests]);

  // State for current load (mock data for now)
  const [currentLoad] = useState({
    poNumber: 'PO-2024-001',
    shipperName: 'ABC Manufacturing',
    contact: 'John Smith (555) 123-4567',
    pickup: {
      location: '123 Factory St, Detroit, MI',
      time: '2024-01-15 08:00 AM'
    },
    delivery: {
      location: '456 Warehouse Ave, Chicago, IL',
      time: '2024-01-16 02:00 PM'
    },
    product: {
      description: 'Automotive parts - Engine components',
      size: '48ft x 8.5ft x 8.5ft',
      weight: '45,000 lbs'
    },
    notes: 'Handle with care. Temperature controlled shipment required.'
  });

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1>Carrier Dashboard</h1>
          <div className={styles.headerControls}>
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
                  <button onClick={() => navigate('/carrier/profile')}>Account</button>
                  <button onClick={() => navigate('/carrier/settings')}>Settings</button>
                  <button 
                    onClick={handleLogout}
                    className={styles.logoutButton}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Performance Indicator */}
        {(isLowBandwidth || isLowBattery) && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '12px',
            fontSize: '12px',
            color: '#856404',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📱</span>
            <span>
              {isLowBandwidth ? 'Slow connection detected - Optimized loading enabled' : ''}
              {isLowBattery ? 'Low battery detected - Reduced data loading' : ''}
            </span>
          </div>
        )}

        <div className={styles.content}>
          {/* Current Load Information */}
          <section className={styles.currentLoad}>
            <h2>Current Load Information</h2>
            <div className={styles.loadDetails}>
              <div className={styles.loadInfo}>
                <p><strong>PO Number:</strong> {currentLoad.poNumber}</p>
                <p><strong>Shipper Name:</strong> {currentLoad.shipperName}</p>
                <p><strong>Contact Information:</strong> {currentLoad.contact}</p>
              </div>
              
              <div className={styles.locations}>
                <div>
                  <h3>Pickup Location</h3>
                  <p>{currentLoad.pickup.location}</p>
                  <p>{currentLoad.pickup.time}</p>
                </div>
                <div>
                  <h3>Delivery Location</h3>
                  <p>{currentLoad.delivery.location}</p>
                  <p>{currentLoad.delivery.time}</p>
                </div>
              </div>

              <div className={styles.productInfo}>
                <h3>Product Description</h3>
                <p>{currentLoad.product.description}</p>
                <div className={styles.dimensions}>
                  <p><strong>Size:</strong> {currentLoad.product.size}</p>
                  <p><strong>Weight:</strong> {currentLoad.product.weight}</p>
                </div>
                <p><strong>Notes:</strong> {currentLoad.notes}</p>
              </div>
            </div>
          </section>

          {/* Available Loads */}
          <section className={styles.availableLoads}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Available Loads</h2>
              {availableLoads.length > 0 && (
                <a
                  href="/carrier/available-loads"
                  style={{ color: '#007bff', textDecoration: 'underline', fontWeight: 500, fontSize: 14 }}
                >
                  See all
                </a>
              )}
            </div>
            <div className={styles.viewToggle}>
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
            {activeTab === 'MARKETPLACE' ? (
              <div className={styles.listView}>
                {loadsLoading ? (
                  <div>Loading available loads...</div>
                ) : loadsError ? (
                  <div>Error loading loads: {loadsError}</div>
                ) : availableLoads.filter(load => load.isMarketplace === true).length === 0 ? (
                  <div>No available loads in your area.</div>
                ) : (
                  <>
                    {availableLoads
                      .filter(load => load.isMarketplace === true && load && load.pickupLocation && load.deliveryLocation && load.pickupLocation.address && load.deliveryLocation.address)
                      .map((load) => (
                        <div key={load.id} className={styles.loadCard}>
                          <h3>{load.title}</h3>
                          <p>Pickup: {load.pickupLocation.address}</p>
                          <p>Delivery: {load.deliveryLocation.address}</p>
                          <p>Rate: {load.rate ? `$${load.rate.toLocaleString()}` : '—'}</p>
                          <button onClick={() => console.log('View details:', load)}>
                            View Details
                          </button>
                        </div>
                      ))}
                    {hasMoreLoads && (
                      <button 
                        onClick={loadMoreLoads}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginTop: '12px'
                        }}
                      >
                        Load More Loads
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className={styles.listView}>
                {partnerLoading ? (
                  <div>Loading partner loads...</div>
                ) : validRequests.length === 0 ? (
                  <div>No partner loads at this time.</div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    {!isMobile && (
                      <table className={styles.partnerTable}>
                        <thead>
                          <tr>
                            <th>PO Number</th>
                            <th>Shipper</th>
                            <th>Pickup</th>
                            <th>Delivery</th>
                            <th>Rate</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {validRequests.slice(0, 5).map((request) => (
                            <tr key={request.id}>
                              <td>{request.loadDetails?.poNumber || '-'}</td>
                              <td>{request.loadDetails?.shipperCompany || '-'}</td>
                              <td>{request.loadDetails?.pickupLocation?.address || '-'}</td>
                              <td>{request.loadDetails?.deliveryLocation?.address || '-'}</td>
                              <td>{typeof request.loadDetails?.rate === 'number' ? `$${request.loadDetails.rate}` : '-'}</td>
                              <td>
                                <a
                                  href="/carrier/available-loads#partner"
                                  style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 }}
                                >
                                  View
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    
                    {/* Mobile Card View */}
                    {isMobile && (
                      <div className={styles.mobilePartnerCards}>
                        {validRequests.slice(0, 5).map((request) => (
                          <div key={request.id} className={styles.partnerCard}>
                            <h4>PO: {request.loadDetails?.poNumber || 'N/A'}</h4>
                            <p><strong>Shipper:</strong> {request.loadDetails?.shipperCompany || 'N/A'}</p>
                            <p><strong>Pickup:</strong> {request.loadDetails?.pickupLocation?.address || 'N/A'}</p>
                            <p><strong>Delivery:</strong> {request.loadDetails?.deliveryLocation?.address || 'N/A'}</p>
                            <p className={styles.rate}>
                              <strong>Rate:</strong> {typeof request.loadDetails?.rate === 'number' ? `$${request.loadDetails.rate}` : 'N/A'}
                            </p>
                            <a
                              href="/carrier/available-loads#partner"
                              className={styles.viewLink}
                            >
                              View Details
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
      <div className={styles.complianceAlert}>
        <div className={styles.alertHeader}>
          <h3>📋 Compliance Status</h3>
          <span className={styles.compliantBadge}>Compliant</span>
        </div>
        <p>All required documents are up to date. Next document expiration: Insurance (Dec 31, 2024)</p>
      </div>
    </div>
  );
};

export default HomeFeed; 