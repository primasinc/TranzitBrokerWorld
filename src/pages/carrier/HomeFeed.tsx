import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MapboxMap from '../../components/common/MapboxMap';
import styles from './HomeFeed.module.css';
import LoadRequestCard from '../../components/carrier/LoadRequestCard';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import NotificationsTray, { useUnreadNotifications } from '../carrier/NotificationsTray';
import { useAvailableLoads } from '../../hooks/useAvailableLoads';

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
  PARTNER: 'Partner Loads',
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

  const { loads: availableLoads, loading: loadsLoading, error: loadsError } = useAvailableLoads(userLocation, radiusMiles);

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

  // Prompt for geolocation immediately and block UI if denied
  useEffect(() => {
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

  const currentLoad = {
    poNumber: 'PO-12345',
    shipperName: 'ABC Logistics',
    contact: 'John Doe | 555-0123',
    pickup: {
      location: '123 Pickup St, City, ST',
      time: '2024-02-23 14:00',
    },
    delivery: {
      location: '456 Delivery Ave, City, ST',
      time: '2024-02-24 10:00',
    },
    product: {
      description: 'Electronics',
      size: '48" x 48" x 48"',
      weight: '2000 lbs',
    },
    notes: 'Handle with care. Liftgate required.',
  };

  const handleLogout = () => {
    navigate('/login');
  };

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
        <header className={styles.header}>
          <h1>Carrier Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <button
              className={styles.bellButton}
              onClick={() => setShowNotifications(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative' }}
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
        </header>
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
                Partner Loads
              </button>
            </div>
            {activeTab === 'MARKETPLACE' ? (
              <div className={styles.listView}>
                {loadsLoading ? (
                  <div>Loading available loads...</div>
                ) : loadsError ? (
                  <div>Error loading loads: {loadsError}</div>
                ) : availableLoads.length === 0 ? (
                  <div>No available loads in your area.</div>
                ) : (
                  availableLoads
                    .filter(load => load && load.pickupLocation && load.deliveryLocation && load.pickupLocation.address && load.deliveryLocation.address)
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
                    ))
                )}
              </div>
            ) : (
              <div className={styles.listView}>
                {partnerLoading ? (
                  <div>Loading partner loads...</div>
                ) : partnerRequests.filter(r => r.status === 'pending').length === 0 ? (
                  <div>No partner loads at this time.</div>
                ) : (
                  partnerRequests.filter(r => r.status === 'pending').map((request) => (
                    <LoadRequestCard
                      key={request.id}
                      notification={request}
                      onStatusUpdate={() => {}}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default HomeFeed; 