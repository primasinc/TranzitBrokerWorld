import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const OAuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing OAuth response...');

  useEffect(() => {
    // Parse query params
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const error = params.get('error');
    const provider = params.get('provider');

    if (error) {
      setMessage(`OAuth failed: ${error}`);
      return;
    }
    if (code && provider) {
      // In a real app, send code and provider to backend to exchange for access token
      // Example: await fetch('/api/oauth/callback', { method: 'POST', body: JSON.stringify({ code, provider }) })
      setMessage(`OAuth successful! Code: ${code} (Provider: ${provider})`);
      // Optionally, redirect or update user profile here
      setTimeout(() => navigate('/carrier/profile'), 2000);
    } else {
      setMessage('Missing OAuth code or provider.');
    }
  }, [location, navigate]);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>ELD OAuth Connection</h2>
      <p>{message}</p>
    </div>
  );
};

export default OAuthCallback; 