import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './BrokerCarrierPartners.module.css';

interface Partner {
  carrierId: string;
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
  rate?: number;
}

const BrokerCarrierPartners: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingCarrier, setSelectingCarrier] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Check if we came from PO creation
  const locationState = location.state as LocationState;
  const isFromPO = Boolean(locationState?.poData);

  useEffect(() => {
    const fetchPartners = async () => {
      if (!user?.uid) return;
      
      setLoading(true);
      setError(null);
      try {
        const partnersSnapshot = await getDocs(collection(db, 'users', user.uid, 'partners'));
        
        const partnerList: Partner[] = [];
        partnersSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          
          // Validate required fields
          if (!data.companyName) {
            console.warn('Partner document missing required companyName field:', docSnap.id);
            return;
          }
          
          // Use docSnap.id as the UID
          const partner: Partner = {
            carrierId: docSnap.id,
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
        
        setPartners(partnerList);
      } catch (error) {
        console.error('Error fetching partners:', error);
        setError('There was an error loading your partners. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) {
      fetchPartners();
    }
  }, [user?.uid]);

  const filteredPartners = partners.filter(partner =>
    partner.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.companyRep?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCarrier = async (partner: Partner) => {
    if (!locationState?.poData?.poNumber) {
      setError('No PO data found. Please go back and try again.');
      return;
    }

    setSelectingCarrier(partner.carrierId);
    setError(null);

    try {
      // Update the PO with selected carrier
      const poQuery = query(
        collection(db, 'brokerPurchaseOrders'),
        where('poNumber', '==', locationState.poData.poNumber)
      );
      const poSnapshot = await getDocs(poQuery);
      
      if (!poSnapshot.empty) {
        const poDoc = poSnapshot.docs[0];
        const poData = poDoc.data();
        
        // Verify broker owns this PO
        if (poData.brokerId !== user?.uid) {
          setError('You do not have permission to update this purchase order.');
          return;
        }
        
        // Update PO with selected carrier
        await updateDoc(doc(db, 'brokerPurchaseOrders', poDoc.id), {
          status: 'Active',
          shippingScheduleStatus: 'Carrier Pending',
          selectedCarrier: partner,
          updatedAt: serverTimestamp()
        });
        
        // Navigate to shipping schedule creation with PO and carrier data
        navigate('/broker/shipping-schedule', {
          state: {
            poData: locationState.poData,
            selectedCarrier: partner,
            rate: locationState.rate || 0
          }
        });
      } else {
        setError('Purchase order not found. Please go back and try again.');
      }
    } catch (error) {
      console.error('Error selecting carrier:', error);
      setError('Failed to select carrier. Please try again.');
    } finally {
      setSelectingCarrier(null);
    }
  };

  const handleAddNewCarrier = () => {
    navigate('/broker/carrier-directory');
  };

  const handleBack = () => {
    navigate('/broker/create-po');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setError(null); // Clear errors when user types
  };

  // Clear error when component unmounts or user navigates
  useEffect(() => {
    return () => {
      setError(null);
      setSelectingCarrier(null);
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Select Carrier Partner</h1>
        {isFromPO && (
          <div className={styles.poInfo}>
            <p><strong>PO:</strong> {locationState.poData?.poNumber}</p>
            <p><strong>Rate:</strong> ${locationState.rate || 0}</p>
          </div>
        )}
        {!isFromPO && (
          <button 
            className={styles.addButton}
            onClick={handleAddNewCarrier}
          >
            Add New Carrier
          </button>
        )}
      </div>

      {isFromPO && (
        <div className={styles.backSection}>
          <button className={styles.backButton} onClick={handleBack}>
            ← Back to PO Creation
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => setError(null)}
            className={styles.errorClose}
          >
            ×
          </button>
        </div>
      )}

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search carriers by name, rep, or state..."
          value={searchTerm}
          onChange={handleSearchChange}
          className={styles.searchInput}
        />
        {searchTerm && (
          <span className={styles.searchResults}>
            {filteredPartners.length} carrier{filteredPartners.length !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      <div className={styles.carrierGrid}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading carrier partners...</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className={styles.noCarriers}>
            {searchTerm ? (
              <>
                <p>No carriers found matching "{searchTerm}"</p>
                <button 
                  className={styles.clearSearch}
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <p>No carrier partners found. Add some carriers from the directory!</p>
                <button 
                  className={styles.addButton}
                  onClick={handleAddNewCarrier}
                >
                  Add New Carrier
                </button>
              </>
            )}
          </div>
        ) : (
          filteredPartners.map((partner) => (
            <div key={partner.carrierId} className={styles.carrierCard}>
              <div className={styles.cardHeader}>
                <h3>{partner.companyName}</h3>
                {partner.mcNumber && (
                  <span className={styles.mcNumber}>MC: {partner.mcNumber}</span>
                )}
              </div>
              
              <div className={styles.contact}>
                {partner.companyRep && <p><strong>Rep:</strong> {partner.companyRep}</p>}
                {partner.phoneNumber && <p><strong>Phone:</strong> {partner.phoneNumber}</p>}
                {partner.email && <p><strong>Email:</strong> {partner.email}</p>}
                {partner.state && <p><strong>State:</strong> {partner.state}</p>}
                {partner.loadTypes && partner.loadTypes.length > 0 && (
                  <p><strong>Load Types:</strong> {partner.loadTypes.join(', ')}</p>
                )}
                {partner.trailerTypes && partner.trailerTypes.length > 0 && (
                  <p><strong>Trailer Types:</strong> {partner.trailerTypes.join(', ')}</p>
                )}
                {partner.endorsements && partner.endorsements.length > 0 && (
                  <p><strong>Endorsements:</strong> {partner.endorsements.join(', ')}</p>
                )}
              </div>
              
              <div className={styles.actions}>
                {isFromPO ? (
                  <button
                    className={styles.selectButton}
                    onClick={() => handleSelectCarrier(partner)}
                    disabled={selectingCarrier === partner.carrierId}
                  >
                    {selectingCarrier === partner.carrierId ? (
                      <>
                        <span className={styles.spinner}></span>
                        Selecting...
                      </>
                    ) : (
                      'Select This Carrier'
                    )}
                  </button>
                ) : (
                  <button
                    className={styles.viewButton}
                    onClick={() => navigate(`/broker/carrier-profile/${partner.carrierId}`)}
                  >
                    View Profile
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BrokerCarrierPartners;
