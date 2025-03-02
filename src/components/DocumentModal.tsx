import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import styles from './DocumentModal.module.css';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
}

interface Document {
  name: string;
  url: string;
  uploadDate: string;
}

const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, loadId }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isOpen && loadId) {
      loadDocuments();
    }
  }, [isOpen, loadId]);

  const loadDocuments = async () => {
    try {
      const loadFolderRef = ref(storage, `loads/${loadId}/documents`);
      const result = await listAll(loadFolderRef);
      
      const docs = await Promise.all(
        result.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return {
            name: item.name,
            url,
            uploadDate: new Date().toISOString() // In real app, get from metadata
          };
        })
      );
      
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileRef = ref(storage, `loads/${loadId}/documents/${file.name}`);
        
        await uploadBytes(fileRef, file);
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      await loadDocuments();
      setSelectedFiles(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Load Documents - {loadId}</h2>
        
        <div className={styles.content}>
          <div className={styles.uploadSection}>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className={styles.fileInput}
              disabled={uploading}
            />
            <button 
              onClick={handleUpload}
              className={styles.uploadButton}
              disabled={!selectedFiles || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Documents'}
            </button>
          </div>

          {uploading && (
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className={styles.documentList}>
            <h3>Uploaded Documents</h3>
            {documents.length === 0 ? (
              <p>No documents uploaded yet</p>
            ) : (
              <ul>
                {documents.map((doc) => (
                  <li key={doc.url}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      {doc.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button onClick={onClose} className={styles.closeButton}>Close</button>
      </div>
    </div>
  );
};

export default DocumentModal; 