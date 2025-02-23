import React, { useState } from 'react';
import styles from './CarrierDirectory.module.css';

interface Carrier {
  id: string;
  name: string;
  type: string[];
  location: string;
  rating: number;
  equipmentTypes: string[];
  insuranceStatus: 'Valid' | 'Expired' | 'Pending';
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  operatingStates: string[];
  fleetSize: number;
  yearEstablished: number;
}

const CarrierDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const carriers: Carrier[] = [
    {
      id: "CD001",
      name: "Swift Transportation",
      type: ["FTL", "LTL", "Refrigerated"],
      location: "Phoenix, AZ",
      rating: 4.7,
      equipmentTypes: ["53' Dry Van", "Reefer", "Flatbed"],
      insuranceStatus: "Valid",
      contact: {
        name: "John Smith",
        phone: "(555) 123-4567",
        email: "contact@swifttrans.com"
      },
      operatingStates: ["AZ", "CA", "NV", "TX", "NM"],
      fleetSize: 150,
      yearEstablished: 1995
    },
    {
      id: "CD002",
      name: "Roadrunner Logistics",
      type: ["LTL", "Expedited"],
      location: "Chicago, IL",
      rating: 4.5,
      equipmentTypes: ["26' Box Truck", "Sprinter Van"],
      insuranceStatus: "Valid",
      contact: {
        name: "Sarah Johnson",
        phone: "(555) 987-6543",
        email: "info@roadrunner.com"
      },
      operatingStates: ["IL", "IN", "WI", "MI", "OH"],
      fleetSize: 75,
      yearEstablished: 2005
    },
    // Add more carriers as needed
  ];

  const renderStars = (rating: number) => {
    return "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));
  };

  const filteredCarriers = carriers.filter(carrier => {
    const matchesSearch = 
      carrier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carrier.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || carrier.type.includes(selectedType);
    const matchesState = selectedState === 'all' || carrier.operatingStates.includes(selectedState);
    return matchesSearch && matchesType && matchesState;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Carrier Directory</h1>
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.toggleButton} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Grid View
          </button>
          <button 
            className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
        </div>
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
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="FTL">FTL</option>
          <option value="LTL">LTL</option>
          <option value="Refrigerated">Refrigerated</option>
          <option value="Expedited">Expedited</option>
        </select>
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All States</option>
          <option value="AZ">Arizona</option>
          <option value="CA">California</option>
          <option value="IL">Illinois</option>
          {/* Add more states as needed */}
        </select>
      </div>

      {viewMode === 'grid' ? (
        <div className={styles.carrierGrid}>
          {filteredCarriers.map((carrier) => (
            <div key={carrier.id} className={styles.carrierCard}>
              <div className={styles.cardHeader}>
                <h3>{carrier.name}</h3>
                <span className={`${styles.insurance} ${styles[carrier.insuranceStatus.toLowerCase()]}`}>
                  {carrier.insuranceStatus}
                </span>
              </div>
              
              <div className={styles.rating}>
                <span className={styles.stars}>{renderStars(carrier.rating)}</span>
                <span>{carrier.rating.toFixed(1)}</span>
              </div>

              <div className={styles.location}>
                <i>📍</i> {carrier.location}
              </div>

              <div className={styles.types}>
                {carrier.type.map((type) => (
                  <span key={type} className={styles.type}>{type}</span>
                ))}
              </div>

              <div className={styles.info}>
                <div>Fleet Size: {carrier.fleetSize} trucks</div>
                <div>Est. {carrier.yearEstablished}</div>
              </div>

              <div className={styles.contact}>
                <h4>Contact Information</h4>
                <p>{carrier.contact.name}</p>
                <p>{carrier.contact.phone}</p>
                <p>{carrier.contact.email}</p>
              </div>

              <div className={styles.actions}>
                <button className={styles.viewButton}>View Details</button>
                <button className={styles.contactButton}>Contact</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.carrierList}>
          <table>
            <thead>
              <tr>
                <th>Carrier Name</th>
                <th>Location</th>
                <th>Type</th>
                <th>Rating</th>
                <th>Insurance</th>
                <th>Fleet Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCarriers.map((carrier) => (
                <tr key={carrier.id}>
                  <td>{carrier.name}</td>
                  <td>{carrier.location}</td>
                  <td>{carrier.type.join(', ')}</td>
                  <td>
                    <span className={styles.stars}>{renderStars(carrier.rating)}</span>
                  </td>
                  <td>
                    <span className={`${styles.insurance} ${styles[carrier.insuranceStatus.toLowerCase()]}`}>
                      {carrier.insuranceStatus}
                    </span>
                  </td>
                  <td>{carrier.fleetSize} trucks</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.viewButton}>View</button>
                      <button className={styles.contactButton}>Contact</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CarrierDirectory; 