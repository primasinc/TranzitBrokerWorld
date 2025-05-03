import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import styles from './CarrierDirectory.module.css';

interface CarrierUser {
  id: string;
  companyName: string;
  companyRep?: string;
  phoneNumber?: string;
  email?: string;
  // Add more fields as needed
}

const CarrierDirectory: React.FC = () => {
  const [carriers, setCarriers] = useState<CarrierUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
        });
      });
      setCarriers(carrierList);
      setLoading(false);
    };
    fetchCarriers();
  }, []);

  const filteredCarriers = carriers.filter(carrier =>
    carrier.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Carrier Directory</h1>
        <input
          type="text"
          placeholder="Search carriers by company name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
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
                {/* Add more info as needed */}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CarrierDirectory; 