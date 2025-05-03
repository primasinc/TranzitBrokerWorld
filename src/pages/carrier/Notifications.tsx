import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './Notifications.module.css';

interface Notification {
  id: string;
  type: string;
  senderId: string;
  senderName: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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
            createdAt: data.createdAt.toDate()
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

  if (loading) {
    return <div>Loading notifications...</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Notifications</h1>
      {notifications.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <div className={styles.notificationList}>
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`${styles.notification} ${notification.read ? styles.read : ''}`}
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
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications; 