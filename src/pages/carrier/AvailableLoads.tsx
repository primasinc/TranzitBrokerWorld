import React, { useState, useEffect, useMemo } from 'react';
import MapboxMap from '../../components/common/MapboxMap';
import styles from './AvailableLoads.module.css';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, query, where, collection, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import LoadRequestCard from '../../components/carrier/LoadRequestCard';
import { useAvailableLoads, getFilteredMarketplaceLoads, AvailableLoad } from '../../hooks/useAvailableLoads';
import mapboxgl from 'mapbox-gl';
import { sendLoadRequestToCarrier, acceptLoadForPO } from '../../services/notificationService';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { MobileOptimizedList } from '../../components/common/MobileOptimizedList';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';
import { useCarrierPartnerRequests } from '../../hooks/useCarrierPartnerRequests';
import { usePartnerRequestLoads } from '../../hooks/usePartnerRequestLoads';
import { createPartnerRequest } from '../../services/partnerRequestService';
import { Dialog } from '@reach/dialog';
import '@reach/dialog/styles.css';
import { getPurchaseOrderByPONumber } from '../../services/firebase';

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

interface PurchaseOrder {
  id?: string;
  poNumber?: string;
  date?: string;
  vendorInfo?: { 
    name?: string;
    streetAddress?: string;
    cityStateZip?: string;
  };
  companyInfo?: { name?: string };
  shipTo?: { 
    name?: string;
    streetAddress?: string;
    cityStateZip?: string;
    instructions?: string;
  };
  status?: string;
  amount?: number;
  total?: number;
  items?: any[];
  shipperCompany?: string;
  comments?: string;
  [key: string]: any;
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
  console.log('AvailableLoads page mounted');
  const [viewType, setViewType] = useState<'map' | 'list'>('list');
  const [selectedLoad, setSelectedLoad] = useState<AvailableLoad | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [makeOfferValue, setMakeOfferValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<[number, number]>([-87.6298, 41.8781]);
  const [radiusMiles] = useState<number>(100);
  const [userId, setUserId] = useState<string | null>(null);
  const [eldApiKey, setEldApiKey] = useState<string | null>(null);
  const [eldApiId, setEldApiId] = useState<string | null>(null);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('MARKETPLACE');
  const { partnerRequests: poPartnerRequests, loading: poPartnerLoading } = useCarrierPartnerRequests();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();
  const [isMobile, setIsMobile] = useState(false);
  // Use the new hook for partner requests
  const { merged: mergedPartnerRequests, loading: mergedPartnerLoading, error: mergedPartnerError } = usePartnerRequestLoads();
  const [poCompanyNames, setPoCompanyNames] = useState<{ [poNumber: string]: string }>({});

  // Confirmation state for Make Offer
  const [offerConfirmation, setOfferConfirmation] = useState<string | null>(null);
  
  // Action feedback state for partner request updates
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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

  useEffect(() => {
    console.log('AvailableLoads: availableLoads', availableLoads);
  }, [availableLoads]);

  // Debug: Log the current userLocation whenever it changes
  useEffect(() => {
    // console.log('AvailableLoads page - current userLocation:', userLocation);
  }, [userLocation]);

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
          // console.log('Map section dimensions:', {
          //   width: sectionRect.width,
          //   height: sectionRect.height,
          //   top: sectionRect.top,
          //   left: sectionRect.left
          // });
        }
        
