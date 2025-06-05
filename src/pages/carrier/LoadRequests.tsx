import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { LoadRequestNotification } from '../../services/notificationService';
import LoadRequestCard from '../../components/carrier/LoadRequestCard';
import styles from './LoadRequests.module.css';

const LoadRequests: React.FC = () => {
  const { user } = useAuth();
  const [loadRequests, setLoadRequests] = useState<LoadRequestNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Query notifications for this carrier
    const q = query(
      collection(db, 'notifications'),
      where('carrierId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: LoadRequestNotification[] = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as LoadRequestNotification);
      });
      setLoadRequests(requests);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStatusUpdate = (notificationId: string, newStatus: LoadRequestNotification['status']) => {
    setLoadRequests(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, status: newStatus }
          : notification
      )
    );
  };

  if (loading) {
    return <div className={styles.loading}>Loading load requests...</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Load Requests</h1>
      {loadRequests.length === 0 ? (
        <p className={styles.noRequests}>No load requests at this time.</p>
      ) : (
        <div className={styles.requestsList}>
          {loadRequests.map((request) => (
            <LoadRequestCard
              key={request.id}
              notification={request}
              onStatusUpdate={(status) => handleStatusUpdate(request.id!, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LoadRequests; 