import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { setUserRole } from '../../services/authService';
import styles from './Login.module.css';

type UserType = 'shipper' | 'carrier';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userType: 'shipper' as UserType,
    companyName: '',
    companyRep: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Set user role using Firebase Functions
      await setUserRole(formData.userType);

      // TODO: Optionally, save company info to Firestore here

      console.log('Registered user:', userCredential.user);

      // Navigate based on user type
      if (formData.userType === 'shipper') {
        navigate('/shipper/dashboard');
      } else {
        navigate('/carrier/home');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            >
              <option value="shipper">Shipper</option>
              <option value="carrier">Carrier</option>
            </select>
          </div>

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