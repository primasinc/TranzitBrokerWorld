import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import styles from './Login.module.css';
import modalStyles from '../../components/DocumentModal.module.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationCheckRef = useRef(false);

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationAllowed(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationAllowed(true);
        setLocationError(null);
        console.log('[Location] Success:', pos.coords);
      },
      (error) => {
        setLocationAllowed(false);
        setLocationError('Location access is required. Please allow location in your browser settings and click Retry.');
        console.log('[Location] Error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRetryLocation = () => {
    setLocationError(null);
    setLocationAllowed(true);
    requestLocation();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTwoFAError('');
    setShow2FAModal(false);
    setPendingUser(null);

    try {
      const email = formData.email || 'test@tranzit.com';
      const password = formData.password || 'test123';

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Try to fetch Firestore user data, but don't block login if missing
      let userData: any = null;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        userData = userDoc.data() || null;
        if (!userData) {
          setError('User profile not found. Please register your account.');
          return;
        }
      } catch (firestoreErr) {
        setError('Could not fetch user profile. Please contact support.');
        return;
      }

      // Check approval status
      if (userData.approvalStatus === 'pending') {
        setError('Your account is pending approval. You will receive an email notification once approved.');
        return;
      }

      if (userData.approvalStatus === 'rejected') {
        setError('Your account has been rejected. Please contact support for more information.');
        return;
      }

      // 2FA logic
      if (userData && userData["2faEnabled"]) {
        setShow2FAModal(true);
        setPendingUser({ user, userData });
        setTwoFACode('');
        setTwoFAError('');
        setTwoFALoading(true);
        // Call backend to send code
        try {
          await fetch('/api/auth/send-2fa-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email })
          });
        } catch (err) {
          setTwoFAError('Failed to send 2FA code. Please try again.');
        }
        setTwoFALoading(false);
        return;
      }

      // Normal navigation
      if (userData && userData.userType === 'shipper') {
        navigate('/shipper/dashboard');
        setTimeout(() => {
          if (!locationCheckRef.current) {
            locationCheckRef.current = true;
            requestLocation();
          }
        }, 100);
      } else if (userData && userData.userType === 'carrier') {
        navigate('/carrier/home');
        setTimeout(() => {
          if (!locationCheckRef.current) {
            locationCheckRef.current = true;
            requestLocation();
          }
        }, 100);
      } else {
        setError('User type is invalid. Please contact support.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password');
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFAError('');
    setTwoFALoading(true);
    try {
      const res = await fetch('/api/auth/verify-2fa-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingUser.user.email, code: twoFACode })
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFAError(data.error || 'Invalid code.');
        setTwoFALoading(false);
        return;
      }
      // Success: proceed to dashboard
      if (pendingUser.userData.userType === 'shipper') {
        navigate('/shipper/dashboard');
      } else if (pendingUser.userData.userType === 'carrier') {
        navigate('/carrier/home');
      } else {
        setError('User type is invalid. Please contact support.');
      }
      setShow2FAModal(false);
      setTwoFALoading(false);
    } catch (err) {
      setTwoFAError('Failed to verify code.');
      setTwoFALoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h1>Welcome to Tranzit</h1>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={styles.input}
              placeholder="Enter your email (or leave empty for test account)"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={styles.input}
              placeholder="Enter your password (or leave empty for test account)"
            />
          </div>

          <div className={styles.rememberMe}>
            <label>
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
              />
              Remember me
            </label>
          </div>

          <button type="submit" className={styles.loginButton}>
            Login
          </button>

          <button 
            type="button" 
            className={styles.registerButton}
            onClick={() => navigate('/register')}
          >
            Register
          </button>

          {process.env.NODE_ENV === 'development' && (
            <div className={styles.devNote}>
              <small>
                Development Note: Leave email/password empty to use test account:<br />
                Email: test@tranzit.com<br />
                Password: test123
              </small>
            </div>
          )}
        </form>
      </div>
      {show2FAModal && (
        <div className={modalStyles.modalOverlay}>
          <div className={modalStyles.modal}>
            <h2>Two-Factor Authentication</h2>
            <form onSubmit={handle2FAVerify}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="twofa-code">Enter the 6-digit code sent to your email:</label>
                <input
                  id="twofa-code"
                  type="text"
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value)}
                  maxLength={6}
                  style={{ width: '100%', padding: 8, fontSize: 18, marginTop: 8 }}
                  autoFocus
                />
              </div>
              {twoFAError && <div style={{ color: 'red', marginBottom: 8 }}>{twoFAError}</div>}
              <button type="submit" className={modalStyles.uploadButton} disabled={twoFALoading || twoFACode.length !== 6}>
                {twoFALoading ? 'Verifying...' : 'Verify'}
              </button>
              <button type="button" className={modalStyles.closeButton} onClick={() => setShow2FAModal(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login; 