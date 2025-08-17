import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, getDoc, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import styles from './CarrierPartners.module.css';
import { getCarrier } from '../../services/carrierService';
import { sendUnifiedLoadRequestToCarrier, createUnifiedPartnerRequest } from '../../services/unifiedPartnerRequestService';
import { useAuth } from '../../contexts/AuthContext';

interface Partner {
  carrierId: string; // Always the Firebase Auth UID
  companyName: string;
  companyRep?: string;
  phoneNumber?: string;
  email?: string;
  state?: string;
  loadTypes?: string[];
  trailerTypes?: string[];
  endorsements?: string[];
  addedAt?: any;
  mcNumber?: string;
}

interface LocationState {
  poData?: any;
  rate?: string;
  fromRejection?: boolean;
  rejectedLoadId?: string;
}

const CarrierPartners: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileCarrier, setProfileCarrier] = useState<any>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Check if we came from PO creation
  const locationState = location.state as LocationState;
  const isFromPO = Boolean(locationState?.poData);
  console.log('DEBUG CarrierPartners location.state:', location.state);
  console.log('DEBUG CarrierPartners isFromPO:', isFromPO);

  useEffect(() => {
    const fetchPartners = async () => {
      if (!user?.uid) {
        console.warn('[DEBUG] No user authenticated. Skipping Firestore call.');
        setPartners([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('[DEBUG] Fetching partners from Firestore for user UID:', user.uid);
        const partnersPath = `users/${user.uid}/partners`;
        console.log('[DEBUG] Firestore path:', partnersPath);
        const partnersSnapshot = await getDocs(collection(db, 'users', user.uid, 'partners'));
        console.log('[DEBUG] Partners snapshot size:', partnersSnapshot.size);
        const partnerList: Partner[] = [];
        partnersSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          console.log('[DEBUG] Raw partner doc:', docSnap.id, data);
          // Validate required fields
          if (!data.companyName) {
            console.warn('[DEBUG] Partner document missing required companyName field:', docSnap.id);
            return;
          }
          // Use docSnap.id as the UID
          const partner: Partner = {
            carrierId: docSnap.id, // Always use the UID
            companyName: data.companyName,
            addedAt: data.addedAt
          };
          // Add optional fields if they exist
          if (data.companyRep) partner.companyRep = data.companyRep;
          if (data.phoneNumber) partner.phoneNumber = data.phoneNumber;
          if (data.email) partner.email = data.email;
          if (data.state) partner.state = data.state;
          if (data.loadTypes) partner.loadTypes = data.loadTypes;
          if (data.trailerTypes) partner.trailerTypes = data.trailerTypes;
          if (data.endorsements) partner.endorsements = data.endorsements;
          if (data.mcNumber) partner.mcNumber = data.mcNumber;
          partnerList.push(partner);
        });
        console.log('[DEBUG] Final partner list:', partnerList);
        setPartners(partnerList);
      } catch (error) {
        console.error('[DEBUG] Error fetching partners:', error);
        alert('There was an error loading your partners. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) {
      fetchPartners();
    }
  }, [user?.uid]);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Initializing...</p>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user?.uid) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Please log in to view your carrier partners.</p>
      </div>
    );
  }

  const filteredPartners = partners.filter(partner =>
    partner.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (partner.companyRep && partner.companyRep.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (partner.state && partner.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (partner.loadTypes && partner.loadTypes.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()))) ||
    (partner.trailerTypes && partner.trailerTypes.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()))) ||
    (partner.endorsements && partner.endorsements.some(endorsement => endorsement.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleViewDetails = async (carrierId: string, mcNumber?: string) => {
    try {
      let carrierData;
      if (mcNumber) {
        carrierData = await getCarrier(mcNumber);
      } else {
        carrierData = await getCarrier(carrierId);
      }
      setProfileCarrier(carrierData);
      setShowProfileModal(true);
    } catch (error) {
      console.error('Error fetching carrier details:', error);
      alert('Failed to fetch carrier details. Please try again.');
    }
  };

  const handleRemovePartner = async (partner: Partner) => {
    if (!user?.uid) {
      console.error('No user ID found');
      alert('You must be logged in to remove partners');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to remove ${partner.companyName} as a partner?`);
    if (!confirmed) return;

    try {
      console.log('Starting partner removal process...');
      console.log('Removing partner:', partner.carrierId);
      
      // Remove from current user's partners
      const userPartnerRef = doc(db, 'users', user.uid, 'partners', partner.carrierId);
      console.log('Removing from user partners:', userPartnerRef.path);
      await deleteDoc(userPartnerRef);
      
      // Remove current user from partner's partners
      const partnerPartnerRef = doc(db, 'users', partner.carrierId, 'partners', user.uid);
      console.log('Removing from partner partners:', partnerPartnerRef.path);
      await deleteDoc(partnerPartnerRef);
      
      // Update local state
      setPartners(prev => prev.filter(p => p.carrierId !== partner.carrierId));
      console.log('Partner removed successfully');
    } catch (error) {
      console.error('Error removing partner:', error);
      alert('There was an error removing the partner. Please try again.');
    }
  };

  const handleSelectCarrier = async (partner: Partner) => {
    if (locationState?.poData?.poNumber) {
      // Find the order by poNumber
      const q = query(
        collection(db, 'purchaseOrders'),
        where('poNumber', '==', locationState.poData.poNumber)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const orderDoc = querySnapshot.docs[0];
        const orderData = orderDoc.data();
        const po = locationState?.poData || {};
        if (orderData.brokerId !== user?.uid) {
          console.error('[ERROR] User does not own PO:', { brokerId: user?.uid, poBrokerId: orderData.brokerId, poNumber: locationState.poData.poNumber });
          alert('You do not have permission to update this purchase order.');
          return;
        }
        
        // Check if this is from a rejection (has rejectedLoadId)
        const isFromRejection = locationState?.fromRejection && locationState?.rejectedLoadId;
        
        try {
          await updateDoc(doc(db, 'purchaseOrders', orderDoc.id), {
            status: 'Active',
            shippingScheduleStatus: 'Carrier Pending',
            selectedCarrier: partner,
          });
        } catch (err) {
          console.error('[ERROR] Failed to update PO:', {
            poId: orderDoc.id,
            poNumber: locationState.poData.poNumber,
            brokerId: user?.uid,
            poBrokerId: orderData.brokerId,
            error: err
          });
          alert('Failed to update purchase order. Please check your permissions.');
          return;
        }
        // --- FIX: Update the load and create partner request with correct loadId ---
        // Find the load for this PO
        const loadsSnapshot = await getDocs(query(collection(db, 'brokerLoads'), where('poNumber', '==', locationState.poData.poNumber)));
        if (!loadsSnapshot.empty) {
          const loadDoc = loadsSnapshot.docs[0];
          try {
            // If this is from a rejection, update the existing load
            if (isFromRejection) {
              await updateDoc(doc(db, 'loads', loadDoc.id), {
                carrierId: partner.carrierId,
                status: 'pending',
                updatedAt: serverTimestamp(),
              });
            } else {
              // IMMEDIATELY remove load from marketplace when carrier is selected
              await updateDoc(doc(db, 'loads', loadDoc.id), {
                isMarketplace: false,
                carrierId: partner.carrierId,
                status: 'pending',
                updatedAt: serverTimestamp(),
              });
            }
            
            await createUnifiedPartnerRequest({
              poNumber: locationState.poData.poNumber,
              loadId: loadDoc.id,
              userId: user?.uid || '',
              userType: 'broker',
              carrierId: partner.carrierId,
            }, 'broker');
            
            // If this is from a rejection, mark the notification as read
            if (isFromRejection && locationState.rejectedLoadId) {
              try {
                await updateDoc(doc(db, 'notifications', locationState.rejectedLoadId), {
                  read: true,
                  updatedAt: serverTimestamp(),
                });
              } catch (err) {
                console.error('[ERROR] Failed to mark rejection notification as read:', err);
              }
            }
          } catch (err) {
            console.error('[ERROR] Failed to create partner request:', err);
          }
        } else {
          console.error('[ERROR] No load found for PO when selecting carrier:', locationState.poData.poNumber);
        }
        // --- END FIX ---
        // Fetch order details to send notification
        const pickupLocation = orderData.pickupLocation || po.vendorInfo || {};
        const deliveryLocation = orderData.deliveryLocation || po.shipTo || {};
        const brokerCompany = orderData.brokerCompany || po.companyInfo?.name || orderData.brokerName || '';
        const pickupDate = orderData.pickupDate || orderData.date || po.date || (Array.isArray(po.items) && po.items[0]?.pickupDate) || '';
        const deliveryDate = orderData.deliveryDate || po.deliveryDate || (Array.isArray(po.items) && po.items[0]?.deliveryDate) || pickupDate || '';
        const cargoDetails = orderData.cargoDetails || po.cargoDetails || {};
        const dimensions = cargoDetails.dimensions || po.dimensions || (Array.isArray(po.items) && po.items[0]?.dimensions) || { length: 0, width: 0, height: 0 };
        const weight = cargoDetails.weight || (Array.isArray(po.items) && po.items[0]?.weight) || 0;
        const rate = orderData.carrierRate || po.rate || (Array.isArray(po.items) && po.items[0]?.rate) || 0;
        try {
          await sendUnifiedLoadRequestToCarrier(
            partner.carrierId,
            user?.uid || '',
            'broker',
            orderDoc.id, // Use orderId as shippingScheduleId
            {
              pickupLocation: {
                address: locationState.poData?.vendorInfo?.address || '',
                city: locationState.poData?.vendorInfo?.city || '',
                state: locationState.poData?.vendorInfo?.state || '',
                zipCode: locationState.poData?.vendorInfo?.zipCode || '',
                date: locationState.poData?.pickupDate || '',
                time: locationState.poData?.pickupTime || '',
              },
              deliveryLocation: {
                address: locationState.poData?.shipTo?.streetAddress || '',
                city: locationState.poData?.shipTo?.city || '',
                state: locationState.poData?.shipTo?.state || '',
                zipCode: locationState.poData?.shipTo?.zipCode || '',
                date: locationState.poData?.deliveryDate || '',
                time: locationState.poData?.deliveryTime || '',
              },
              dimensions: {
                length: locationState.poData?.cargoDetails?.dimensions?.length || 0,
                width: locationState.poData?.cargoDetails?.dimensions?.width || 0,
                height: locationState.poData?.cargoDetails?.dimensions?.height || 0,
              },
              weight: locationState.poData?.cargoDetails?.weight || 0,
              rate: locationState.poData?.rate || 0,
              companyName: locationState.poData?.companyInfo?.name || '',
              poNumber: locationState.poData.poNumber || orderData.poNumber || '',
            }
          );
        } catch (err) {
          console.error('[ERROR] Failed to send load request notification:', err);
        }
      }
    }
    navigate('/broker/schedule');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Carrier Partners</h1>
        {!isFromPO && (
          <button 
            className={styles.addButton}
            onClick={() => navigate('/broker/directory')}
          >
            Add New Carrier
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search carriers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.carrierGrid}>
        {loading ? (
          <div>Loading...</div>
        ) : filteredPartners.length === 0 ? (
          <div className={styles.noCarriers}>
            <p>No carrier partners found. Add some carriers from the directory!</p>
          </div>
        ) : (
          filteredPartners.map((partner) => (
            <div key={partner.carrierId} className={styles.carrierCard}>
              <div className={styles.cardHeader}>
                <h3>{partner.companyName}</h3>
              </div>
              <div className={styles.contact}>
                {partner.companyRep && <p>Rep: {partner.companyRep}</p>}
                {partner.phoneNumber && <p>Phone: {partner.phoneNumber}</p>}
                {partner.email && <p>Email: {partner.email}</p>}
                {partner.state && <p>State: {partner.state}</p>}
                {partner.loadTypes && <p>Load Types: {partner.loadTypes.join(', ')}</p>}
                {partner.trailerTypes && <p>Trailer Types: {partner.trailerTypes.join(', ')}</p>}
                {partner.endorsements && <p>Endorsements: {partner.endorsements.join(', ')}</p>}
              </div>
              <div className={styles.actions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => handleViewDetails(partner.carrierId, partner.mcNumber)}
                >
                  View Details
                </button>
                <button className={styles.actionButton} onClick={() => handleRemovePartner(partner)} style={{backgroundColor:'#dc3545'}}>Remove Partnership</button>
                {isFromPO && (
                  <button
                    className={styles.selectButton}
                    onClick={() => handleSelectCarrier(partner)}
                  >
                    Select Carrier
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Carrier Profile Modal */}
      {showProfileModal && (
        <div className={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            {profileCarrier ? (
              <>
                <h2>{profileCarrier.companyName || 'Carrier Profile'}</h2>
                <div style={{marginBottom: 12}}>
                  <strong>MC Number:</strong> {profileCarrier.mcNumber || 'N/A'}<br/>
                  <strong>DOT Number:</strong> {profileCarrier.dotNumber || 'N/A'}<br/>
                  <strong>Status:</strong> {profileCarrier.status || 'N/A'}<br/>
                  <strong>Address:</strong> {
                    profileCarrier.address
                      ? `${profileCarrier.address.street || ''}, ${profileCarrier.address.city || ''}, ${profileCarrier.address.state || ''} ${profileCarrier.address.zip || ''}`
                      : `${profileCarrier.street || ''}, ${profileCarrier.city || ''}, ${profileCarrier.state || ''} ${profileCarrier.zip || ''}`
                    || 'N/A'
                  }<br/>
                </div>
                <div style={{marginBottom: 12}}>
                  <strong>Contact Information</strong><br/>
                  <strong>Email:</strong> {profileCarrier.email || 'N/A'}<br/>
                  <strong>Phone:</strong> {profileCarrier.phoneNumber || profileCarrier.phone || 'N/A'}<br/>
                </div>
                <div style={{marginBottom: 12}}>
                  <strong>Rating:</strong> {profileCarrier.rating ? `${profileCarrier.rating.toFixed(1)} / 5` : 'N/A'}<br/>
                  <strong>Total Loads:</strong> {profileCarrier.totalLoads ?? 'N/A'}<br/>
                  <strong>Completed Loads:</strong> {profileCarrier.completedLoads ?? 'N/A'}<br/>
                  <strong>On-Time Deliveries:</strong> {profileCarrier.onTimeDeliveries ?? 'N/A'}<br/>
                </div>
                <div style={{marginBottom: 12}}>
                  <strong>Compliance & Insurance</strong><br/>
                  {profileCarrier.insurance && profileCarrier.insurance.length > 0 ? (
                    <ul>
                      {profileCarrier.insurance.map((ins: any, idx: number) => (
                        <li key={idx}>{ins.type?.toUpperCase() || 'INS'}: {ins.provider || 'N/A'} (Policy: {ins.policyNumber || 'N/A'}, Coverage: ${ins.coverage?.toLocaleString() || 'N/A'}, Expires: {ins.expiresAt?.toDate ? ins.expiresAt.toDate().toLocaleDateString() : 'N/A'})</li>
                      ))}
                    </ul>
                  ) : <p>No insurance info available.</p>}
                </div>
                <div style={{marginBottom: 12}}>
                  <strong>Equipment</strong><br/>
                  {profileCarrier.equipment && profileCarrier.equipment.length > 0 ? (
                    <ul>
                      {profileCarrier.equipment.map((eq: any, idx: number) => (
                        <li key={idx}>{eq.type?.toUpperCase() || 'EQUIP'}: {eq.count || 1} units, Capacity: {eq.capacity ? `${eq.capacity} lbs` : 'N/A'}</li>
                      ))}
                    </ul>
                  ) : <p>No equipment info available.</p>}
                </div>
                <div style={{marginBottom: 12}}>
                  <strong>Service Areas</strong><br/>
                  {profileCarrier.serviceAreas && profileCarrier.serviceAreas.length > 0 ? (
                    <ul>
                      {profileCarrier.serviceAreas.map((area: any, idx: number) => (
                        <li key={idx}>{area.state}{area.preferred ? ' (Preferred)' : ''}</li>
                      ))}
                    </ul>
                  ) : <p>No service area info available.</p>}
                </div>
                <button onClick={() => setShowProfileModal(false)}>Close</button>
              </>
            ) : (
              <div>
                <h2>Carrier Profile Not Found</h2>
                <p>No profile data available for this carrier. Please ensure the partner record has a valid carrierId or mcNumber.</p>
                <button onClick={() => setShowProfileModal(false)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierPartners;
