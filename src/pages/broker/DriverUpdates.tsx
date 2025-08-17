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
          // Fetch active loads for this broker
          const loadsQuery = query(
            collection(db, 'loads'),
            where('brokerId', '==', user.uid),
            where('status', 'in', ['in_transit', 'in_progress', 'delayed'])
          );
          const snapshot = await getDocs(loadsQuery);
          
          // Fetch all loads for these loads
          const loadsQuery2 = query(
            collection(db, 'loads'),
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

            // Calculate progress based on coordinates
            let progress = 0;
            if (coordinates && pickupCoords && deliveryCoords) {
              const totalDistance = haversineDistance(pickupCoords, deliveryCoords);
              const currentDistance = haversineDistance(coordinates, pickupCoords);
              if (totalDistance > 0) {
                progress = Math.min(100, Math.max(0, Math.round((currentDistance / totalDistance) * 100)));
              }
            }

            // Get ETA
            let eta = 'N/A';
            if (data.eta) {
              eta = data.eta;
            } else if (data.estimatedDeliveryDate) {
              eta = data.estimatedDeliveryDate;
            }

            // Get last update time
            let lastUpdate = 'N/A';
            if (data.lastUpdate) {
              lastUpdate = data.lastUpdate;
            } else if (data.updatedAt) {
              lastUpdate = data.updatedAt.toDate().toLocaleString();
            } else if (data.createdAt) {
              lastUpdate = data.createdAt.toDate().toLocaleString();
            }

            return {
              driverId: loadDoc.id,
              driverName: carrierName,
              location,
              status,
              lastUpdate,
              eta,
              load: `Load ${data.poNumber || 'N/A'}`,
              carrierId,
              pickupCoords,
              deliveryCoords,
              progress,
              coordinates
            };
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
    <div className={styles.driverUpdates}>
      <div className={styles.header}>
        <h1>Driver Updates</h1>
        <p>Real-time updates on your loads and carrier locations</p>
      </div>

      <div className={styles.updatesGrid}>
        {updates.map((update) => (
          <div key={update.driverId} className={styles.updateCard}>
            <div className={styles.updateHeader}>
              <h3>{update.driverName}</h3>
              <span className={`${styles.status} ${styles[update.status.toLowerCase().replace(' ', '')]}`}>
                {update.status}
              </span>
            </div>
            
            <div className={styles.updateDetails}>
              <div className={styles.detailRow}>
                <label>Load:</label>
                <span>{update.load}</span>
              </div>
              <div className={styles.detailRow}>
                <label>Location:</label>
                <span>{update.location}</span>
              </div>
              <div className={styles.detailRow}>
                <label>ETA:</label>
                <span>{update.eta}</span>
              </div>
              <div className={styles.detailRow}>
                <label>Last Update:</label>
                <span>{update.lastUpdate}</span>
              </div>
            </div>

            <div className={styles.progressSection}>
              <label>Progress:</label>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${update.progress}%` }}
                ></div>
              </div>
              <span className={styles.progressText}>{update.progress}%</span>
            </div>

            <div className={styles.updateActions}>
              <button 
                className={styles.viewDetailsButton}
                onClick={() => handleViewDetails(update)}
              >
                View Details
              </button>
              {update.carrierId && (
                <button 
                  className={styles.contactButton}
                  onClick={() => handleContactClick(update.carrierId!, update.driverName)}
                >
                  Contact
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Contact Modal */}
      {showContactModal && contactInfo && (
        <div className={styles.modalOverlay} onClick={() => setShowContactModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Contact Information</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowContactModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <h3>{contactInfo.driverName}</h3>
              <div className={styles.contactInfo}>
                <p><strong>Phone:</strong> {contactInfo.phone}</p>
                <p><strong>Email:</strong> {contactInfo.email}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && eldDetails && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Load Details</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.modalTabs}>
                <button 
                  className={`${styles.tabButton} ${detailsView === 'map' ? styles.active : ''}`}
                  onClick={() => setDetailsView('map')}
                >
                  Map View
                </button>
                <button 
                  className={`${styles.tabButton} ${detailsView === 'contact' ? styles.active : ''}`}
                  onClick={() => setDetailsView('contact')}
                >
                  Contact & Notes
                </button>
              </div>

              {detailsView === 'map' && (
                <div className={styles.mapSection}>
                  <MapboxMap
                    center={eldDetails.coordinates}
                    zoom={10}
                    markers={[
                      {
                        id: 'driver',
                        position: eldDetails.coordinates,
                        type: 'carrier'
                      },
                      {
                        id: 'pickup',
                        position: eldDetails.pickup,
                        type: 'shipper'
                      },
                      {
                        id: 'delivery',
                        position: eldDetails.delivery,
                        type: 'shipper'
                      }
                    ]}
                  />
                </div>
              )}

              {detailsView === 'contact' && (
                <div className={styles.contactSection}>
                  {eldDetails.carrierProfile && (
                    <div className={styles.carrierInfo}>
                      <h3>Carrier Information</h3>
                      <p><strong>Company:</strong> {eldDetails.carrierProfile.companyName}</p>
                      <p><strong>Phone:</strong> {eldDetails.carrierProfile.phone}</p>
                      <p><strong>Email:</strong> {eldDetails.carrierProfile.email}</p>
                    </div>
                  )}
                  
                  <div className={styles.notesSection}>
                    <h3>Notes</h3>
                    <div className={styles.notesList}>
                      {carrierNotes.map((note, index) => (
                        <div key={index} className={styles.note}>
                          <p>{note.notes}</p>
                          <small>{note.timestamp.toDate().toLocaleString()}</small>
                        </div>
                      ))}
                    </div>
                    <div className={styles.addNote}>
                      <textarea 
                        placeholder="Add a note..."
                        className={styles.noteInput}
                      />
                      <button 
                        className={styles.addNoteButton}
                        onClick={() => {
                          const textarea = document.querySelector(`.${styles.noteInput}`) as HTMLTextAreaElement;
                          if (textarea && eldDetails.carrierProfile) {
                            handleAddNote(eldDetails.carrierProfile.id, textarea.value);
                            textarea.value = '';
                          }
                        }}
                      >
                        Add Note
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverUpdates;
