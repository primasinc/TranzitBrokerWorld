import React, { useState, useRef } from 'react';
import { documentService, DocumentUploadData, CarrierDocument } from '../services/documentService';
import styles from './DocumentUploadModal.module.css';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (document: CarrierDocument) => void;
  userId: string;
  loadId?: string;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  userId,
  loadId
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<CarrierDocument['type']>('Other');
  const [category, setCategory] = useState<CarrierDocument['category']>('general');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!documentType) {
      setError('Please select a document type');
      return;
    }

    if (!category) {
      setError('Please select a category');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const uploadData: DocumentUploadData = {
        file: selectedFile,
        type: documentType,
        category,
        loadId,
        description: description.trim() || undefined,
        expiryDate: expiryDate || undefined
      };

      const uploadedDocument = await documentService.uploadDocument(userId, uploadData);
      onUploadSuccess(uploadedDocument);
      handleClose();
    } catch (error) {
      console.error('Error uploading document:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDocumentType('Other');
    setCategory('general');
    setDescription('');
    setExpiryDate('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Upload New Document</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="fileInput">Select File</label>
            <input
              ref={fileInputRef}
              type="file"
              id="fileInput"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
              className={styles.fileInput}
            />
            {selectedFile && (
              <div className={styles.fileInfo}>
                <span>Selected: {selectedFile.name}</span>
                <span>Size: {(selectedFile.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="documentType">Document Type</label>
            <select
              id="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as CarrierDocument['type'])}
              className={styles.select}
            >
              <option value="Other">Other</option>
              <option value="BOL">Bill of Lading</option>
              <option value="Insurance">Insurance</option>
              <option value="License">License</option>
              <option value="Invoice">Invoice</option>
              <option value="POD">Proof of Delivery</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CarrierDocument['category'])}
              className={styles.select}
            >
              <option value="general">General</option>
              <option value="compliance">Compliance</option>
              <option value="loads">Load Documents</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder="Enter document description..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="expiryDate">Expiry Date (Optional)</label>
            <input
              type="date"
              id="expiryDate"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={handleClose}
            className={styles.cancelButton}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className={styles.uploadButton}
            disabled={uploading || !selectedFile}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
