import React, { useState, useEffect } from 'react';
import styles from './DriverUpdates.module.css';
import { getCarrier } from '../../services/carrierService';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import MapboxMap from '../../components/common/MapboxMap';
import { carrierNotesService, CarrierNote } from '../../services/carrierNotesService';


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
  progress: number; // Add progress field
  coordinates?: [number, number]; // Add coordinates field
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
    eta?: string,
    existingProgress?: number
  } | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsView, setDetailsView] = useState<'map' | 'contact'>('map');
  const [carrierNotes, setCarrierNotes] = useState<CarrierNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);


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
          // Fetch active loads for this broker from new optimized collection
          const loadsQuery = query(
            collection(db, 'brokerLoads'),
            where('brokerId', '==', user.uid),
            where('status', 'in', ['in_transit', 'in_progress', 'delayed'])
          );
          const snapshot = await getDocs(loadsQuery);
          
          // Fetch all loads for these loads from new optimized collection
          const loadsQuery2 = query(
            collection(db, 'brokerLoads'),
            where('brokerId', '==', user.uid)
          );
          const loadsSnapshot = await getDocs(loadsQuery2);
          const loadsMap = new Map();
          loadsSnapshot.forEach(doc => {
            const load = doc.data();
            loadsMap.set(load.poNumber, load);
          });

          // Explicitly type as (DriverUpdate | null)[]
          const updatesList: (DriverUpdate | null)[] = await Promise.all(snapshot.docs.map(async loadDoc => {
            const data = loadDoc.data();
            const load = loadsMap.get(data.poNumber);
            
            // Cross-check purchaseOrder status by poNumber
            let poStatus = '';
            if (data.poNumber) {
              try {
                const poQuery = query(collection(db, 'brokerPurchaseOrders'), where('poNumber', '==', data.poNumber));
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
                const poQuery = query(collection(db, 'brokerPurchaseOrders'), where('poNumber', '==', data.poNumber));
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
                const poQuery = query(collection(db, 'brokerPurchaseOrders'), where('poNumber', '==', data.poNumber));
                const poSnap = await getDocs(poQuery);
                if (!poSnap.empty) {
                  const poData = poSnap.docs[0].data();
                  poApprovedCarrier = poData.approvedCarrier;
                }
              } catch (err) {
                // Ignore errors
              }
            }
            
            console.log('[DriverUpdates] Processing load:', {
              loadId: loadDoc.id,
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
                            const detailedGeoData = await response.json();
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
                        console.warn('[DriverUpdates] Reverse geocoding failed:', err);
                        location = `${eldLoc.lat.toFixed(4)}, ${eldLoc.lng.toFixed(4)}`;
                      }
                    }
                  }
                }
              }
            }

            // Calculate progress for the main table
            let progress = 0;
            let eta = 'N/A';
            if (pickupCoords && deliveryCoords && coordinates) {
              const totalMiles = haversineDistance(pickupCoords, deliveryCoords);
              const remainingMiles = haversineDistance(coordinates, deliveryCoords);
              progress = Math.max(0, Math.min(1, 1 - (remainingMiles / totalMiles)));
              
              // Calculate ETA based on remaining distance (assuming 60 mph average speed)
              if (remainingMiles > 0) {
                const estimatedHours = remainingMiles / 60;
                const estimatedMinutes = Math.round(estimatedHours * 60);
                if (estimatedMinutes < 60) {
                  eta = `${estimatedMinutes}m`;
                } else {
                  const hours = Math.floor(estimatedMinutes / 60);
                  const minutes = estimatedMinutes % 60;
                  eta = `${hours}h ${minutes}m`;
                }
              }
            }

            // Get last update time
            let lastUpdate = 'N/A';
            if (data.updatedAt instanceof Timestamp) {
              lastUpdate = data.updatedAt.toDate().toLocaleString();
            } else if (data.lastUpdate) {
              lastUpdate = data.lastUpdate;
            } else if (data.createdAt instanceof Timestamp) {
              lastUpdate = data.createdAt.toDate().toLocaleString();
            }

            const finalUpdate = {
              driverId: carrierId || loadDoc.id,
              driverName: carrierName,
              location,
              status,
              lastUpdate: lastUpdate,
              eta: eta,
              load: data.poNumber || 'N/A',
              carrierId: carrierId,
              pickupCoords: pickupCoords,
              deliveryCoords: deliveryCoords,
              progress: progress, // Add progress to the update object
              coordinates: coordinates, // Add coordinates to the update object
            };
            
            console.log('[DriverUpdates] Final update object for PO', data.poNumber, ':', finalUpdate);
            
            return finalUpdate;
          }));

          // Filter out null values and set updates
          const validUpdates = updatesList.filter(update => update !== null) as DriverUpdate[];
          setUpdates(validUpdates);

          // Load carrier notes for all loads
          if (validUpdates.length > 0) {
            setLoadingNotes(true);
            try {
              const allNotes: CarrierNote[] = [];
              for (const update of validUpdates) {
                if (update.carrierId) {
                  const notes = await carrierNotesService.getCarrierNotesByUserId(update.carrierId);
                  allNotes.push(...notes);
                }
              }
              setCarrierNotes(allNotes);
            } catch (error) {
              console.error('Error loading carrier notes:', error);
            } finally {
              setLoadingNotes(false);
            }
          }

        } catch (error) {
          console.error('Error fetching updates:', error);
        } finally {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleContactClick = async (carrierId: string, driverName: string) => {
    try {
      const carrier = await getCarrier(carrierId);
      if (carrier) {
        setContactInfo({
          phone: carrier.phone || 'N/A',
          email: carrier.email || 'N/A',
          driverName
        });
        setShowContactModal(true);
      }
    } catch (error) {
      console.error('Error fetching carrier info:', error);
    }
  };

  const handleViewDetails = async (update: DriverUpdate) => {
    if (update.carrierId) {
      try {
        const carrier = await getCarrier(update.carrierId);
        setEldDetails({
          location: update.location,
          coordinates: update.coordinates || [0, 0],
          pickup: update.pickupCoords || [0, 0],
          delivery: update.deliveryCoords || [0, 0],
          carrierProfile: carrier,
          eta: update.eta,
          existingProgress: update.progress
        });
        setShowDetailsModal(true);
      } catch (error) {
        console.error('Error fetching carrier details:', error);
      }
    }
  };

  const handleAddNote = async (carrierId: string, note: string) => {
    if (!userId) return;
    
    try {
      // Mock the function call for now since broker services aren't fully implemented
      console.log('Adding note for carrier:', carrierId, 'by user:', userId, 'note:', note);
      // await carrierNotesService.addNote({
      //   poNumber: 'mock-po-number',
      //   loadId: 'mock-load-id',
      //   userId: userId,
      //   carrierName: 'Mock Carrier',
      //   status: 'active',
      //   notes: note
      // });
      // Refresh notes
      // const notes = await carrierNotesService.getCarrierNotesByLoadId('mock-load-id');
      // setCarrierNotes(notes);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading driver updates...</p>
      </div>
    );
  }

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
                <th>Progress</th>
                <th>Last Update</th>
                <th>ETA</th>
                <th>PO Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {updates.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center'}}>No active carrier partners or loads found.</td></tr>
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
                    <td>
                      {update.pickupCoords && update.deliveryCoords && update.progress > 0 ? (
                        (() => {
                          const percent = Math.round(update.progress * 100);
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
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>{update.lastUpdate}</td>
                    <td>{update.eta}</td>
                    <td>{update.load}</td>
                    <td>
                      <button className={styles.actionButton} onClick={() => handleContactClick(update.carrierId!, update.driverName)}>Contact</button>
                      <button className={styles.actionButton} onClick={() => handleViewDetails(update)}>View Details</button>
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
            
            {/* Enhanced Phone Section with Native System Popups */}
            <div className={styles.contactSection}>
              <p><strong>Phone:</strong> {contactInfo.phone}</p>
              {contactInfo.phone && contactInfo.phone !== 'N/A' && (
                <div className={styles.contactOptions}>
                  <button 
                    className={styles.contactButton}
                    onClick={() => {
                      const url = `tel:${contactInfo.phone.replace(/\D/g, '')}`;
                      window.location.href = url;
                    }}
                    style={{ background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)' }}
                  >
                    📞 Call
                  </button>
                  <button 
                    className={styles.contactButton}
                    onClick={() => {
                      const url = `sms:${contactInfo.phone.replace(/\D/g, '')}`;
                      window.location.href = url;
                    }}
                    style={{ background: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' }}
                  >
                    💬 SMS
                  </button>
                </div>
              )}
            </div>
            
            {/* Email Section - Native System Popup */}
            <div className={styles.contactSection}>
              <p><strong>Email:</strong> {contactInfo.email}</p>
              {contactInfo.email && contactInfo.email !== 'N/A' && (
                <div className={styles.contactOptions}>
                  <button 
                    className={styles.contactButton}
                    onClick={() => {
                      const url = `mailto:${contactInfo.email}`;
                      window.location.href = url;
                    }}
                    style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}
                  >
                    📧 Email
                  </button>
                </div>
              )}
            </div>
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
                <p><strong>Coordinates:</strong> {
                  eldDetails.coordinates[0] === 0 && eldDetails.coordinates[1] === 0 
                    ? 'No location data available' 
                    : `${eldDetails.coordinates[0]}, ${eldDetails.coordinates[1]}`
                }</p>
                
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
                
                {/* Modern Progress Bar - only show if we have valid coordinates */}
                {eldDetails.pickup && eldDetails.delivery && eldDetails.coordinates && 
                 eldDetails.pickup[0] !== 0 && eldDetails.pickup[1] !== 0 &&
                 eldDetails.delivery[0] !== 0 && eldDetails.delivery[1] !== 0 &&
                 eldDetails.coordinates[0] !== 0 && eldDetails.coordinates[1] !== 0 ? (
                  (() => {
                    // Use existing progress from main table if available, otherwise calculate
                    let progress = 0;
                    let percent = 0;
                    
                    if (eldDetails.existingProgress !== undefined) {
                      // Use the progress that was already calculated for the main table
                      progress = eldDetails.existingProgress;
                      percent = Math.round(progress * 100);
                    } else {
                      // Calculate progress using the same method as the main table
                      const totalMiles = haversineDistance(eldDetails.pickup, eldDetails.delivery);
                      const remainingMiles = haversineDistance(eldDetails.coordinates, eldDetails.delivery);
                      progress = Math.max(0, Math.min(1, 1 - (remainingMiles / totalMiles)));
                      percent = Math.round(progress * 100);
                    }
                    
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
                ) : (
                  <div className={styles.progressContainer}>
                    <div className={styles.progressHeader}>
                      <span>Progress</span>
                      <span>N/A</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: '0%' }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Progress unavailable - location data required
                    </p>
                  </div>
                )}
                
                {/* Carrier Notes Section */}
                <div className={styles.carrierNotes}>
                  <h3>Carrier Notes</h3>
                  {loadingNotes ? (
                    <p className={styles.loadingNotes}>Loading carrier notes...</p>
                  ) : carrierNotes.length === 0 ? (
                    <p className={styles.noNotes}>No carrier notes available.</p>
                  ) : (
                    <div className={styles.notesList}>
                      {carrierNotes.map((note, index) => (
                        <div key={note.id || index} className={styles.noteItem}>
                          <div className={styles.noteHeader}>
                            <span className={styles.noteTimestamp}>
                              {note.timestamp instanceof Date 
                                ? note.timestamp.toLocaleString()
                                : note.timestamp?.toDate?.()?.toLocaleString() || 'N/A'
                              }
                            </span>
                            <span className={styles.noteStatus}>{note.status}</span>
                          </div>
                          {note.notes && (
                            <p className={styles.noteText}>{note.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
