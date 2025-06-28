import React, { useState } from 'react';
import styles from '../carrier/Settings.module.css';

const ShipperSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'payment' | 'security'>('notifications');
  // Notification toggles
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    sms: true,
    push: false,
  });
  // Payment fields
  const [paymentInfo, setPaymentInfo] = useState({
    accountName: '',
    accountType: '',
    bankName: '',
    routingNumber: '',
    accountNumber: '',
  });
  // Security
  const [teamMembers, setTeamMembers] = useState<{ name: string; email: string; role: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: '' });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [routingBank, setRoutingBank] = useState('');
  const [routingLoading, setRoutingLoading] = useState(false);
  const [accountNumber2, setAccountNumber2] = useState('');
  const [accountMatchError, setAccountMatchError] = useState('');
  const [showAccount, setShowAccount] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [showAppModal, setShowAppModal] = useState(false);
  const paymentApps = [
    { name: 'SAP', description: 'Connect your SAP ERP or S/4HANA account' },
    { name: 'Quicken', description: 'Connect your Quicken account' },
    { name: 'QuickBooks', description: 'Connect your QuickBooks account' },
    { name: 'Oracle NetSuite', description: 'Connect your NetSuite ERP account' },
    { name: 'Microsoft Dynamics 365', description: 'Connect your Dynamics 365 account' },
    { name: 'Sage Intacct', description: 'Connect your Sage Intacct account' },
    { name: 'Zelle', description: 'Connect your Zelle account' },
    { name: 'PayPal', description: 'Connect your PayPal account' },
    { name: 'Square', description: 'Connect your Square account' },
    { name: 'Plaid', description: 'Connect your Plaid account' },
    { name: 'Other', description: 'Connect another payment provider' },
  ];
  const [appSearch, setAppSearch] = useState('');
  const [connectMsg, setConnectMsg] = useState('');

  const handleNotificationUpdate = (type: keyof typeof notificationPreferences) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Routing number lookup
  const handleRoutingChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPaymentInfo({ ...paymentInfo, routingNumber: value });
    setRoutingBank('');
    setAccountMatchError('');
    if (value.length === 9) {
      setRoutingLoading(true);
      try {
        const res = await fetch(`https://www.routingnumbers.info/api/data.json?rn=${value}`);
        const data = await res.json();
        if (data.code === 200) {
          setRoutingBank(data.customer_name);
        } else {
          setRoutingBank('Unknown or invalid routing number');
        }
      } catch {
        setRoutingBank('Error looking up bank');
      }
      setRoutingLoading(false);
    }
  };

  // Account number verification
  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentInfo({ ...paymentInfo, accountNumber: e.target.value });
    if (accountNumber2 && e.target.value !== accountNumber2) {
      setAccountMatchError('Account numbers do not match');
    } else {
      setAccountMatchError('');
    }
  };
  const handleAccountNumber2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountNumber2(e.target.value);
    if (paymentInfo.accountNumber && paymentInfo.accountNumber !== e.target.value) {
      setAccountMatchError('Account numbers do not match');
    } else {
      setAccountMatchError('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess('');
    if (!paymentInfo.accountName || !paymentInfo.accountType || !paymentInfo.bankName || !paymentInfo.routingNumber || !paymentInfo.accountNumber) {
      setAccountMatchError('All fields are required.');
      return;
    }
    if (accountNumber2 !== paymentInfo.accountNumber) {
      setAccountMatchError('Account numbers do not match');
      return;
    }
    setAccountMatchError('');
    setSaveSuccess('Payment settings saved!');
  };

  // Helper to generate a random state string
  function generateState(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerCard}>
        <header className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <h1>Settings</h1>
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
                      checked={notificationPreferences.email}
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
                      checked={notificationPreferences.sms}
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
                      checked={notificationPreferences.push}
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
              <form onSubmit={handleSave}>
                <div className={styles.paymentInfo}>
                  <div className={styles.formGroup}>
                    <label>Account Name</label>
                    <input type="text" value={paymentInfo.accountName} onChange={e => setPaymentInfo({ ...paymentInfo, accountName: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Account Type</label>
                    <input type="text" value={paymentInfo.accountType} onChange={e => setPaymentInfo({ ...paymentInfo, accountType: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Bank Name</label>
                    <input type="text" value={paymentInfo.bankName} onChange={e => setPaymentInfo({ ...paymentInfo, bankName: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Routing Number</label>
                    <input type="text" value={paymentInfo.routingNumber} onChange={handleRoutingChange} maxLength={9} />
                    {routingLoading && <div style={{ color: '#888', fontSize: 14 }}>Looking up bank...</div>}
                    {routingBank && <div style={{ color: routingBank.includes('Unknown') || routingBank.includes('Error') ? 'red' : '#007bff', fontSize: 15, marginTop: 4 }}>{routingBank}</div>}
                  </div>
                  <div className={styles.formGroup}>
                    <label>Account Number</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showAccount ? 'text' : 'password'}
                        value={paymentInfo.accountNumber}
                        onChange={handleAccountNumberChange}
                        style={{ paddingRight: 36 }}
                      />
                      <span
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                        onClick={() => setShowAccount(v => !v)}
                        aria-label={showAccount ? 'Hide account number' : 'Show account number'}
                      >
                        {showAccount ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="12" rx="8" ry="5" />
                            <circle cx="12" cy="12" r="2" />
                            <line x1="6" y1="6" x2="18" y2="18" stroke="#d32f2f" strokeWidth="2.5" />
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="12" rx="8" ry="5" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Account Number (Verify)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showAccount ? 'text' : 'password'}
                        value={accountNumber2}
                        onChange={handleAccountNumber2Change}
                        style={{ paddingRight: 36 }}
                      />
                      <span
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                        onClick={() => setShowAccount(v => !v)}
                        aria-label={showAccount ? 'Hide account number' : 'Show account number'}
                      >
                        {showAccount ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="12" rx="8" ry="5" />
                            <circle cx="12" cy="12" r="2" />
                            <line x1="6" y1="6" x2="18" y2="18" stroke="#d32f2f" strokeWidth="2.5" />
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="12" rx="8" ry="5" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                        )}
                      </span>
                    </div>
                    {accountMatchError && <div style={{ color: 'red', fontSize: 14 }}>{accountMatchError}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                  <button type="submit" className={styles.saveButton}>Save</button>
                  <button type="button" className={styles.actionButton} onClick={() => setShowAppModal(true)}>
                    Add AP/AR Software
                  </button>
                </div>
                <div style={{ marginTop: 32 }}></div>
                {saveSuccess && <div style={{ color: 'green', marginTop: 12 }}>{saveSuccess}</div>}
              </form>
              {showAppModal && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modal}>
                    <h3>Connect Payment App</h3>
                    <input
                      type="text"
                      placeholder="Search payment app (e.g. Quicken, Stripe)"
                      value={appSearch}
                      onChange={e => {
                        setAppSearch(e.target.value);
                        setConnectMsg('');
                      }}
                      style={{ width: '100%', marginBottom: 16, padding: 8, fontSize: 16 }}
                    />
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {appSearch.trim() && paymentApps.filter(app =>
                        app.name.toLowerCase().includes(appSearch.toLowerCase())
                      ).slice(0, 3).map(app => (
                        <li key={app.name} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <strong>{app.name}</strong>
                              <div style={{ fontSize: 13, color: '#666' }}>{app.description}</div>
                            </div>
                            {app.name === 'QuickBooks' ? (
                              <button
                                className={styles.actionButton}
                                style={{ marginLeft: 16 }}
                                onClick={() => {
                                  const clientId = 'ABKbtJRwFm2tbNqsY2njUvsDqWNHp03xwvz7o8QCyW2KmA00m3';
                                  const redirectUri = encodeURIComponent('http://localhost:3001/api/quickbooks/oauth-callback');
                                  const scope = encodeURIComponent('com.intuit.quickbooks.accounting');
                                  const state = generateState();
                                  const url = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                Connect
                              </button>
                            ) : (
                              <button
                                className={styles.actionButton}
                                style={{ marginLeft: 16 }}
                                onClick={() => setConnectMsg(`${app.name} integration coming soon!`)}
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                      {appSearch.trim() && paymentApps.filter(app =>
                        app.name.toLowerCase().includes(appSearch.toLowerCase())
                      ).length === 0 && (
                        <li style={{ color: '#888', fontSize: 15 }}>No results found.</li>
                      )}
                    </ul>
                    {connectMsg && <div style={{ color: '#007bff', marginTop: 12 }}>{connectMsg}</div>}
                    <button className={styles.closeButton} onClick={() => { setShowAppModal(false); setAppSearch(''); setConnectMsg(''); }} style={{ marginTop: 16 }}>Close</button>
                  </div>
                </div>
              )}
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
                <div className={styles.additionalDriversSection}>
                  <h3>Team Members</h3>
                  <button className={styles.addButton} onClick={() => setShowAddModal(true)}>Add Team Member</button>
                  {showAddModal && (
                    <form className={styles.inviteForm} onSubmit={e => {
                      e.preventDefault();
                      setInviteError('');
                      setInviteSuccess('');
                      if (!newMember.name || !newMember.email || !newMember.role) {
                        setInviteError('All fields are required.');
                        return;
                      }
                      setTeamMembers([...teamMembers, newMember]);
                      setInviteSuccess('Team member added!');
                      setNewMember({ name: '', email: '', role: '' });
                      setShowAddModal(false);
                    }} style={{ marginTop: 16 }}>
                      <div className={styles.formGroup}>
                        <label>Name</label>
                        <input type="text" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Email</label>
                        <input type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Role</label>
                        <input type="text" value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} required />
                      </div>
                      {inviteError && <div className={styles.error}>{inviteError}</div>}
                      <button type="submit" className={styles.submitButton}>Add</button>
                      <button type="button" className={styles.cancelButton} onClick={() => setShowAddModal(false)}>Cancel</button>
                    </form>
                  )}
                  {inviteSuccess && <div className={styles.success}>{inviteSuccess}</div>}
                  <ul style={{ marginTop: 16 }}>
                    {teamMembers.map((member, idx) => (
                      <li key={idx} style={{ marginBottom: 8 }}>
                        <strong>{member.name}</strong> ({member.role}) - <span style={{ color: '#666' }}>{member.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipperSettings; 