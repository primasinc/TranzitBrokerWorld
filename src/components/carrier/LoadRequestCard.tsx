import React, { useState } from 'react';
import styles from './LoadRequestCard.module.css';
import { updateLoadRequestStatus } from '../../services/notificationService';
import { updatePartnerRequestStatus } from '../../services/partnerRequestService';

interface LoadRequestNotification {
  id?: string;
  carrierId: string;
  userId: string;
  shippingScheduleId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'counter_offer';
  poNumber?: string;
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
  const [counterOffer, setCounterOffer] = useState(notification?.loadDetails?.rate || 0);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(notification.status);

  // Add safety check for notification and loadDetails
  if (!notification || !notification.loadDetails) {
    return (
      <div className={styles.card}>
        <div className={styles.errorMessage}>
          Error: Load details not available
        </div>
      </div>
    );
  }

  const handleAction = async (action: LoadRequestNotification['status']) => {
    // Prevent double-clicks during processing
    if (isSubmitting) {
      console.log('[LoadRequestCard] Action already in progress, ignoring click');
      return;
    }

    try {
      setIsSubmitting(true);
      setLogMessage(`Processing ${action}...`);
      console.log('[LoadRequestCard] Starting action:', action, 'for notification:', notification.id);
      
      // Get poNumber from multiple possible locations
      const poNumber = notification.loadDetails?.poNumber || notification.poNumber || '';
      
      if (!poNumber) {
        throw new Error('PO Number not found in notification data');
      }
      
      console.log('[LoadRequestCard] Using poNumber:', poNumber);
      
      // IMMEDIATE UI UPDATE - Update local status immediately for responsive UI
      setLocalStatus(action);
      
      // Use partner request function instead of notification function
      if (action === 'rejected') {
        await updatePartnerRequestStatus(notification.id!, 'declined');
        await updateLoadRequestStatus(poNumber, action, counterOffer);
      } else if (action === 'accepted') {
        await updatePartnerRequestStatus(notification.id!, 'accepted');
        await updateLoadRequestStatus(poNumber, action, counterOffer);
      } else {
        await updateLoadRequestStatus(poNumber, action, counterOffer);
      }
      
      console.log('[LoadRequestCard] Action completed successfully:', action);
      
      // Update parent component immediately
      onStatusUpdate(action);
      
      // Show success message briefly
      setLogMessage(`Action: ${action} completed successfully.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setLogMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('[LoadRequestCard] Error during action:', action, error);
      
      // REVERT UI UPDATE on error
      setLocalStatus(notification.status);
      
      setLogMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setLogMessage(null);
      }, 5000);
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
        <span className={`${styles.status} ${styles[localStatus]}`}>
          {isSubmitting ? 'Processing...' : localStatus}
        </span>
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
      {localStatus === 'pending' && (
        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.accept} ${isSubmitting ? styles.disabled : ''}`}
            onClick={() => handleAction('accepted')}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Accept'}
          </button>
          <button
            className={`${styles.button} ${styles.reject} ${isSubmitting ? styles.disabled : ''}`}
            onClick={() => handleAction('rejected')}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Reject'}
          </button>
          <div className={styles.counterOffer}>
            <input
              type="number"
              value={counterOffer}
              onChange={(e) => setCounterOffer(Number(e.target.value))}
              min={0}
              step={0.01}
              className={styles.counterInput}
              disabled={isSubmitting}
            />
            <button
              className={`${styles.button} ${styles.counter} ${isSubmitting ? styles.disabled : ''}`}
              onClick={() => handleAction('counter_offer')}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Make Offer'}
            </button>
          </div>
        </div>
      )}
      {localStatus !== 'pending' && (
        <div className={styles.statusMessage}>
          {localStatus === 'accepted' && 'You have accepted this load'}
          {localStatus === 'rejected' && 'You have rejected this load'}
          {localStatus === 'counter_offer' && 'You have made a counter offer'}
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