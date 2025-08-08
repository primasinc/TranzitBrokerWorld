// Non-intrusive monitoring service
interface MonitoringConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sampleRate: number; // 0-1, percentage of events to log
}

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  userId?: string;
  userAgent: string;
}

interface ErrorMetric {
  error: string;
  stack?: string;
  timestamp: number;
  userId?: string;
  userAgent: string;
  context?: any;
}

class MonitoringService {
  private config: MonitoringConfig = {
    enabled: true,
    logLevel: 'info',
    sampleRate: 0.1 // Only log 10% of events to avoid performance impact
  };

  private metrics: PerformanceMetric[] = [];
  private errors: ErrorMetric[] = [];
  private maxMetrics = 1000; // Keep only last 1000 metrics
  private maxErrors = 500; // Keep only last 500 errors

  // Safe initialization - won't affect existing code
  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Only initialize if monitoring is enabled
    if (!this.config.enabled) return;

    // Set up error boundary for unhandled errors
    window.addEventListener('error', (event) => {
      this.recordError(event.error?.message || 'Unknown error', event.error?.stack);
    });

    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('Unhandled Promise Rejection', undefined, { reason: event.reason });
    });

    // Periodic cleanup to prevent memory leaks
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Record performance metrics without affecting the operation
  recordPerformance(operation: string, duration: number, success: boolean, error?: string) {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) return;

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
      error,
      userAgent: navigator.userAgent
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Monitoring] ${operation}: ${duration.toFixed(2)}ms (${success ? 'success' : 'failed'})`);
    }
  }

  // Record errors without affecting error handling
  recordError(error: string, stack?: string, context?: any) {
    if (!this.config.enabled) return;

    const errorMetric: ErrorMetric = {
      error,
      stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      context
    };

    this.errors.push(errorMetric);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Monitoring] Error: ${error}`, context);
    }
  }

  // Monitor API calls without affecting the API call itself
  monitorApiCall<T>(apiCall: () => Promise<T>, operation: string): Promise<T> {
    const startTime = performance.now();
    
    return apiCall()
      .then(result => {
        const duration = performance.now() - startTime;
        this.recordPerformance(operation, duration, true);
        return result;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        this.recordPerformance(operation, duration, false, error.message);
        this.recordError(error.message, error.stack);
        throw error; // Re-throw to maintain existing error handling
      });
  }

  // Get performance metrics (for analysis)
  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Get error metrics (for analysis)
  getErrorMetrics(): ErrorMetric[] {
    return [...this.errors];
  }

  // Get summary statistics
  getSummary() {
    const successfulOps = this.metrics.filter(m => m.success);
    const failedOps = this.metrics.filter(m => !m.success);

    return {
      totalOperations: this.metrics.length,
      successfulOperations: successfulOps.length,
      failedOperations: failedOps.length,
      averageResponseTime: successfulOps.length > 0 
        ? successfulOps.reduce((sum, m) => sum + m.duration, 0) / successfulOps.length 
        : 0,
      totalErrors: this.errors.length,
      lastError: this.errors[this.errors.length - 1]
    };
  }

  // Cleanup old data to prevent memory leaks
  private cleanup() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  // Update configuration
  updateConfig(newConfig: Partial<MonitoringConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
export const monitoringService = new MonitoringService();

// Export monitoring hooks for easy use
export const monitorOperation = <T>(
  operation: string, 
  fn: () => Promise<T>
): Promise<T> => {
  return monitoringService.monitorApiCall(fn, operation);
};

export const recordError = (error: string, stack?: string, context?: any) => {
  monitoringService.recordError(error, stack, context);
};

export const recordPerformance = (
  operation: string, 
  duration: number, 
  success: boolean, 
  error?: string
) => {
  monitoringService.recordPerformance(operation, duration, success, error);
};
