import React, { useState } from 'react';
import styles from './Documents.module.css';

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
  const [activeTab, setActiveTab] = useState<'all' | 'compliance' | 'loads'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Documents</h1>
        <button className={styles.uploadButton}>
          Upload New Document
        </button>
      </div>

      <div className={styles.subHeader}>
        <div className={styles.tabs}>
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
        </div>
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
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

      <div className={styles.complianceAlert}>
        <div className={styles.alertHeader}>
          <h3>📋 Compliance Status</h3>
          <span className={styles.compliantBadge}>Compliant</span>
        </div>
        <p>All required documents are up to date. Next document expiration: Insurance (Dec 31, 2024)</p>
      </div>
    </div>
  );
};

export default Documents; 