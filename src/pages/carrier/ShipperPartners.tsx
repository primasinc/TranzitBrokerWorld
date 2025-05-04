import React, { useState, useEffect } from 'react';
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
  addedAt?: any;
}

const STATES = [
  '', 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const ShipperPartners: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        console.log('Current logged-in user UID:', user.uid);
        setLoading(true);
        const partnersSnapshot = await getDocs(collection(db, 'users', user.uid, 'partners'));
        const partnerList: Partner[] = [];
        partnersSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          partnerList.push({
            id: docSnap.id,
            companyName: data.companyName,
            companyRep: data.companyRep,
            phoneNumber: data.phoneNumber,
            email: data.email,
            state: data.state,
            addedAt: data.addedAt
          });
        });
        setPartners(partnerList);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = !stateFilter || partner.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const handleRemovePartner = async (partner: Partner) => {
    if (!userId) return;
    const confirmed = window.confirm(`Are you sure you want to remove ${partner.companyName} as a partner?`);
    if (!confirmed) return;
    // Remove from current user's partners
    await deleteDoc(doc(db, 'users', userId, 'partners', partner.id));
    // Remove current user from partner's partners
    await deleteDoc(doc(db, 'users', partner.id, 'partners', userId));
    // Update local state
    setPartners(prev => prev.filter(p => p.id !== partner.id));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Shipper Partners</h1>
        <div className={styles.filterRow}>
          <input
            type="text"
            placeholder="Search shippers by company name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className={styles.filterSelect}
          >
            {STATES.map(state => <option key={state} value={state}>{state || 'All States'}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.carrierGrid}>
        {loading ? (
          <div>Loading...</div>
        ) : filteredPartners.length === 0 ? (
          <div className={styles.noCarriers}>
            <p>No shipper partners found.</p>
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
              </div>
              <div className={styles.actions}>
                <button className={styles.actionButton} onClick={() => handleRemovePartner(partner)} style={{backgroundColor:'#dc3545'}}>Remove Partnership</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShipperPartners; 