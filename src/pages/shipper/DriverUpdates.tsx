import React, { useState, useEffect } from 'react';
import styles from './DriverUpdates.module.css';
import { getCarrier } from '../../services/carrierService';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import MapboxMap from '../../components/common/MapboxMap';


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
  const [eldDetails, setEldDetails] = useState<{
    location: string, 
    coordinates: [number, number], 
    pickup: [number, number], 
    delivery: [number, number],
    carrierProfile?: any,
    eta?: string
  } | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsView, setDetailsView] = useState<'map' | 'location'>('map');



  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isMobileScreen);
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

            // Get pickup and delivery coordinates from PO
            let pickupCoords: [number, number] | undefined = undefined;
            let deliveryCoords: [number, number] | undefined = undefined;
            if (data.poNumber) {
              try {
                const poQuery = query(collection(db, 'purchaseOrders'), where('poNumber', '==', data.poNumber));
                const poSnap = await getDocs(poQuery);
                if (!poSnap.empty) {
                  const poData = poSnap.docs[0].data();
                  // Try pickupLocation.position or vendorInfo.position
                  if (poData.pickupLocation && Array.isArray(poData.pickupLocation.position)) {
                    pickupCoords = poData.pickupLocation.position;
                  } else if (poData.vendorInfo && Array.isArray(poData.vendorInfo.position)) {
                    pickupCoords = poData.vendorInfo.position;
                  }
                  // Try deliveryLocation.position or shipTo.position
                  if (poData.deliveryLocation && Array.isArray(poData.deliveryLocation.position)) {
                    deliveryCoords = poData.deliveryLocation.position;
                  } else if (poData.shipTo && Array.isArray(poData.shipTo.position)) {
                    deliveryCoords = poData.shipTo.position;
                  }
                }
              } catch (err) {
                // Ignore errors
              }
            }

            // Default status
            let status = 'En Route - Pickup';
            // Manual Delayed status overrides all
            if (data.status === 'Delayed') {
              status = 'Delayed';
            } else if (data.status === 'Completed') {
              status = 'Completed';
            } else if (data.status === 'in_transit' || data.status === 'in_progress') {
              status = 'En Route - Pickup';
            } else if (data.status) {
              status = data.status;
            }

            // Get carrier details if available
            let carrierName = 'N/A';
            let carrierId = data.carrier?.id;
            let location = 'N/A';
            let coordinates: [number, number] | undefined = undefined;
            let poApprovedCarrier = undefined;
            if (data.poNumber) {
              try {
                const poQuery = query(collection(db, 'purchaseOrders'), where('poNumber', '==', data.poNumber));
                const poSnap = await getDocs(poQuery);
                if (!poSnap.empty) {
                  const poData = poSnap.docs[0].data();
                  poApprovedCarrier = poData.approvedCarrier;
                }
              } catch (err) {
                // Ignore errors
              }
            }
            
            console.log('[DriverUpdates] Processing shipment:', {
              shipmentId: shipmentDoc.id,
              poNumber: data.poNumber,
              dataCarrierId: data.carrier?.id,
              loadCarrierId: load?.carrierId,
              loadData: load
            });
            
            if (load?.carrierId) {
              console.log('[DriverUpdates] Load has carrierId:', load.carrierId);
              // Use global getCarrier utility for robust lookup
              const carrierProfile = await getCarrier(load.carrierId);
              console.log('[DriverUpdates] getCarrier result for', load.carrierId, ':', carrierProfile);
              
              if (carrierProfile) {
                carrierName = carrierProfile.companyName || carrierProfile.displayName || 'N/A';
                carrierId = load.carrierId;
                console.log('[DriverUpdates] Set carrier name from profile:', {
                  carrierId: load.carrierId,
                  companyName: carrierProfile.companyName,
                  displayName: carrierProfile.displayName,
                  finalCarrierName: carrierName
                });
              } else {
                console.warn('[DriverUpdates] No carrier profile found for carrierId:', load.carrierId);
              }
              // 1. Try mobile app location (PRIMARY)
              const mobLocRef = doc(db, 'locations', load.carrierId);
              const mobLocSnap = await getDoc(mobLocRef);
              if (mobLocSnap.exists()) {
                const mobLoc = mobLocSnap.data();
                // Support both lat/lng fields and position array
                let lat = mobLoc.lat;
                let lng = mobLoc.lng;
                if ((lat === undefined || lng === undefined) && Array.isArray(mobLoc.position) && mobLoc.position.length === 2) {
                  lng = mobLoc.position[0];
                  lat = mobLoc.position[1];
                }
                if (lat !== undefined && lng !== undefined) {
                  coordinates = [lng, lat];
                  if (mobLoc.city && mobLoc.state) {
                    location = `${mobLoc.city}, ${mobLoc.state}`;
                  } else {
                    // Try reverse geocoding to get city/state
                    try {
                      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
                      if (response.ok) {
                        const geoData = await response.json();
                        const address = geoData.address || {};
                        const city = address.city || address.town || address.village || address.hamlet || address.county || '';
                        const state = address.state || address.county || '';
                        if (city && state) {
                          location = `${city}, ${state}`;
                        } else if (city) {
                          location = city;
                        } else {
                          // If no city/state found, try a more detailed lookup
                          const detailedResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=8`);
                          if (detailedResponse.ok) {
                            const detailedGeoData = await detailedResponse.json();
                            const detailedAddress = detailedGeoData.address || {};
                            const detailedCity = detailedAddress.city || detailedAddress.town || detailedAddress.village || detailedAddress.county || '';
                            const detailedState = detailedAddress.state || '';
                            if (detailedCity && detailedState) {
                              location = `${detailedCity}, ${detailedState}`;
                            } else if (detailedCity) {
                              location = detailedCity;
                            } else {
                              location = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                            }
                          } else {
                            location = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                          }
                        }
                      } else {
                        location = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                      }
                    } catch (err) {
                      console.warn('[DriverUpdates] Reverse geocoding failed:', err);
                      location = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    }
                  }
                }
              } else {
                // 2. Fallback to ELD location (SECONDARY)
                const eldLocRef = doc(db, 'eldLocations', load.carrierId);
                const eldLocSnap = await getDoc(eldLocRef);
                if (eldLocSnap.exists()) {
                  const eldLoc = eldLocSnap.data();
                  if (eldLoc.lat && eldLoc.lng) {
                    coordinates = [eldLoc.lng, eldLoc.lat];
                    if (eldLoc.city && eldLoc.state) {
                      location = `${eldLoc.city}, ${eldLoc.state}`;
                    } else {
                      // Try reverse geocoding to get city/state
                      try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${eldLoc.lat}&lon=${eldLoc.lng}&zoom=10`);
                        if (response.ok) {
                          const geoData = await response.json();
                          const address = geoData.address || {};
                          const city = address.city || address.town || address.village || address.hamlet || address.county || '';
                          const state = address.state || address.county || '';
                          if (city && state) {
                            location = `${city}, ${state}`;
                          } else if (city) {
                            location = city;
                          } else {
                            location = `${eldLoc.lat.toFixed(4)}, ${eldLoc.lng.toFixed(4)}`;
                          }
                        } else {
                          location = `${eldLoc.lat.toFixed(4)}, ${eldLoc.lng.toFixed(4)}`;
                        }
                      } catch (err) {
                        console.warn('[DriverUpdates] ELD reverse geocoding failed:', err);
                        location = `${eldLoc.lat.toFixed(4)}, ${eldLoc.lng.toFixed(4)}`;
                      }
                    }
                  }
                }
              }
            }
            if (location === 'N/A') {
              // 3. Fallback to shipment origin
              location = data.origin || 'N/A';
            }

            // Fallback: use PO's approvedCarrier if carrierName is still N/A
            if (carrierName === 'N/A' && poApprovedCarrier && poApprovedCarrier.companyName) {
              carrierName = poApprovedCarrier.companyName;
              carrierId = poApprovedCarrier.id;
            }

            const finalUpdate = {
              driverId: carrierId || shipmentDoc.id,
              driverName: carrierName,
              location,
              status,
              lastUpdate: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toLocaleString() : 'N/A',
              eta: 'N/A', // Placeholder for ETA logic
              load: data.poNumber || 'N/A',
              carrierId: carrierId,
              pickupCoords: pickupCoords,
              deliveryCoords: deliveryCoords,
            };
            
            console.log('[DriverUpdates] Final update object for PO', data.poNumber, ':', finalUpdate);
            
            return finalUpdate;
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
    try {
      // Fetch carrier profile data for driver information
      const carrierProfile = await getCarrier(driverId);
      
      // Get current location data (existing logic)
      let currentLocation = 'N/A';
      let currentCoordinates: [number, number] = [-87.6298, 41.8781];
      
      // Try to get current location from locations collection
      const locationRef = doc(db, 'locations', driverId);
      const locationSnap = await getDoc(locationRef);
      if (locationSnap.exists()) {
        const locationData = locationSnap.data();
        if (locationData.lat && locationData.lng) {
          currentCoordinates = [locationData.lng, locationData.lat];
          if (locationData.city && locationData.state) {
            currentLocation = `${locationData.city}, ${locationData.state}`;
          } else {
            currentLocation = `${locationData.lat.toFixed(4)}, ${locationData.lng.toFixed(4)}`;
          }
        }
      }
      
      // Calculate ETA based on current progress
      let eta = 'N/A';
      if (pickup && delivery && currentCoordinates) {
        const totalDistance = haversineDistance(pickup, delivery);
        const remainingDistance = haversineDistance(currentCoordinates, delivery);
        const progress = Math.max(0, Math.min(1, 1 - (remainingDistance / totalDistance)));
        
        // Estimate ETA based on average truck speed (60 mph) and remaining distance
        if (remainingDistance > 0) {
          const estimatedHours = remainingDistance / 60; // 60 mph average
          const estimatedMinutes = Math.round(estimatedHours * 60);
          if (estimatedMinutes < 60) {
            eta = `${estimatedMinutes} minutes`;
          } else {
            const hours = Math.floor(estimatedMinutes / 60);
            const minutes = estimatedMinutes % 60;
            eta = `${hours}h ${minutes}m`;
          }
        }
      }
      
      setEldDetails({
        location: currentLocation,
        coordinates: currentCoordinates,
        pickup: pickup || [-87.6298, 41.8781],
        delivery: delivery || [-96.7970, 32.7767],
        carrierProfile: carrierProfile || null,
        eta: eta
      });
      setDetailsView('map');
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching driver details:', error);
      // Fallback to basic data
      setEldDetails({
        location: 'N/A',
        coordinates: [-87.6298, 41.8781],
        pickup: pickup || [-87.6298, 41.8781],
        delivery: delivery || [-96.7970, 32.7767],
        carrierProfile: null,
        eta: 'N/A'
      });
      setDetailsView('map');
      setShowDetailsModal(true);
    }
  };



  return (
    <div className={styles.container}>
            <div className={styles.header}>
        <h1>Driver Updates</h1>
      </div>
      
      <div className={styles.updatesTable}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
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
                
                {/* Driver Information Section */}
                {eldDetails.carrierProfile && (
                  <div className={styles.driverInfo}>
                    <h3>Driver Information</h3>
                    <div className={styles.driverDetails}>
                      <p><strong>Company:</strong> {eldDetails.carrierProfile.companyName || 'N/A'}</p>
                      <p><strong>Driver:</strong> {eldDetails.carrierProfile.driverName || eldDetails.carrierProfile.displayName || eldDetails.carrierProfile.companyName || 'N/A'}</p>
                      <p><strong>Phone:</strong> {eldDetails.carrierProfile.driverPhone || eldDetails.carrierProfile.phone || 'N/A'}</p>
                      <p><strong>Vehicle VIN:</strong> {eldDetails.carrierProfile.vehicleVin || 'N/A'}</p>
                      <p><strong>DOT:</strong> {eldDetails.carrierProfile.driverDotNumber || eldDetails.carrierProfile.dotNumber || 'N/A'}</p>
                      <p><strong>ELD:</strong> {eldDetails.carrierProfile.eldCompany || 'N/A'}</p>
                      <p><strong>ELD API ID:</strong> {eldDetails.carrierProfile.eldApiId || 'N/A'}</p>
                    </div>
                  </div>
                )}
                
                {/* Route Information */}
                <div className={styles.routeInfo}>
                  <h3>Route Information</h3>
                  <p><strong>Estimated Arrival:</strong> {eldDetails.eta || 'N/A'}</p>
                </div>
                
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
      

    </div>
  );
};

export default DriverUpdates; 