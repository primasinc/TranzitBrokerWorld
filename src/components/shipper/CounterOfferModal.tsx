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
    poNumber?: string;
    carrierName?: string;
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
          <h2 style={{ fontWeight: 700, fontSize: '1.6rem', color: '#222', letterSpacing: '-1px', margin: 0 }}>Offer Details</h2>
        </div>
        <div className={styles.modalContent}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 6 }}>Carrier: <span style={{ fontWeight: 400 }}>{loadDetails.carrierName}</span></div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 6 }}>Offer Amount: <span style={{ color: '#1976d2', fontWeight: 700 }}>${counterOffer.toLocaleString()}</span></div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 6 }}>PO Number: <span style={{ fontWeight: 400 }}>{loadDetails.poNumber}</span></div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 6 }}>Pickup: <span style={{ fontWeight: 400 }}>{[loadDetails.pickupLocation.address, loadDetails.pickupLocation.city, loadDetails.pickupLocation.state].filter(Boolean).join(', ')}</span></div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 6 }}>Delivery: <span style={{ fontWeight: 400 }}>{[loadDetails.deliveryLocation.address, loadDetails.deliveryLocation.city, loadDetails.deliveryLocation.state].filter(Boolean).join(', ')}</span></div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 6 }}>Message: <span style={{ fontWeight: 400 }}>{loadDetails.carrierName} has made an offer of ${counterOffer.toLocaleString()} on PO {loadDetails.poNumber}</span></div>
          </div>
          <div className={styles.actions} style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button
              className={styles.accept}
              style={{ background: '#28a745', color: 'white', fontWeight: 600, border: 'none', borderRadius: 6, padding: '12px 0', flex: 1, fontSize: '1rem' }}
              onClick={onAccept}
            >
              Accept
            </button>
            <button
              className={styles.reject}
              style={{ background: '#dc3545', color: 'white', fontWeight: 600, border: 'none', borderRadius: 6, padding: '12px 0', flex: 1, fontSize: '1rem' }}
              onClick={onReject}
            >
              Reject
            </button>
            <button
              className={styles.closeButton}
              style={{ background: '#1976d2', color: 'white', fontWeight: 600, border: 'none', borderRadius: 6, padding: '12px 0', flex: 1, fontSize: '1rem' }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CounterOfferModal; 