        if (mapContainer) {
          const containerRect = mapContainer.getBoundingClientRect();
          // console.log('Map container dimensions:', {
          //   width: containerRect.width,
          //   height: containerRect.height,
          //   top: containerRect.top,
          //   left: containerRect.left
          // });
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
      // console.log('Skipping loads fetch due to poor conditions');
      return;
    }
  }, [shouldFetchData]);

  // Get user location - optional for carriers
  useEffect(() => {
    // Only request location if user is authenticated
    if (!user) {
      // console.log('User not authenticated, skipping location request');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
          setLocationError(null);
        },
        (error) => {
          // console.warn('Geolocation error:', error);
          // Keep default location - don't block the app
          // console.log('Using default location due to geolocation error');
          setLocationError(null); // Don't show error, just use default
        },
        {
          enableHighAccuracy: true, // High accuracy for carriers
          timeout: 10000, // 10 second timeout
          maximumAge: 300000 // 5 minutes cache
        }
      );
    } else {
      // console.log('Geolocation not supported, using default location');
    }
  }, [user]); // Only run when user changes

  // On mount, check for #partner hash and set tab accordingly
  useEffect(() => {
    if (window.location.hash.startsWith('#partner')) {
      setActiveTab('PARTNER');
    }
  }, []);

  const handleLogout = () => navigate('/login');
  const handleProfile = () => navigate('/carrier/profile');
  const handleSettings = () => navigate('/carrier/settings');

  const handleAcceptLoad = async (load: Load) => {
    if (!user || !user.uid) return;
    try {
      // Fetch the load from Firestore
      const loadDocRef = doc(db, 'loads', load.id);
      const loadDoc = await getDoc(loadDocRef);
      const loadData = loadDoc.data();
      if (!loadData) throw new Error('Load data not found.');
      const userId = loadData?.userId || loadData?.createdBy || '';
      if (!userId) throw new Error('User ID not found for this load.');
      // Find the purchase order by poNumber
      let purchaseOrderId = '';
      if (loadData?.poNumber) {
        const poSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', loadData.poNumber)));
        if (!poSnapshot.empty) {
          purchaseOrderId = poSnapshot.docs[0].id;
        }
      }
      if (!purchaseOrderId) {
        alert('Purchase Order not found for this load. Please try again.');
        return;
      }
      // Do NOT update the load directly here. Only create a partner request and send notification.
      await createPartnerRequest({
        poNumber: loadData.poNumber || '',
        loadId: load.id,
        userId: userId,
        carrierId: user.uid,
      });
      await sendLoadRequestToCarrier(
        userId,
        user.uid,
        load.id,
        {
          pickupLocation: loadData.pickupLocation || {},
          deliveryLocation: loadData.deliveryLocation || {},
          dimensions: loadData.dimensions || {},
          weight: loadData.weight || 0,
          rate: loadData.rate || 0,
          shipperCompany: loadData.shipperCompany || '',
          poNumber: loadData.poNumber || '',
        }
      );
    } catch (err) {
      console.error('Failed to accept load:', err); // Log the full error object
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

  // Fetch PO for modal
  const fetchPOForLoad = async (load: AvailableLoad) => {
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedPO(null);
    try {
      if (!load.poNumber) throw new Error('No PO number for this load.');
      const po = await getPurchaseOrderByPONumber(load.poNumber);
      if (!po) throw new Error('Purchase Order not found.');
      setSelectedPO(po);
      setShowDetailsModal(true);
    } catch (err: any) {
      setDetailsError(err.message || 'Failed to fetch PO');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Make Offer handler
  const handleMakeOffer = async (load: AvailableLoad, offerValue: string) => {
    if (!user || !user.uid) return;
    if (!offerValue || isNaN(Number(offerValue))) {
      setOfferConfirmation('Please enter a valid offer amount.');
      return;
    }
    try {
      // Fetch userId from the load
      const loadDoc = await getDoc(doc(db, 'loads', load.id));
      const loadData = loadDoc.data();
      if (!loadData) throw new Error('Load data not found.');
      const userId = loadData?.userId || loadData?.createdBy || '';
      if (!userId) throw new Error('User ID not found for this load.');
      // Find the purchase order by poNumber
      let purchaseOrderId = '';
      if (loadData?.poNumber) {
        const poSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', loadData.poNumber)));
        if (!poSnapshot.empty) {
          purchaseOrderId = poSnapshot.docs[0].id;
        }
      }
      if (!purchaseOrderId) {
        setOfferConfirmation('Purchase Order not found for this load.');
        return;
      }
      // Create a partner request in partnerRequests collection with offer
      await createPartnerRequest({
        poNumber: loadData.poNumber || '',
        loadId: load.id,
        userId: userId, // use userId as the value for shipperId
        carrierId: user.uid,
        offer: Number(offerValue),
        type: 'make_offer',
      });
      // Fetch carrier profile for senderName
      let senderName = user.displayName || '';
      try {
        const carrierProfileDoc = await getDoc(doc(db, 'users', user.uid));
        if (carrierProfileDoc.exists()) {
          const carrierProfile = carrierProfileDoc.data();
          senderName = carrierProfile.companyName || carrierProfile.displayName || senderName;
        }
      } catch (err) {
        // fallback to user.displayName
      }
      // Send a notification to the shipper for alert (mirroring partner request notification structure)
      const notificationRef = collection(db, 'notifications');
      const notificationData = {
        carrierId: user.uid,
        userId: userId,
        recipientId: userId,
        shippingScheduleId: load.id,
        status: 'pending',
        type: 'make_offer',
        senderId: user.uid,
        senderName,
        message: `${senderName} has made an offer of $${Number(offerValue).toLocaleString()} on PO ${loadData.poNumber || ''}`,
        loadDetails: {
          pickupLocation: loadData.pickupLocation || {},
          deliveryLocation: loadData.deliveryLocation || {},
          dimensions: loadData.dimensions || {},
          weight: loadData.weight || 0,
          rate: Number(offerValue),
          shipperCompany: loadData.shipperCompany || '',
          poNumber: loadData.poNumber || '',
        },
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        requiresAction: true
      };
      await addDoc(notificationRef, notificationData);
      setOfferConfirmation('Offer sent to shipper!');
      setMakeOfferValue('');
    } catch (err) {
      setOfferConfirmation('Failed to send offer: ' + (err as Error).message);
    }
  };

  // Strict filtering for partner requests and marketplace loads
  const partnerRequestLoads = availableLoads.filter(
    load => load.isMarketplace === false && 'carrierId' in load
  );
  const marketplaceLoads = availableLoads.filter(
    load => {
      // Must be explicitly marketplace
      if (load.isMarketplace !== true) return false;
      // Must NOT have carrierId field at all
      if ('carrierId' in load) return false;
      // Additional check: exclude loads that are partner requests
      if (mergedPartnerRequests && mergedPartnerRequests.length > 0) {
        const isPartnerRequest = mergedPartnerRequests.some(({ partnerRequest }) => 
          partnerRequest.poNumber === load.poNumber
        );
        if (isPartnerRequest) return false;
      }
      return true;
    }
  );

  // Memoize filtered marketplace loads to ensure sync with data
  const filteredMarketplaceLoads = React.useMemo(
    () => marketplaceLoads, // Use the properly filtered marketplace loads
    [marketplaceLoads]
  );

  // Fetch PO company names for all visible loads
  useEffect(() => {
    const fetchCompanyNames = async () => {
      const missingPoNumbers = filteredMarketplaceLoads
        .map(load => load.poNumber)
        .filter(poNumber => poNumber && !(poNumber in poCompanyNames));
      if (missingPoNumbers.length === 0) return;
      const newNames: { [poNumber: string]: string } = {};
      for (const poNumber of missingPoNumbers) {
        if (!poNumber) continue;
        const poSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber)));
        if (!poSnapshot.empty) {
          const poData = poSnapshot.docs[0].data();
          newNames[poNumber] = poData.companyInfo?.name || '—';
        } else {
          newNames[poNumber] = '—';
        }
      }
      setPoCompanyNames(prev => ({ ...prev, ...newNames }));
    };
    fetchCompanyNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredMarketplaceLoads]);

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

  // Add handler for partner request status updates
  const handlePartnerRequestStatusUpdate = (status: string) => {
    console.log('[AvailableLoads] Partner request status updated:', status);
    
    // Show immediate feedback to user
    setActionFeedback(`Action completed: ${status}`);
    
    // Clear feedback after 3 seconds
    setTimeout(() => {
      setActionFeedback(null);
    }, 3000);
    
    // Force refresh of partner requests to update the list
    // The real-time listener should handle this automatically, but we can force a refresh
    if (status === 'rejected' || status === 'accepted') {
      // Trigger a refresh of the partner requests
      // This will be handled by the real-time listener, but we can add a manual trigger if needed
      console.log('[AvailableLoads] Triggering partner request refresh');
    }
  };

  // Render load item for mobile list
  const renderLoadItem = (load: AvailableLoad, index: number) => (
    <div 
      key={load.id}
      className={`${styles.loadCard} ${selectedLoad?.id === load.id ? styles.selected : ''}`}
      tabIndex={0}
      aria-label={`Marketplace load from ${load.pickupLocation.address} to ${load.deliveryLocation.address}`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderRadius: 12, marginBottom: 24, background: '#fff', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{load.title}</div>
          <div style={{ fontSize: 14, color: '#666' }}>PO #: <strong>{load.poNumber || '—'}</strong></div>
          <div style={{ fontSize: 14, color: '#666' }}>Shipper: <strong>{poCompanyNames[load.poNumber || ''] || '—'}</strong></div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#2196f3', minWidth: 100, textAlign: 'right' }}>
          ${load.rate?.toLocaleString() || '—'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 32, margin: '12px 0' }}>
        <div>
          <div style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>Pickup</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{load.pickupLocation.address}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>Delivery</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{load.deliveryLocation.address}</div>
        </div>
      </div>
      <div className={styles.actionRow}>
        <button 
          className={`${styles.viewButton} ${styles.actionControl}`}
          onClick={e => { e.stopPropagation(); fetchPOForLoad(load); }}
        >
          View Details
        </button>
        <button 
          className={`${styles.bookButton} ${styles.actionControl}`}
          onClick={e => { e.stopPropagation(); handleAcceptLoad(load as any); }}
        >
          Book Load
        </button>
        <form style={{ display: 'flex', alignItems: 'center', gap: 0 }} onSubmit={e => { e.preventDefault(); handleMakeOffer(load, makeOfferValue); }}>
          <div className={styles.offerInputWrapper} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            {/* Show dollar sign if input has value */}
            {makeOfferValue && (
              <span className={styles.offerDollar} style={{ position: 'absolute', left: 8, color: '#1976d2', fontWeight: 700 }}>$</span>
            )}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Amount"
              value={makeOfferValue}
              onChange={e => setMakeOfferValue(e.target.value.replace(/[^0-9]/g, ''))}
              className={`${styles.offerInput} ${styles.actionControl} ${makeOfferValue ? styles.hasValue : ''}`}
              aria-label="Make Offer Amount"
              style={{ paddingLeft: makeOfferValue ? 20 : 0, minWidth: 80 }}
            />
          </div>
          <button type="submit" className={`${styles.offerButton} ${styles.actionControl}`}>Make Offer</button>
        </form>
      </div>
    </div>
  );

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

  // Modal for View Details
  const detailsModal = showDetailsModal && (
    <Dialog aria-label="Purchase Order Details" onDismiss={() => setShowDetailsModal(false)}>
      {detailsLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner"></div>
          <p>Loading purchase order details...</p>
        </div>
      ) : detailsError ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#d32f2f' }}>
          <h3>Error</h3>
          <p>{detailsError}</p>
        </div>
      ) : selectedPO ? (
        <div style={{ 
          maxWidth: 700, 
          maxHeight: '90vh', 
          overflow: 'auto',
          padding: 0,
          borderRadius: 12,
          background: '#fff'
        }}>
          {/* Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
            color: 'white',
            padding: '24px 32px',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowDetailsModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
            >
              ×
            </button>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Purchase Order Details</h2>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: 16 }}>
              PO #{selectedPO.poNumber} • {selectedPO.date || '—'}
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '32px' }}>
            {/* Basic Info Section */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                margin: '0 0 16px 0',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                📋 Order Information
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 16
              }}>
                <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Shipper</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>
                    {selectedPO.shipperCompany || selectedPO.companyInfo?.name || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                margin: '0 0 16px 0',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                📍 Locations
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 16
              }}>
                {/* Pickup */}
                <div style={{ 
                  background: '#e3f2fd', 
                  padding: 20, 
                  borderRadius: 8,
                  border: '1px solid #bbdefb'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    marginBottom: 12,
                    color: '#1976d2',
                    fontWeight: 600
                  }}>
                    🚚 Pickup Location
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>
                    <strong>Vendor:</strong> {selectedPO.vendorInfo?.name || '—'}
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>
                    <strong>Address:</strong> {selectedPO.pickupLocation?.address || selectedPO.vendorInfo?.streetAddress || '—'}
                  </div>
                  {selectedPO.vendorInfo?.cityStateZip && (
                    <div style={{ fontSize: 14 }}>
                      <strong>City/State:</strong> {selectedPO.vendorInfo.cityStateZip}
                    </div>
                  )}
                </div>

                {/* Delivery */}
                <div style={{ 
                  background: '#e8f5e8', 
                  padding: 20, 
                  borderRadius: 8,
                  border: '1px solid #c8e6c9'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    marginBottom: 12,
                    color: '#2e7d32',
                    fontWeight: 600
                  }}>
                    📦 Delivery Location
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>
                    <strong>Ship To:</strong> {selectedPO.shipTo?.name || '—'}
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>
                    <strong>Address:</strong> {selectedPO.deliveryLocation?.address || selectedPO.shipTo?.streetAddress || '—'}
                  </div>
                  {selectedPO.shipTo?.cityStateZip && (
                    <div style={{ fontSize: 14 }}>
                      <strong>City/State:</strong> {selectedPO.shipTo.cityStateZip}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                margin: '0 0 16px 0',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                📦 Items ({Array.isArray(selectedPO.items) ? selectedPO.items.length : 0})
              </h3>
              <div style={{ 
                background: '#fafafa', 
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #e0e0e0'
              }}>
                {Array.isArray(selectedPO.items) && selectedPO.items.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        {/* Always show Item Name as first column if present */}
                        {selectedPO.items[0]?.name && (
                          <th style={{
                            padding: '8px 12px',
                            fontSize: 13,
                            color: '#555',
                            fontWeight: 600,
                            borderBottom: '1px solid #e0e0e0',
                            textTransform: 'capitalize',
                            textAlign: 'left',
                            background: '#f5f5f5'
                          }}>Item Name</th>
                        )}
                        {Object.keys(selectedPO.items[0] || {})
                          .filter(key => {
                            const normalized = key.replace(/\s+/g, '').toLowerCase();
                            return !['total', 'price', 'amount', 'name', 'itemnumber'].includes(normalized);
                          })
                          .map((key, idx) => (
                            <th key={key} style={{
                              padding: '8px 12px',
                              fontSize: 13,
                              color: '#555',
                              fontWeight: 600,
                              borderBottom: '1px solid #e0e0e0',
                              textTransform: 'capitalize',
                              textAlign: 'left',
                              background: idx % 2 === 0 ? '#f5f5f5' : '#f0f0f0'
                            }}>{key.replace(/([A-Z])/g, ' $1')}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items.map((item: any, idx: number) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                          {/* Always show Item Name as first column if present */}
                          {item.name && (
                            <td style={{
                              padding: '8px 12px',
                              fontSize: 15,
                              color: '#222',
                              borderBottom: idx < (selectedPO.items?.length || 0) - 1 ? '1px solid #e0e0e0' : 'none',
                              whiteSpace: 'pre-line'
                            }}>{item.name}</td>
                          )}
                          {Object.keys(item)
                            .filter(key => {
                              const normalized = key.replace(/\s+/g, '').toLowerCase();
                              return !['total', 'price', 'amount', 'name', 'itemnumber'].includes(normalized);
                            })
                            .map(key => (
                              <td key={key} style={{
                                padding: '8px 12px',
                                fontSize: 15,
                                color: '#222',
                                borderBottom: idx < (selectedPO.items?.length || 0) - 1 ? '1px solid #e0e0e0' : 'none',
                                whiteSpace: 'pre-line'
                              }}>{item[key]}</td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                    No items specified
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details */}
            {(selectedPO.comments || selectedPO.shipTo?.instructions) && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ 
                  fontSize: 18, 
                  fontWeight: 600, 
                  margin: '0 0 16px 0',
                  color: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  📝 Additional Information
                </h3>
                <div style={{ 
                  background: '#fff3e0', 
                  padding: 20, 
                  borderRadius: 8,
                  border: '1px solid #ffcc02'
                }}>
                  {selectedPO.comments && (
                    <div style={{ marginBottom: selectedPO.shipTo?.instructions ? 16 : 0 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Comments</div>
                      <div style={{ fontSize: 14 }}>{selectedPO.comments}</div>
                    </div>
                  )}
                  {selectedPO.shipTo?.instructions && (
                    <div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Delivery Instructions</div>
                      <div style={{ fontSize: 14 }}>{selectedPO.shipTo.instructions}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 12,
              paddingTop: 24,
              borderTop: '1px solid #e0e0e0'
            }}>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#333'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );

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

        {/* Tab Switcher Controls */}
        <div className={styles.viewToggleContainer} style={{ marginBottom: 16 }}>
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
        </div>

        {/* Content for each tab */}
        {activeTab === 'MARKETPLACE' ? (
          <>
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
                    markers={filteredMarketplaceLoads.map(load => ({
                      id: load.id,
                      position: load.pickupLocation.position,
                      type: 'shipper' as const,
                      icon: 'circle',
                      onClick: () => handleLoadSelect(load)
                    }))}
                    onMapLoad={() => {}}
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
              // List view - always render, no spinner, just empty state if needed
              <div className={styles.listView}>
                {filteredMarketplaceLoads.length === 0 ? (
                  <div className={styles.noLoads}>
                    <h3>No loads available</h3>
                  </div>
                ) : (
                  <>
                    {filteredMarketplaceLoads.map((load, idx) => renderLoadItem(load, idx))}
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div className={styles.listView}>
            {mergedPartnerLoading ? (
              <div>Loading partner loads...</div>
            ) : mergedPartnerRequests.length === 0 ? (
              <div>No partner loads at this time.</div>
            ) : (
              <>
                {dedupePartnerRequests(mergedPartnerRequests).map(({ partnerRequest, po }) => {
                  const poNumber = po?.poNumber || partnerRequest.loadDetails?.poNumber || partnerRequest.poNumber || '';
                  
                  return (
                    <LoadRequestCard
                      key={partnerRequest.id}
                      notification={{
                        ...partnerRequest,
                        poNumber: poNumber, // Add poNumber at the top level
                        loadDetails: {
                          ...(partnerRequest.loadDetails || {}),
                          ...(po || {}),
                          pickupLocation: po?.pickupLocation || partnerRequest.loadDetails?.pickupLocation || {},
                          deliveryLocation: po?.deliveryLocation || partnerRequest.loadDetails?.deliveryLocation || {},
                          rate: po?.rate || partnerRequest.loadDetails?.rate || 0,
                          weight: po?.weight || partnerRequest.loadDetails?.weight || 0,
                          dimensions: po?.dimensions || partnerRequest.loadDetails?.dimensions || {},
                          shipperCompany: po?.shipperCompany || partnerRequest.loadDetails?.shipperCompany || '',
                          poNumber: poNumber, // Also in loadDetails
                        }
                      }}
                      onStatusUpdate={handlePartnerRequestStatusUpdate}
                    />
                  );
                })}
              </>
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
        
        {/* Action feedback for partner request updates */}
        {actionFeedback && (
          <div className={styles.actionFeedback}>
            {actionFeedback}
          </div>
        )}
      </div>
      {detailsModal}
      {offerConfirmation && (
        <Dialog aria-label="Offer Confirmation" onDismiss={() => setOfferConfirmation(null)}>
          <div style={{ padding: 32, textAlign: 'center' }}>
            <h3>{offerConfirmation}</h3>
            <button onClick={() => setOfferConfirmation(null)} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 6, background: '#2196f3', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>OK</button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default AvailableLoads;