import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, getDoc, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './CarrierPartners.module.css';
import { getCarrier } from '../../services/carrierService';
import { sendLoadRequestToCarrier } from '../../services/notificationService';
import { createPartnerRequest } from '../../services/partnerRequestService';

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
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileCarrier, setProfileCarrier] = useState<any>(null);

  // Check if we came from PO creation
  const locationState = location.state as LocationState;
  const isFromPO = Boolean(locationState?.poData);
  console.log('DEBUG CarrierPartners location.state:', location.state);
  console.log('DEBUG CarrierPartners isFromPO:', isFromPO);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[DEBUG] onAuthStateChanged user:', user);
      if (user) {
        setUserId(user.uid);
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
      } else {
        console.warn('[DEBUG] No user authenticated. Skipping Firestore call.');
        setPartners([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
    if (window.confirm(`Are you sure you want to remove ${partner.companyName} as a partner?`)) {
      try {
        await deleteDoc(doc(db, 'users', userId!, 'partners', partner.carrierId));
        setPartners(partners.filter(p => p.carrierId !== partner.carrierId));
        alert('Partner removed successfully.');
      } catch (error) {
        console.error('Error removing partner:', error);
        alert('Failed to remove partner. Please try again.');
      }
    }
  };

  const handleSelectCarrier = async (partner: Partner) => {
    if (!locationState?.poData) {
      alert('No purchase order data available.');
      return;
    }

    try {
      // Mock the partner request creation for now since broker services aren't fully implemented
      console.log('Creating partner request for carrier:', partner.carrierId, 'with PO:', locationState.poData.poNumber);
      
      // Mock the load request notification for now since broker services aren't fully implemented
      console.log('Sending load request to carrier:', partner.carrierId);
      
      // Navigate to broker schedule page
      navigate('/broker/schedule');
    } catch (error) {
      console.error('Error selecting carrier:', error);
      alert('Failed to select carrier. Please try again.');
    }
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
