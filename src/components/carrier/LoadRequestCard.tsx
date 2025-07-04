import React, { useState, useEffect } from 'react';
import styles from './LoadRequestCard.module.css';
import { updateLoadRequestStatus } from '../../services/notificationService';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
  const [loadDetails, setLoadDetails] = useState<any>(null);

  useEffect(() => {
    // Fetch load details from loads collection using poNumber
    const fetchLoad = async () => {
      if (!notification.loadDetails.poNumber) return;
      console.log('Fetching load for poNumber:', notification.loadDetails.poNumber);
      const q = query(collection(db, 'loads'), where('poNumber', '==', notification.loadDetails.poNumber));
      const snap = await getDocs(q);
      if (!snap.empty) {
        console.log('Fetched load details:', snap.docs[0].data());
        setLoadDetails(snap.docs[0].data());
      } else {
        console.warn('No load found for poNumber:', notification.loadDetails.poNumber);
      }
    };
    fetchLoad();
  }, [notification.loadDetails.poNumber]);

  const handleAction = async (action: LoadRequestNotification['status']) => {
    try {
      setIsSubmitting(true);
      await updateLoadRequestStatus(notification.id!, action, notification.loadDetails.poNumber || '');
      onStatusUpdate(action);
      setLogMessage(`Action: ${action} submitted successfully.`);
    } catch (error) {
      console.error('Error updating load request status:', error);
      setLogMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCounterOffer = async () => {
    try {
      setIsSubmitting(true);
      await updateLoadRequestStatus(notification.id!, 'counter_offer', notification.loadDetails.poNumber || '', counterOffer);
      onStatusUpdate('counter_offer');
      setLogMessage(`Counter offer of $${counterOffer} submitted successfully.`);
    } catch (error) {
      console.error('Error submitting counter offer:', error);
      setLogMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Load Request</h3>
        {loadDetails?.shipper && (
          <div className={styles.shipperCompany}>
            <strong>From:</strong> {loadDetails.shipper}
          </div>
        )}
        <span className={`${styles.status} ${styles[notification.status]}`}>
          {notification.status}
        </span>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h4>Pickup Details</h4>
          <p>{loadDetails?.pickupLocation?.address || '-'}</p>
          <p>{loadDetails?.pickupLocation?.city || ''}{loadDetails?.pickupLocation?.state ? ', ' + loadDetails.pickupLocation.state : ''} {loadDetails?.pickupLocation?.zipCode || ''}</p>
          <p>Date: {loadDetails?.pickupLocation?.date ?? loadDetails?.items?.[0]?.pickupDate ?? notification.loadDetails.pickupLocation.date ?? '-'}</p>
        </div>

        <div className={styles.section}>
          <h4>Delivery Details</h4>
          <p>{loadDetails?.deliveryLocation?.address || '-'}</p>
          <p>{loadDetails?.deliveryLocation?.city || ''}{loadDetails?.deliveryLocation?.state ? ', ' + loadDetails.deliveryLocation.state : ''} {loadDetails?.deliveryLocation?.zipCode || ''}</p>
          <p>Date: {loadDetails?.deliveryLocation?.date ?? loadDetails?.items?.[0]?.deliveryDate ?? notification.loadDetails.deliveryLocation.date ?? '-'}</p>
        </div>

        <div className={styles.section}>
          <h4>Cargo Details</h4>
          <p>Weight: {(loadDetails?.weight ?? loadDetails?.items?.[0]?.weight ?? 0)} lbs</p>
          <p>Dimensions: {(loadDetails?.dimensions ?? loadDetails?.items?.[0]?.dimensions ?? '-')}</p>
          <p>Rate: ${loadDetails?.rate || 0}</p>
        </div>

        {/* Show PO Number if present */}
        {notification.loadDetails.poNumber && (
          <div className={styles.section}>
            <h4>PO Number</h4>
            <p>{notification.loadDetails.poNumber}</p>
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
              onClick={handleCounterOffer}
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

      {/* Log message area */}
      {logMessage && (
        <div className={`${styles.logMessage} ${logMessage.startsWith('Error') ? styles.error : styles.success}`}>
          {logMessage}
        </div>
      )}
    </div>
  );
};

export default LoadRequestCard; 