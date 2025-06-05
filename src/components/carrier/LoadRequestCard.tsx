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

  const handleAction = async (action: LoadRequestNotification['status']) => {
    try {
      setIsSubmitting(true);
      await updateLoadRequestStatus(notification.id!, action);
      onStatusUpdate(action);
    } catch (error) {
      console.error('Error updating load request status:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCounterOffer = async () => {
    try {
      setIsSubmitting(true);
      await updateLoadRequestStatus(notification.id!, 'counter_offer', counterOffer);
      onStatusUpdate('counter_offer');
    } catch (error) {
      console.error('Error submitting counter offer:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Load Request</h3>
        {notification.loadDetails.shipperCompany && (
          <div className={styles.shipperCompany}>
            <strong>From:</strong> {notification.loadDetails.shipperCompany}
          </div>
        )}
        <span className={`${styles.status} ${styles[notification.status]}`}>
          {notification.status}
        </span>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h4>Pickup Details</h4>
          <p>{notification.loadDetails.pickupLocation.address}</p>
          <p>{notification.loadDetails.pickupLocation.city}, {notification.loadDetails.pickupLocation.state} {notification.loadDetails.pickupLocation.zipCode}</p>
          <p>Date: {notification.loadDetails.pickupLocation.date}</p>
          <p>Time: {notification.loadDetails.pickupLocation.time}</p>
        </div>

        <div className={styles.section}>
          <h4>Delivery Details</h4>
          <p>{notification.loadDetails.deliveryLocation.address}</p>
          <p>{notification.loadDetails.deliveryLocation.city}, {notification.loadDetails.deliveryLocation.state} {notification.loadDetails.deliveryLocation.zipCode}</p>
          <p>Date: {notification.loadDetails.deliveryLocation.date}</p>
          <p>Time: {notification.loadDetails.deliveryLocation.time}</p>
        </div>

        <div className={styles.section}>
          <h4>Cargo Details</h4>
          <p>Weight: {notification.loadDetails.weight} lbs</p>
          <p>Dimensions: {notification.loadDetails.dimensions.length}L x {notification.loadDetails.dimensions.width}W x {notification.loadDetails.dimensions.height}H</p>
          <p>Rate: ${notification.loadDetails.rate}</p>
        </div>
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
    </div>
  );
};

export default LoadRequestCard; 