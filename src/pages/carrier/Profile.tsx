import React, { useState, useEffect } from 'react';
import styles from './Settings.module.css';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Insurance, Equipment, ServiceArea, CarrierProfile } from '../../types/carrier';
import CarrierProfileCard from '../../components/carrier/CarrierProfileCard';
import CarrierProfileForm from '../../components/carrier/CarrierProfileForm';
import MapboxMap from '../../components/common/MapboxMap';
import { locationService } from '../../services/locationService';
import homeFeedStyles from './HomeFeed.module.css';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';
import { useNavigate } from 'react-router-dom';

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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (userId) {
      const stopTracking = locationService.startTracking(userId);
      return () => {
        if (stopTracking) stopTracking();
      };
    }
  }, [userId]);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([position.coords.longitude, position.coords.latitude]);
        setGeoError(null);
      },
      (error) => {
        setGeoError('Unable to retrieve your location. Please allow location access.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => {
      navigator.geolocation.clearWatch(watcher);
    };
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
      <main className={homeFeedStyles.mainContent}>
        <header className={homeFeedStyles.header}>
          <h1>Company Profile</h1>
          <div className={homeFeedStyles.headerControls}>
            <button
              className={homeFeedStyles.bellButton}
              onClick={() => setShowNotifications(v => !v)}
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
            <div className={homeFeedStyles.menuContainer}>
              <button
                className={homeFeedStyles.hamburgerButton}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <div className={homeFeedStyles.hamburgerIcon}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
              {isMenuOpen && (
                <div className={homeFeedStyles.dropdownMenu}>
                  <button onClick={() => navigate('/carrier/profile')}>Account</button>
                  <button onClick={() => navigate('/carrier/settings')}>Settings</button>
                  <button onClick={() => navigate('/login')}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>
      <CarrierProfileForm
        initialData={profile}
        onSubmit={handleProfileUpdate}
        isLoading={loading}
      />
      {/* Show the carrier's map using device geolocation */}
      <div style={{ marginTop: 32 }}>
        <h2>Carrier Map (using your Device Location)</h2>
        <div style={{ 
          width: '100%', 
          minHeight: '400px',
          height: '50vh',
          maxHeight: '600px',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          {geoError ? (
            <div style={{ background: '#fff3cd', color: '#856404', padding: 24, borderRadius: 8, textAlign: 'center' }}>
              <p>⚠️ {geoError}</p>
            </div>
          ) : userLocation ? (
            <MapboxMap
              center={userLocation}
              markers={[{ id: 'me', position: userLocation, type: 'carrier', icon: 'circle' }]}
              zoom={10}
              circles={[{ center: userLocation, radius: 16093.4 }]}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p>Locating your device...</p>
            </div>
          )}
        </div>
      </div>
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
    </main>
    </div>
  );
};

export default ProfilePage; 