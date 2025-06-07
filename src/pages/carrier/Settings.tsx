import React, { useState } from 'react';
import styles from './Settings.module.css';

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
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const isCompanyAdmin = true; // Set to false for dependent/driver users

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

  const handleProfile = () => {};
  const handleSettings = () => {};
  const handleLogout = () => {};

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
      <div className={styles.headerCard}>
        <header className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <h1>Settings</h1>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.bellButton}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative' }}
              tabIndex={0}
              aria-label="Notifications"
            >
              <span role="img" aria-label="Notifications">🔔</span>
            </button>
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
              {/* Security settings go here */}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings; 