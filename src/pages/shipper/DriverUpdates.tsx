import React, { useState, useEffect } from 'react';
import styles from './DriverUpdates.module.css';
import { getCarrier } from '../../services/carrierService';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import MapboxMap from '../../components/common/MapboxMap';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { MobileOptimizedList } from '../../components/common/MobileOptimizedList';

interface DriverUpdate {
  driverId: string;
  driverName: string;
  location: string;
  status: string;
  lastUpdate: string;
  eta: string;
  load: string;
  carrierId?: string;
  pickupCoords?: [number, number];
  deliveryCoords?: [number, number];
}

// Haversine formula to calculate distance between two lat/lng points in miles
function haversineDistance([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3958.8; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const DriverUpdates: React.FC = () => {
  const [updates, setUpdates] = useState<DriverUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // State for modals
  const [contactInfo, setContactInfo] = useState<{phone: string, email: string, driverName: string} | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [eldDetails, setEldDetails] = useState<{location: string, coordinates: [number, number], pickup: [number, number], delivery: [number, number]} | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsView, setDetailsView] = useState<'map' | 'location'>('map');

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
  const [viewType, setViewType] = useState<'table' | 'cards'>('table');

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isMobileScreen);
      
      // Auto-switch to cards view on mobile
      if (isMobileDevice || isMobileScreen) {
        setViewType('cards');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setLoading(true);
        try {
          // Fetch active shipments for this shipper
          const shipmentsQuery = query(
            collection(db, 'shipments'),
            where('shipperId', '==', user.uid),
            where('status', 'in', ['in_transit', 'in_progress', 'delayed'])
          );
          const snapshot = await getDocs(shipmentsQuery);
          
          // Fetch all loads for these shipments
          const loadsQuery = query(
            collection(db, 'loads'),
            where('shipperId', '==', user.uid)
          );
          const loadsSnapshot = await getDocs(loadsQuery);
          const loadsMap = new Map();
          loadsSnapshot.forEach(doc => {
            const load = doc.data();
            loadsMap.set(load.poNumber, load);
          });

          // Explicitly type as (DriverUpdate | null)[]
          const updatesList: (DriverUpdate | null)[] = await Promise.all(snapshot.docs.map(async shipmentDoc => {
            const data = shipmentDoc.data();
            const load = loadsMap.get(data.poNumber);
            
            // Cross-check purchaseOrder status by poNumber
            let poStatus = '';
            if (data.poNumber) {
              try {
                const poQuery = query(collection(db, 'purchaseOrders'), where('poNumber', '==', data.poNumber));
                const poSnap = await getDocs(poQuery);
                if (poSnap.empty) {
                  return null; // Skip this update if purchaseOrder does not exist
                } else {
                  const poData = poSnap.docs[0].data();
                  poStatus = (poData.status || poData.shippingScheduleStatus || '').toLowerCase();
                }
              } catch (err) {
                // Ignore errors, fallback to showing
              }
            }
            if (poStatus === 'cancelled' || poStatus === 'completed') {
              return null; // Skip this update
            }

            // Determine status for display
            let status = 'N/A';
            if (data.status === 'in_transit' || data.status === 'in_progress') {
              status = 'En Route - Pickup';
            } else if (data.status === 'delayed') {
              status = 'Delayed';
            } else if (data.status) {
              status = data.status;
            }

            // Get carrier details if available
            let carrierName = 'N/A';
            let carrierId = data.carrier?.id;
            if (load?.carrierId) {
              const carrierDocSnap = await getDoc(doc(db, 'carriers', load.carrierId));
              if (carrierDocSnap.exists()) {
                const carrierData: any = carrierDocSnap.data();
                carrierName = carrierData.companyName || 'N/A';
                carrierId = load.carrierId;
              }
            }

            return {
              driverId: carrierId || shipmentDoc.id,
              driverName: carrierName,
              location: data.origin || 'N/A',
              status,
              lastUpdate: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toLocaleString() : 'N/A',
              eta: 'N/A', // Placeholder for ETA logic
              load: data.poNumber || 'N/A',
              carrierId: carrierId,
              pickupCoords: data.pickupCoords,
              deliveryCoords: data.deliveryCoords,
            };
          }));

          setUpdates(updatesList.filter((u): u is DriverUpdate => Boolean(u)));
        } catch (error) {
          console.error('Error fetching driver updates:', error);
          setUpdates([]);
        } finally {
          setLoading(false);
        }
      } else {
        setUserId(null);
        setUpdates([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handler for Contact button
  const handleContactClick = async (carrierId?: string, driverName?: string) => {
    if (!carrierId) return;
    const carrier = await getCarrier(carrierId);
    if (carrier) {
      setContactInfo({ phone: carrier.phone, email: carrier.email, driverName: driverName || 'N/A' });
      setShowContactModal(true);
    }
  };

  // Handler for View Details button
  const handleViewDetailsClick = async (driverId: string, pickup?: [number, number], delivery?: [number, number]) => {
    // Simulate fetching ELD/location data and use provided pickup/delivery coordinates
    setEldDetails({
      location: 'N/A',
      coordinates: [-87.6298, 41.8781],
      pickup: pickup || [-87.6298, 41.8781],
      delivery: delivery || [-96.7970, 32.7767],
    });
    setDetailsView('map');
    setShowDetailsModal(true);
  };

  // Mobile card component
  const renderMobileCard = (update: DriverUpdate) => (
    <div key={update.driverId} className={styles.mobileCard}>
      <div className={styles.cardHeader}>
        <h3>{update.driverName}</h3>
        <span className={`${styles.status} ${styles[update.status.toLowerCase()]}`}>
          {update.status}
        </span>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardRow}>
          <label>Location:</label>
          <span>{update.location}</span>
        </div>
        <div className={styles.cardRow}>
          <label>Last Update:</label>
          <span>{update.lastUpdate}</span>
        </div>
        <div className={styles.cardRow}>
          <label>ETA:</label>
          <span>{update.eta}</span>
        </div>
        <div className={styles.cardRow}>
          <label>PO Number:</label>
          <span>{update.load}</span>
        </div>
      </div>
      <div className={styles.cardActions}>
        <button 
          className={styles.mobileActionButton} 
          onClick={() => handleContactClick(update.carrierId, update.driverName)}
        >
          Contact
        </button>
        <button 
          className={styles.mobileActionButton} 
          onClick={() => handleViewDetailsClick(update.driverId, update.pickupCoords, update.deliveryCoords)}
        >
          View Details
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Driver Updates</h1>
        {!isMobile && (
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.toggleButton} ${viewType === 'table' ? styles.active : ''}`}
              onClick={() => setViewType('table')}
            >
              Table View
            </button>
            <button 
              className={`${styles.toggleButton} ${viewType === 'cards' ? styles.active : ''}`}
              onClick={() => setViewType('cards')}
            >
              Card View
            </button>
          </div>
        )}
      </div>
      
      <div className={styles.updatesTable}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : viewType === 'table' ? (
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Location</th>
                <th>Status</th>
                <th>Last Update</th>
                <th>ETA</th>
                <th>PO Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {updates.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center'}}>No active carrier partners or shipments found.</td></tr>
              ) : (
                updates.map((update) => (
                  <tr key={update.driverId}>
                    <td>{update.driverName}</td>
                    <td>{update.location}</td>
                    <td>
                      <span className={`${styles.status} ${styles[update.status.toLowerCase()]}`}>
                        {update.status}
                      </span>
                    </td>
                    <td>{update.lastUpdate}</td>
                    <td>{update.eta}</td>
                    <td>{update.load}</td>
                    <td>
                      <button className={styles.actionButton} onClick={() => handleContactClick(update.carrierId, update.driverName)}>Contact</button>
                      <button className={styles.actionButton} onClick={() => handleViewDetailsClick(update.driverId, update.pickupCoords, update.deliveryCoords)}>View Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className={styles.mobileCardsContainer}>
            {updates.length === 0 ? (
              <div className={styles.noData}>No active carrier partners or shipments found.</div>
            ) : (
              <MobileOptimizedList
                items={updates}
                renderItem={renderMobileCard}
                keyExtractor={(update) => update.driverId}
                itemHeight={180}
                containerHeight={isMobile ? 400 : 500}
                enableVirtualization={isMobile}
                enablePullToRefresh={isMobile}
                onRefresh={async () => {
                  // Refresh updates data
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }}
                className={styles.mobileUpdatesList}
              />
            )}
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && contactInfo && (
        <div className={styles.modalOverlay} onClick={() => setShowContactModal(false)}>
          <div className={styles.contactCard} onClick={e => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowContactModal(false)} aria-label="Close">×</button>
            <h2>Carrier Contact Information</h2>
            <p><strong>Name:</strong> {contactInfo.driverName || 'N/A'}</p>
            <p><strong>Phone:</strong> {contactInfo.phone}</p>
            <p><strong>Email:</strong> {contactInfo.email}</p>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && eldDetails && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div className={`${styles.contactCard} ${isMobile ? styles.mobileModal : ''}`} onClick={e => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowDetailsModal(false)} aria-label="Close">×</button>
            <h2>Driver Route Details</h2>
            {/* Location Info and Progress Bar at the top */}
            <div className={styles.modalContent}>
              <div className={styles.locationInfo}>
                <p><strong>Current Location:</strong> {eldDetails.location}</p>
                <p><strong>Coordinates:</strong> {eldDetails.coordinates[0]}, {eldDetails.coordinates[1]}</p>
                {/* Modern Progress Bar */}
                {eldDetails.pickup && eldDetails.delivery && eldDetails.coordinates && (
                  (() => {
                    const totalMiles = haversineDistance(eldDetails.pickup, eldDetails.delivery);
                    const remainingMiles = haversineDistance(eldDetails.coordinates, eldDetails.delivery);
                    const progress = Math.max(0, Math.min(1, 1 - (remainingMiles / totalMiles)));
                    const percent = Math.round(progress * 100);
                    return (
                      <div className={styles.progressContainer}>
                        <div className={styles.progressHeader}>
                          <span>Progress</span>
                          <span>{percent}%</span>
                        </div>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
              {/* Large Map below */}
              <div className={styles.largeMap}>
                <MapboxMap 
                  showKonexialVehicles={true}
                  enableRealtime={true}
                  eldApiKey={process.env.REACT_APP_MAPBOX_TOKEN}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile performance indicator */}
      {(isLowBandwidth || isLowBattery) && (
        <div className={styles.performanceIndicator}>
          {isLowBandwidth && <span>📶 Slow connection - Optimized loading</span>}
          {isLowBattery && <span>🔋 Low battery - Reduced animations</span>}
        </div>
      )}
    </div>
  );
};

export default DriverUpdates; 