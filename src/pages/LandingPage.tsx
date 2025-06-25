import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';
import { db } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import logoImg from '../assets/logo.png'; // Place your logo image in src/assets/logo.png
import { useMobileOptimization } from '../hooks/useMobileOptimization';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    loadTime: number;
    renderTime: number;
  }>({ loadTime: 0, renderTime: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // Mobile optimization hooks
  const { networkInfo, batteryInfo, isLowBandwidth, isLowBattery } = useMobileOptimization();

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice || window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const startTime = performance.now();
    
    const measurePerformance = () => {
      const loadTime = performance.now() - startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: Math.round(loadTime)
      }));
    };

    // Measure initial render
    const renderTime = performance.now() - startTime;
    setPerformanceMetrics(prev => ({
      ...prev,
      renderTime: Math.round(renderTime)
    }));

    // Measure full load time
    window.addEventListener('load', measurePerformance);
    
    return () => {
      window.removeEventListener('load', measurePerformance);
    };
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      await addDoc(collection(db, 'subscribers'), { email, createdAt: new Date() });
      setSubscribed(true);
      setEmail('');
    } catch (err) {
      setError('There was an error subscribing. Please try again.');
    }
  };

  return (
    <div className={styles.landingContainer}>
      {/* Mobile Performance Indicator */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 234, 255, 0.9)',
          color: '#0f2027',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          zIndex: 1000,
          fontFamily: 'monospace'
        }}>
          {performanceMetrics.loadTime}ms | {isLowBandwidth ? 'Slow' : 'Fast'}
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.logo}><img src={logoImg} alt="Tranzit.io Logo" className={styles.logoImg} /> Tranzit.io</div>
        <nav className={styles.nav}>
          <a className={styles.menuLink} href="/home">Home</a>
          <a className={styles.menuLink} href="/technology">Technology</a>
          <a className={styles.menuLink} href="/about">About Us</a>
          <button className={styles.navButton} onClick={() => navigate('/register')}>Register</button>
          <button className={styles.navButton} onClick={() => navigate('/login')}>Login</button>
        </nav>
      </header>
      <main className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1>Modern Logistics, Simplified</h1>
          <p>Tranzit.io streamlines your shipping, carrier, and logistics operations with real-time visibility and automation.</p>
          <button className={styles.ctaButton} onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </main>
      <section className={styles.pointsSection}>
        <div className={styles.pointsHeaderRow}>
          <div className={styles.pointBlock}>
            <h3>Accessibility</h3>
            <p>We are in the process of preparing our system for demonstration mode. Customer service will become available once the system goes live. For any inquiries or interest in our product, please reach out to srose@venturesmr.com or use our "Contact Us" form.</p>
          </div>
          <div className={styles.pointBlock}>
            <h3>Technology</h3>
            <p>Tranzit.io's technology is designed to streamline the connection between shippers and independent carriers, eliminating the uncertainties often introduced by intermediaries. Our software enables shippers to easily locate qualified independent carriers for immediate freight transportation needs. Additionally, through Tranzit's innovative technology, users can monitor the entire lifecycle of the transportation process, ensuring transparency and efficiency from start to finish.</p>
          </div>
          <div className={styles.pointBlock}>
            <h3>The need for change.</h3>
            <p>The freight transportation sector is facing challenges that necessitate enhancements. We are convinced that enhancing transportation requires a dependable network of operators upon whom shippers can rely and establish partnerships, similar to those they have with their existing brokerage firms. Such an approach is crucial for tackling prevalent issues like misinformation, theft, and other problems impacting the industry.</p>
          </div>
        </div>
      </section>
      <section className={styles.subscribeSection}>
        <h2>Stay Connected</h2>
        <p>Get updates and be the first to know when Tranzit.io goes live.</p>
        <form className={styles.subscribeForm} onSubmit={handleSubscribe}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={styles.emailInput}
            disabled={subscribed}
            style={{ color: '#222' }}
          />
          <button type="submit" className={styles.subscribeButton} disabled={subscribed}>
            {subscribed ? 'Subscribed!' : 'Subscribe'}
          </button>
        </form>
        {error && <div className={styles.errorMsg}>{error}</div>}
        {subscribed && <div className={styles.successMsg}>Thank you for subscribing!</div>}
      </section>
      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>
          <a href="/refund-policy" target="_blank" rel="noopener noreferrer">Refund Policy</a>
          <a href="/accessibility" target="_blank" rel="noopener noreferrer">Accessibility Statement</a>
        </div>
        <p>&copy; {new Date().getFullYear()} Tranzit.io. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage; 