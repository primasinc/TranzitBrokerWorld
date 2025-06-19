import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Documents.module.css';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';

interface Document {
  id: string;
  name: string;
  type: 'BOL' | 'Insurance' | 'License' | 'Invoice' | 'POD' | 'Other';
  status: 'Valid' | 'Expired' | 'Pending' | 'Rejected';
  dateUploaded: string;
  expiryDate?: string;
  size: string;
  loadId?: string;
}

const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'compliance' | 'loads'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();

  // Mobile optimization
  const { 
    isLowBandwidth, 
    isLowBattery, 
    getOptimalPageSize, 
    shouldFetchData, 
    measurePerformance 
  } = useMobileOptimization({
    enableOfflineMode: true,
    enableLowBandwidthMode: true,
    enableBatteryOptimization: true
  });

  const documents: Document[] = [
    {
      id: "DOC001",
      name: "Commercial Driver's License",
      type: "License",
      status: "Valid",
      dateUploaded: "2024-01-15",
      expiryDate: "2025-01-15",
      size: "2.3 MB"
    },
    {
      id: "DOC002",
      name: "Liability Insurance",
      type: "Insurance",
      status: "Valid",
      dateUploaded: "2024-01-10",
      expiryDate: "2024-12-31",
      size: "1.8 MB"
    },
    {
      id: "DOC003",
      name: "Load #L123 - Bill of Lading",
      type: "BOL",
      status: "Valid",
      dateUploaded: "2024-02-20",
      size: "1.1 MB",
      loadId: "L123"
    },
    // Add more documents
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'compliance' && ['License', 'Insurance'].includes(doc.type)) ||
      (activeTab === 'loads' && ['BOL', 'POD', 'Invoice'].includes(doc.type));
    return matchesSearch && matchesTab;
  });

  const handleProfile = () => {
    navigate('/carrier/profile');
  };

  const handleSettings = () => {
    navigate('/carrier/settings');
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerCard}>
        <header className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <h1>Documents</h1>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.bellButton}
              onClick={() => setShowNotifications(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative' }}
              tabIndex={0}
              aria-label="Notifications"
            >
              <span role="img" aria-label="Notifications">🔔</span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'red',
                  color: 'white',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  zIndex: 10
                }}>{unreadCount}</span>
              )}
            </button>
            {showNotifications && <NotificationsTray onClose={() => setShowNotifications(false)} />}
            <div className={styles.menuContainer}>
              <button 
                className={styles.hamburgerButton}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                <div className={styles.hamburgerIcon}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
              {isMenuOpen && (
                <div className={styles.dropdownMenu}>
                  <button onClick={handleProfile}>Account</button>
                  <button onClick={handleSettings}>Settings</button>
                  <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>
      <div className={styles.subHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div className={styles.menuBar}>
          <button 
            className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Documents
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'compliance' ? styles.active : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            Compliance
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'loads' ? styles.active : ''}`}
            onClick={() => setActiveTab('loads')}
          >
            Load Documents
          </button>
        <button className={styles.uploadButton}>
          Upload New Document
        </button>
        </div>
      </div>

      <div className={styles.documentGrid}>
        {filteredDocuments.map((doc) => (
          <div key={doc.id} className={styles.documentCard}>
            <div className={styles.docIcon}>
              📄
            </div>
            
            <div className={styles.docInfo}>
              <h3>{doc.name}</h3>
              <div className={styles.docMeta}>
                <span className={styles.docType}>{doc.type}</span>
                <span className={`${styles.status} ${styles[doc.status.toLowerCase()]}`}>
                  {doc.status}
                </span>
              </div>
              
              <div className={styles.docDetails}>
                <div>
                  <label>Uploaded:</label>
                  <span>{doc.dateUploaded}</span>
                </div>
                {doc.expiryDate && (
                  <div>
                    <label>Expires:</label>
                    <span>{doc.expiryDate}</span>
                  </div>
                )}
                <div>
                  <label>Size:</label>
                  <span>{doc.size}</span>
                </div>
                {doc.loadId && (
                  <div>
                    <label>Load ID:</label>
                    <span>{doc.loadId}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.docActions}>
              <button className={styles.viewButton}>View</button>
              <button className={styles.downloadButton}>Download</button>
              <button className={styles.moreButton}>⋮</button>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile performance indicator */}
      {(isLowBandwidth || isLowBattery) && (
        <div className={styles.performanceIndicator}>
          {isLowBandwidth && <span>📶 Slow connection - Optimized loading</span>}
          {isLowBattery && <span>🔋 Low battery - Reduced animations</span>}
        </div>
      )}
    </div>
  );
};

export default Documents; 