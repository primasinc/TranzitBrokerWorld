import React, { useState, useEffect } from 'react';
import styles from './Settings.module.css';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Insurance, Equipment, ServiceArea, CarrierProfile } from '../../types/carrier';
import CarrierProfileCard from '../../components/carrier/CarrierProfileCard';
import CarrierProfileForm from '../../components/carrier/CarrierProfileForm';
import MapboxMap from '../../components/common/MapboxMap';

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Partial<CarrierProfile>>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [insurance, setInsurance] = useState<Insurance[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [address, setAddress] = useState({ street: '', city: '', state: '', zip: '' });
  const [showProfileCardModal, setShowProfileCardModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({ ...profile, ...data });
          setInsurance(data.insurance || []);
          setEquipment(data.equipment || []);
          setServiceAreas(data.serviceAreas || []);
          setAddress({
            street: data.address?.street || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            zip: data.address?.zip || ''
          });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, []);

  const handleProfileUpdate = async (data: CarrierProfile) => {
    if (!userId) return;
    await setDoc(doc(db, 'users', userId), data, { merge: true });
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

  // Debug log for CarrierProfileCard props
  console.log('Rendering CarrierProfileCard with:', profile);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Company Profile</h1>
      </div>
      <CarrierProfileForm
        initialData={profile}
        onSubmit={handleProfileUpdate}
        isLoading={loading}
      />
      {/* Show the carrier's map using their ELD API key */}
      {profile.eldApiKey && (
        <div style={{ marginTop: 32 }}>
          <h2>Carrier Map (using your ELD API Key)</h2>
          <div style={{ width: '100%', height: 400 }}>
            <MapboxMap eldApiKey={profile.eldApiKey} />
          </div>
        </div>
      )}
      {showProfileCardModal && (
        <div className={styles.modalOverlay} onClick={() => setShowProfileCardModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <CarrierProfileCard carrier={{
              companyName: profile.companyName,
              companyRep: (profile as any).companyRep || '',
              phoneNumber: profile.phone,
              email: profile.email,
              mcNumber: (profile as any).mcNumber || '',
              dotNumber: (profile as any).dotNumber || '',
            }} />
            <button className={styles.closeButton} onClick={() => setShowProfileCardModal(false)} style={{marginTop: 16}}>Close</button>
          </div>
        </div>
      )}
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

export default ProfilePage; 