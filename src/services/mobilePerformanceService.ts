interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  networkType?: string;
  batteryLevel?: number;
  deviceType: 'mobile' | 'desktop';
  screenSize: string;
  userAgent: string;
  success: boolean;
  error?: string;
}

interface QueryPerformance {
  queryType: string;
  responseTime: number;
  dataSize: number;
  cacheHit: boolean;
  retryCount: number;
}

class MobilePerformanceService {
  private metrics: PerformanceMetric[] = [];
  private queryMetrics: QueryPerformance[] = [];
  private isMobile: boolean;

  constructor() {
    this.isMobile = this.detectMobile();
    this.initializePerformanceObserver();
  }

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  private initializePerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              this.recordMetric({
                operation: entry.name,
                duration: entry.duration,
                deviceType: this.isMobile ? 'mobile' : 'desktop',
                screenSize: `${window.innerWidth}x${window.innerHeight}`,
                userAgent: navigator.userAgent,
                success: true
              });
            }
          }
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Store in localStorage for persistence
    this.persistMetrics();
  }

  recordQueryPerformance(queryData: QueryPerformance): void {
    this.queryMetrics.push(queryData);

    // Keep only last 500 query metrics
    if (this.queryMetrics.length > 500) {
      this.queryMetrics = this.queryMetrics.slice(-500);
    }

    // Store in localStorage
    this.persistQueryMetrics();
  }

  private persistMetrics(): void {
    try {
      localStorage.setItem('mobile_performance_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to persist performance metrics:', error);
    }
  }

  private persistQueryMetrics(): void {
    try {
      localStorage.setItem('mobile_query_metrics', JSON.stringify(this.queryMetrics));
    } catch (error) {
      console.warn('Failed to persist query metrics:', error);
    }
  }

  getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return this.metrics;
  }

  getQueryMetrics(queryType?: string): QueryPerformance[] {
    if (queryType) {
      return this.queryMetrics.filter(q => q.queryType === queryType);
    }
    return this.queryMetrics;
  }

  getAverageResponseTime(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;

    const total = operationMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / operationMetrics.length;
  }

  getSlowQueries(threshold: number = 1000): QueryPerformance[] {
    return this.queryMetrics.filter(q => q.responseTime > threshold);
  }

  getCacheHitRate(): number {
    if (this.queryMetrics.length === 0) return 0;

    const cacheHits = this.queryMetrics.filter(q => q.cacheHit).length;
    return (cacheHits / this.queryMetrics.length) * 100;
  }

  getMobileVsDesktopPerformance(): { mobile: number; desktop: number } {
    const mobileMetrics = this.metrics.filter(m => m.deviceType === 'mobile');
    const desktopMetrics = this.metrics.filter(m => m.deviceType === 'desktop');

    const mobileAvg = mobileMetrics.length > 0 
      ? mobileMetrics.reduce((sum, m) => sum + m.duration, 0) / mobileMetrics.length 
      : 0;
    
    const desktopAvg = desktopMetrics.length > 0 
      ? desktopMetrics.reduce((sum, m) => sum + m.duration, 0) / desktopMetrics.length 
      : 0;

    return { mobile: mobileAvg, desktop: desktopAvg };
  }

  getNetworkPerformanceBreakdown(): Record<string, number> {
    const networkGroups: Record<string, number[]> = {};
    
    this.queryMetrics.forEach(q => {
      const networkType = this.getNetworkType();
      if (!networkGroups[networkType]) {
        networkGroups[networkType] = [];
      }
      networkGroups[networkType].push(q.responseTime);
    });

    const result: Record<string, number> = {};
    Object.entries(networkGroups).forEach(([network, times]) => {
      result[network] = times.reduce((sum, time) => sum + time, 0) / times.length;
    });

    return result;
  }

  private getNetworkType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || connection?.type || 'unknown';
  }

  clearMetrics(): void {
    this.metrics = [];
    this.queryMetrics = [];
    localStorage.removeItem('mobile_performance_metrics');
    localStorage.removeItem('mobile_query_metrics');
  }

  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      queryMetrics: this.queryMetrics,
      summary: {
        totalMetrics: this.metrics.length,
        totalQueries: this.queryMetrics.length,
        cacheHitRate: this.getCacheHitRate(),
        mobileVsDesktop: this.getMobileVsDesktopPerformance(),
        networkBreakdown: this.getNetworkPerformanceBreakdown()
      }
    }, null, 2);
  }

  // Monitor specific operations
  startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operation,
        duration,
        deviceType: this.isMobile ? 'mobile' : 'desktop',
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        success: true
      });
    };
  }

  // Monitor API calls
  monitorApiCall<T>(apiCall: () => Promise<T>, operation: string): Promise<T> {
    const startTime = performance.now();
    
    return apiCall()
      .then(result => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          operation,
          duration,
          deviceType: this.isMobile ? 'mobile' : 'desktop',
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          userAgent: navigator.userAgent,
          success: true
        });
        return result;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          operation,
          duration,
          deviceType: this.isMobile ? 'mobile' : 'desktop',
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          userAgent: navigator.userAgent,
          success: false,
          error: error.message
        });
        throw error;
      });
  }
}

export const mobilePerformanceService = new MobilePerformanceService();
export default mobilePerformanceService; 