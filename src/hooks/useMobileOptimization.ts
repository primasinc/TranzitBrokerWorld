import { useState, useEffect, useCallback } from 'react';

interface MobileOptimizationConfig {
  enableOfflineMode?: boolean;
  enableLowBandwidthMode?: boolean;
  enableBatteryOptimization?: boolean;
  cacheDuration?: number;
}

interface NetworkInfo {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

interface BatteryInfo {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

export const useMobileOptimization = (config: MobileOptimizationConfig = {}) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({ isOnline: navigator.onLine });
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);
  const [isLowBattery, setIsLowBattery] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Network detection
  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setNetworkInfo({
        isOnline: navigator.onLine,
        connectionType: connection?.type,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt
      });

      // Determine if low bandwidth
      if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
        setIsLowBandwidth(true);
      } else {
        setIsLowBandwidth(false);
      }
    };

    // Initial check
    updateNetworkInfo();

    // Listen for network changes
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  // Battery detection
  useEffect(() => {
    const getBatteryInfo = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          
          const updateBatteryInfo = () => {
            const info: BatteryInfo = {
              level: battery.level,
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime
            };
            
            setBatteryInfo(info);
            setIsLowBattery(battery.level < 0.2 && !battery.charging);
          };

          updateBatteryInfo();
          battery.addEventListener('levelchange', updateBatteryInfo);
          battery.addEventListener('chargingchange', updateBatteryInfo);

          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo);
            battery.removeEventListener('chargingchange', updateBatteryInfo);
          };
        }
      } catch (error) {
        console.warn('Battery API not supported:', error);
      }
    };

    getBatteryInfo();
  }, []);

  // Offline mode detection
  useEffect(() => {
    if (config.enableOfflineMode) {
      setIsOfflineMode(!networkInfo.isOnline);
    }
  }, [networkInfo.isOnline, config.enableOfflineMode]);

  // Optimize image loading based on network conditions
  const getOptimizedImageUrl = useCallback((originalUrl: string, quality: 'high' | 'medium' | 'low' = 'medium') => {
    if (isLowBandwidth || isLowBattery) {
      // Return lower quality image or placeholder
      return originalUrl.replace(/\.(jpg|jpeg|png)/, '_thumb.$1');
    }
    return originalUrl;
  }, [isLowBandwidth, isLowBattery]);

  // Optimize data fetching based on conditions
  const shouldFetchData = useCallback((dataType: string) => {
    if (isOfflineMode) {
      return false; // Don't fetch when offline
    }
    
    if (isLowBattery && dataType !== 'critical') {
      return false; // Only fetch critical data when battery is low
    }
    
    if (isLowBandwidth && dataType === 'non-essential') {
      return false; // Skip non-essential data on slow connections
    }
    
    return true;
  }, [isOfflineMode, isLowBattery, isLowBandwidth]);

  // Get optimal page size based on conditions
  const getOptimalPageSize = useCallback((defaultSize: number = 10) => {
    if (isLowBandwidth) {
      return Math.max(5, Math.floor(defaultSize / 2));
    }
    if (isLowBattery) {
      return Math.max(5, Math.floor(defaultSize * 0.7));
    }
    return defaultSize;
  }, [isLowBandwidth, isLowBattery]);

  // Performance monitoring
  const measurePerformance = useCallback((operation: string, startTime: number) => {
    const duration = performance.now() - startTime;
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
    }
    
    // Store performance metrics
    const metrics = JSON.parse(localStorage.getItem('mobile_performance_metrics') || '{}');
    if (!metrics[operation]) {
      metrics[operation] = [];
    }
    metrics[operation].push({
      duration,
      timestamp: Date.now(),
      networkType: networkInfo.effectiveType,
      batteryLevel: batteryInfo?.level
    });
    
    // Keep only last 100 entries
    if (metrics[operation].length > 100) {
      metrics[operation] = metrics[operation].slice(-100);
    }
    
    localStorage.setItem('mobile_performance_metrics', JSON.stringify(metrics));
    
    return duration;
  }, [networkInfo.effectiveType, batteryInfo?.level]);

  return {
    networkInfo,
    batteryInfo,
    isLowBandwidth,
    isLowBattery,
    isOfflineMode,
    getOptimizedImageUrl,
    shouldFetchData,
    getOptimalPageSize,
    measurePerformance
  };
}; 