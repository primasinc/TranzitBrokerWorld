import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import styles from './MyLoads.module.css';
import { onAuthStateChanged } from 'firebase/auth';
import { konexialService } from '../../services/konexialService';
import InvoiceModal from '../../components/carrier/InvoiceModal';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';

interface Load {
  id: string;
  title: string;
  shipper: string;
  shipperId: string;
  carrierId: string;
  pickup: {
    location: string;
    time: string;
    status: 'pending' | 'picked_up' | 'completed';
  };
  delivery: {
    location: string;
    time: string;
    status: 'pending' | 'in_progress' | 'delivered';
  };
  status: 'active' | 'in_progress' | 'completed';
  payment: number;
  weight: string;
  dimensions: string;
  createdAt: Date;
  updatedAt: Date;
  poNumber?: string;
}

const MyLoads: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'in_progress' | 'completed'>('active');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }
    setLoading(true);
    const loadsQuery = query(
      collection(db, 'loads'),
      where('carrierId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      loadsQuery,
      (snapshot) => {
        const loadsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt && typeof doc.data().createdAt.toDate === 'function'
            ? doc.data().createdAt.toDate()
            : doc.data().createdAt,
          updatedAt: doc.data().updatedAt && typeof doc.data().updatedAt.toDate === 'function'
            ? doc.data().updatedAt.toDate()
            : doc.data().updatedAt,
        })) as Load[];
        setLoads(loadsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching loads:', error);
        setError('Failed to fetch loads. Please try again later.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [authLoading, user]);

  const filteredLoads = loads.filter(load => load.status === activeTab).filter(load => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (load.poNumber && load.poNumber.toLowerCase().includes(term)) ||
      (load.shipper && load.shipper.toLowerCase().includes(term)) ||
      (load.pickup?.location && load.pickup.location.toLowerCase().includes(term)) ||
      (load.delivery?.location && load.delivery.location.toLowerCase().includes(term))
    );
  });

  // Deduplicate loads by poNumber or load id to prevent duplicates
  const deduplicatedLoads = React.useMemo(() => {
    const seen = new Set();
    return filteredLoads.filter(load => {
      const key = load.poNumber || load.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredLoads]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return styles.pending;
      case 'picked_up': return styles.pickedUp;
      case 'in_progress': return styles.inProgress;
      case 'delivered': return styles.delivered;
      case 'completed': return styles.completed;
      default: return '';
    }
  };

  const handleProfile = () => {
    navigate('/carrier/profile');
  };

  const handleSettings = () => {
    navigate('/carrier/settings');
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const handleStartLoad = async (id: string) => {
    try {
      const loadRef = doc(db, 'loads', id);
      await updateDoc(loadRef, {
        status: 'in_progress',
        'pickup.status': 'picked_up',
        'delivery.status': 'in_progress',
        updatedAt: new Date()
      });

      // --- Update the corresponding shipment for the shipper ---
      // Get the load to find shipperId and poNumber
      const loadSnap = await getDoc(loadRef);
      if (loadSnap.exists()) {
        const loadData = loadSnap.data();
        const { shipperId, poNumber } = loadData;
        if (!poNumber || !shipperId) {
          console.error('Load is missing poNumber or shipperId. Cannot update shipment.');
        } else {
          // Find the shipment with matching shipperId and poNumber
          const shipmentsQuery = query(
            collection(db, 'shipments'),
            where('shipperId', '==', shipperId),
            where('poNumber', '==', poNumber)
          );
          const shipmentsSnap = await getDocs(shipmentsQuery);
          if (!shipmentsSnap.empty) {
            const shipmentDoc = shipmentsSnap.docs[0];
            await updateDoc(doc(db, 'shipments', shipmentDoc.id), {
              status: 'in_progress',
              updatedAt: new Date()
            });
          } else {
            console.error(`No shipment found for shipperId=${shipperId} and poNumber=${poNumber}`);
          }
        }
      } else {
        console.error('Load document not found for id:', id);
      }

      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return;
      const eldApiId = userDoc.data().eldApiId;
      const eldApiKey = userDoc.data().eldApiKey;
      if (!eldApiId || !eldApiKey) return;

      const vehicles = await konexialService.getUserVehicles(eldApiId, eldApiKey);
      if (vehicles.length === 0) return;
      const selectedVehicle = vehicles[0];
      await updateDoc(loadRef, {
        eldVehicleId: selectedVehicle.id
      });
    } catch (error) {
      console.error('Error updating load status or starting ELD tracking:', error);
      setError('Failed to update load status or start ELD tracking. Please try again.');
    }
  };

  const handleCompleteLoad = async (id: string) => {
    try {
      const loadRef = doc(db, 'loads', id);
      await updateDoc(loadRef, {
        status: 'completed',
        'pickup.status': 'completed',
        'delivery.status': 'delivered',
        updatedAt: new Date()
      });
      // Also update the corresponding purchase order status to Completed
      const loadDoc = await getDoc(loadRef);
      const loadData = loadDoc.data();
      if (loadData && loadData.poNumber) {
        const poQuery = query(collection(db, 'purchaseOrders'), where('poNumber', '==', loadData.poNumber));
        const poSnap = await getDocs(poQuery);
        if (!poSnap.empty) {
          const poRef = doc(db, 'purchaseOrders', poSnap.docs[0].id);
          await updateDoc(poRef, {
            status: 'Completed',
            shippingScheduleStatus: 'Completed',
            updatedAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error completing load:', error);
      setError('Failed to complete load. Please try again.');
    }
  };

  // Mobile-optimized table row component
  const MobileTableRow = ({ load }: { load: Load }) => (
    <div className={styles.mobileTableRow}>
      <div className={styles.mobileRowHeader}>
        <div className={styles.mobileRowTitle}>
          <strong>{load.shipper}</strong>
          <span className={getStatusColor(load.status)}>{load.status}</span>
        </div>
        <div className={styles.mobileRowPo}>
          PO: {load.poNumber || 'N/A'}
        </div>
      </div>
      
      <div className={styles.mobileRowDetails}>
        <div className={styles.mobileRowSection}>
          <div className={styles.mobileRowItem}>
            <label>Pickup:</label>
            <span>{load.pickup?.location || 'N/A'}</span>
          </div>
          <div className={styles.mobileRowItem}>
            <label>Delivery:</label>
            <span>{load.delivery?.location || 'N/A'}</span>
          </div>
        </div>
        
        <div className={styles.mobileRowSection}>
          <div className={styles.mobileRowItem}>
            <label>Payment:</label>
            <span>${load.payment}</span>
          </div>
        </div>
      </div>
      
      <div className={styles.mobileRowActions}>
        <button 
          className={styles.viewButton}
          onClick={() => navigate(`/carrier/loads/${load.id}`)}
        >
          View Details
        </button>
        <button
          className={styles.invoiceButton}
          onClick={() => { setSelectedLoad(load); setShowInvoiceModal(true); }}
        >
          Create Invoice
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <div className={styles.headerCard}>
          <header className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <h1>My Loads</h1>
            </div>
            <div className={styles.headerRight}>
              <button
                className={styles.bellButton}
                onClick={() => setShowNotifications(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative' }}
                tabIndex={0}
                aria-label="Notifications"
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
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'active' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'in_progress' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('in_progress')}
          >
            In Progress
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'completed' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by PO Number, Shipper, Pickup, Delivery..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.loadsList}>
          {authLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Checking authentication...</p>
            </div>
          ) : loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading your loads...</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          ) : deduplicatedLoads.length === 0 ? (
            <div className={styles.errorState}>
              <p>No loads found for this tab.</p>
            </div>
          ) : activeTab === 'completed' ? (
            // Mobile-optimized completed loads view
            <div className={styles.completedTableWrapper}>
              {/* Desktop table view */}
              <div className={styles.desktopTable}>
                <table className={styles.completedTable}>
                  <thead>
                    <tr>
                      <th>Shipper</th>
                      <th>PO Number</th>
                      <th>Pickup</th>
                      <th>Delivery</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deduplicatedLoads.map(load => (
                      <tr key={load.id}>
                        <td>{load.shipper}</td>
                        <td>{load.poNumber}</td>
                        <td>{load.pickup?.location}</td>
                        <td>{load.delivery?.location}</td>
                        <td>${load.payment}</td>
                        <td><span className={getStatusColor(load.status)}>{load.status}</span></td>
                        <td>
                          <button 
                            className={styles.viewButton}
                            onClick={() => navigate(`/carrier/loads/${load.id}`)}
                          >
                            View Details
                          </button>
                          <button
                            className={styles.invoiceButton}
                            onClick={() => { setSelectedLoad(load); setShowInvoiceModal(true); }}
                          >
                            Create Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile card view */}
              <div className={styles.mobileTable}>
                {deduplicatedLoads.map(load => (
                  <MobileTableRow key={load.id} load={load} />
                ))}
              </div>
            </div>
          ) : (
            deduplicatedLoads.map(load => (
              <div key={load.id} className={styles.loadCard}>
                <div className={styles.loadHeader}>
                  <h3>{load.title}</h3>
                  <span className={getStatusColor(load.status)}>{load.status}</span>
                </div>
                <div className={styles.loadDetails}>
                  <div className={styles.detail}>
                    <label>Shipper:</label>
                    <span>{load.shipper}</span>
                  </div>
                  {load.poNumber && (
                    <div className={styles.detail}>
                      <label>PO Number:</label>
                      <span>{load.poNumber}</span>
                    </div>
                  )}
                  <div className={styles.locationInfo}>
                    <div className={styles.location}>
                      <label>Pickup:</label>
                      <span>{load.pickup && load.pickup.location ? load.pickup.location : ''}</span>
                      <span>{load.pickup && load.pickup.time ? load.pickup.time : ''}</span>
                      <span className={getStatusColor(load.pickup && load.pickup.status ? load.pickup.status : '')}>
                        {load.pickup && load.pickup.status ? load.pickup.status : ''}
                      </span>
                    </div>
                    <div className={styles.location}>
                      <label>Delivery:</label>
                      <span>{load.delivery && load.delivery.location ? load.delivery.location : ''}</span>
                      <span>{load.delivery && load.delivery.time ? load.delivery.time : ''}</span>
                      <span className={getStatusColor(load.delivery && load.delivery.status ? load.delivery.status : '')}>
                        {load.delivery && load.delivery.status ? load.delivery.status : ''}
                      </span>
                    </div>
                  </div>
                  <div className={styles.loadSpecs}>
                    <div className={styles.detail}>
                      <label>Payment:</label>
                      <span>${load.payment}</span>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button 
                      className={styles.viewButton}
                      onClick={() => navigate(`/carrier/loads/${load.id}`)}
                    >
                      View Details
                    </button>
                    {load.status === 'active' && (
                      <button className={styles.startButton} onClick={() => handleStartLoad(load.id)}>Start Load</button>
                    )}
                    {load.status === 'in_progress' && (
                      <button className={styles.completeButton} onClick={() => handleCompleteLoad(load.id)}>Mark as Completed</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      
      {/* Mobile performance indicator */}
      {(isLowBandwidth || isLowBattery) && (
        <div className={styles.performanceIndicator}>
          {isLowBandwidth && <span>📶 Slow connection - Optimized loading</span>}
          {isLowBattery && <span>🔋 Low battery - Reduced animations</span>}
        </div>
      )}
      
      {showInvoiceModal && selectedLoad && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          load={selectedLoad}
          user={user}
        />
      )}
    </div>
  );
};

export default MyLoads; 