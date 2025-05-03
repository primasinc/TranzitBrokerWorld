import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './CarrierDirectory.module.css';

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
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        // Fetch current shipper's partners
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

  const handleAddToPartners = async (carrier: CarrierUser) => {
    if (!userId) return;
    const partnerRef = doc(db, 'users', userId, 'partners', carrier.id);
    console.log('Current userId:', userId);
    console.log('Writing to Firestore path:', partnerRef.path);
    const partnerDoc = await getDoc(partnerRef);
    if (!partnerDoc.exists()) {
      // Only include defined fields
      const partnerData: any = {
        companyName: carrier.companyName,
        addedAt: new Date()
      };
      if (carrier.companyRep) partnerData.companyRep = carrier.companyRep;
      if (carrier.phoneNumber) partnerData.phoneNumber = carrier.phoneNumber;
      if (carrier.email) partnerData.email = carrier.email;
      if (carrier.state) partnerData.state = carrier.state;
      if (carrier.loadTypes) partnerData.loadTypes = carrier.loadTypes;
      if (carrier.trailerTypes) partnerData.trailerTypes = carrier.trailerTypes;
      if (carrier.endorsements) partnerData.endorsements = carrier.endorsements;

      await setDoc(partnerRef, partnerData);

      // Create notification for the carrier
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        type: 'partner_request',
        recipientId: carrier.id,
        senderId: userId,
        senderName: auth.currentUser?.displayName || 'A shipper',
        message: `${auth.currentUser?.displayName || 'A shipper'} has added you as a partner`,
        read: false,
        createdAt: new Date()
      });

      setPartnerIds(new Set([...Array.from(partnerIds), carrier.id]));
      navigate('/shipper/partners');
    }
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
              <div key={carrier.id} className={styles.carrierCard}>
                <h2>{carrier.companyName}</h2>
                {carrier.companyRep && <p>Rep: {carrier.companyRep}</p>}
                {carrier.phoneNumber && <p>Phone: {carrier.phoneNumber}</p>}
                {carrier.email && <p>Email: {carrier.email}</p>}
                {carrier.state && <p>State: {carrier.state}</p>}
                {carrier.loadTypes && <p>Load Types: {carrier.loadTypes.join(', ')}</p>}
                {carrier.trailerTypes && <p>Trailer Types: {carrier.trailerTypes.join(', ')}</p>}
                {carrier.endorsements && <p>Endorsements: {carrier.endorsements.join(', ')}</p>}
                <button
                  className={styles.addButton}
                  onClick={() => handleAddToPartners(carrier)}
                  disabled={partnerIds.has(carrier.id)}
                >
                  {partnerIds.has(carrier.id) ? 'Added' : 'Add to Partners'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CarrierDirectory; 