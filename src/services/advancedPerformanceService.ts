// Advanced Performance Monitoring Service
// Phase 5: Enhanced Performance Monitoring & Optimization

interface PerformanceMetric {
  timestamp: number;
  type: 'response_time' | 'memory_usage' | 'cpu_usage' | 'error_rate' | 'user_interaction';
  value: number;
  context: string;
  userId?: string;
  sessionId?: string;
}

interface PerformanceBaseline {
  metric: string;
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
  lastUpdated: number;
}

interface OptimizationRecommendation {
  id: string;
  type: 'caching' | 'code_splitting' | 'lazy_loading' | 'memory_optimization' | 'database_optimization';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  estimatedImprovement: number; // percentage
  priority: number;
  createdAt: number;
  status: 'pending' | 'implemented' | 'ignored';
}

interface PerformanceReport {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: number;
  endDate: number;
  metrics: {
    averageResponseTime: number;
    averageMemoryUsage: number;
    errorRate: number;
    userSatisfaction: number;
    totalRequests: number;
    cacheHitRate: number;
  };
  trends: {
    responseTime: 'improving' | 'stable' | 'degrading';
    memoryUsage: 'improving' | 'stable' | 'degrading';
    errorRate: 'improving' | 'stable' | 'degrading';
  };
  recommendations: OptimizationRecommendation[];
  alerts: string[];
}

class AdvancedPerformanceService {
  private metrics: PerformanceMetric[] = [];
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private recommendations: OptimizationRecommendation[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private memoryThreshold = 50; // MB
  private responseTimeThreshold = 2000; // ms
  private errorRateThreshold = 0.05; // 5%

  constructor() {
    this.initializeBaselines();
    this.startMonitoring();
  }

  private initializeBaselines(): void {
    // Initialize baseline metrics
    this.baselines.set('response_time', {
      metric: 'response_time',
      average: 500,
      min: 100,
      max: 2000,
      standardDeviation: 300,
      lastUpdated: Date.now()
    });

    this.baselines.set('memory_usage', {
      metric: 'memory_usage',
      average: 30,
      min: 10,
      max: 80,
      standardDeviation: 15,
      lastUpdated: Date.now()
    });

    this.baselines.set('error_rate', {
      metric: 'error_rate',
      average: 0.02,
      min: 0,
      max: 0.1,
      standardDeviation: 0.02,
      lastUpdated: Date.now()
    });
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.analyzePerformance();
      this.generateRecommendations();
    }, 30000); // Every 30 seconds

