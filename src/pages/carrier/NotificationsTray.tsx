import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import styles from './Notifications.module.css';
import RejectionOptionsModal from '../../components/shipper/RejectionOptionsModal';
import CounterOfferModal from '../../components/shipper/CounterOfferModal';
import { updateLoadRequestStatus } from '../../services/notificationService';
import { Dialog } from '@reach/dialog';
import '@reach/dialog/styles.css';

interface Notification {
  id: string;
  type: string;
  senderId: string;
  senderName: string;
  message: string;
  read: boolean;
  createdAt: Date;
  requiresAction?: boolean;
  loadDetails?: {
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
    rate: number;
    poNumber?: string;
  };
}

interface NotificationsTrayProps {
  onClose: () => void;
}

const NotificationsTray: React.FC<NotificationsTrayProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsNotification, setDetailsNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close tray if no modal is open
      if (
        !showDetailsModal &&
        !showRejectionModal &&
        !showCounterOfferModal &&
        trayRef.current &&
        !trayRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, showDetailsModal, showRejectionModal, showCounterOfferModal]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
        const q = query(
          collection(db, 'notifications'),
          where('recipientId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const notificationList: Notification[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          notificationList.push({
            id: doc.id,
            type: data.type,
            senderId: data.senderId,
            senderName: data.senderName,
            message: data.message,
            read: data.read,
            createdAt: data.createdAt.toDate(),
            requiresAction: data.requiresAction,
            loadDetails: data.loadDetails
          });
        });
        setNotifications(notificationList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        setLoading(false);
          setError(null);
        } catch (err: any) {
          setError('Could not load notifications. Please check your permissions or contact support.');
          setLoading(false);
        }
      } else {
        setNotifications([]);
        setLoading(false);
        setError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'carrier_reject' && notification.requiresAction) {
      setSelectedNotification(notification);
      setShowRejectionModal(true);
    } else if (notification.type === 'carrier_counter_offer' && notification.requiresAction) {
      setSelectedNotification(notification);
      setShowCounterOfferModal(true);
    } else if (notification.type === 'make_offer') {
      setDetailsNotification(notification);
      setShowDetailsModal(true);
    }
  };

  const handleSelectNewCarrier = () => {
    console.log('Selecting new carrier for rejected load');
    if (selectedNotification?.loadDetails) {
      navigate('/shipper/partners', { 
        state: { 
          loadDetails: selectedNotification.loadDetails,
          fromRejection: true 
        }
      });
    }
    setShowRejectionModal(false);
  };

  const handlePlaceInMarketplace = () => {
    console.log('Placing rejected load in marketplace');
    if (selectedNotification?.loadDetails) {
      navigate('/shipper/marketplace', { 
        state: { 
          loadDetails: selectedNotification.loadDetails,
          fromRejection: true 
        }
      });
    }
    setShowRejectionModal(false);
  };

  const handleAcceptCounterOffer = async () => {
    if (selectedNotification?.id) {
      try {
        await updateLoadRequestStatus(selectedNotification.loadDetails?.poNumber || '', 'accepted');
        setShowCounterOfferModal(false);
        // Refresh notifications
        const notificationRef = doc(db, 'notifications', selectedNotification.id);
        await updateDoc(notificationRef, { read: true });
        setNotifications(prev => prev.map(n => 
          n.id === selectedNotification.id ? { ...n, read: true } : n
        ));
      } catch (error) {
        console.error('Error accepting counter offer:', error);
        alert('Failed to accept counter offer. Please try again.');
      }
    }
  };

  const handleRejectCounterOffer = async () => {
    if (selectedNotification?.id) {
      try {
        await updateLoadRequestStatus(selectedNotification.loadDetails?.poNumber || '', 'rejected');
        setShowCounterOfferModal(false);
        // Refresh notifications
        const notificationRef = doc(db, 'notifications', selectedNotification.id);
        await updateDoc(notificationRef, { read: true });
        setNotifications(prev => prev.map(n => 
          n.id === selectedNotification.id ? { ...n, read: true } : n
        ));
      } catch (error) {
        console.error('Error rejecting counter offer:', error);
        alert('Failed to reject counter offer. Please try again.');
      }
    }
  };

  return (
    <>
      <div ref={trayRef} className={styles.tray} style={{ position: 'absolute', top: 50, right: 0, zIndex: 2000, minWidth: 340 }}>
        <div className={styles.trayHeader}>
          <span>Notifications</span>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        {error ? (
          <div className={styles.error}>{error}</div>
        ) : loading ? (
          <div>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          <div className={styles.notificationList}>
            {notifications.map(notification => {
              // Defensive: fallback values
              const senderName = notification.senderName || 'Unknown Carrier';
              const offerAmount = notification.loadDetails?.rate ? `$${notification.loadDetails.rate.toLocaleString()}` : '—';
              const poNumber = notification.loadDetails?.poNumber || '—';
              const pickup = notification.loadDetails?.pickupLocation?.address || '—';
              const delivery = notification.loadDetails?.deliveryLocation?.address || '—';
              const message = notification.message || (notification.type === 'make_offer'
                ? `${senderName} has made an offer of ${offerAmount} on PO ${poNumber}`
                : 'Notification data missing');
              // Modern card for make_offer
              if (notification.type === 'make_offer') {
                return (
                  <div
                    key={notification.id}
                    className={`${styles.notification} ${notification.read ? styles.read : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                    style={{ cursor: 'pointer', borderLeft: '5px solid #43a047', background: notification.read ? '#f5f5f5' : '#e8f5e9' }}
                    aria-label={`Offer from ${senderName} for PO ${poNumber}`}
                  >
                    <div className={styles.content}>
                      <div style={{ fontWeight: 600, fontSize: 16, color: '#388e3c', marginBottom: 2 }}>
                        <span role="img" aria-label="Offer">💰</span> Offer Received
                      </div>
                      <div style={{ fontSize: 15, marginBottom: 2 }}>
                        <strong>{senderName}</strong> offered <span style={{ color: '#1976d2', fontWeight: 700 }}>{offerAmount}</span>
                      </div>
                      <div style={{ fontSize: 14, color: '#555', marginBottom: 2 }}>
                        PO: <strong>{poNumber}</strong>
                      </div>
                      <div className={styles.time}>{notification.createdAt.toLocaleString()}</div>
                    </div>
                    {!notification.read && (
                      <button
                        className={styles.markAsRead}
                        onClick={e => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                      >Mark as read</button>
                    )}
                  </div>
                );
              }
              // Default card for other types, always show a message
              return (
                <div
                  key={notification.id}
                  className={`${styles.notification} ${notification.read ? styles.read : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{ cursor: notification.requiresAction ? 'pointer' : 'default' }}
                >
                  <div className={styles.content}>
                    <p className={styles.message}>{message}</p>
                    <span className={styles.time}>{notification.createdAt.toLocaleString()}</span>
                  </div>
                  {!notification.read && (
                    <button
                      className={styles.markAsRead}
                      onClick={e => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                    >Mark as read</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Details Modal for Make Offer */}
      {showDetailsModal && detailsNotification && (
        <Dialog aria-label="Offer Details" onDismiss={() => setShowDetailsModal(false)}>
          <div style={{ maxWidth: 420, padding: 24 }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 22, color: '#222', fontWeight: 700, letterSpacing: '-1px' }}>
              Offer Details
            </h2>
            <div style={{ marginBottom: 12 }}>
              <strong>Carrier:</strong> {detailsNotification.senderName}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Offer Amount:</strong> <span style={{ color: '#1976d2', fontWeight: 700 }}>${detailsNotification.loadDetails?.rate?.toLocaleString()}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>PO Number:</strong> {detailsNotification.loadDetails?.poNumber}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Pickup:</strong> {detailsNotification.loadDetails?.pickupLocation?.address || '-'}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Delivery:</strong> {detailsNotification.loadDetails?.deliveryLocation?.address || '-'}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Message:</strong> {detailsNotification.message}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
              <button style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 600, fontSize: 16, flex: 1, cursor: 'pointer' }}
                onClick={async () => {
                  try {
                    await updateLoadRequestStatus(detailsNotification.loadDetails?.poNumber || '', 'accepted');
                    setShowDetailsModal(false);
                    // Refresh notifications
                    const notificationRef = doc(db, 'notifications', detailsNotification.id);
                    await updateDoc(notificationRef, { read: true });
                    setNotifications(prev => prev.map(n => n.id === detailsNotification.id ? { ...n, read: true } : n));
                  } catch (error) {
                    alert('Failed to accept offer. Please try again.');
                  }
                }}>
                Accept
              </button>
              <button style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 600, fontSize: 16, flex: 1, cursor: 'pointer' }}
                onClick={async () => {
                  try {
                    await updateLoadRequestStatus(detailsNotification.loadDetails?.poNumber || '', 'rejected');
                    setShowDetailsModal(false);
                    // Refresh notifications
                    const notificationRef = doc(db, 'notifications', detailsNotification.id);
                    await updateDoc(notificationRef, { read: true });
                    setNotifications(prev => prev.map(n => n.id === detailsNotification.id ? { ...n, read: true } : n));
                  } catch (error) {
                    alert('Failed to reject offer. Please try again.');
                  }
                }}>
                Reject
              </button>
              <button style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 600, fontSize: 16, flex: 1, cursor: 'pointer' }} onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {/* Existing modals */}
      {showRejectionModal && selectedNotification && (
        <RejectionOptionsModal
          isOpen={showRejectionModal}
          onClose={() => setShowRejectionModal(false)}
          onSelectNewCarrier={handleSelectNewCarrier}
          onPlaceInMarketplace={handlePlaceInMarketplace}
          loadDetails={selectedNotification.loadDetails!}
        />
      )}
      {showCounterOfferModal && selectedNotification && selectedNotification.loadDetails && (
        <CounterOfferModal
          isOpen={showCounterOfferModal}
          onClose={() => setShowCounterOfferModal(false)}
          onAccept={handleAcceptCounterOffer}
          onReject={handleRejectCounterOffer}
          currentRate={selectedNotification.loadDetails.rate}
          counterOffer={selectedNotification.loadDetails.rate}
          loadDetails={selectedNotification.loadDetails}
        />
      )}
    </>
  );
};

// Utility hook to get unread count for bell badge
export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(
          collection(db, 'notifications'),
          where('recipientId', '==', user.uid),
          where('read', '==', false)
        );
        const querySnapshot = await getDocs(q);
        setUnreadCount(querySnapshot.size);
      }
    });
    return () => unsubscribe();
  }, []);
  return unreadCount;
}

export default NotificationsTray; 