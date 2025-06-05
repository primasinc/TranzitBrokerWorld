import React, { useState, useEffect } from 'react';
import MapboxMap from '../../components/common/MapboxMap';
import styles from './AvailableLoads.module.css';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import LoadRequestCard from '../../components/carrier/LoadRequestCard';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

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

const AvailableLoads: React.FC = () => {
  console.log('AvailableLoads component loaded');
  const [viewType, setViewType] = useState<'map' | 'list'>('map');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [carrierLocation, setCarrierLocation] = useState<[number, number] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [eldApiKey, setEldApiKey] = useState<string | null>(null);
  const [eldApiId, setEldApiId] = useState<string | null>(null);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('MARKETPLACE');
  const [partnerRequests, setPartnerRequests] = useState<any[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(true);

  const loads: Load[] = [
    {
      id: '1',
      position: [-87.6298, 41.8781], // [longitude, latitude] for Mapbox
      title: 'Chicago to New York',
      pickup: 'Chicago, IL',
      delivery: 'New York, NY',
      rate: 3500,
      distance: '787 miles',
      weight: '15,000 lbs',
      dimensions: '53\' Trailer'
    },
    {
      id: '2',
      position: [-118.2437, 34.0522], // [longitude, latitude] for Mapbox
      title: 'LA to San Francisco',
      pickup: 'Los Angeles, CA',
      delivery: 'San Francisco, CA',
      rate: 1800,
      distance: '383 miles',
      weight: '10,000 lbs',
      dimensions: '48\' Trailer'
    },
    // Add more sample loads as needed
  ];

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

  const handleLogout = () => navigate('/login');
  const handleProfile = () => navigate('/carrier/profile');
  const handleSettings = () => navigate('/carrier/settings');

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
          viewType === 'map' ? (
            <div className={styles.mapSection}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <div className={styles.viewToggle} style={{ margin: 0 }}>
                    <button
                      className={`${styles.toggleButton} ${viewType === 'map' ? styles.active : ''}`}
                      onClick={() => setViewType('map')}
                    >
                      Map View
                    </button>
                    <button
                      className={`${styles.toggleButton} ${(viewType as any) === 'list' ? styles.active : ''}`}
                      onClick={() => setViewType('list')}
                    >
                      List View
                    </button>
                  </div>
                </div>
                <div className={styles.mapContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <MapboxMap
                    center={carrierLocation || [-98.5795, 39.8283]}
                    zoom={carrierLocation ? 10 : 4}
                    eldApiKey={eldApiKey || undefined}
                    showKonexialVehicles={true}
                    enableRealtime={true}
                    markers={[
                      ...loads.map(load => ({
                        id: load.id,
                        position: load.position,
                        type: 'shipper' as const,
                        onClick: () => setSelectedLoad(load)
                      })),
                    ]}
                  />
                </div>
              </div>
              {selectedLoad && (
                <div className={styles.selectedLoadDetails}>
                  {renderLoadCard(selectedLoad)}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.listView}>
              {loads.map(renderLoadCard)}
            </div>
          )
        ) : (
          <div className={styles.listView}>
            {partnerLoading ? (
              <div>Loading partner requests...</div>
            ) : partnerRequests.filter(r => r.status === 'pending').length === 0 ? (
              <div>No partner requests at this time.</div>
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
      </main>
    </div>
  );
};

export default AvailableLoads;