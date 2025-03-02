import React, { useState } from 'react';
import styles from './CancelPaymentRequestModal.module.css';

interface CancelPaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
  amount: number;
  customer: string;
  onConfirmCancel: () => Promise<void>;
}

const CancelPaymentRequestModal: React.FC<CancelPaymentRequestModalProps> = ({ 
  isOpen, 
  onClose, 
  loadId, 
  amount,
  customer,
  onConfirmCancel
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await onConfirmCancel();
      onClose();
    } catch (error) {
      console.error('Error canceling payment request:', error);
      alert('Error canceling payment request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Cancel Payment Request</h2>
        
        <div className={styles.content}>
          <div className={styles.loadInfo}>
            <p><strong>Load ID:</strong> {loadId}</p>
            <p><strong>Customer:</strong> {customer}</p>
            <p><strong>Amount:</strong> ${amount.toFixed(2)}</p>
          </div>
          
          <div className={styles.warningMessage}>
            <p>Are you sure you want to cancel this payment request?</p>
            <p>This action cannot be undone.</p>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="reason">Reason for cancellation (optional):</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for canceling this payment request..."
              rows={3}
            />
          </div>
          
          <div className={styles.actions}>
            <button 
              onClick={onClose} 
              className={styles.backButton}
              disabled={submitting}
            >
              Go Back
            </button>
            <button 
              onClick={handleSubmit} 
              className={styles.cancelButton}
              disabled={submitting}
            >
              {submitting ? 'Canceling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelPaymentRequestModal; 