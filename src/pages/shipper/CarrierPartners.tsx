import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './CarrierPartners.module.css';

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
                  onClick={() => navigate(`/shipper/partners/${partner.id}`)}
                >
                  View Details
                </button>
                <button className={styles.actionButton} onClick={() => handleRemovePartner(partner)} style={{backgroundColor:'#dc3545'}}>Remove Partnership</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CarrierPartners; 