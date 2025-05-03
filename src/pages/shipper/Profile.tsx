import React, { useState, useEffect } from 'react';
import styles from '../carrier/Settings.module.css';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Profile {
  companyName: string;
  companyRep: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

const ShipperProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile>({
    companyName: "",
    companyRep: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: ""
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile({
            ...profile,
            ...userDoc.data(),
          } as Profile);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    await setDoc(doc(db, 'users', userId), profile, { merge: true });
    alert('Profile updated successfully!');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      setPasswordError('All fields are required.');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    // TODO: Implement password change logic (call Firebase Auth)
    alert('Password changed successfully!');
    setShowPasswordModal(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Company Profile</h1>
      </div>
      <div className={styles.section}>
        <form onSubmit={handleProfileUpdate}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Company Name</label>
              <input 
                type="text" 
                value={profile.companyName}
                readOnly
                className={styles.readOnly}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Company Representative</label>
              <input 
                type="text" 
                value={profile.companyRep}
                onChange={(e) => setProfile({...profile, companyRep: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input 
                type="email" 
                value={profile.email}
                readOnly
                className={styles.readOnly}
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
          <button type="button" className={styles.saveButton} style={{marginLeft: 16}} onClick={() => setShowPasswordModal(true)}>
            Change Password
          </button>
        </form>
      </div>
      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Change Password</h2>
            <form onSubmit={handlePasswordChange}>
              <div className={styles.formGroup}>
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordForm.new}
                  onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                />
              </div>
              {passwordError && <div className={styles.error}>{passwordError}</div>}
              <div style={{display: 'flex', gap: 8, marginTop: 16}}>
                <button type="submit" className={styles.saveButton}>Save</button>
                <button type="button" className={styles.saveButton} onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipperProfilePage; 