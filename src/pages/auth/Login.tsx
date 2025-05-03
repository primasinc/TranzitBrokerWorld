import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import styles from './Login.module.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // For development/testing, use these credentials if fields are empty
      const email = formData.email || 'test@tranzit.com';
      const password = formData.password || 'test123';

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get custom claims (role)
      const idTokenResult = await user.getIdTokenResult();
      const role = idTokenResult.claims.role;

      // Route based on role
      if (role === 'shipper') {
        navigate('/shipper/dashboard');
      } else if (role === 'carrier') {
        navigate('/carrier/home');
      } else {
        setError('No role assigned to this user.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password');
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
    </div>
  );
};

export default Login; 