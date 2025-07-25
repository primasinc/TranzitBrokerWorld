import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import styles from './AdminDashboard.module.css';

interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  role?: string;
  addedBy?: string;
  addedAt?: any;
}

interface Personnel {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  isActive: boolean;
  assignedAdmin?: string;
  assignedAdminEmail?: string;
  createdAt: any;
}

interface PendingUser {
  id: string;
  email: string;
  companyName: string;
  userType: string;
  phoneNumber: string;
  createdAt: any;
  status: string;
  // New fields for company hierarchy (optional for backward compatibility)
  role?: 'company_owner' | 'driver';
  parentCompanyId?: string;
}

interface NewAdminForm {
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  phone?: string;
  department?: string;
  location?: string;
}

interface NewPersonnelForm {
  email: string;
  name: string;
  role: string;
  department: string;
  assignedAdmin: string;
  isActive: boolean;
}

const AdminSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [activeTab, setActiveTab] = useState<'admin' | 'personnel'>('admin');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Form states for personnel
  const [personnelForm, setPersonnelForm] = useState<NewPersonnelForm>({
    email: '',
    name: '',
    role: '',
    department: '',
    assignedAdmin: '',
    isActive: true
  });

  // Form states for adding new admins
  const [newAdminForm, setNewAdminForm] = useState<NewAdminForm>({
    email: '',
    name: '',
    role: '',
    isSuperAdmin: false,
    phone: '',
    department: '',
    location: ''
  });

  useEffect(() => {
    if (user?.email === 'srose@norwalkls.com') {
      checkSuperAdminStatus();
      loadAdminUsers();
      loadPersonnel();
      loadPendingUsers();
    }
  }, [user]);

  const checkSuperAdminStatus = async () => {
    try {
      const userRef = doc(db, 'users', user!.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      setUserData(userData);
      
      if (userData?.isAdmin) {
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
          isAdmin: data.isAdmin || false,
          isSuperAdmin: data.isSuperAdmin || false,
          role: data.role || 'admin',
          addedBy: data.addedBy || 'System',
          addedAt: data.addedAt
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

  const loadPersonnel = async () => {
    try {
      const personnelRef = collection(db, 'personnel');
      const querySnapshot = await getDocs(personnelRef);
      const personnelList: Personnel[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        personnelList.push({
          id: doc.id,
          email: data.email || '',
          name: data.name || '',
          role: data.role || '',
          department: data.department || '',
          isActive: data.isActive !== false,
          assignedAdmin: data.assignedAdmin || '',
          assignedAdminEmail: data.assignedAdminEmail || '',
          createdAt: data.createdAt
        });
      });
      
      setPersonnel(personnelList);
    } catch (error) {
      console.error('Error loading personnel:', error);
      setMessage('Failed to load personnel list.');
    }
  };

  const loadPendingUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const pendingQuery = query(usersRef, where('approvalStatus', '==', 'pending'));
      const querySnapshot = await getDocs(pendingQuery);
      
      const pendingUsersList: PendingUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        pendingUsersList.push({
          id: doc.id,
          email: data.email || '',
          companyName: data.companyName || '',
          userType: data.userType || '',
          phoneNumber: data.phoneNumber || '',
          createdAt: data.createdAt,
          status: data.approvalStatus || 'pending'
        });
      });
      
      setPendingUsers(pendingUsersList);
    } catch (error) {
      console.error('Error loading pending users:', error);
      setMessage('Failed to load pending users.');
    }
  };

  const handleSetupAdmin = async () => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }

    if (user.email !== 'srose@norwalkls.com') {
      setMessage('Only srose@norwalkls.com can set up admin role');
      return;
    }

    try {
      setLoading(true);
      setMessage('Setting up admin role...');
      
      // Update user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        isAdmin: true,
        isSuperAdmin: true, // Make srose@norwalkls.com the super admin
        role: 'super_admin',
        adminSetupAt: new Date(),
        addedBy: 'System',
        addedAt: new Date()
      }, { merge: true });
      
      setIsSuperAdmin(true);
      setMessage('Super Admin role set successfully! You can now manage other admins.');
      
      // Reload admin users
      await loadAdminUsers();
    } catch (error: any) {
      console.error('Error setting admin role:', error);
      setMessage(`Failed to set admin role: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminForm.email || !newAdminForm.name) {
      setMessage('Please fill in all required fields');
      return;
    }

    if (!user) {
      setMessage('Please log in first');
      return;
    }

    if (!isSuperAdmin) {
      setMessage('Only super admins can add new admins');
      return;
    }

    try {
      setLoading(true);
      setMessage('Adding new admin...');

      // Check if user already exists in Firestore
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', newAdminForm.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      let targetUid: string;
      
      if (emailSnapshot.empty) {
        setMessage('User with this email does not exist. They must register first.');
        return;
      } else {
        targetUid = emailSnapshot.docs[0].id;
      }

      // Update the user's admin status
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        isAdmin: true,
        isSuperAdmin: newAdminForm.isSuperAdmin,
        role: newAdminForm.role || 'admin',
        addedBy: user.email,
        addedAt: new Date(),
        contactInfo: {
          phone: newAdminForm.phone || '',
          department: newAdminForm.department || '',
          location: newAdminForm.location || ''
        }
      });

      setMessage(`Admin added successfully! ${newAdminForm.email} is now an admin.`);
      setNewAdminForm({
        email: '',
        name: '',
        role: '',
        isSuperAdmin: false,
        phone: '',
        department: '',
        location: ''
      });

      // Reload admin users
      await loadAdminUsers();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      setMessage(`Failed to add admin: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (adminUid: string, adminEmail: string) => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }

    if (!isSuperAdmin) {
      setMessage('Only super admins can remove admins');
      return;
    }

    if (adminEmail === 'srose@norwalkls.com') {
      setMessage('Cannot remove the primary super admin');
      return;
    }

    try {
      setLoading(true);
      setMessage('Removing admin...');

      const userRef = doc(db, 'users', adminUid);
      await updateDoc(userRef, {
        isAdmin: false,
        isSuperAdmin: false,
        role: 'user',
        removedBy: user.email,
        removedAt: new Date()
      });

      setMessage(`Admin removed successfully! ${adminEmail} is no longer an admin.`);
      
      // Reload admin users
      await loadAdminUsers();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      setMessage(`Failed to remove admin: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!personnelForm.email || !personnelForm.name || !personnelForm.role || !personnelForm.assignedAdmin) {
      setMessage('Please fill in all required fields');
      return;
    }

    if (!user) {
      setMessage('Please log in first');
      return;
    }

    try {
      setLoading(true);
      setMessage('Adding personnel...');

      // Check if user has admin role
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      if (!userData?.isAdmin) {
        setMessage('Access denied. Admin privileges required.');
        return;
      }

      // Get assigned admin email
      const assignedAdminRef = doc(db, 'users', personnelForm.assignedAdmin);
      const assignedAdminDoc = await getDoc(assignedAdminRef);
      const assignedAdminData = assignedAdminDoc.data();

      // Add to Firestore
      await addDoc(collection(db, 'personnel'), {
        ...personnelForm,
        assignedAdminEmail: assignedAdminData?.email || '',
        createdAt: new Date()
      });

      setMessage('Personnel added successfully!');
      setPersonnelForm({
        email: '',
        name: '',
        role: '',
        department: '',
        assignedAdmin: '',
        isActive: true
      });

      // Reload personnel list
      await loadPersonnel();
    } catch (error: any) {
      console.error('Error adding personnel:', error);
      setMessage(`Failed to add personnel: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePersonnelStatus = async (personnelId: string, currentStatus: boolean) => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }

    try {
      // Check if user has admin role
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      if (!userData?.isAdmin) {
        setMessage('Access denied. Admin privileges required.');
        return;
      }

      const personnelRef = doc(db, 'personnel', personnelId);
      await updateDoc(personnelRef, {
        isActive: !currentStatus,
        updatedAt: new Date()
      });
      
      // Reload personnel list
      await loadPersonnel();
      setMessage('Personnel status updated successfully!');
    } catch (error: any) {
      console.error('Error updating personnel status:', error);
      setMessage(`Failed to update status: ${error.message || 'Unknown error'}`);
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }

    try {
      setLoading(true);
      setMessage('Approving user...');

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approvalStatus: 'approved',
        approvedBy: user.email,
        approvedAt: new Date()
      });

      setMessage('User approved successfully!');
      
      // Reload pending users
      await loadPendingUsers();
    } catch (error: any) {
      console.error('Error approving user:', error);
      setMessage(`Failed to approve user: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }

    try {
      setLoading(true);
      setMessage('Rejecting user...');

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approvalStatus: 'rejected',
        rejectedBy: user.email,
        rejectedAt: new Date()
      });

      setMessage('User rejected successfully!');
      
      // Reload pending users
      await loadPendingUsers();
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      setMessage(`Failed to reject user: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
      setMessage('Logged out successfully!');
    } catch (error: any) {
      console.error('Error logging out:', error);
      setMessage(`Failed to log out: ${error.message || 'Unknown error'}`);
    }
  };

  if (!user) {
    return (
      <div className={styles.adminDashboard}>
        <h1>Admin Setup</h1>
        <p>Please log in first.</p>
      </div>
    );
  }

  if (user.email !== 'srose@norwalkls.com') {
    return (
      <div className={styles.adminDashboard}>
        <h1>Admin Setup</h1>
        <p>Access denied. Only srose@norwalkls.com can access this page.</p>
      </div>
    );
  }

  return (
    <div className={styles.adminDashboard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Admin Setup & Personnel Management</h1>
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
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('admin')}
            className={activeTab === 'admin' ? styles.approveBtn : styles.refreshBtn}
            style={{ padding: '10px 20px' }}
          >
            Admin Management
          </button>
          <button
            onClick={() => setActiveTab('personnel')}
            className={activeTab === 'personnel' ? styles.approveBtn : styles.refreshBtn}
            style={{ padding: '10px 20px' }}
          >
            Personnel Management
          </button>
        </div>
      </div>

      {/* Admin Management Tab */}
      {activeTab === 'admin' && (
        <div>
          <div style={{ marginBottom: '30px' }}>
            <h2>Your Admin Status</h2>
            <div style={{ 
              padding: '15px', 
              backgroundColor: isSuperAdmin ? '#d4edda' : '#fff3cd', 
              border: `1px solid ${isSuperAdmin ? '#c3e6cb' : '#ffeaa7'}`,
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <p><strong>Name:</strong> {userData?.companyRep || userData?.name || userData?.displayName || 'Not Set'}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Status:</strong> 
                <span style={{ 
                  color: isSuperAdmin ? '#28a745' : '#856404',
                  fontWeight: 'bold',
                  marginLeft: '5px'
                }}>
                  {isSuperAdmin ? 'Super Admin' : 'Not Admin'}
                </span>
              </p>
              {!isSuperAdmin && (
                <p style={{ marginTop: '10px', fontSize: '14px' }}>
                  Click "Set Admin Role" below to become a Super Admin
                </p>
              )}
            </div>
            
            {!isSuperAdmin && (
          <button 
            onClick={handleSetupAdmin}
            disabled={loading}
                className={styles.approveBtn}
                style={{ marginTop: '10px' }}
          >
            {loading ? 'Setting up...' : 'Set Admin Role'}
          </button>
            )}
          </div>

          {isSuperAdmin && (
            <>
              <div style={{ marginBottom: '30px' }}>
                <h2>Add New Admin</h2>
                <form onSubmit={handleAddNewAdmin} style={{ maxWidth: '500px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newAdminForm.email}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                      className={styles.input}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      placeholder="Enter user's email address"
                      required
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.name}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                      className={styles.input}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      placeholder="Enter user's full name"
                      required
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Role *
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.role}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
                      className={styles.input}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      placeholder="e.g., Operations Manager, Support Admin"
                      required
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Phone
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.phone}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                      className={styles.input}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Department
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.department}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, department: e.target.value })}
                      className={styles.input}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      placeholder="e.g., Operations, Support, IT"
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Location
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.location}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, location: e.target.value })}
                      className={styles.input}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      placeholder="e.g., New York, Remote, HQ"
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={newAdminForm.isSuperAdmin}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, isSuperAdmin: e.target.checked })}
                      />
                      Super Admin (can add/remove other admins)
                    </label>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.approveBtn}
                    style={{ width: '100%' }}
                  >
                    {loading ? 'Adding...' : 'Add New Admin'}
                  </button>
                </form>
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
                          <h3>{adminUser.displayName}</h3>
                          <p><strong>Email:</strong> {adminUser.email}</p>
                          <p><strong>Role:</strong> {adminUser.role || 'Admin'}</p>
                          <p><strong>Status:</strong> 
                            <span style={{ 
                              color: adminUser.isSuperAdmin ? '#007bff' : '#28a745',
                              fontWeight: 'bold',
                              marginLeft: '5px'
                            }}>
                              {adminUser.isSuperAdmin ? 'Super Admin' : 'Admin'}
                            </span>
                          </p>
                          <p><strong>Added By:</strong> {adminUser.addedBy || 'System'}</p>
                          <p><strong>Added At:</strong> {adminUser.addedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                        </div>
                        
                        {isSuperAdmin && adminUser.email !== 'srose@norwalkls.com' && (
                          <div className={styles.userActions}>
                            <button
                              onClick={() => handleRemoveAdmin(adminUser.uid, adminUser.email || 'N/A')}
                              className={styles.rejectBtn}
                            >
                              Remove Admin
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
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
                onClick={loadAdminUsers}
                className={styles.refreshBtn}
              >
                Refresh Admin Users
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personnel Management Tab */}
      {activeTab === 'personnel' && (
        <div>
          <div style={{ marginBottom: '30px' }}>
            <h2>Add New Personnel</h2>
            <form onSubmit={handleAddPersonnel} style={{ maxWidth: '500px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={personnelForm.email}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, email: e.target.value })}
                  className={styles.input}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={personnelForm.name}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, name: e.target.value })}
                  className={styles.input}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Role *
                </label>
                <input
                  type="text"
                  value={personnelForm.role}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, role: e.target.value })}
                  className={styles.input}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Department *
                </label>
                <input
                  type="text"
                  value={personnelForm.department}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, department: e.target.value })}
                  className={styles.input}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Assigned Admin *
                </label>
                <select
                  value={personnelForm.assignedAdmin}
                  onChange={(e) => setPersonnelForm({ ...personnelForm, assignedAdmin: e.target.value })}
                  className={styles.input}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                >
                  <option value="">Select an admin</option>
                  {adminUsers.map((admin) => (
                    <option key={admin.uid} value={admin.uid}>
                      {admin.displayName || admin.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={personnelForm.isActive}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className={styles.approveBtn}
                style={{ width: '100%' }}
              >
                {loading ? 'Adding...' : 'Add Personnel'}
              </button>
            </form>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2>Current Personnel ({personnel.length})</h2>
            {personnel.length === 0 ? (
              <p>No personnel found.</p>
            ) : (
              <div className={styles.usersList}>
                {personnel.map((person) => (
                  <div key={person.id} className={styles.userCard}>
                    <div className={styles.userInfo}>
                      <h3>{person.name}</h3>
                      <p><strong>Email:</strong> {person.email}</p>
                      <p><strong>Role:</strong> {person.role}</p>
                      <p><strong>Department:</strong> {person.department || 'N/A'}</p>
                      <p><strong>Status:</strong> 
                        <span style={{ 
                          color: person.isActive ? '#28a745' : '#dc3545',
                          fontWeight: 'bold',
                          marginLeft: '5px'
                        }}>
                          {person.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                      <p><strong>Assigned Admin:</strong> {person.assignedAdminEmail || 'N/A'}</p>
                      <p><strong>Added:</strong> {person.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                    </div>
                    
                    <div className={styles.userActions}>
                      <button
                        onClick={() => handleTogglePersonnelStatus(person.id, person.isActive)}
                        className={person.isActive ? styles.rejectBtn : styles.approveBtn}
                      >
                        {person.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2>Pending User Approvals ({pendingUsers.length})</h2>
            {loading ? (
              <p>Loading pending users...</p>
            ) : pendingUsers.length === 0 ? (
              <p>No pending user approvals.</p>
            ) : (
              <div className={styles.usersList}>
                {pendingUsers.map((pendingUser) => (
                  <div key={pendingUser.id} className={styles.userCard}>
                    <div className={styles.userInfo}>
                      <h3>{pendingUser.companyName || pendingUser.email}</h3>
                      <p><strong>Email:</strong> {pendingUser.email}</p>
                      <p><strong>User Type:</strong> {pendingUser.userType}</p>
                      <p><strong>Phone:</strong> {pendingUser.phoneNumber || 'N/A'}</p>
                      <p><strong>Status:</strong> 
                        <span style={{ 
                          color: pendingUser.status === 'approved' ? '#28a745' : pendingUser.status === 'rejected' ? '#dc3545' : '#ffc107',
                          fontWeight: 'bold',
                          marginLeft: '5px'
                        }}>
                          {pendingUser.status === 'approved' ? 'Approved' : pendingUser.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                      </p>
                      <p><strong>Created At:</strong> {pendingUser.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                    </div>
                    
                    <div className={styles.userActions}>
                      {pendingUser.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveUser(pendingUser.id)}
                            className={styles.approveBtn}
                            style={{ marginRight: '5px' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(pendingUser.id)}
                            className={styles.rejectBtn}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
          
          {message && (
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
              border: `1px solid ${message.includes('success') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          color: message.includes('success') ? '#155724' : '#721c24'
            }}>
              {message}
        </div>
      )}
    </div>
  );
};

export default AdminSetup; 