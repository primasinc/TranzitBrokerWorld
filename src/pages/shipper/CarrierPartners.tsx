import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './CarrierPartners.module.css';
import { getCarrier } from '../../services/carrierService';
import { sendLoadRequestToCarrier } from '../../services/notificationService';

interface Partner {
  id: string;
  companyName: string;
  companyRep?: string;
  phoneNumber?: string;
  email?: string;
  state?: string;
  loadTypes?: string[];
  trailerTypes?: string[];
  endorsements?: string[];
  addedAt?: any;
  carrierId?: string;
  mcNumber?: string;
}

interface LocationState {
  poData?: any;
  rate?: string;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        console.log('Current logged-in user UID:', user.uid);
        setLoading(true);
        try {
          console.log('Fetching partners from Firestore...');
          const partnersSnapshot = await getDocs(collection(db, 'users', user.uid, 'partners'));
          console.log('Partners snapshot size:', partnersSnapshot.size);
          const partnerList: Partner[] = [];
          partnersSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            console.log('Raw partner doc:', docSnap.id, data);
            // Validate required fields
            if (!data.companyName) {
              console.warn('Partner document missing required companyName field:', docSnap.id);
              return;
            }
            const partner: Partner = {
              id: docSnap.id,
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
            partnerList.push(partner);
          });
          console.log('Final partner list:', partnerList);
          setPartners(partnerList);
        } catch (error) {
          console.error('Error fetching partners:', error);
          alert('There was an error loading your partners. Please try refreshing the page.');
        } finally {
          setLoading(false);
        }
      } else {
        console.log('No user logged in');
        setLoading(false);
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    // You can add more filters here if needed
    return matchesSearch;
  });

  const handleRemovePartner = async (partner: Partner) => {
    if (!userId) {
      console.error('No user ID found');
      alert('You must be logged in to remove partners');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to remove ${partner.companyName} as a partner?`);
    if (!confirmed) return;

    try {
      console.log('Starting partner removal process...');
      console.log('Removing partner:', partner.id);
      
      // Remove from current user's partners
      const userPartnerRef = doc(db, 'users', userId, 'partners', partner.id);
      console.log('Removing from user partners:', userPartnerRef.path);
      await deleteDoc(userPartnerRef);
      
      // Remove current user from partner's partners
      const partnerPartnerRef = doc(db, 'users', partner.id, 'partners', userId);
      console.log('Removing from partner partners:', partnerPartnerRef.path);
      await deleteDoc(partnerPartnerRef);
      
      // Update local state
      setPartners(prev => prev.filter(p => p.id !== partner.id));
      console.log('Partner removed successfully');
    } catch (error) {
      console.error('Error removing partner:', error);
      alert('There was an error removing the partner. Please try again.');
    }
  };

  const handleViewDetails = async (partnerId: string, mcNumber?: string) => {
    let carrier = null;
    // Always fetch the full user profile from the users collection
    if (partnerId) {
      const carrierRef = doc(db, 'users', partnerId);
      const carrierSnap = await getDoc(carrierRef);
      if (carrierSnap.exists()) {
        carrier = carrierSnap.data();
      }
    }
    // If not found and mcNumber is available, try to fetch by MC Number
    if (!carrier && mcNumber) {
      const q = query(collection(db, 'users'), where('mcNumber', '==', mcNumber), where('userType', '==', 'carrier'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        carrier = snap.docs[0].data();
      }
    }
    console.log('DEBUG Carrier Profile:', carrier);
    setProfileCarrier(carrier); // Only set to the fetched user profile
    setShowProfileModal(true);
  };

  const handleSelectCarrier = async (carrier: Partner) => {
    if (locationState?.poData?.poNumber) {
      // Find the order by poNumber
      const q = query(
        collection(db, 'purchaseOrders'),
        where('poNumber', '==', locationState.poData.poNumber)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const orderDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'purchaseOrders', orderDoc.id), {
          status: 'Active',
          shippingScheduleStatus: 'Carrier Pending',
          selectedCarrier: carrier,
        });
        
        // Fetch order details to send notification
        const orderData = orderDoc.data();
        if (orderData && userId) {
          // Safe access for cargo details
          const po = locationState?.poData || {};
          // Map vendorInfo and shipTo to pickup/delivery
          const pickupLocation = orderData.pickupLocation || po.vendorInfo || {};
          const deliveryLocation = orderData.deliveryLocation || po.shipTo || {};
          // Map company name
          const shipperCompany = orderData.shipperCompany || po.companyInfo?.name || orderData.shipperName || '';
          // Map date
          const pickupDate = orderData.date || po.date || '';
          // Map dimensions and weight
          const cargoDetails = orderData.cargoDetails || po.cargoDetails || {};
          const dimensions = cargoDetails.dimensions || po.dimensions || { length: 0, width: 0, height: 0 };
          const weight = cargoDetails.weight || po.items?.reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || 0;
          const rate = orderData.carrierRate || po.rate || 0;
          await sendLoadRequestToCarrier(
            carrier.id,
            userId,
            orderDoc.id,
            {
              pickupLocation: {
                address: pickupLocation.streetAddress || '',
                city: pickupLocation.cityStateZip?.split(',')[0]?.trim() || '',
                state: pickupLocation.cityStateZip?.split(',')[1]?.trim().split(' ')[0] || '',
                zipCode: pickupLocation.cityStateZip?.split(' ').slice(-1)[0] || '',
                date: pickupDate,
                time: ''
              },
              deliveryLocation: {
                address: deliveryLocation.streetAddress || '',
                city: deliveryLocation.cityStateZip?.split(',')[0]?.trim() || '',
                state: deliveryLocation.cityStateZip?.split(',')[1]?.trim().split(' ')[0] || '',
                zipCode: deliveryLocation.cityStateZip?.split(' ').slice(-1)[0] || '',
                date: pickupDate,
                time: ''
              },
              dimensions,
              weight,
              rate,
              shipperCompany,
              poNumber: locationState.poData.poNumber || orderData.poNumber || ''
            }
          );
        }
      }
    }
    navigate('/shipper/schedule');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Carrier Partners</h1>
        {!isFromPO && (
          <button 
            className={styles.addButton}
            onClick={() => navigate('/shipper/directory')}
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
            <div key={partner.id} className={styles.carrierCard}>
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
                  onClick={() => handleViewDetails(partner.carrierId || partner.id, partner.mcNumber)}
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