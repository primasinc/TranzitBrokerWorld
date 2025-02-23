import React, { useState } from 'react';
import styles from './MyLoads.module.css';

interface Load {
  id: string;
  status: 'In Progress' | 'Scheduled' | 'Completed' | 'Cancelled';
  pickupLocation: string;
  deliveryLocation: string;
  pickupDate: string;
  deliveryDate: string;
  customer: string;
  rate: number;
  weight: string;
  progress: number;
  currentLocation?: string;
  eta?: string;
}

const MyLoads: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'scheduled' | 'completed'>('current');
  const [searchTerm, setSearchTerm] = useState('');

  const loads: Load[] = [
    {
      id: "ML001",
      status: "In Progress",
      pickupLocation: "Chicago, IL",
      deliveryLocation: "New York, NY",
      pickupDate: "2024-02-25",
      deliveryDate: "2024-02-27",
      customer: "ABC Manufacturing",
      rate: 2800.00,
      weight: "18,000 lbs",
      progress: 65,
      currentLocation: "Cleveland, OH",
      eta: "8 hours"
    },
    {
      id: "ML002",
      status: "Scheduled",
      pickupLocation: "Los Angeles, CA",
      deliveryLocation: "Phoenix, AZ",
      pickupDate: "2024-03-01",
      deliveryDate: "2024-03-02",
      customer: "XYZ Corp",
      rate: 1500.00,
      weight: "12,000 lbs",
      progress: 0
    },
    // Add more loads
  ];

  const filteredLoads = loads.filter(load => {
    const matchesSearch = 
      load.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.deliveryLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      (activeTab === 'current' && load.status === 'In Progress') ||
      (activeTab === 'scheduled' && load.status === 'Scheduled') ||
      (activeTab === 'completed' && load.status === 'Completed');
    
    return matchesSearch && matchesTab;
  });

  const renderProgressBar = (progress: number) => (
    <div className={styles.progressBarContainer}>
      <div 
        className={styles.progressBar} 
        style={{ width: `${progress}%` }}
      />
      <span className={styles.progressText}>{progress}%</span>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Loads</h1>
        <div className={styles.headerActions}>
          <input
            type="text"
            placeholder="Search loads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'current' ? styles.active : ''}`}
          onClick={() => setActiveTab('current')}
        >
          Current Loads
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'scheduled' ? styles.active : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          Scheduled
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'completed' ? styles.active : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      <div className={styles.loadsList}>
        {filteredLoads.map((load) => (
          <div key={load.id} className={styles.loadCard}>
            <div className={styles.loadHeader}>
              <div className={styles.loadRoute}>
                <h3>{load.pickupLocation} → {load.deliveryLocation}</h3>
                <span className={`${styles.status} ${styles[load.status.toLowerCase().replace(' ', '')]}`}>
                  {load.status}
                </span>
              </div>
              <div className={styles.loadRate}>
                ${load.rate.toFixed(2)}
              </div>
            </div>

            {load.status === 'In Progress' && (
              <div className={styles.progress}>
                {renderProgressBar(load.progress)}
                <div className={styles.currentStatus}>
                  <p>Current Location: {load.currentLocation}</p>
                  <p>ETA: {load.eta}</p>
                </div>
              </div>
            )}

            <div className={styles.loadDetails}>
              <div>
                <label>Customer</label>
                <span>{load.customer}</span>
              </div>
              <div>
                <label>Pickup Date</label>
                <span>{load.pickupDate}</span>
              </div>
              <div>
                <label>Delivery Date</label>
                <span>{load.deliveryDate}</span>
              </div>
              <div>
                <label>Weight</label>
                <span>{load.weight}</span>
              </div>
            </div>

            <div className={styles.loadActions}>
              <button className={styles.viewButton}>View Details</button>
              {load.status === 'In Progress' && (
                <button className={styles.updateButton}>Update Status</button>
              )}
              {load.status === 'Scheduled' && (
                <button className={styles.startButton}>Start Load</button>
              )}
              {load.status === 'Completed' && (
                <button className={styles.documentButton}>View Documents</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyLoads; 