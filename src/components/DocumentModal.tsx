import React, { useState } from 'react';
import styles from './DocumentModal.module.css';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
}

const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, loadId }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = () => {
    // TODO: Implement file upload to Firebase Storage
    console.log('Uploading files for load:', loadId);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Load Documents - {loadId}</h2>
        <div className={styles.content}>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          <button 
            onClick={handleUpload}
            className={styles.uploadButton}
          >
            Upload Documents
          </button>
        </div>
        <button onClick={onClose} className={styles.closeButton}>Close</button>
      </div>
    </div>
  );
};

export default DocumentModal; 