    console.log('🔍 Advanced Performance Monitoring Started');
  }

  private collectSystemMetrics(): void {
    // Collect memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memory_usage', memory.usedJSHeapSize / 1024 / 1024, 'system');
    }

    // Collect CPU usage (simulated)
    const cpuUsage = Math.random() * 100;
    this.recordMetric('cpu_usage', cpuUsage, 'system');

    // Monitor for memory leaks
    this.detectMemoryLeaks();
  }

  private detectMemoryLeaks(): void {
    const recentMetrics = this.metrics
      .filter(m => m.type === 'memory_usage' && m.timestamp > Date.now() - 300000) // Last 5 minutes
      .map(m => m.value);

    if (recentMetrics.length > 10) {
      const trend = this.calculateTrend(recentMetrics);
      if (trend > 0.1) { // 10% increase over 5 minutes
        this.createAlert('Potential memory leak detected', 'high');
      }
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  public recordMetric(
    type: PerformanceMetric['type'],
    value: number,
    context: string,
    userId?: string,
    sessionId?: string
  ): void {
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      type,
      value,
      context,
      userId,
      sessionId
    };

    this.metrics.push(metric);
    
    // Keep only last 24 hours of metrics
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > oneDayAgo);

    // Check for performance alerts
    this.checkPerformanceAlerts(metric);
  }

  private checkPerformanceAlerts(metric: PerformanceMetric): void {
    const baseline = this.baselines.get(metric.type);
    if (!baseline) return;

    const threshold = baseline.average + (2 * baseline.standardDeviation);
    
    if (metric.value > threshold) {
      this.createAlert(
        `${metric.type.replace('_', ' ')} exceeded threshold: ${metric.value.toFixed(2)}`,
        'medium'
      );
    }
  }

  private createAlert(message: string, severity: 'low' | 'medium' | 'high'): void {
    console.warn(`🚨 Performance Alert (${severity}): ${message}`);
    
    // Store alert for reporting
    const alert = {
      message,
      severity,
      timestamp: Date.now()
    };
    
    // In a real implementation, this would be sent to a monitoring service
    // For now, we'll store it locally
    if (!(window as any).performanceAlerts) {
      (window as any).performanceAlerts = [];
    }
    (window as any).performanceAlerts.push(alert);
  }

  private analyzePerformance(): void {
    // Update baselines based on recent data
    this.updateBaselines();
    
    // Analyze trends
    this.analyzeTrends();
  }

  private updateBaselines(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    ['response_time', 'memory_usage', 'error_rate'].forEach(metricType => {
      const recentMetrics = this.metrics
        .filter(m => m.type === metricType && m.timestamp > oneHourAgo)
        .map(m => m.value);

      if (recentMetrics.length > 10) {
        const average = recentMetrics.reduce((sum, val) => sum + val, 0) / recentMetrics.length;
        const min = Math.min(...recentMetrics);
        const max = Math.max(...recentMetrics);
        const variance = recentMetrics.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / recentMetrics.length;
        const standardDeviation = Math.sqrt(variance);

        this.baselines.set(metricType, {
          metric: metricType,
          average,
          min,
          max,
          standardDeviation,
          lastUpdated: now
        });
      }
    });
  }

  private analyzeTrends(): void {
    // Analyze performance trends over the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    ['response_time', 'memory_usage', 'error_rate'].forEach(metricType => {
      const recentMetrics = this.metrics
        .filter(m => m.type === metricType && m.timestamp > oneHourAgo)
        .map(m => m.value);

      if (recentMetrics.length > 20) {
        const trend = this.calculateTrend(recentMetrics);
        const baseline = this.baselines.get(metricType);
        
        if (baseline && Math.abs(trend) > baseline.standardDeviation * 0.5) {
          const direction = trend > 0 ? 'increasing' : 'decreasing';
          console.log(`📈 ${metricType} is ${direction} (trend: ${trend.toFixed(3)})`);
        }
      }
    });
  }

  private generateRecommendations(): void {
    const currentRecommendations = this.recommendations.filter(r => r.status === 'pending');
    
    // Generate new recommendations based on current performance
    this.generateCachingRecommendations();
    this.generateMemoryOptimizationRecommendations();
    this.generateCodeOptimizationRecommendations();
    
    // Remove old recommendations
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.recommendations = this.recommendations.filter(r => 
      r.status !== 'ignored' || r.createdAt > oneWeekAgo
    );
  }

  private generateCachingRecommendations(): void {
    const responseTimeBaseline = this.baselines.get('response_time');
    if (!responseTimeBaseline) return;

    if (responseTimeBaseline.average > 1000) {
      this.addRecommendation({
        type: 'caching',
        title: 'Implement Advanced Caching Strategy',
        description: 'Response times are high. Consider implementing Redis caching for frequently accessed data.',
        impact: 'high',
        effort: 'medium',
        estimatedImprovement: 40,
        priority: 1
      });
    }
  }

  private generateMemoryOptimizationRecommendations(): void {
    const memoryBaseline = this.baselines.get('memory_usage');
    if (!memoryBaseline) return;

    if (memoryBaseline.average > 50) {
      this.addRecommendation({
        type: 'memory_optimization',
        title: 'Optimize Memory Usage',
        description: 'Memory usage is high. Consider implementing lazy loading and memory cleanup.',
        impact: 'medium',
        effort: 'low',
        estimatedImprovement: 25,
        priority: 2
      });
    }
  }

  private generateCodeOptimizationRecommendations(): void {
    const errorRateBaseline = this.baselines.get('error_rate');
    if (!errorRateBaseline) return;

    if (errorRateBaseline.average > 0.05) {
      this.addRecommendation({
        type: 'code_splitting',
        title: 'Implement Code Splitting',
        description: 'Error rate is elevated. Consider code splitting to reduce bundle size and improve reliability.',
        impact: 'medium',
        effort: 'medium',
        estimatedImprovement: 30,
        priority: 2
      });
    }
  }

  private addRecommendation(data: Omit<OptimizationRecommendation, 'id' | 'createdAt' | 'status'>): void {
    const recommendation: OptimizationRecommendation = {
      ...data,
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      status: 'pending'
    };

    // Check if similar recommendation already exists
    const existing = this.recommendations.find(r => 
      r.type === data.type && r.status === 'pending'
    );

    if (!existing) {
      this.recommendations.push(recommendation);
      console.log(`💡 New optimization recommendation: ${data.title}`);
    }
  }

  public getPerformanceReport(period: 'daily' | 'weekly' | 'monthly' = 'daily'): PerformanceReport {
    const now = Date.now();
    const startDate = period === 'daily' ? now - 24 * 60 * 60 * 1000 :
                     period === 'weekly' ? now - 7 * 24 * 60 * 60 * 1000 :
                     now - 30 * 24 * 60 * 60 * 1000;

    const periodMetrics = this.metrics.filter(m => m.timestamp >= startDate);
    
    const responseTimes = periodMetrics.filter(m => m.type === 'response_time').map(m => m.value);
    const memoryUsage = periodMetrics.filter(m => m.type === 'memory_usage').map(m => m.value);
    const errorRates = periodMetrics.filter(m => m.type === 'error_rate').map(m => m.value);

    const report: PerformanceReport = {
      period,
      startDate,
      endDate: now,
      metrics: {
        averageResponseTime: responseTimes.length > 0 ? 
          responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length : 0,
        averageMemoryUsage: memoryUsage.length > 0 ? 
          memoryUsage.reduce((sum, val) => sum + val, 0) / memoryUsage.length : 0,
        errorRate: errorRates.length > 0 ? 
          errorRates.reduce((sum, val) => sum + val, 0) / errorRates.length : 0,
        userSatisfaction: this.calculateUserSatisfaction(periodMetrics),
        totalRequests: periodMetrics.filter(m => m.type === 'response_time').length,
        cacheHitRate: this.calculateCacheHitRate(periodMetrics)
      },
      trends: {
        responseTime: this.calculateTrendDirection(responseTimes),
        memoryUsage: this.calculateTrendDirection(memoryUsage),
        errorRate: this.calculateTrendDirection(errorRates)
      },
      recommendations: this.recommendations.filter(r => r.status === 'pending'),
      alerts: this.getRecentAlerts()
    };

    return report;
  }

  private calculateUserSatisfaction(metrics: PerformanceMetric[]): number {
    // Calculate user satisfaction based on performance metrics
    const responseTimes = metrics.filter(m => m.type === 'response_time').map(m => m.value);
    const errorRates = metrics.filter(m => m.type === 'error_rate').map(m => m.value);

    if (responseTimes.length === 0) return 0;

    const avgResponseTime = responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length;
    const avgErrorRate = errorRates.length > 0 ? 
      errorRates.reduce((sum, val) => sum + val, 0) / errorRates.length : 0;

    // Score based on response time and error rate
    let score = 100;
    
    if (avgResponseTime > 2000) score -= 30;
    else if (avgResponseTime > 1000) score -= 15;
    
    if (avgErrorRate > 0.1) score -= 40;
    else if (avgErrorRate > 0.05) score -= 20;

    return Math.max(0, score);
  }

  private calculateCacheHitRate(metrics: PerformanceMetric[]): number {
    // Simulate cache hit rate calculation
    // In a real implementation, this would come from cache service
    return Math.random() * 100;
  }

  private calculateTrendDirection(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 10) return 'stable';
    
    const trend = this.calculateTrend(values);
    const threshold = 0.1; // 10% change threshold
    
    if (trend > threshold) return 'degrading';
    if (trend < -threshold) return 'improving';
    return 'stable';
  }

  private getRecentAlerts(): string[] {
    if (!(window as any).performanceAlerts) return [];
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return (window as any).performanceAlerts
      .filter((alert: any) => alert.timestamp > oneDayAgo)
      .map((alert: any) => `${alert.severity.toUpperCase()}: ${alert.message}`);
  }

  public getRecommendations(): OptimizationRecommendation[] {
    return this.recommendations.filter(r => r.status === 'pending');
  }

  public markRecommendationAsImplemented(id: string): void {
    const recommendation = this.recommendations.find(r => r.id === id);
    if (recommendation) {
      recommendation.status = 'implemented';
      console.log(`✅ Recommendation implemented: ${recommendation.title}`);
    }
  }

  public markRecommendationAsIgnored(id: string): void {
    const recommendation = this.recommendations.find(r => r.id === id);
    if (recommendation) {
      recommendation.status = 'ignored';
      console.log(`❌ Recommendation ignored: ${recommendation.title}`);
    }
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🔍 Advanced Performance Monitoring Stopped');
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.baselines);
  }
}

// Create singleton instance
const advancedPerformanceService = new AdvancedPerformanceService();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).advancedPerformanceService = advancedPerformanceService;
}

export default advancedPerformanceService;
export type { PerformanceMetric, PerformanceBaseline, OptimizationRecommendation, PerformanceReport };
