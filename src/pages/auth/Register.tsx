import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { setUserRole } from '../../services/authService';
import { db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import styles from './Login.module.css';
import { inviteService } from '../../services/inviteService';

type UserType = 'shipper' | 'carrier' | 'broker';
type BrokerSubType = 'broker_only' | 'broker_carrier';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    userType: 'shipper' as UserType,
    brokerSubType: 'broker_only' as BrokerSubType,
    companyName: '',
    companyRep: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    // Check for invite token in URL
    const params = new URLSearchParams(location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) {
      // Fetch real invite data from backend
      const fetchInviteData = async () => {
        try {
          const inviteData = await inviteService.getInviteData(inviteToken);
          if (inviteData) {
            setFormData(prev => ({
              ...prev,
              userType: 'carrier' as UserType,
              brokerSubType: 'broker_only' as BrokerSubType,
              companyName: inviteData.companyName,
              companyRep: inviteData.companyRep,
              phoneNumber: inviteData.phone,
              email: inviteData.email
            }));
          } else {
            setError('Invalid or expired invitation link.');
          }
        } catch (error) {
          console.error('Error fetching invite data:', error);
          setError('Failed to load invitation data. Please try again.');
        }
      };
      
      fetchInviteData();
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate required fields
    if (!formData.companyName.trim() || !formData.phoneNumber.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
      setError('Please fill out all required fields.');
      setLoading(false);
      return;
    }
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      // Check if this is an invited user
      const params = new URLSearchParams(location.search);
      const inviteToken = params.get('invite');
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Prepare user data
      const userData: any = {
        companyName: formData.companyName,
        companyRep: formData.companyRep,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        userType: formData.userType,
        // Add broker-specific data
        ...(formData.userType === 'broker' && {
          brokerSubType: formData.brokerSubType,
          isBroker: true,
          hasCarrierOperations: formData.brokerSubType === 'broker_carrier'
        }),
        createdAt: new Date()
      };

      // If this is an invited driver, add company hierarchy fields
      if (inviteToken) {
        const inviteData = await inviteService.getInviteData(inviteToken);
        if (inviteData) {
          userData.role = 'driver';
          userData.parentCompanyId = inviteData.inviterId;
          // Mark invite as used
          await inviteService.markInviteAsUsed(inviteToken);
        }
      } else {
        // Regular user registration - set as company owner
        userData.role = 'company_owner';
      }

      // Save user profile info to Firestore
      if (formData.userType === 'broker') {
        // For brokers, use the new collection structure
        const companyId = `company_${userCredential.user.uid}`;
        
        // Create company record
        const companyData = {
          id: companyId,
          name: formData.companyName,
          type: formData.brokerSubType,
          status: 'pending',
          businessType: 'logistics',
          capabilities: ['freight_management', 'brokerage'],
          createdAt: new Date(),
          updatedAt: new Date(),
          verifiedAt: null,
          tags: ['broker_portal', 'new_registration'],
          notes: 'Registered through main registration form'
        };

        // Create company user record
        const companyUserData = {
          id: userCredential.user.uid,
          companyId: companyId,
          email: formData.email,
          companyName: formData.companyName,
          companyRep: formData.companyRep,
          phoneNumber: formData.phoneNumber,
          userType: formData.userType,
          companyUserRole: 'owner',
          role: 'company_owner',
          status: 'pending',
          approvalStatus: 'pending',
          isAdmin: false,
          isSuperAdmin: false,
          permissions: formData.brokerSubType === 'broker_carrier' 
            ? ['admin', 'load_management', 'carrier_management', 'user_management', 'carrier_operations']
            : ['admin', 'load_management', 'carrier_management', 'user_management'],
          accessLevel: 'full',
          createdAt: new Date(),
          updatedAt: new Date(),
          // Add broker-specific data
          brokerSubType: formData.brokerSubType,
          isBroker: true,
          hasCarrierOperations: formData.brokerSubType === 'broker_carrier',
          migratedFrom: {
            collection: 'main_registration',
            migratedAt: new Date(),
            source: 'main_registration_form'
          }
        };

              // Save to new collections
      try {
        await setDoc(doc(db, 'companies', companyId), companyData);
        await setDoc(doc(db, 'companyUsers', userCredential.user.uid), companyUserData);
        console.log('Broker registration successful - data saved to new collections');
      } catch (firestoreError) {
        console.error('Firestore save error:', firestoreError);
        // Clean up the Firebase Auth user since Firestore save failed
        try {
          await deleteUser(userCredential.user);
          console.log('Cleaned up Firebase Auth user after Firestore failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup Firebase Auth user:', cleanupError);
        }
        throw new Error(`Failed to save broker data: ${firestoreError instanceof Error ? firestoreError.message : 'Unknown error'}`);
      }
    } else {
      // For non-brokers, use the old collection structure
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), userData, { merge: true });
        console.log('Non-broker registration successful - data saved to users collection');
      } catch (firestoreError) {
        console.error('Firestore save error:', firestoreError);
        // Clean up the Firebase Auth user since Firestore save failed
        try {
          await deleteUser(userCredential.user);
          console.log('Cleaned up Firebase Auth user after Firestore failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup Firebase Auth user:', cleanupError);
        }
        throw new Error(`Failed to save user data: ${firestoreError instanceof Error ? firestoreError.message : 'Unknown error'}`);
      }
    }

    console.log('Registration successful:', userCredential.user);

    // Show success message instead of navigating to login
    setRegistrationSuccess(true);
  } catch (err) {
    console.error('Registration error:', err);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create account. Please try again.';
    if (err instanceof Error) {
      if (err.message.includes('auth/email-already-in-use')) {
        errorMessage = 'An account with this email already exists. Please use a different email or try logging in.';
      } else if (err.message.includes('Failed to save')) {
        errorMessage = `Registration failed: ${err.message}. Please try again or contact support.`;
      } else if (err.message.includes('auth/weak-password')) {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (err.message.includes('auth/invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      }
    }
    
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
  };

  if (registrationSuccess) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h1>Registration Successful!</h1>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <p>Thank you for registering with Tranzit.io!</p>
            <p>Your account has been created and is pending approval.</p>
            <p>You will receive an email notification once your account is approved.</p>
            <p>This process typically takes 24-48 hours.</p>
          </div>
          <button 
            className={styles.loginButton}
            onClick={() => navigate('/login')}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h1>Create Account</h1>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="userType">Account Type</label>
            <select
              id="userType"
              value={formData.userType}
              onChange={(e) => setFormData({ ...formData, userType: e.target.value as UserType })}
              className={styles.select}
              disabled={!!new URLSearchParams(location.search).get('invite')}
            >
              <option value="shipper">Shipper</option>
              <option value="carrier">Carrier</option>
              <option value="broker">Broker</option>
            </select>
          </div>

          {/* Broker Sub-Type Selection - Only show when Broker is selected */}
          {formData.userType === 'broker' && (
            <div className={styles.inputGroup}>
              <label>Broker/Carrier Option</label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '5px',
                border: '1px solid #dee2e6'
              }}>
                <input
                  type="checkbox"
                  id="brokerCarrierToggle"
                  checked={formData.brokerSubType === 'broker_carrier'}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    brokerSubType: e.target.checked ? 'broker_carrier' : 'broker_only' 
                  })}
                  style={{ margin: '0' }}
                />
                <label htmlFor="brokerCarrierToggle" style={{ margin: '0', cursor: 'pointer' }}>
                  We also operate as a carrier
                </label>
                <span style={{ 
                  marginLeft: 'auto',
                  color: '#6c757d',
                  fontSize: '12px'
                }}>
                  {formData.brokerSubType === 'broker_carrier' ? 'Broker + Carrier' : 'Broker Only'}
                </span>
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="companyName">Company Name<span style={{color: 'red'}}>*</span></label>
            <input
              type="text"
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className={styles.input}
              placeholder="Enter your company name"
              required
              disabled={!!new URLSearchParams(location.search).get('invite')}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="companyRep">Company Representative</label>
            <input
              type="text"
              id="companyRep"
              value={formData.companyRep}
              onChange={(e) => setFormData({ ...formData, companyRep: e.target.value })}
              className={styles.input}
              placeholder="Enter company representative (optional)"
              disabled={!!new URLSearchParams(location.search).get('invite')}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="phoneNumber">Phone Number<span style={{color: 'red'}}>*</span></label>
            <input
              type="tel"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className={styles.input}
              placeholder="Enter your phone number"
              required
              disabled={!!new URLSearchParams(location.search).get('invite')}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email<span style={{color: 'red'}}>*</span></label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={styles.input}
              placeholder="Enter your email"
              required
              disabled={!!new URLSearchParams(location.search).get('invite')}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password<span style={{color: 'red'}}>*</span></label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={styles.input}
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirm Password<span style={{color: 'red'}}>*</span></label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={styles.input}
              placeholder="Confirm your password"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <button 
            type="button" 
            className={styles.registerButton}
            onClick={() => navigate('/login')}
          >
            Already have an account? Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register; 