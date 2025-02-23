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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Settings</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Company Profile
          </button>
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
          {activeTab === 'profile' && (
            <div className={styles.section}>
              <h2>Company Profile</h2>
              <form onSubmit={handleProfileUpdate}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Company Name</label>
                    <input 
                      type="text" 
                      value={profile.companyName}
                      onChange={(e) => setProfile({...profile, companyName: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>MC Number</label>
                    <input 
                      type="text" 
                      value={profile.mcNumber}
                      onChange={(e) => setProfile({...profile, mcNumber: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>DOT Number</label>
                    <input 
                      type="text" 
                      value={profile.dotNumber}
                      onChange={(e) => setProfile({...profile, dotNumber: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input 
                      type="email" 
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Phone</label>
                    <input 
                      type="tel" 
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Address</label>
                    <input 
                      type="text" 
                      value={profile.address}
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>City</label>
                    <input 
                      type="text" 
                      value={profile.city}
                      onChange={(e) => setProfile({...profile, city: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>State</label>
                    <input 
                      type="text" 
                      value={profile.state}
                      onChange={(e) => setProfile({...profile, state: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>ZIP Code</label>
                    <input 
                      type="text" 
                      value={profile.zip}
                      onChange={(e) => setProfile({...profile, zip: e.target.value})}
                    />
                  </div>
                </div>
                <button type="submit" className={styles.saveButton}>Save Changes</button>
              </form>
            </div>
          )}

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
                <button className={styles.updateButton}>Update Payment Information</button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className={styles.section}>
              <h2>Security Settings</h2>
              <div className={styles.securitySettings}>
                <div className={styles.securityOption}>
                  <h3>Change Password</h3>
                  <button className={styles.actionButton}>Update Password</button>
                </div>
                <div className={styles.securityOption}>
                  <h3>Two-Factor Authentication</h3>
                  <button className={styles.actionButton}>Enable 2FA</button>
                </div>
                <div className={styles.securityOption}>
                  <h3>Login History</h3>
                  <button className={styles.actionButton}>View History</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings; 