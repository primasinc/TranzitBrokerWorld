import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './AdminDashboard.module.css';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

interface User {
  id: string;
  email: string;
  companyName: string;
  phoneNumber: string;
  userType: string;
  status: string;
  approvalStatus: string;
  createdAt: any;
  // New fields for company hierarchy (optional for backward compatibility)
  role?: 'company_owner' | 'driver';
  parentCompanyId?: string;
}

interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  availability?: 'online' | 'offline' | 'busy';
  lastActive?: any;
}

interface SystemStats {
  totalUsers: number;
  pendingApprovals: number;
  activeAdmins: number;
  totalCarriers: number;
  totalShippers: number;
}

interface CodeChangeRequest {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  requestedBy: string;
}

const AdminDashboard: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    pendingApprovals: 0,
    activeAdmins: 0,
    totalCarriers: 0,
    totalShippers: 0
  });
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'admins' | 'shippers' | 'carriers'>('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form states for code change requests
  const [codeRequestForm, setCodeRequestForm] = useState<CodeChangeRequest>({
    title: '',
    description: '',
    priority: 'medium',
    requestedBy: ''
  });

  // States for shippers and carriers tabs
  const [shippers, setShippers] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      loadDashboardData();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      if (userData?.isAdmin) {
        setIsAdmin(true);
      }
      if (userData?.isSuperAdmin) {
        setIsSuperAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPendingUsers(),
        loadAdminUsers(),
        loadSystemStats(),
        loadShippers(),
        loadCarriers()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingUsers = async () => {
    try {
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
    }
  };

  const loadAdminUsers = async () => {
    try {
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
          availability: data.availability || 'offline',
          lastActive: data.lastActive
        });
      });
      
      setAdminUsers(adminUsersList);
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const usersRef = collection(db, 'users');
      
      // Get total users
      const totalUsersSnapshot = await getDocs(usersRef);
      const totalUsers = totalUsersSnapshot.size;
      
      // Get pending approvals
      const pendingQuery = query(usersRef, where('approvalStatus', '==', 'pending'));
      const pendingSnapshot = await getDocs(pendingQuery);
      const pendingApprovals = pendingSnapshot.size;
      
      // Get active admins
      const adminQuery = query(usersRef, where('isAdmin', '==', true));
      const adminSnapshot = await getDocs(adminQuery);
      const activeAdmins = adminSnapshot.size;
      
      // Get carriers and shippers
      const carrierQuery = query(usersRef, where('userType', '==', 'carrier'));
      const carrierSnapshot = await getDocs(carrierQuery);
      const totalCarriers = carrierSnapshot.size;
      
      const shipperQuery = query(usersRef, where('userType', '==', 'shipper'));
      const shipperSnapshot = await getDocs(shipperQuery);
      const totalShippers = shipperSnapshot.size;
      
      setSystemStats({
        totalUsers,
        pendingApprovals,
        activeAdmins,
        totalCarriers,
        totalShippers
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const loadShippers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const shipperQuery = query(usersRef, where('userType', '==', 'shipper'));
      const querySnapshot = await getDocs(shipperQuery);
      
      const shippersList: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        shippersList.push({
          id: doc.id,
          ...data
        });
      });
      
      setShippers(shippersList);
    } catch (error) {
      console.error('Error loading shippers:', error);
    }
  };

  const loadCarriers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const carrierQuery = query(usersRef, where('userType', '==', 'carrier'));
      const querySnapshot = await getDocs(carrierQuery);
      
      const carriersList: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        carriersList.push({
          id: doc.id,
          ...data
        });
      });
      
      setCarriers(carriersList);
    } catch (error) {
      console.error('Error loading carriers:', error);
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (!user) {
      alert('Please log in first');
      return;
    }

    if (!isAdmin) {
      alert('Access denied. Admin privileges required.');
      return;
    }

    try {
      setApproving(userId);
      
      // Update user status to approved
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'approved',
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: user?.email
      });
      
      // Update local state
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      await loadSystemStats(); // Refresh stats
      
      alert('User approved successfully!');
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user. Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!user) {
      alert('Please log in first');
      return;
    }

    if (!isAdmin) {
      alert('Access denied. Admin privileges required.');
      return;
    }

    try {
      setApproving(userId);
      
      // Update user status to rejected
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'rejected',
        approvalStatus: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: user?.email
      });
      
      // Update local state
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      await loadSystemStats(); // Refresh stats
      
      alert('User rejected successfully!');
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user. Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleSubmitCodeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!codeRequestForm.title || !codeRequestForm.description) {
      alert('Please fill in all required fields');
      return;
    }

    if (!user) {
      alert('Please log in first');
      return;
    }

    if (!isAdmin) {
      alert('Access denied. Admin privileges required.');
      return;
    }

    try {
      // Add code change request to Firestore
      await addDoc(collection(db, 'codeChangeRequests'), {
        ...codeRequestForm,
        requestedBy: user.email,
        status: 'pending',
        createdAt: new Date()
      });

      alert('Code change request submitted successfully!');
      setCodeRequestForm({
        title: '',
        description: '',
        priority: 'medium',
        requestedBy: ''
      });
    } catch (error: any) {
      console.error('Error submitting code request:', error);
      alert(`Failed to submit request: ${error.message || 'Unknown error'}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Filter users based on search term and state
  useEffect(() => {
    let filtered = [...shippers];
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedState) {
      filtered = filtered.filter(user => user.state === selectedState);
    }
    
    setFilteredUsers(filtered);
  }, [shippers, searchTerm, selectedState]);

  if (!user) {
    return <div className={styles.adminDashboard}>Please log in to access the admin dashboard.</div>;
  }

  if (!isAdmin) {
    return <div className={styles.adminDashboard}>Access denied. Admin privileges required.</div>;
  }

  if (loading) {
    return <div className={styles.adminDashboard}>Loading dashboard...</div>;
  }

  return (
    <div className={styles.adminDashboard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Admin Dashboard</h1>
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
      
      {/* Navigation Tabs */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #eee' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: activeTab === 'overview' ? '#007bff' : '#f8f9fa',
              color: activeTab === 'overview' ? 'white' : '#333',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0'
            }}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: activeTab === 'approvals' ? '#007bff' : '#f8f9fa',
              color: activeTab === 'approvals' ? 'white' : '#333',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Pending Approvals ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: activeTab === 'admins' ? '#007bff' : '#f8f9fa',
              color: activeTab === 'admins' ? 'white' : '#333',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Admin Team ({adminUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('shippers')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: activeTab === 'shippers' ? '#007bff' : '#f8f9fa',
              color: activeTab === 'shippers' ? 'white' : '#333',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Shippers ({shippers.length})
          </button>
          <button
            onClick={() => setActiveTab('carriers')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: activeTab === 'carriers' ? '#007bff' : '#f8f9fa',
              color: activeTab === 'carriers' ? 'white' : '#333',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Carriers ({carriers.length})
          </button>
        </div>
      </div>

      {/* System Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <h2>System Overview</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>{systemStats.totalUsers}</h3>
              <p style={{ margin: '0', fontWeight: 'bold' }}>Total Users</p>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>{systemStats.pendingApprovals}</h3>
              <p style={{ margin: '0', fontWeight: 'bold' }}>Pending Approvals</p>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#d4edda', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>{systemStats.activeAdmins}</h3>
              <p style={{ margin: '0', fontWeight: 'bold' }}>Active Admins</p>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#e2e3e5', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#383d41' }}>{systemStats.totalCarriers}</h3>
              <p style={{ margin: '0', fontWeight: 'bold' }}>Carriers</p>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#e2e3e5', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#383d41' }}>{systemStats.totalShippers}</h3>
              <p style={{ margin: '0', fontWeight: 'bold' }}>Shippers</p>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3>Code Change Requests</h3>
            <form onSubmit={handleSubmitCodeRequest} style={{ maxWidth: '600px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={codeRequestForm.title}
                  onChange={(e) => setCodeRequestForm({ ...codeRequestForm, title: e.target.value })}
                  className={styles.input}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Enter request title"
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Description
                </label>
                <textarea
                  value={codeRequestForm.description}
                  onChange={(e) => setCodeRequestForm({ ...codeRequestForm, description: e.target.value })}
                  className={styles.input}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px' }}
                  placeholder="Describe the code change needed"
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Priority
                </label>
                <select
                  value={codeRequestForm.priority}
                  onChange={(e) => setCodeRequestForm({ ...codeRequestForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className={styles.input}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <button
                type="submit"
                className={styles.approveBtn}
                style={{ width: '100%' }}
              >
                Submit Code Change Request
              </button>
            </form>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => navigate('/admin-setup')}
                className={styles.approveBtn}
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Admin Setup
              </button>
              <button 
                onClick={() => navigate('/admin-management')}
                className={styles.approveBtn}
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Admin Management
              </button>
              <button 
                onClick={loadDashboardData}
                className={styles.refreshBtn}
              >
                Refresh Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approvals Tab */}
      {activeTab === 'approvals' && (
        <div>
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
        </div>
      )}

      {/* Admin Team Tab */}
      {activeTab === 'admins' && (
        <div>
          <h2>Admin Team ({adminUsers.length})</h2>
          
          {adminUsers.length === 0 ? (
            <p>No admin users found.</p>
          ) : (
            <div className={styles.usersList}>
              {adminUsers.map((adminUser) => (
                <div key={adminUser.uid} className={styles.userCard}>
                  <div className={styles.userInfo}>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shippers Tab */}
      {activeTab === 'shippers' && (
        <div>
          <h2>Shippers ({shippers.length})</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search shippers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px', marginRight: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All States</option>
              <option value="CA">California</option>
              <option value="TX">Texas</option>
              <option value="NY">New York</option>
              {/* Add more states as needed */}
            </select>
          </div>
          
          {filteredUsers.length === 0 ? (
            <p>No shippers found.</p>
          ) : (
            <div className={styles.usersList}>
              {filteredUsers.map((shipper) => (
                <div key={shipper.id} className={styles.userCard}>
                  <div className={styles.userInfo}>
                    <h3>{shipper.companyName}</h3>
                    <p><strong>Email:</strong> {shipper.email}</p>
                    <p><strong>Phone:</strong> {shipper.phoneNumber || 'N/A'}</p>
                    <p><strong>State:</strong> {shipper.state || 'N/A'}</p>
                    <p><strong>Status:</strong> 
                      <span style={{ 
                        color: shipper.approvalStatus === 'approved' ? '#28a745' : 
                               shipper.approvalStatus === 'rejected' ? '#dc3545' : '#ffc107',
                        fontWeight: 'bold',
                        marginLeft: '5px'
                      }}>
                        {shipper.approvalStatus || 'pending'}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Carriers Tab */}
      {activeTab === 'carriers' && (
        <div>
          <h2>Carriers ({carriers.length})</h2>
          
          {carriers.length === 0 ? (
            <p>No carriers found.</p>
          ) : (
            <div className={styles.usersList}>
              {carriers.map((carrier) => (
                <div key={carrier.id} className={styles.userCard}>
                  <div className={styles.userInfo}>
                    <h3>{carrier.companyName}</h3>
                    <p><strong>Email:</strong> {carrier.email}</p>
                    <p><strong>Phone:</strong> {carrier.phoneNumber || 'N/A'}</p>
                    <p><strong>Status:</strong> 
                      <span style={{ 
                        color: carrier.approvalStatus === 'approved' ? '#28a745' : 
                               carrier.approvalStatus === 'rejected' ? '#dc3545' : '#ffc107',
                        fontWeight: 'bold',
                        marginLeft: '5px'
                      }}>
                        {carrier.approvalStatus || 'pending'}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 