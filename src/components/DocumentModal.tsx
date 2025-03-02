import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { firebaseStorage as storage } from '../services/firebase';
import styles from './DocumentModal.module.css';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
}

interface Document {
  name: string;
  url: string;
}

const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, loadId }) => {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Fetch documents when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, loadId]);

  const fetchDocuments = async () => {
    try {
      const folderRef = ref(storage, `loads/${loadId}/documents`);
      const result = await listAll(folderRef);
      
      const docs = await Promise.all(
        result.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return {
            name: item.name,
            url
          };
        })
      );
      
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleUploadClick = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    
    fileInput.click();

    fileInput.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files?.length) return;

      try {
        setUploading(true);
        
        for (const file of Array.from(files)) {
          const storageRef = ref(storage, `loads/${loadId}/documents/${file.name}`);
          await uploadBytes(storageRef, file);
        }
        
        // Just fetch the updated list without showing an alert
        await fetchDocuments();
      } catch (error) {
        console.error('Error uploading files:', error);
        alert('Error uploading files. Please try again.');  // Keep error alert for user feedback
      } finally {
        setUploading(false);
      }
    };
  };

  const handleDelete = async (docName: string) => {
    try {
      const docRef = ref(storage, `loads/${loadId}/documents/${docName}`);
      await deleteObject(docRef);
      await fetchDocuments(); // Refresh the list after deletion
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Load Documents - {loadId}</h2>
        
        <div className={styles.content}>
          <button 
            onClick={handleUploadClick}
            className={styles.uploadButton}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Choose & Upload Files'}
          </button>

          <div className={styles.documentList}>
            <h3>Uploaded Documents</h3>
            {documents.length === 0 ? (
              <p>No documents uploaded yet</p>
            ) : (
              <ul>
                {documents.map((doc) => (
                  <li key={doc.url} className={styles.documentItem}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      {doc.name}
                    </a>
                    <button 
                      onClick={() => handleDelete(doc.name)}
                      className={styles.deleteButton}
                      aria-label="Delete document"
                    >
                      🗑️
                    </button>
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