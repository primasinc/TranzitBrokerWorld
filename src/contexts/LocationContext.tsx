import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface LocationContextType {
  location: [number, number] | null;
  error: string | null;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown';
  requestLocation: () => void;
  retry: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');

  const checkPermission = useCallback(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
      }).catch(() => setPermissionState('unknown'));
    } else {
      setPermissionState('unknown');
    }
  }, []);

  const requestLocation = useCallback(() => {
    setError(null);
    checkPermission();
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.');
      setLocation(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation([pos.coords.longitude, pos.coords.latitude]);
        setError(null);
        checkPermission();
      },
      (err) => {
        setError('Location access is required. Please allow location in your browser settings and click Retry.');
        setLocation(null);
        checkPermission();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [checkPermission]);

  const retry = useCallback(() => {
    setError(null);
    setLocation(null);
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    requestLocation();
    // Optionally, re-request on focus
    const onFocus = () => requestLocation();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [requestLocation]);

  return (
    <LocationContext.Provider value={{ location, error, permissionState, requestLocation, retry }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used within a LocationProvider');
  return ctx;
}; 