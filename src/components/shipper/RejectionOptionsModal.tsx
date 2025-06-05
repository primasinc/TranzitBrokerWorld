import React from 'react';
import styles from './RejectionOptionsModal.module.css';

interface RejectionOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewCarrier: () => void;
  onPlaceInMarketplace: () => void;
  loadDetails: {
    pickupLocation: {
      address: string;
      city: string;
      state: string;
    };
    deliveryLocation: {
      address: string;
      city: string;
      state: string;
    };
  };
}

const RejectionOptionsModal: React.FC<RejectionOptionsModalProps> = ({
  isOpen,
  onClose,
  onSelectNewCarrier,
  onPlaceInMarketplace,
  loadDetails
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Load Rejected</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalContent}>
          <p>The carrier has rejected your load request.</p>
          <div className={styles.loadDetails}>
            <h3>Load Details:</h3>
            <p>From: {loadDetails.pickupLocation.city}, {loadDetails.pickupLocation.state}</p>
            <p>To: {loadDetails.deliveryLocation.city}, {loadDetails.deliveryLocation.state}</p>
          </div>
          
          <div className={styles.options}>
            <h3>What would you like to do?</h3>
            <button 
              className={`${styles.button} ${styles.selectCarrier}`}
              onClick={onSelectNewCarrier}
            >
              Select Another Carrier Partner
            </button>
            <button 
              className={`${styles.button} ${styles.marketplace}`}
              onClick={onPlaceInMarketplace}
            >
              Place Load in Marketplace
            </button>
            <button 
              className={`${styles.button} ${styles.cancel}`}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionOptionsModal; 