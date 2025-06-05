import React from 'react';
import styles from './CounterOfferModal.module.css';

interface CounterOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  currentRate: number;
  counterOffer: number;
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

const CounterOfferModal: React.FC<CounterOfferModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onReject,
  currentRate,
  counterOffer,
  loadDetails
}) => {
  if (!isOpen) return null;

  const difference = ((counterOffer - currentRate) / currentRate * 100).toFixed(1);
  const isIncrease = counterOffer > currentRate;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Counter Offer Received</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalContent}>
          <p>A carrier has made a counter offer for your load:</p>
          
          <div className={styles.rateComparison}>
            <div className={styles.rateItem}>
              <span className={styles.label}>Original Rate:</span>
              <span className={styles.value}>${currentRate.toFixed(2)}</span>
            </div>
            <div className={styles.rateItem}>
              <span className={styles.label}>Counter Offer:</span>
              <span className={`${styles.value} ${isIncrease ? styles.increase : styles.decrease}`}>
                ${counterOffer.toFixed(2)}
              </span>
            </div>
            <div className={styles.difference}>
              {isIncrease ? '↑' : '↓'} {difference}%
            </div>
          </div>

          <div className={styles.loadDetails}>
            <h3>Load Details</h3>
            <div className={styles.location}>
              <strong>Pickup:</strong> {loadDetails.pickupLocation.address}, {loadDetails.pickupLocation.city}, {loadDetails.pickupLocation.state}
            </div>
            <div className={styles.location}>
              <strong>Delivery:</strong> {loadDetails.deliveryLocation.address}, {loadDetails.deliveryLocation.city}, {loadDetails.deliveryLocation.state}
            </div>
          </div>

          <div className={styles.actions}>
            <button 
              className={`${styles.button} ${styles.accept}`}
              onClick={onAccept}
            >
              Accept Counter Offer
            </button>
            <button 
              className={`${styles.button} ${styles.reject}`}
              onClick={onReject}
            >
              Reject Counter Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CounterOfferModal; 