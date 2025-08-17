import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './CarrierDirectory.module.css';
import CarrierProfileCard from '../../components/carrier/CarrierProfileCard';

interface CarrierUser {
  id: string;
  companyName: string;
  companyRep?: string;
  phoneNumber?: string;
  email?: string;
  state?: string;
  loadTypes?: string[];
  trailerTypes?: string[];
  endorsements?: string[];
  mcNumber?: string;
  dotNumber?: string;
}

const STATES = [
  '', 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];
const LOAD_TYPES = ['', 'FTL', 'LTL', 'Refrigerated', 'Expedited'];
const TRAILER_TYPES = ['', 'Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Lowboy', 'Power Only'];
const ENDORSEMENTS = ['', 'Hazmat', 'Tanker', 'Doubles/Triples', 'TWIC'];

const CarrierDirectory: React.FC = () => {
  const [carriers, setCarriers] = useState<CarrierUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState('');
  const [loadTypeFilter, setLoadTypeFilter] = useState('');
  const [trailerTypeFilter, setTrailerTypeFilter] = useState('');
  const [endorsementFilter, setEndorsementFilter] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [partnerIds, setPartnerIds] = useState<Set<string>>(new Set());
  const [showSaferModal, setShowSaferModal] = useState(false);
  const [saferCarrier, setSaferCarrier] = useState<CarrierUser | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileCarrier, setProfileCarrier] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        // Fetch current broker's partners
        const partnersSnapshot = await getDocs(collection(db, 'users', user.uid, 'partners'));
        const ids = new Set<string>();
        partnersSnapshot.forEach(doc => ids.add(doc.id));
        setPartnerIds(ids);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCarriers = async () => {
      setLoading(true);
      // Query the users collection for carriers
      const q = query(collection(db, 'users'), where('userType', '==', 'carrier'));
      const querySnapshot = await getDocs(q);
      const carrierList: CarrierUser[] = [];
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        carrierList.push({
          id: docSnap.id,
          companyName: data.companyName,
          companyRep: data.companyRep,
          phoneNumber: data.phoneNumber,
          email: data.email,
          state: data.state,
          loadTypes: data.loadTypes,
          trailerTypes: data.trailerTypes,
          endorsements: data.endorsements,
          mcNumber: data.mcNumber,
          dotNumber: data.dotNumber,
        });
      });
      setCarriers(carrierList);
      setLoading(false);
    };
    fetchCarriers();
  }, []);

  const filteredCarriers = carriers.filter(carrier => {
    const matchesSearch = carrier.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = !stateFilter || carrier.state === stateFilter;
    const matchesLoadType = !loadTypeFilter || (carrier.loadTypes && carrier.loadTypes.includes(loadTypeFilter));
    const matchesTrailerType = !trailerTypeFilter || (carrier.trailerTypes && carrier.trailerTypes.includes(trailerTypeFilter));
    const matchesEndorsement = !endorsementFilter || (carrier.endorsements && carrier.endorsements.includes(endorsementFilter));
    return matchesSearch && matchesState && matchesLoadType && matchesTrailerType && matchesEndorsement;
  });

  // Helper to remove undefined values from objects
  function removeUndefined(obj: any) {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
  }

  const handleAddToPartners = async (carrier: CarrierUser) => {
    if (!userId) {
      alert('You must be logged in to add partners');
      return;
    }
    try {
      // Search users collection for existing carrier by MC Number or email
      const q = query(collection(db, 'users'), where('userType', '==', 'carrier'), where('companyName', '==', carrier.companyName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const existingCarrierDoc = querySnapshot.docs[0];
        const existingCarrierData = existingCarrierDoc.data();
        const existingCarrierId = existingCarrierDoc.id;

        // Defensive: Ensure all required carrier fields are defined
        const partnerData = {
          companyName: carrier.companyName || '',
          companyRep: carrier.companyRep || '',
          phoneNumber: carrier.phoneNumber || '',
          email: carrier.email || '',
          loadTypes: Array.isArray(carrier.loadTypes) ? carrier.loadTypes : [],
          trailerTypes: Array.isArray(carrier.trailerTypes) ? carrier.trailerTypes : [],
          endorsements: Array.isArray(carrier.endorsements) ? carrier.endorsements : [],
          addedAt: new Date(),
          partnerId: existingCarrierId,
          state: 'active', // Always set to a valid value
        };
        const partnerRef = doc(db, 'users', userId, 'partners', existingCarrierId);

        // Defensive: Fetch and check broker data
        const brokerDocRef = doc(db, 'users', userId);
        const brokerDoc = await getDoc(brokerDocRef);
        if (!brokerDoc.exists()) {
          throw new Error('Broker document not found');
        }
        const brokerData = brokerDoc.data() || {};
        const brokerPartnerData = {
          companyName: brokerData.companyName || '',
          companyRep: brokerData.companyRep || '',
          phoneNumber: brokerData.phoneNumber || '',
          email: brokerData.email || '',
          addedAt: new Date(),
          partnerId: userId,
          state: 'active', // Always set to a valid value
        };
        const carrierPartnerRef = doc(db, 'users', existingCarrierId, 'partners', userId);

        // Notification data
        const notificationRef = doc(collection(db, 'notifications'));
        const notificationData = {
          type: 'partner_request',
          recipientId: existingCarrierId,
          senderId: userId,
          senderName: auth.currentUser?.displayName || brokerData.companyName || 'A broker',
          message: `${auth.currentUser?.displayName || brokerData.companyName || 'A broker'} has added you as a partner`,
          read: false,
          createdAt: new Date()
        };

        // Batch write
        const batch = writeBatch(db);
        batch.set(partnerRef, removeUndefined(partnerData));
        batch.set(carrierPartnerRef, removeUndefined(brokerPartnerData));
        batch.set(notificationRef, notificationData);
        await batch.commit();

        // Update local state
        setPartnerIds(new Set([...Array.from(partnerIds), existingCarrierId]));
        
        // Show success message
        alert('Partner added successfully!');
        navigate('/broker/partners');
      } else {
        // If not found, allow creation of new user (rare)
        // This should not happen in a typical application
        throw new Error('Carrier not found in users collection');
      }
    } catch (error) {
      console.error('Error adding partner:', error);
      if (error instanceof Error) {
        alert(`There was an error adding the carrier as a partner: ${error.message}`);
      } else {
        alert('There was an unknown error adding the carrier as a partner. Please try again.');
      }
    }
  };

  const handleViewProfile = async (carrier: CarrierUser) => {
    let fullProfile = null;
    // Always fetch the full user profile from the users collection
    if (carrier.id) {
      const carrierRef = doc(db, 'users', carrier.id);
      const carrierSnap = await getDoc(carrierRef);
      if (carrierSnap.exists()) {
        fullProfile = carrierSnap.data();
      }
    }
    setProfileCarrier(fullProfile);
    setShowProfileModal(true);
  };

  const handleSaferCheck = (carrier: CarrierUser) => {
    setSaferCarrier(carrier);
    setShowSaferModal(true);
  };

  const closeSaferModal = () => {
    setShowSaferModal(false);
    setSaferCarrier(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Carrier Directory</h1>
        <div className={styles.filterRow}>
          <input
            type="text"
            placeholder="Search carriers by company name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <div className={styles.filters}>
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className={styles.filterSelect}>
              {STATES.map(state => <option key={state} value={state}>{state || 'All States'}</option>)}
            </select>
            <select value={loadTypeFilter} onChange={e => setLoadTypeFilter(e.target.value)} className={styles.filterSelect}>
              {LOAD_TYPES.map(type => <option key={type} value={type}>{type || 'All Load Types'}</option>)}
            </select>
            <select value={trailerTypeFilter} onChange={e => setTrailerTypeFilter(e.target.value)} className={styles.filterSelect}>
              {TRAILER_TYPES.map(type => <option key={type} value={type}>{type || 'All Trailer Types'}</option>)}
            </select>
            <select value={endorsementFilter} onChange={e => setEndorsementFilter(e.target.value)} className={styles.filterSelect}>
              {ENDORSEMENTS.map(type => <option key={type} value={type}>{type || 'All Endorsements'}</option>)}
            </select>
          </div>
        </div>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className={styles.carrierList}>
          {filteredCarriers.length === 0 ? (
            <div>No carriers found.</div>
          ) : (
            filteredCarriers.map(carrier => (
              <CarrierProfileCard key={carrier.id} carrier={carrier} onPartnerRequest={handleAddToPartners} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CarrierDirectory;
