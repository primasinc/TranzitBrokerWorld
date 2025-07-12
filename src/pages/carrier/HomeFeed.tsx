import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MapboxMap from '../../components/common/MapboxMap';
import styles from './HomeFeed.module.css';
import LoadRequestCard from '../../components/carrier/LoadRequestCard';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';
import { useAvailableLoads, getFilteredMarketplaceLoads } from '../../hooks/useAvailableLoads';
import { isValidPartnerRequest } from './AvailableLoads';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { usePartnerRequestLoads } from '../../hooks/usePartnerRequestLoads';
import { useCarrierPartnerRequests } from '../../hooks/useCarrierPartnerRequests';

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

interface PurchaseOrder {
  id?: string;
  poNumber?: string;
  date?: string;
  vendorInfo?: { name?: string };
  companyInfo?: { name?: string };
  shipTo?: { name?: string };
  status?: string;
  amount?: number;
  total?: number;
  items?: any[];
  shipperCompany?: string;
  [key: string]: any;
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
  const { user, isLoading } = useAuth();
  console.log('HomeFeed - isLoading:', isLoading, 'user:', user);
  const [userLocation, setUserLocation] = useState<[number, number]>([-87.6298, 41.8781]); // Default to Chicago
  const [locationLoading, setLocationLoading] = useState(true); // Track if real location is set
  const [radiusMiles] = useState<number>(100); // You can make this configurable if needed
  const [activeTab, setActiveTab] = useState<TabType>('MARKETPLACE');
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
  const { partnerRequests: poPartnerRequests, loading: poPartnerLoading } = useCarrierPartnerRequests();

  // Get real user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
          setLocationError(null);
          setLocationLoading(false);
        },
        (error) => {
          setLocationError('Unable to get location, using default.');
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    } else {
      setLocationError('Geolocation not supported, using default.');
      setLocationLoading(false);
    }
  }, []);

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

  // Remove partnerRequests state and notification fetching logic
  // const [partnerRequests, setPartnerRequests] = useState<any[]>([]);
  // const [partnerLoading, setPartnerLoading] = useState(true);
  // useEffect(() => { ... notification logic ... });

  // Use the new hook for partner requests
  const { merged: mergedPartnerRequests, loading: mergedPartnerLoading, error: mergedPartnerError } = usePartnerRequestLoads();

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

  // Filter out loads from marketplace if there is a matching partner request for this carrier
  const filteredMarketplaceLoads = React.useMemo(
    () => {
      const result = getFilteredMarketplaceLoads(availableLoads, poPartnerRequests);
      console.log('HomeFeed - userLocation:', userLocation);
      console.log('HomeFeed - availableLoads:', availableLoads);
      console.log('HomeFeed - filteredMarketplaceLoads:', result);
      return result;
    },
    [availableLoads, poPartnerRequests, userLocation]
  );

  // Remove the full-page loading spinner. Always render the main UI.
  // If loading, show a small non-blocking indicator only in the available loads section.
  // If no loads, show a message only in that section.

  // Debug: Log availableLoads and loading state
  console.log('HomeFeed - availableLoads:', availableLoads);
  console.log('HomeFeed - isLoading:', isLoading, 'locationLoading:', locationLoading);

  // Fallback UI if no loads are found
  if (!isLoading && !locationLoading && availableLoads.length === 0) {
    return <div style={{textAlign: 'center', marginTop: 40}}>No available loads found in your area.</div>;
  }

  // Deduplicate mergedPartnerRequests by poNumber or loadId
  function dedupePartnerRequests(requests: any[]) {
    const seen = new Set();
    return requests.filter(({ partnerRequest }) => {
      const key = partnerRequest.poNumber || partnerRequest.loadId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

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
                {loadsError ? (
                  <div>Error loading loads: {loadsError}</div>
                ) : filteredMarketplaceLoads.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: '20px 0', color: '#888' }}>No loads available</div>
                ) : (
                  <>
                    {filteredMarketplaceLoads
                      .filter(load => load.isMarketplace === true && load && load.pickupLocation && load.deliveryLocation && load.pickupLocation.address && load.deliveryLocation.address)
                      .map((load) => {
                        // Always use companyInfo?.name as the Shipper Name
                        const shipperName = (load as any).companyInfo && typeof (load as any).companyInfo === 'object' && 'name' in (load as any).companyInfo && typeof (load as any).companyInfo.name === 'string'
                          ? (load as any).companyInfo.name
                          : 'Unknown Shipper';
                        return (
                          <div key={load.id} className={styles.loadCard} style={{ marginBottom: 16, padding: 16, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: '#fff', border: '1px solid #eee' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1976d2', marginBottom: 4 }}>
                              PO Number: {load.poNumber || '-'}
                            </div>
                            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{shipperName}</div>
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ fontWeight: 600 }}>Pickup:</span> {load.pickupLocation.address}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ fontWeight: 600 }}>Delivery:</span> {load.deliveryLocation.address}
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <span style={{ fontWeight: 600 }}>Rate:</span> {load.rate ? `$${load.rate.toLocaleString()}` : '—'}
                            </div>
                            <button onClick={() => console.log('View details:', load)} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>
                              View Details
                            </button>
                          </div>
                        );
                      })}
                  </>
                )}
              </div>
            ) : (
              <div className={styles.listView}>
                {mergedPartnerLoading ? (
                  <div>Loading partner loads...</div>
                ) : mergedPartnerRequests.length === 0 ? (
                  <div>No partner loads at this time.</div>
                ) : (
                  <table className={styles.partnerTable} style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px' }}>PO Number</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Shipper</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Pickup</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Pickup Date</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Delivery</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Delivery Date</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dedupePartnerRequests(mergedPartnerRequests).map(({ partnerRequest, po }) => (
                        <tr key={partnerRequest.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px' }}>
                            <a
                              href={`/carrier/available-loads#partner&po=${po?.poNumber || partnerRequest.poNumber}`}
                              className={styles.poLink}
                              style={{ fontWeight: 600 }}
                            >
                              {po?.poNumber || partnerRequest.poNumber || '-'}
                            </a>
                          </td>
                          <td style={{ padding: '8px' }}>{po?.shipperCompany || '-'}</td>
                          <td style={{ padding: '8px' }}>{po?.pickupLocation?.address || '-'}</td>
                          <td style={{ padding: '8px' }}>{po?.pickupLocation?.date || '-'}</td>
                          <td style={{ padding: '8px' }}>{po?.deliveryLocation?.address || '-'}</td>
                          <td style={{ padding: '8px' }}>{po?.deliveryLocation?.date || '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#1976d2' }}>{po?.rate ? `$${po.rate}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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