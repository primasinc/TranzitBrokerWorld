import React, { useState } from 'react';
import styles from './LoadRequestCard.module.css';
import { updateLoadRequestStatus } from '../../services/notificationService';

interface LoadRequestNotification {
  id?: string;
  carrierId: string;
  shipperId: string;
  shippingScheduleId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'counter_offer';
  loadDetails: {
    pickupLocation: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      date: string;
      time: string;
    };
    deliveryLocation: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      date: string;
      time: string;
    };
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    weight: number;
    rate: number;
    shipperCompany?: string;
    poNumber?: string;
    items?: { weight: number; dimensions: string }[];
  };
  createdAt: any;
  updatedAt: any;
}

interface LoadRequestCardProps {
  notification: LoadRequestNotification;
  onStatusUpdate: (status: LoadRequestNotification['status']) => void;
}

const LoadRequestCard: React.FC<LoadRequestCardProps> = ({ notification, onStatusUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counterOffer, setCounterOffer] = useState(notification.loadDetails.rate);
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const handleAction = async (action: LoadRequestNotification['status']) => {
    try {
      setIsSubmitting(true);
      await updateLoadRequestStatus(notification.id!, action, notification.loadDetails.poNumber || '', counterOffer);
      onStatusUpdate(action);
      setLogMessage(`Action: ${action} submitted successfully.`);
    } catch (error) {
      setLogMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const weight = notification.loadDetails.weight || (notification.loadDetails.items && notification.loadDetails.items[0]?.weight) || '-';
  const dimensions = (notification.loadDetails.dimensions && notification.loadDetails.dimensions.length && notification.loadDetails.dimensions.width && notification.loadDetails.dimensions.height)
    ? `${notification.loadDetails.dimensions.length}x${notification.loadDetails.dimensions.width}x${notification.loadDetails.dimensions.height}`
    : (notification.loadDetails.items && notification.loadDetails.items[0]?.dimensions)
      ? notification.loadDetails.items[0].dimensions
      : '-';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Load Request</h3>
        {notification.loadDetails.shipperCompany && (
          <div className={styles.shipperCompany}>
            <strong>From:</strong> {notification.loadDetails.shipperCompany}
          </div>
        )}
        <span className={`${styles.status} ${styles[notification.status]}`}>{notification.status}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.section}>
          <h4>Pickup</h4>
          <p>{notification.loadDetails.pickupLocation?.address || '-'}</p>
          <p>{notification.loadDetails.pickupLocation?.date || '-'}</p>
        </div>
        <div className={styles.section}>
          <h4>Delivery</h4>
          <p>{notification.loadDetails.deliveryLocation?.address || '-'}</p>
          <p>{notification.loadDetails.deliveryLocation?.date || '-'}</p>
        </div>
        <div className={styles.section}>
          <h4>Cargo</h4>
          <p>Weight: {weight !== '-' ? `${weight} lbs` : '-'}</p>
          <p>Dimensions: {dimensions}</p>
          <p>Rate: {notification.loadDetails.rate ? `$${notification.loadDetails.rate}` : '-'}</p>
        </div>
        {notification.loadDetails.poNumber && (
          <div className={styles.section}>
            <h4>PO Number</h4>
            <a href={`/carrier/loads/${notification.loadDetails.poNumber}`} className={styles.poLink}>
              {notification.loadDetails.poNumber}
            </a>
          </div>
        )}
      </div>
      {notification.status === 'pending' && (
        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.accept}`}
            onClick={() => handleAction('accepted')}
            disabled={isSubmitting}
          >
            Accept
          </button>
          <button
            className={`${styles.button} ${styles.reject}`}
            onClick={() => handleAction('rejected')}
            disabled={isSubmitting}
          >
            Reject
          </button>
          <div className={styles.counterOffer}>
            <input
              type="number"
              value={counterOffer}
              onChange={(e) => setCounterOffer(Number(e.target.value))}
              min={0}
              step={0.01}
              className={styles.counterInput}
            />
            <button
              className={`${styles.button} ${styles.counter}`}
              onClick={() => handleAction('counter_offer')}
              disabled={isSubmitting}
            >
              Make Offer
            </button>
          </div>
        </div>
      )}
      {notification.status !== 'pending' && (
        <div className={styles.statusMessage}>
          {notification.status === 'accepted' && 'You have accepted this load'}
          {notification.status === 'rejected' && 'You have rejected this load'}
          {notification.status === 'counter_offer' && 'You have made a counter offer'}
        </div>
      )}
      {logMessage && (
        <div className={`${styles.logMessage} ${logMessage.startsWith('Error') ? styles.error : styles.success}`}>
          {logMessage}
        </div>
      )}
    </div>
  );
};

export default LoadRequestCard; 