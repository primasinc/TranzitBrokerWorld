import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import MapboxMap from '../components/common/MapboxMap';
import styles from './BrokerPortalLanding.module.css';

interface Load {
  id: string;
  pickupLocation: string;
  deliveryLocation: string;
  rate: number;
  status: 'Available' | 'Assigned' | 'In Transit' | 'Delivered' | 'Cancelled';
  equipmentType: string;
  weight: number;
  dimensions: string;
  pickupDate: string;
  deliveryDate: string;
  brokerId: string;
  carrierId?: string;
  createdAt: Date;
}

interface Carrier {
  id: string;
  companyName: string;
  rating: number;
  equipmentType: string;
  availableDate: string;
  location: string;
  mcNumber: string;
  dotNumber: string;
  insurance: boolean;
  status: 'Available' | 'Busy' | 'Offline';
}

const BrokerPortalLanding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loads, setLoads] = useState<Load[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [metrics, setMetrics] = useState({
    totalLoads: 0,
    activeLoads: 0,
    totalCarriers: 0,
    monthlyRevenue: 0
  });
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Load broker's loads
    const loadsQuery = query(
      collection(db, 'loads'),
      where('brokerId', '==', user.uid)
    );

    const unsubscribeLoads = onSnapshot(loadsQuery, (snapshot) => {
      const loadsData: Load[] = [];
      snapshot.forEach((doc) => {
        loadsData.push({ id: doc.id, ...doc.data() } as Load);
      });
      setLoads(loadsData);
      
      // Calculate metrics
      setMetrics({
        totalLoads: loadsData.length,
        activeLoads: loadsData.filter(load => 
          ['Available', 'Assigned', 'In Transit'].includes(load.status)
        ).length,
        totalCarriers: carriers.length,
        monthlyRevenue: loadsData
          .filter(load => load.status === 'Delivered')
          .reduce((sum, load) => sum + (load.rate || 0), 0)
      });
    });

    // Load available carriers
    const carriersQuery = query(
      collection(db, 'carriers'),
      where('status', '==', 'Available')
    );

    const unsubscribeCarriers = onSnapshot(carriersQuery, (snapshot) => {
      const carriersData: Carrier[] = [];
      snapshot.forEach((doc) => {
        carriersData.push({ id: doc.id, ...doc.data() } as Carrier);
      });
      setCarriers(carriersData);
      
      // Update metrics
      setMetrics(prev => ({ ...prev, totalCarriers: carriersData.length }));
    });

    setLoading(false);

    return () => {
      unsubscribeLoads();
      unsubscribeCarriers();
    };
  }, [user]);

  const handleCreateLoad = () => {
    navigate('/broker/create-load');
  };

  const handleViewCarriers = () => {
    setActiveTab('carriers');
  };

  const handleViewLoads = () => {
    setActiveTab('loads');
  };

  const handleLoadClick = (load: Load) => {
    setSelectedLoad(load);
    setShowLoadModal(true);
  };

  const handleCarrierClick = (carrier: Carrier) => {
    setSelectedLoad(null);
    setShowCarrierModal(true);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading Broker Portal...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Broker Portal Dashboard</h1>
          <div className={styles.headerActions}>
            <button 
              className={styles.createLoadButton}
              onClick={handleCreateLoad}
            >
              + Create Load
            </button>
            <button 
              className={styles.profileButton}
              onClick={() => navigate('/broker/profile')}
            >
              Profile
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className={styles.navTabs}>
        <button 
          className={`${styles.navTab} ${activeTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`${styles.navTab} ${activeTab === 'loads' ? styles.active : ''}`}
          onClick={handleViewLoads}
        >
          My Loads ({loads.length})
        </button>
        <button 
          className={`${styles.navTab} ${activeTab === 'carriers' ? styles.active : ''}`}
          onClick={handleViewCarriers}
        >
          Available Carriers ({carriers.length})
        </button>
        <button 
          className={`${styles.navTab} ${activeTab === 'analytics' ? styles.active : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </nav>

      {/* Dashboard Content */}
      {activeTab === 'dashboard' && (
        <div className={styles.dashboardContent}>
          {/* Metrics Cards */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Total Loads</h3>
              <div className={styles.metricValue}>{metrics.totalLoads}</div>
            </div>
            <div className={styles.metricCard}>
              <h3>Active Loads</h3>
              <div className={styles.metricValue}>{metrics.activeLoads}</div>
            </div>
            <div className={styles.metricCard}>
              <h3>Available Carriers</h3>
              <div className={styles.metricValue}>{metrics.totalCarriers}</div>
            </div>
            <div className={styles.metricCard}>
              <h3>Monthly Revenue</h3>
              <div className={styles.metricValue}>${metrics.monthlyRevenue.toLocaleString()}</div>
            </div>
          </div>

          {/* Map View */}
          <div className={styles.mapSection}>
            <h3>Load & Carrier Locations</h3>
            <div className={styles.mapContainer}>
              <MapboxMap 
                center={[-98.5795, 39.8283]}
                zoom={4}
                markers={[
                  ...loads.map(load => ({
                    id: load.id,
                    position: [0, 0] as [number, number], // Placeholder - you'll need to add coordinates
                    type: 'load' as const,
                    onClick: () => handleLoadClick(load)
                  })),
                  ...carriers.map(carrier => ({
                    id: carrier.id,
                    position: [0, 0] as [number, number], // Placeholder - you'll need to add coordinates
                    type: 'carrier' as const,
                    onClick: () => handleCarrierClick(carrier)
                  }))
                ]}
              />
            </div>
          </div>

          {/* Recent Activity */}
          <div className={styles.recentActivity}>
            <h3>Recent Activity</h3>
            <div className={styles.activityList}>
              {loads.slice(0, 5).map((load) => (
                <div 
                  key={load.id} 
                  className={styles.activityItem}
                  onClick={() => handleLoadClick(load)}
                >
                  <div className={styles.activityIcon}>📦</div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle}>
                      Load from {load.pickupLocation} to {load.deliveryLocation}
                    </div>
                    <div className={styles.activityDetails}>
                      Rate: ${load.rate} | Status: {load.status}
                    </div>
                  </div>
                  <div className={styles.activityTime}>
                    {new Date(load.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loads Tab */}
      {activeTab === 'loads' && (
        <div className={styles.loadsContent}>
          <div className={styles.loadsHeader}>
            <h2>My Loads</h2>
            <button 
              className={styles.createLoadButton}
              onClick={handleCreateLoad}
            >
              + Create New Load
            </button>
          </div>
          
          <div className={styles.loadsGrid}>
            {loads.map((load) => (
              <div 
                key={load.id} 
                className={styles.loadCard}
                onClick={() => handleLoadClick(load)}
              >
                <div className={styles.loadHeader}>
                  <span className={styles.loadStatus}>{load.status}</span>
                  <span className={styles.loadRate}>${load.rate}</span>
                </div>
                <div className={styles.loadRoute}>
                  <div className={styles.loadLocation}>
                    <strong>From:</strong> {load.pickupLocation}
                  </div>
                  <div className={styles.loadLocation}>
                    <strong>To:</strong> {load.deliveryLocation}
                  </div>
                </div>
                <div className={styles.loadDetails}>
                  <span>Equipment: {load.equipmentType}</span>
                  <span>Weight: {load.weight} lbs</span>
                  <span>Pickup: {load.pickupDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carriers Tab */}
      {activeTab === 'carriers' && (
        <div className={styles.carriersContent}>
          <div className={styles.carriersHeader}>
            <h2>Available Carriers</h2>
            <div className={styles.carrierFilters}>
              <select className={styles.filterSelect}>
                <option value="">All Equipment</option>
                <option value="dry_van">Dry Van</option>
                <option value="reefer">Reefer</option>
                <option value="flatbed">Flatbed</option>
                <option value="power_only">Power Only</option>
              </select>
            </div>
          </div>
          
          <div className={styles.carriersGrid}>
            {carriers.map((carrier) => (
              <div 
                key={carrier.id} 
                className={styles.carrierCard}
                onClick={() => handleCarrierClick(carrier)}
              >
                <div className={styles.carrierHeader}>
                  <h3>{carrier.companyName}</h3>
                  <span className={styles.carrierRating}>⭐ {carrier.rating}</span>
                </div>
                <div className={styles.carrierDetails}>
                  <div>Equipment: {carrier.equipmentType}</div>
                  <div>Location: {carrier.location}</div>
                  <div>Available: {carrier.availableDate}</div>
                  <div>MC: {carrier.mcNumber}</div>
                  <div>DOT: {carrier.dotNumber}</div>
                </div>
                <div className={styles.carrierActions}>
                  <button className={styles.contactButton}>Contact</button>
                  <button className={styles.viewProfileButton}>View Profile</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className={styles.analyticsContent}>
          <h2>Analytics & Reports</h2>
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsCard}>
              <h3>Load Performance</h3>
              <div className={styles.chartPlaceholder}>
                Chart showing load completion rates over time
              </div>
            </div>
            <div className={styles.analyticsCard}>
              <h3>Revenue Trends</h3>
              <div className={styles.chartPlaceholder}>
                Chart showing monthly revenue trends
              </div>
            </div>
            <div className={styles.analyticsCard}>
              <h3>Carrier Performance</h3>
              <div className={styles.chartPlaceholder}>
                Chart showing top performing carriers
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load Details Modal */}
      {showLoadModal && selectedLoad && (
        <div className={styles.modalOverlay} onClick={() => setShowLoadModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Load Details</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowLoadModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.loadDetailRow}>
                <strong>Status:</strong> {selectedLoad.status}
              </div>
              <div className={styles.loadDetailRow}>
                <strong>Pickup:</strong> {selectedLoad.pickupLocation}
              </div>
              <div className={styles.loadDetailRow}>
                <strong>Delivery:</strong> {selectedLoad.deliveryLocation}
              </div>
              <div className={styles.loadDetailRow}>
                <strong>Rate:</strong> ${selectedLoad.rate}
              </div>
              <div className={styles.loadDetailRow}>
                <strong>Equipment:</strong> {selectedLoad.equipmentType}
              </div>
              <div className={styles.loadDetailRow}>
                <strong>Weight:</strong> {selectedLoad.weight} lbs
              </div>
              <div className={styles.loadDetailRow}>
                <strong>Pickup Date:</strong> {selectedLoad.pickupDate}
              </div>
              <div className={styles.loadDetailRow}>
                <strong>Delivery Date:</strong> {selectedLoad.deliveryDate}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.editButton}>Edit Load</button>
              <button className={styles.assignButton}>Assign Carrier</button>
              <button className={styles.cancelButton}>Cancel Load</button>
            </div>
          </div>
        </div>
      )}

      {/* Carrier Details Modal */}
      {showCarrierModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCarrierModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Carrier Details</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowCarrierModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.carrierDetailRow}>
                <strong>Company:</strong> {carriers.find(c => c.id === selectedLoad?.carrierId)?.companyName}
              </div>
              <div className={styles.carrierDetailRow}>
                <strong>Rating:</strong> ⭐ {carriers.find(c => c.id === selectedLoad?.carrierId)?.rating}
              </div>
              <div className={styles.carrierDetailRow}>
                <strong>Equipment:</strong> {carriers.find(c => c.id === selectedLoad?.carrierId)?.equipmentType}
              </div>
              <div className={styles.carrierDetailRow}>
                <strong>Location:</strong> {carriers.find(c => c.id === selectedLoad?.carrierId)?.location}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.contactButton}>Contact Carrier</button>
              <button className={styles.viewProfileButton}>View Full Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerPortalLanding;
