import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import styles from './Notifications.module.css';
import RejectionOptionsModal from '../../components/shipper/RejectionOptionsModal';
import CounterOfferModal from '../../components/shipper/CounterOfferModal';
import { updateLoadRequestStatus } from '../../services/notificationService';

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
    console.log('Notification clicked:', notification);
    if (notification.type === 'carrier_reject' && notification.requiresAction) {
      console.log('Showing rejection modal for notification:', notification.id);
      setSelectedNotification(notification);
      setShowRejectionModal(true);
    } else if (notification.type === 'carrier_counter_offer' && notification.requiresAction) {
      console.log('Showing counter offer modal for notification:', notification.id);
      setSelectedNotification(notification);
      setShowCounterOfferModal(true);
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
        await updateLoadRequestStatus(selectedNotification.id, 'accepted');
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
        await updateLoadRequestStatus(selectedNotification.id, 'rejected');
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
      <div ref={trayRef} className={styles.tray} style={{ position: 'absolute', top: 50, right: 0, zIndex: 2000, minWidth: 320 }}>
        <div className={styles.trayHeader}>
          <span>Notifications</span>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        {loading ? (
          <div>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          <div className={styles.notificationList}>
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`${styles.notification} ${notification.read ? styles.read : ''}`}
                onClick={() => handleNotificationClick(notification)}
                style={{ cursor: notification.requiresAction ? 'pointer' : 'default' }}
              >
                <div className={styles.content}>
                  <p className={styles.message}>{notification.message}</p>
                  <span className={styles.time}>
                    {notification.createdAt.toLocaleString()}
                  </span>
                </div>
                {!notification.read && (
                  <button 
                    className={styles.markAsRead}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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