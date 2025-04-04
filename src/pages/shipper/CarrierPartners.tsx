import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrierContext } from '../../context/CarrierContext';
import styles from './CarrierPartners.module.css';

const CarrierPartners: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const navigate = useNavigate();
  const { partnerCarriers } = useCarrierContext();

  const renderStars = (rating: number) => {
    return "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));
  };

  const filteredCarriers = partnerCarriers.filter(carrier => {
    const matchesSearch = carrier.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = filterSpecialty === 'all' || carrier.specialties.includes(filterSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Carrier Partners</h1>
        <button 
          className={styles.addButton}
          onClick={() => navigate('/shipper/carrier-directory')}
        >
          Add New Carrier
        </button>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search carriers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
          className={styles.specialtyFilter}
        >
          <option value="all">All Specialties</option>
          <option value="Refrigerated">Refrigerated</option>
          <option value="Hazmat">Hazmat</option>
          <option value="LTL">LTL</option>
          <option value="FTL">FTL</option>
          <option value="Flatbed">Flatbed</option>
        </select>
      </div>

      <div className={styles.carrierGrid}>
        {filteredCarriers.length === 0 ? (
          <div className={styles.noCarriers}>
            <p>No carrier partners found. Add some carriers from the directory!</p>
          </div>
        ) : (
          filteredCarriers.map((carrier) => (
            <div key={carrier.id} className={styles.carrierCard}>
              <div className={styles.cardHeader}>
                <h3>{carrier.name}</h3>
                <span className={`${styles.status} ${styles[carrier.status.toLowerCase()]}`}>
                  {carrier.status}
                </span>
              </div>
              
              <div className={styles.rating}>
                <span className={styles.stars}>{renderStars(carrier.rating)}</span>
                <span>{carrier.rating.toFixed(1)}</span>
              </div>

              <div className={styles.stats}>
                <div>
                  <label>Completed Loads</label>
                  <span>{carrier.completedLoads}</span>
                </div>
                <div>
                  <label>Active Loads</label>
                  <span>{carrier.activeLoads}</span>
                </div>
              </div>

              <div className={styles.specialties}>
                {carrier.specialties.map((specialty) => (
                  <span key={specialty} className={styles.specialty}>
                    {specialty}
                  </span>
                ))}
              </div>

              <div className={styles.location}>
                <i className={styles.locationIcon}>📍</i>
                {carrier.location}
              </div>

              <div className={styles.contact}>
                <h4>Contact Information</h4>
                <p>{carrier.contact.name}</p>
                <p>{carrier.contact.phone}</p>
                <p>{carrier.contact.email}</p>
              </div>

              <div className={styles.actions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => navigate(`/shipper/partners/${carrier.id}`)}
                >
                  View Details
                </button>
                <button className={styles.actionButton}>Contact</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CarrierPartners; 