import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { assignUserTier } from '../utils/subscriptionTierManager';

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

interface CodeChangeRequest {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
}

interface SystemStats {
  totalUsers: number;
  pendingApprovals: number;
  activeAdmins: number;
  totalCarriers: number;
  totalShippers: number;
}

const AdminSetup: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    pendingApprovals: 0,
    activeAdmins: 0,
    totalCarriers: 0,
    totalShippers: 0
  });

  // Form states for code change requests
  const [codeRequestForm, setCodeRequestForm] = useState<CodeChangeRequest>({
    title: '',
    description: '',
    priority: 'medium',
    requestedBy: ''
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPendingUsers(),
        loadAdminUsers(),
        loadSystemStats()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingUsers = async () => {
    try {
      const usersRef = collection(db, 'companyUsers');
      const q = query(usersRef, where('approvalStatus', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const users: any[] = [];
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
      const usersRef = collection(db, 'companyUsers');
      const q = query(usersRef, where('isAdmin', '==', true));
      const querySnapshot = await getDocs(q);
      
      const admins: AdminUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        admins.push({
          uid: doc.id,
          email: data.email || 'N/A',
          displayName: data.displayName || data.companyName || 'N/A',
          isAdmin: data.isAdmin || false,
          isSuperAdmin: data.isSuperAdmin || false,
          role: data.role || 'admin',
          addedBy: data.addedBy || 'N/A',
          addedAt: data.addedAt
        });
      });
      
      setAdminUsers(admins);
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const usersRef = collection(db, 'companyUsers');
      const querySnapshot = await getDocs(usersRef);
      
      let totalUsers = 0;
      let pendingApprovals = 0;
      let activeAdmins = 0;
      let totalCarriers = 0;
      let totalShippers = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalUsers++;
        
        if (data.approvalStatus === 'pending') {
          pendingApprovals++;
        }
        
        if (data.isAdmin) {
          activeAdmins++;
        }
        
        if (data.userType === 'carrier') {
          totalCarriers++;
        }
        
        if (data.userType === 'shipper') {
          totalShippers++;
        }
      });
      
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

  const handleApproveUser = async (userId: string) => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: user?.uid
      });

      // Auto-assign subscription tier
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const tier = userData.userType === 'carrier' ? 'professional' : 
                    userData.companyName && userData.companyName.length > 15 ? 'enterprise' : 'professional';
        await assignUserTier(userId, tier);
      }

      setMessage('✅ User approved successfully!');
      await loadDashboardData();
    } catch (error: any) {
      console.error('Error approving user:', error);
      setMessage(`❌ Failed to approve user: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approvalStatus: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: user?.uid
      });

      setMessage('✅ User rejected successfully!');
      await loadDashboardData();
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      setMessage(`❌ Failed to reject user: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminSetup = async () => {
    setLoading(true);
    try {
      if (!user?.uid) {
        throw new Error('No user ID found');
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isAdmin: true,
        isSuperAdmin: true,
        subscriptionTier: 'admin',
        adminSetupAt: new Date()
      });

      setMessage('✅ Admin privileges granted successfully! You now have full admin access.');
      await loadDashboardData();
    } catch (error: any) {
      console.error('Error setting up admin:', error);
      setMessage(`❌ Failed to setup admin: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCodeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const requestData = {
        ...codeRequestForm,
        requestedBy: user?.email || 'Unknown',
        status: 'pending',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'codeChangeRequests'), requestData);
      setCodeRequestForm({
        title: '',
        description: '',
        priority: 'medium',
        requestedBy: ''
      });

      setMessage('✅ Code change request submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting code request:', error);
      setMessage(`❌ Failed to submit request: ${error.message || 'Unknown error'}`);
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
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px'
        }}>
          <h1 style={{ color: '#333', marginBottom: '20px' }}>🔒 Admin Setup</h1>
          <p style={{ color: '#666' }}>Please log in first to access admin features.</p>
        </div>
      </div>
    );
  }

  if (user.email !== 'srose@norwalkls.com') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px'
        }}>
          <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>🚫 Access Denied</h1>
          <p style={{ color: '#666' }}>Only authorized administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ 
            color: '#333', 
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            ⚙️ Admin Setup & Management
          </h1>
          <p style={{ 
            color: '#666', 
            margin: '0',
            fontSize: '16px'
          }}>
            System administration and user management
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => navigate('/admin')}
            style={{
              backgroundColor: '#495057',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#343a40';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#495057';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '16px' }}>←</span>
            Back to Dashboard
          </button>
          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#c82333';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc3545';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div style={{
          backgroundColor: message.includes('✅') ? '#d4edda' : message.includes('❌') ? '#f8d7da' : '#d1ecf1',
          color: message.includes('✅') ? '#155724' : message.includes('❌') ? '#721c24' : '#0c5460',
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : message.includes('❌') ? '#f5c6cb' : '#bee5eb'}`,
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {/* Quick Admin Setup Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            color: '#333', 
            margin: '0 0 16px 0',
            fontSize: '20px',
            fontWeight: '600'
          }}>
            🚀 Quick Admin Setup
          </h2>
          <p style={{ 
            color: '#666', 
            margin: '0 0 20px 0',
            fontSize: '14px'
          }}>
            Click the button below to grant yourself full admin privileges:
          </p>
          <button 
            onClick={handleQuickAdminSetup}
            disabled={loading}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#0056b3';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#007bff';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? '⏳ Setting up...' : '👑 Make Me Admin'}
          </button>
        </div>

        {/* System Statistics */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            color: '#333', 
            margin: '0 0 20px 0',
            fontSize: '20px',
            fontWeight: '600'
          }}>
            📊 System Statistics
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '16px' 
          }}>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#007bff',
                marginBottom: '4px'
              }}>
                {systemStats.totalUsers}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Users</div>
            </div>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#ffc107',
                marginBottom: '4px'
              }}>
                {systemStats.pendingApprovals}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Pending Approvals</div>
            </div>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#28a745',
                marginBottom: '4px'
              }}>
                {systemStats.activeAdmins}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Active Admins</div>
            </div>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#17a2b8',
                marginBottom: '4px'
              }}>
                {systemStats.totalCarriers}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Carriers</div>
            </div>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              gridColumn: 'span 2'
            }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#6f42c1',
                marginBottom: '4px'
              }}>
                {systemStats.totalShippers}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Shippers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending User Approvals */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ 
          color: '#333', 
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          ⏳ Pending User Approvals ({pendingUsers.length})
        </h2>
        {pendingUsers.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No pending approvals</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {pendingUsers.map((user) => (
              <div key={user.id} style={{
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8f9fa'
              }}>
                <div>
                  <h4 style={{ 
                    color: '#333', 
                    margin: '0 0 8px 0',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    {user.companyName}
                  </h4>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <p style={{ margin: '4px 0' }}>📧 {user.email}</p>
                    <p style={{ margin: '4px 0' }}>🏢 Type: {user.userType}</p>
                    <p style={{ margin: '4px 0' }}>📞 {user.phoneNumber}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleApproveUser(user.id)}
                    disabled={loading}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      opacity: loading ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = '#218838';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = '#28a745';
                      }
                    }}
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleRejectUser(user.id)}
                    disabled={loading}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      opacity: loading ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = '#c82333';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = '#dc3545';
                      }
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Users */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ 
          color: '#333', 
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          👥 Admin Users ({adminUsers.length})
        </h2>
        {adminUsers.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No admin users found</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {adminUsers.map((admin) => (
              <div key={admin.uid} style={{
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#f8f9fa'
              }}>
                <h4 style={{ 
                  color: '#333', 
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  {admin.displayName}
                </h4>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <p style={{ margin: '4px 0' }}>📧 {admin.email}</p>
                  <p style={{ margin: '4px 0' }}>🎭 Role: {admin.role}</p>
                  <p style={{ margin: '4px 0' }}>
                    👑 Super Admin: {admin.isSuperAdmin ? '✅ Yes' : '❌ No'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code Change Requests */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ 
          color: '#333', 
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          📝 Submit Code Change Request
        </h2>
        <form onSubmit={handleSubmitCodeRequest} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label htmlFor="title" style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333',
              fontWeight: '500'
            }}>
              Title:
            </label>
            <input
              type="text"
              id="title"
              value={codeRequestForm.title}
              onChange={(e) => setCodeRequestForm({...codeRequestForm, title: e.target.value})}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label htmlFor="description" style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333',
              fontWeight: '500'
            }}>
              Description:
            </label>
            <textarea
              id="description"
              value={codeRequestForm.description}
              onChange={(e) => setCodeRequestForm({...codeRequestForm, description: e.target.value})}
              required
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label htmlFor="priority" style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333',
              fontWeight: '500'
            }}>
              Priority:
            </label>
            <select
              id="priority"
              value={codeRequestForm.priority}
              onChange={(e) => setCodeRequestForm({...codeRequestForm, priority: e.target.value as any})}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1,
              justifySelf: 'start'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#0056b3';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#007bff';
              }
            }}
          >
            {loading ? '⏳ Submitting...' : '📤 Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSetup; 