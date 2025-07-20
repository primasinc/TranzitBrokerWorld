import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import styles from './AdminDashboard.module.css';

interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  permissions?: string[];
  availability?: 'online' | 'offline' | 'busy';
  lastActive?: any;
  addedBy?: string;
  addedAt?: any;
  contactInfo?: {
    phone?: string;
    department?: string;
    location?: string;
  };
}

interface AdminPermissions {
  canApproveUsers: boolean;
  canManagePersonnel: boolean;
  canViewUserAccounts: boolean;
  canSubmitCodeRequests: boolean;
  canManageOtherAdmins: boolean;
}

const AdminManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showAdminDetails, setShowAdminDetails] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      checkSuperAdminStatus();
      loadAdminUsers();
    }
  }, [user]);

  const checkSuperAdminStatus = async () => {
    try {
      const userRef = doc(db, 'users', user!.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      if (userData?.isSuperAdmin) {
        setIsSuperAdmin(true);
      }
    } catch (error) {
      console.error('Error checking super admin status:', error);
    }
  };

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      // Get users from Firestore with admin role
      const usersRef = collection(db, 'users');
      const adminQuery = query(usersRef, where('isAdmin', '==', true));
      const querySnapshot = await getDocs(adminQuery);
      
      const adminUsersList: AdminUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        adminUsersList.push({
          uid: doc.id,
          email: data.email || '',
          displayName: data.companyRep || data.name || 'No Name',
          role: data.role || 'Admin',
          isAdmin: data.isAdmin || false,
          isSuperAdmin: data.isSuperAdmin || false,
          permissions: data.permissions || [],
          availability: data.availability || 'offline',
          lastActive: data.lastActive,
          addedBy: data.addedBy || 'System',
          addedAt: data.addedAt,
          contactInfo: data.contactInfo || {
            phone: '',
            department: '',
            location: ''
          }
        });
      });
      
      setAdminUsers(adminUsersList);
    } catch (error) {
      console.error('Error loading admin users:', error);
      setMessage('Failed to load admin users. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAdminDetails = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setShowAdminDetails(true);
  };

  const handleUpdateAdminPermissions = async (adminUid: string, permissions: AdminPermissions) => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }

    if (!isSuperAdmin) {
      setMessage('Only super admins can update admin permissions');
      return;
    }

    try {
      setLoading(true);
      setMessage('Updating admin permissions...');

      const userRef = doc(db, 'users', adminUid);
      await updateDoc(userRef, {
        permissions: Object.keys(permissions).filter(key => permissions[key as keyof AdminPermissions]),
        updatedBy: user?.email,
        updatedAt: new Date()
      });

      setMessage('Admin permissions updated successfully!');
      await loadAdminUsers();
    } catch (error: any) {
      console.error('Error updating admin permissions:', error);
      setMessage(`Failed to update permissions: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async (adminUid: string, availability: 'online' | 'offline' | 'busy') => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }

    try {
      setLoading(true);
      setMessage('Updating availability...');

      const userRef = doc(db, 'users', adminUid);
      await updateDoc(userRef, {
        availability: availability,
        lastActive: new Date(),
        updatedBy: user?.email,
        updatedAt: new Date()
      });

      setMessage('Availability updated successfully!');
      await loadAdminUsers();
    } catch (error: any) {
      console.error('Error updating availability:', error);
      setMessage(`Failed to update availability: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Sign out from Firebase Auth
    signOut(auth);
    // Navigate to login page
    navigate('/login');
  };

  // if (checkingAdmin) { // This block is removed as per the edit hint
  //   return (
  //     <div className={styles.adminDashboard}>
  //       <h1>Admin Management</h1>
  //       <p>Checking admin privileges...</p>
  //     </div>
  //   );
  // }

  // if (!isAdmin) { // This block is removed as per the edit hint
  //   return (
  //     <div className={styles.adminDashboard}>
  //       <h1>Admin Management</h1>
  //       <p>Access denied. Admin privileges required.</p>
  //     </div>
  //   );
  // }

  return (
    <div className={styles.adminDashboard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Admin Management</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Logout
        </button>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Current Admin Team ({adminUsers.length})</h2>
        {loading ? (
          <p>Loading admin users...</p>
        ) : adminUsers.length === 0 ? (
          <p>No admin users found.</p>
        ) : (
          <div className={styles.usersList}>
            {adminUsers.map((adminUser) => (
              <div key={adminUser.uid} className={styles.userCard}>
                <div className={styles.userInfo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3>{adminUser.displayName}</h3>
                      <p><strong>Email:</strong> {adminUser.email}</p>
                      <p><strong>Role:</strong> {adminUser.role}</p>
                      <p><strong>Status:</strong> 
                        <span style={{ 
                          color: adminUser.isSuperAdmin ? '#007bff' : '#28a745',
                          fontWeight: 'bold',
                          marginLeft: '5px'
                        }}>
                          {adminUser.isSuperAdmin ? 'Super Admin' : 'Admin'}
                        </span>
                      </p>
                      <p><strong>Availability:</strong> 
                        <span style={{ 
                          color: adminUser.availability === 'online' ? '#28a745' : 
                                 adminUser.availability === 'busy' ? '#ffc107' : '#dc3545',
                          fontWeight: 'bold',
                          marginLeft: '5px'
                        }}>
                          {adminUser.availability || 'offline'}
                        </span>
                      </p>
                      <p><strong>Added By:</strong> {adminUser.addedBy || 'System'}</p>
                      <p><strong>Added At:</strong> {adminUser.addedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                    </div>
                    <div className={styles.userActions}>
                      <button
                        onClick={() => handleViewAdminDetails(adminUser)}
                        className={styles.approveBtn}
                        style={{ marginBottom: '5px' }}
                      >
                        View Details
                      </button>
                      {isSuperAdmin && adminUser.email !== 'srose@norwalkls.com' && (
                        <button
                          onClick={() => handleUpdateAvailability(adminUser.uid, 
                            adminUser.availability === 'online' ? 'offline' : 'online')}
                          className={adminUser.availability === 'online' ? styles.rejectBtn : styles.approveBtn}
                        >
                          {adminUser.availability === 'online' ? 'Set Offline' : 'Set Online'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Details Modal */}
      {showAdminDetails && selectedAdmin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2>Admin Details: {selectedAdmin.displayName}</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <h3>Basic Information</h3>
              <p><strong>Email:</strong> {selectedAdmin.email}</p>
              <p><strong>Role:</strong> {selectedAdmin.role}</p>
              <p><strong>Status:</strong> {selectedAdmin.isSuperAdmin ? 'Super Admin' : 'Admin'}</p>
              <p><strong>Added By:</strong> {selectedAdmin.addedBy}</p>
              <p><strong>Added At:</strong> {selectedAdmin.addedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>Contact Information</h3>
              <p><strong>Phone:</strong> {selectedAdmin.contactInfo?.phone || 'N/A'}</p>
              <p><strong>Department:</strong> {selectedAdmin.contactInfo?.department || 'N/A'}</p>
              <p><strong>Location:</strong> {selectedAdmin.contactInfo?.location || 'N/A'}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>Availability</h3>
              <select
                value={selectedAdmin.availability || 'offline'}
                onChange={(e) => handleUpdateAvailability(selectedAdmin.uid, e.target.value as any)}
                className={styles.input}
                style={{ width: '200px' }}
              >
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="busy">Busy</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowAdminDetails(false)}
                className={styles.refreshBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2>Quick Links</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => navigate('/admin')}
            className={styles.approveBtn}
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            Go to Admin Dashboard
          </button>
          <button 
            onClick={() => navigate('/admin-setup')}
            className={styles.approveBtn}
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            Go to Admin Setup
          </button>
          <button 
            onClick={loadAdminUsers}
            className={styles.refreshBtn}
          >
            Refresh Admin Users
          </button>
        </div>
      </div>
      
      {message && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('success') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AdminManagement; 