import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Documents.module.css';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';
import { useAuth } from '../../contexts/AuthContext';
import { documentService, CarrierDocument } from '../../services/documentService';
import DocumentUploadModal from '../../components/DocumentUploadModal';

const Documents: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'compliance' | 'loads'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState<CarrierDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch documents on component mount
  useEffect(() => {
    if (user?.uid) {
      fetchDocuments();
    }
  }, [user?.uid]);

  const fetchDocuments = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      const userDocuments = await documentService.getUserDocuments(user.uid);
      setDocuments(userDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // If it's an index building error, show a more specific message
      if (error instanceof Error && error.message.includes('index')) {
        setError('Documents are being indexed. Please try again in a few minutes.');
      } else {
        setError('Failed to load documents. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'compliance' && doc.category === 'compliance') ||
      (activeTab === 'loads' && doc.category === 'loads');
    return matchesSearch && matchesTab;
  });

  const handleUploadSuccess = (newDocument: CarrierDocument) => {
    setDocuments(prev => [newDocument, ...prev]);
  };

  const handleViewDocument = async (doc: CarrierDocument) => {
    try {
      if (doc.url) {
        window.open(doc.url, '_blank', 'noopener,noreferrer');
      } else {
        const downloadData = await documentService.downloadDocument(doc.id!);
        window.open(downloadData.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Error viewing document. Please try again.');
    }
  };

  const handleDownloadDocument = async (doc: CarrierDocument) => {
    try {
      const downloadData = await documentService.downloadDocument(doc.id!);
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = downloadData.url;
      link.download = downloadData.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document. Please try again.');
    }
  };

  const handleDeleteDocument = async (doc: CarrierDocument) => {
    if (!user?.uid) return;
    
    if (window.confirm(`Are you sure you want to delete "${doc.name}"?`)) {
      try {
        await documentService.deleteDocument(doc.id!, user.uid);
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document. Please try again.');
      }
    }
  };

  const handleProfile = () => {
    navigate('/carrier/profile');
  };

  const handleSettings = () => {
    navigate('/carrier/settings');
  };

  const handleLogout = () => {
    navigate('/login');
  };

  if (!user) {
    return <div>Please log in to view documents.</div>;
  }

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
          <button 
            className={styles.uploadButton}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload New Document
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loadingMessage}>
          Loading documents...
        </div>
      ) : (
        <div className={styles.documentGrid}>
          {filteredDocuments.length === 0 ? (
            <div className={styles.noDocuments}>
              <p>No documents found. Upload your first document to get started.</p>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div key={doc.id} className={styles.documentCard}>
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
                      <label>Uploaded</label>
                      <span>{new Date(doc.dateUploaded).toLocaleDateString()}</span>
                    </div>
                    {doc.expiryDate && (
                      <div>
                        <label>Expires</label>
                        <span>{new Date(doc.expiryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div>
                      <label>Size</label>
                      <span>{doc.size}</span>
                    </div>
                    {doc.loadId && (
                      <div>
                        <label>Load ID</label>
                        <span>{doc.loadId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.docActions}>
                  <button 
                    className={styles.viewButton}
                    onClick={() => handleViewDocument(doc)}
                    title="View document"
                  >
                    View
                  </button>
                  <button 
                    className={styles.downloadButton}
                    onClick={() => handleDownloadDocument(doc)}
                    title="Download document"
                  >
                    Download
                  </button>
                  <button 
                    className={styles.moreButton}
                    onClick={() => handleDeleteDocument(doc)}
                    title="Delete document"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        userId={user.uid}
      />

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