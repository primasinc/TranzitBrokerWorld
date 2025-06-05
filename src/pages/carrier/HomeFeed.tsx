import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MapboxMap from '../../components/common/MapboxMap';
import styles from './HomeFeed.module.css';
import LoadRequestCard from '../../components/carrier/LoadRequestCard';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

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
  const [availableLoads, setAvailableLoads] = useState<AvailableLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number]>([-87.6298, 41.8781]); // Default to Chicago
  const [activeTab, setActiveTab] = useState<TabType>('MARKETPLACE');
  const [partnerRequests, setPartnerRequests] = useState<any[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(true);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

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

  // Sample loads data
  const loads: AvailableLoad[] = [
    {
      id: '1',
      pickupLocation: {
        address: '123 Main St, Chicago, IL',
        position: [-87.6298, 41.8781]
      },
      deliveryLocation: {
        address: '456 Oak St, New York, NY',
        position: [-74.0060, 40.7128]
      },
      title: 'Chicago to New York'
    },
    {
      id: '2',
      pickupLocation: {
        address: '123 Main St, Los Angeles, CA',
        position: [-118.2437, 34.0522]
      },
      deliveryLocation: {
        address: '123 Main St, San Francisco, CA',
        position: [-122.4194, 37.7749]
      },
      title: 'LA to San Francisco'
    },
    // Add more sample loads as needed
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1>Carrier Dashboard</h1>
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
            <h2>Available Loads</h2>
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
                {loads.map((load) => (
                  <div key={load.id} className={styles.loadCard}>
                    <h3>{load.title}</h3>
                    <p>Pickup: {load.pickupLocation.address}</p>
                    <p>Delivery: {load.deliveryLocation.address}</p>
                    <button onClick={() => console.log('View details:', load)}>
                      View Details
                    </button>
                  </div>
                ))}
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