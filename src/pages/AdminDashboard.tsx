import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import styles from './AdminDashboard.module.css';

interface User {
  id: string;
  email: string;
  companyName: string;
  phoneNumber: string;
  userType: string;
  status: string;
  approvalStatus: string;
  createdAt: any;
}

const AdminDashboard: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  const functions = getFunctions();
  const approveUserFunction = httpsCallable(functions, 'approveUser');

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('approvalStatus', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          email: data.email || 'N/A',
          companyName: data.companyName || 'N/A',
          phoneNumber: data.phoneNumber || 'N/A',
          userType: data.userType || 'N/A',
          status: data.status || 'N/A',
          approvalStatus: data.approvalStatus || 'N/A',
          createdAt: data.createdAt
        });
      });
      
      setPendingUsers(users);
    } catch (error) {
      console.error('Error loading pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      setApproving(userId);
      
      // Call the Cloud Function to approve the user
      await approveUserFunction({ userId });
      
      // Update local state
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      alert('User approved successfully!');
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user. Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      setApproving(userId);
      
      // Update user status to rejected
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'rejected',
        approvalStatus: 'rejected',
        rejectedAt: new Date()
      });
      
      // Update local state
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      alert('User rejected successfully!');
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user. Please try again.');
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return <div className={styles.adminDashboard}>Loading pending users...</div>;
  }

  return (
    <div className={styles.adminDashboard}>
      <h1>Admin Dashboard</h1>
      <h2>Pending User Approvals ({pendingUsers.length})</h2>
      
      {pendingUsers.length === 0 ? (
        <p>No pending users to approve.</p>
      ) : (
        <div className={styles.usersList}>
          {pendingUsers.map((user) => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userInfo}>
                <h3>{user.companyName}</h3>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Phone:</strong> {user.phoneNumber}</p>
                <p><strong>User Type:</strong> {user.userType}</p>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Registered:</strong> {user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
              </div>
              
              <div className={styles.userActions}>
                <button
                  onClick={() => handleApproveUser(user.id)}
                  disabled={approving === user.id}
                  className={styles.approveBtn}
                >
                  {approving === user.id ? 'Approving...' : 'Approve'}
                </button>
                
                <button
                  onClick={() => handleRejectUser(user.id)}
                  disabled={approving === user.id}
                  className={styles.rejectBtn}
                >
                  {approving === user.id ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button onClick={loadPendingUsers} className={styles.refreshBtn}>
        Refresh List
      </button>
    </div>
  );
};

export default AdminDashboard; 