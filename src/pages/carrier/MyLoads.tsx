import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MyLoads.module.css';

interface Load {
  id: string;
  title: string;
  shipper: string;
  pickup: {
    location: string;
    time: string;
    status: 'pending' | 'picked_up' | 'completed';
  };
  delivery: {
    location: string;
    time: string;
    status: 'pending' | 'in_progress' | 'delivered';
  };
  status: 'active' | 'in_progress' | 'completed';
  payment: number;
  weight: string;
  dimensions: string;
}

const MyLoads: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'in_progress' | 'completed'>('active');

  // Sample data - would come from API
  const loads: Load[] = [
    {
      id: '1',
      title: 'Electronics Shipment',
      shipper: 'ABC Electronics',
      pickup: {
        location: 'Chicago, IL',
        time: '2024-02-25 09:00',
        status: 'pending'
      },
      delivery: {
        location: 'New York, NY',
        time: '2024-02-26 15:00',
        status: 'pending'
      },
      status: 'active',
      payment: 2500,
      weight: '15,000 lbs',
      dimensions: '53\' Trailer'
    },
    // Add more sample loads...
  ];

  const filteredLoads = loads.filter(load => load.status === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return styles.pending;
      case 'picked_up': return styles.pickedUp;
      case 'in_progress': return styles.inProgress;
      case 'delivered': return styles.delivered;
      case 'completed': return styles.completed;
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>My Loads</h1>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'active' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'in_progress' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('in_progress')}
          >
            In Progress
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'completed' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>
      </header>

      <div className={styles.loadsList}>
        {filteredLoads.map(load => (
          <div key={load.id} className={styles.loadCard}>
            <div className={styles.loadHeader}>
              <h3>{load.title}</h3>
              <span className={getStatusColor(load.status)}>{load.status}</span>
            </div>
            
            <div className={styles.loadDetails}>
              <div className={styles.detail}>
                <label>Shipper:</label>
                <span>{load.shipper}</span>
              </div>
              
              <div className={styles.locationInfo}>
                <div className={styles.location}>
                  <label>Pickup:</label>
                  <span>{load.pickup.location}</span>
                  <span>{load.pickup.time}</span>
                  <span className={getStatusColor(load.pickup.status)}>
                    {load.pickup.status}
                  </span>
                </div>
                
                <div className={styles.location}>
                  <label>Delivery:</label>
                  <span>{load.delivery.location}</span>
                  <span>{load.delivery.time}</span>
                  <span className={getStatusColor(load.delivery.status)}>
                    {load.delivery.status}
                  </span>
                </div>
              </div>

              <div className={styles.loadSpecs}>
                <div className={styles.detail}>
                  <label>Payment:</label>
                  <span>${load.payment}</span>
                </div>
                <div className={styles.detail}>
                  <label>Weight:</label>
                  <span>{load.weight}</span>
                </div>
                <div className={styles.detail}>
                  <label>Dimensions:</label>
                  <span>{load.dimensions}</span>
                </div>
              </div>

              <div className={styles.actions}>
                <button 
                  className={styles.viewButton}
                  onClick={() => navigate(`/carrier/loads/${load.id}`)}
                >
                  View Details
                </button>
                {load.status === 'active' && (
                  <button className={styles.startButton}>Start Load</button>
                )}
                {load.status === 'in_progress' && (
                  <button className={styles.completeButton}>Mark as Completed</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyLoads; 