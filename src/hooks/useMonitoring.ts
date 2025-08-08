import { useEffect, useCallback } from 'react';
import { monitoringService, monitorOperation, recordError, recordPerformance } from '../services/monitoringService';
import { useAuth } from '../contexts/AuthContext';

export const useMonitoring = () => {
  const { user } = useAuth();

  // Monitor component lifecycle
  useEffect(() => {
    const componentName = 'Component'; // This will be overridden by individual components
    
    // Record component mount
    recordPerformance(`${componentName}_mount`, 0, true);
    
    return () => {
      // Record component unmount
      recordPerformance(`${componentName}_unmount`, 0, true);
    };
  }, []);

  // Monitor async operations
  const monitorAsyncOperation = useCallback(<T>(
    operation: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return monitorOperation(operation, asyncFn);
  }, []);

  // Monitor user interactions
  const monitorUserAction = useCallback((action: string, context?: any) => {
    recordPerformance(`user_action_${action}`, 0, true);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Monitoring] User action: ${action}`, context);
    }
  }, []);

  // Monitor errors
  const monitorError = useCallback((error: Error, context?: any) => {
    recordError(error.message, error.stack, {
      ...context,
      userId: user?.uid
    });
  }, [user?.uid]);

  // Get monitoring data
  const getMonitoringData = useCallback(() => {
    return {
      summary: monitoringService.getSummary(),
      performanceMetrics: monitoringService.getPerformanceMetrics(),
      errorMetrics: monitoringService.getErrorMetrics()
    };
  }, []);

  // Enable/disable monitoring
  const setMonitoringEnabled = useCallback((enabled: boolean) => {
    monitoringService.setEnabled(enabled);
  }, []);

  return {
    monitorAsyncOperation,
    monitorUserAction,
    monitorError,
    getMonitoringData,
    setMonitoringEnabled
  };
};
