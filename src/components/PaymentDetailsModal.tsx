import React from 'react';
import styles from './PaymentDetailsModal.module.css';

// Define the types for payment history events
type PaymentEventType = 'created' | 'requested' | 'canceled' | 'processing' | 'paid';

type PaymentEvent = {
  id: string;
  date: string;
  type: PaymentEventType;
  description: string;
  user?: string;
};

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    loadId: string;
    date: string;
    customer: string;
    amount: number;
    status: string;
    origin?: string;
    destination?: string;
    miles?: number;
    rate?: number;
    notes?: string;
    history: PaymentEvent[];
  } | null;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  payment 
}) => {
  if (!isOpen || !payment) return null;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get status class for styling
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return styles.statusPending;
      case 'requested': return styles.statusRequested;
      case 'processing': return styles.statusProcessing;
      case 'paid': return styles.statusPaid;
      case 'canceled': return styles.statusCanceled;
      default: return '';
    }
  };

  // Get event icon based on type
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created': return '📋';
      case 'requested': return '📤';
      case 'canceled': return '❌';
      case 'processing': return '⏳';
      case 'paid': return '💰';
      default: return '📝';
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Payment Details</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.paymentHeader}>
            <div className={styles.paymentId}>
              <h3>Load #{payment.loadId}</h3>
              <span className={`${styles.status} ${getStatusClass(payment.status)}`}>
                {payment.status}
              </span>
            </div>
            <div className={styles.paymentAmount}>
              ${payment.amount.toFixed(2)}
            </div>
          </div>
          
          <div className={styles.paymentDetails}>
            <div className={styles.detailsSection}>
              <h4>Load Information</h4>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Customer:</span>
                  <span className={styles.detailValue}>{payment.customer}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Date:</span>
                  <span className={styles.detailValue}>{formatDate(payment.date)}</span>
                </div>
                {payment.origin && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Origin:</span>
                    <span className={styles.detailValue}>{payment.origin}</span>
                  </div>
                )}
                {payment.destination && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Destination:</span>
                    <span className={styles.detailValue}>{payment.destination}</span>
                  </div>
                )}
                {payment.miles !== undefined && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Miles:</span>
                    <span className={styles.detailValue}>{payment.miles}</span>
                  </div>
                )}
                {payment.rate !== undefined && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Rate:</span>
                    <span className={styles.detailValue}>${payment.rate.toFixed(2)}/mile</span>
                  </div>
                )}
              </div>
            </div>
            
            {payment.notes && (
              <div className={styles.detailsSection}>
                <h4>Notes</h4>
                <p className={styles.notes}>{payment.notes}</p>
              </div>
            )}
            
            <div className={styles.detailsSection}>
              <h4>Payment History</h4>
              <div className={styles.timeline}>
                {payment.history.map((event) => (
                  <div key={event.id} className={styles.timelineEvent}>
                    <div className={styles.timelineIcon}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.timelineTitle}>{event.description}</span>
                        <span className={styles.timelineDate}>{formatDate(event.date)}</span>
                      </div>
                      {event.user && (
                        <div className={styles.timelineUser}>by {event.user}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className={styles.actions}>
            <button 
              onClick={onClose} 
              className={styles.closeModalButton}
            >
              Close
            </button>
            {payment.status === 'Paid' && (
              <button className={styles.downloadButton}>
                Download Receipt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsModal; 