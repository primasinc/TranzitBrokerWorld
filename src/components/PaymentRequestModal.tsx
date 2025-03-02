import React, { useState } from 'react';
import styles from './PaymentRequestModal.module.css';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
  amount: number;
  customer: string;
  onRequestSubmitted?: () => void;
}

const PaymentRequestModal: React.FC<PaymentRequestModalProps> = ({ 
  isOpen, 
  onClose, 
  loadId, 
  amount,
  customer,
  onRequestSubmitted
}) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      // TODO: Implement API call to submit payment request
      console.log('Submitting payment request for load:', loadId, 'Amount:', amount, 'Notes:', notes);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the payment status in the UI (you'll need to pass a callback function as a prop)
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting payment request:', error);
      alert('Error submitting payment request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Request Direct Payment</h2>
        
        <div className={styles.content}>
          <div className={styles.loadInfo}>
            <p><strong>Load ID:</strong> {loadId}</p>
            <p><strong>Customer:</strong> {customer}</p>
            <p><strong>Amount:</strong> ${amount.toFixed(2)}</p>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="notes">Additional Notes:</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes for this payment request..."
              rows={4}
            />
          </div>
          
          <div className={styles.actions}>
            <button 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRequestModal; 