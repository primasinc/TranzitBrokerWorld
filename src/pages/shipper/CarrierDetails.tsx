import React from 'react';
import { useParams } from 'react-router-dom';
import styles from './CarrierDetails.module.css';

const CarrierDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // TODO: Fetch carrier details using the ID
  const carrier = {
    id: "C001",
    name: "ABC Trucking Co",
    rating: 4.8,
    completedLoads: 156,
    activeLoads: 3,
    specialties: ["Refrigerated", "Hazmat", "LTL"],
    status: "Active",
    location: "Chicago, IL",
    contact: {
      name: "John Smith",
      phone: "(555) 123-4567",
      email: "john@abctrucking.com"
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{carrier.name}</h1>
        <span className={`${styles.status} ${styles[carrier.status.toLowerCase()]}`}>
          {carrier.status}
        </span>
      </div>

      <div className={styles.content}>
        {/* Add detailed carrier information here */}
      </div>
    </div>
  );
};

export default CarrierDetails; 