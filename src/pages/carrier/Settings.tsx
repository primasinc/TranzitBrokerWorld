import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Settings.module.css';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';

interface Profile {
  companyName: string;
  mcNumber: string;
  dotNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  paymentInfo: {
    accountName: string;
    accountType: string;
    bankName: string;
    routingNumber: string;
    accountNumber: string;
  };
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'payment' | 'security'>('profile');
  const [profile, setProfile] = useState<Profile>({
    companyName: "ABC Trucking LLC",
    mcNumber: "MC-123456",
    dotNumber: "DOT-789012",
    email: "contact@abctrucking.com",
    phone: "(555) 123-4567",
    address: "123 Transport Ave",
    city: "Chicago",
    state: "IL",
    zip: "60601",
    notificationPreferences: {
      email: true,
      sms: true,
      push: false
    },
    paymentInfo: {
      accountName: "ABC Trucking LLC",
      accountType: "Business Checking",
      bankName: "Chase Bank",
      routingNumber: "•••••••••",
      accountNumber: "••••••••4567"
    }
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    loadTime: number;
    renderTime: number;
  }>({ loadTime: 0, renderTime: 0 });
  const isCompanyAdmin = true; // Set to false for dependent/driver users
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Mobile optimization hooks
  const { networkInfo, batteryInfo, isLowBandwidth, isLowBattery } = useMobileOptimization();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice || window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    
    const measurePerformance = () => {
      const loadTime = performance.now() - startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: Math.round(loadTime)
      }));
    };

    // Measure initial render
    const renderTime = performance.now() - startTime;
    setPerformanceMetrics(prev => ({
      ...prev,
      renderTime: Math.round(renderTime)
    }));

    // Measure full load time
    window.addEventListener('load', measurePerformance);
    
    return () => {
      window.removeEventListener('load', measurePerformance);
    };
  }, []);

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle profile update logic
    alert('Profile updated successfully!');
  };

  const handleNotificationUpdate = (type: keyof typeof profile.notificationPreferences) => {
    setProfile(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [type]: !prev.notificationPreferences[type]
      }
    }));
  };

  const handleProfile = () => {
    navigate('/carrier/profile');
  };

  const handleSettings = () => {
    navigate('/carrier/settings');
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!inviteName || !invitePhone || !inviteEmail) {
      setInviteError('All fields are required.');
      return;
    }
    // TODO: Implement backend invite logic here
    setInviteSuccess('Invitation sent to ' + inviteEmail);
    setShowInviteForm(false);
    setInviteName('');
    setInvitePhone('');
    setInviteEmail('');
  };

  return (
    <div className={styles.container}>
      {/* Mobile Performance Indicator */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 234, 255, 0.9)',
          color: '#0f2027',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          zIndex: 1000,
          fontFamily: 'monospace'
        }}>
          {performanceMetrics.loadTime}ms | {isLowBandwidth ? 'Slow' : 'Fast'}
        </div>
      )}

      <div className={styles.headerCard}>
        <header className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <h1>Settings</h1>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.bellButton}
              onClick={() => setShowNotifications(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative' }}
              tabIndex={0}
              aria-label="Notifications"
            >
              <span role="img" aria-label="Notifications">🔔</span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'red',
                  color: 'white',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  zIndex: 10
                }}>{unreadCount}</span>
              )}
            </button>
            {showNotifications && <NotificationsTray onClose={() => setShowNotifications(false)} />}
            <div className={styles.menuContainer}>
              <button 
                className={styles.hamburgerButton}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                <div className={styles.hamburgerIcon}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
              {isMenuOpen && (
                <div className={styles.dropdownMenu}>
                  <button onClick={handleProfile}>Account</button>
                  <button onClick={handleSettings}>Settings</button>
                  <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Performance Alert */}
      {(isLowBandwidth || isLowBattery) && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '12px',
          fontSize: '12px',
          color: '#856404',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📱</span>
          <span>
            {isLowBandwidth ? 'Slow connection detected - Optimized loading enabled' : ''}
            {isLowBattery ? 'Low battery detected - Reduced data loading' : ''}
          </span>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'notifications' ? styles.active : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'payment' ? styles.active : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            Payment Settings
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'security' ? styles.active : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
        </div>

        <div className={styles.mainContent}>
          {activeTab === 'notifications' && (
            <div className={styles.section}>
              <h2>Notification Preferences</h2>
              <div className={styles.notificationSettings}>
                <div className={styles.notificationOption}>
                  <div>
                    <h3>Email Notifications</h3>
                    <p>Receive updates and alerts via email</p>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox"
                      checked={profile.notificationPreferences.email}
                      onChange={() => handleNotificationUpdate('email')}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <div className={styles.notificationOption}>
                  <div>
                    <h3>SMS Notifications</h3>
                    <p>Receive updates and alerts via text message</p>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox"
                      checked={profile.notificationPreferences.sms}
                      onChange={() => handleNotificationUpdate('sms')}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <div className={styles.notificationOption}>
                  <div>
                    <h3>Push Notifications</h3>
                    <p>Receive updates and alerts via push notifications</p>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox"
                      checked={profile.notificationPreferences.push}
                      onChange={() => handleNotificationUpdate('push')}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className={styles.section}>
              <h2>Payment Settings</h2>
              <div className={styles.paymentInfo}>
                <div className={styles.formGroup}>
                  <label>Account Name</label>
                  <input type="text" value={profile.paymentInfo.accountName} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Account Type</label>
                  <input type="text" value={profile.paymentInfo.accountType} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Bank Name</label>
                  <input type="text" value={profile.paymentInfo.bankName} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Routing Number</label>
                  <input type="text" value={profile.paymentInfo.routingNumber} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Account Number</label>
                  <input type="text" value={profile.paymentInfo.accountNumber} readOnly />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className={styles.section}>
              <h2>Security</h2>
              <div className={styles.securitySettings}>
                <div className={styles.securityOption}>
                  <div>
                    <h3>Two-Factor Authentication</h3>
                    <p>Require a second authentication step for added security.</p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={e => setTwoFactorEnabled(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                {isCompanyAdmin && (
                  <div className={styles.additionalDriversSection}>
                    <h3>Additional Drivers</h3>
                    <button className={styles.addButton} onClick={() => setShowInviteForm(true)}>Add Driver</button>
                    {showInviteForm && (
                      <form className={styles.inviteForm} onSubmit={handleSendInvite} style={{ marginTop: 16 }}>
                        <div className={styles.formGroup}>
                          <label>Name</label>
                          <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} required />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Phone Number</label>
                          <input type="text" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} required />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Email</label>
                          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                        </div>
                        {inviteError && <div className={styles.error}>{inviteError}</div>}
                        <button type="submit" className={styles.submitButton}>Send Invitation</button>
                        <button type="button" className={styles.cancelButton} onClick={() => setShowInviteForm(false)}>Cancel</button>
                      </form>
                    )}
                    {inviteSuccess && <div className={styles.success}>{inviteSuccess}</div>}
                  </div>
                )}
                {!isCompanyAdmin && (
                  <div className={styles.dependentNotice}>
                    <p>You are currently a driver for a carrier company. To add drivers, you must leave your current company and create your own account.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings; 