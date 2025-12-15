/**
 * Resource Monitor for AI Chatbot Desktop Device
 * 
 * Monitors system resources, tracks performance metrics, and provides
 * automatic resource management and optimization recommendations.
 */
export class ResourceMonitor {
  private monitoringInterval?: NodeJS.Timeout;
  private performanceHistory: PerformanceSnapshot[] = [];
  private alertThresholds = {
    memoryUsagePercent: 80,
    cpuUsagePercent: 75,
    responseTimeMs: 2500,
    errorRatePercent: 5,
    cacheHitRatePercent: 30
  };
  
  private currentMetrics: SystemMetrics = {
    memory: { used: 0, available: 0, percentage: 0 },
    cpu: { usage: 0, cores: 1, temperature: 0 },
    disk: { used: 0, available: 0, percentage: 0 },
    network: { bytesIn: 0, bytesOut: 0, latency: 0 },
    performance: {
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      cacheHitRate: 0,
      uptime: 0
    }
  };

  private alertCallbacks: Array<(alert: ResourceAlert) => void> = [];
  private optimizationCallbacks: Array<(recommendation: OptimizationRecommendation) => void> = [];
  
  private config = {
    monitoringIntervalMs: 5000, // 5 seconds
    historyRetentionHours: 24,
    enableAutoOptimization: true,
    enableAlerts: true,
    maxHistoryEntries: 1000
  };

  /**
   * Initialize the resource monitor
   */
  async initialize(customConfig?: Partial<typeof this.config>): Promise<void> {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Get current system metrics
   */
  getCurrentMetrics(): SystemMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Get performance history for analysis
   */
  getPerformanceHistory(hours?: number): PerformanceSnapshot[] {
    const cutoffTime = hours 
      ? Date.now() - (hours * 60 * 60 * 1000)
      : Date.now() - (this.config.historyRetentionHours * 60 * 60 * 1000);
    
    return this.performanceHistory.filter(snapshot => snapshot.timestamp >= cutoffTime);
  }

  /**
   * Register callback for resource alerts
   */
  onAlert(callback: (alert: ResourceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Register callback for optimization recommendations
   */
  onOptimizationRecommendation(callback: (recommendation: OptimizationRecommendation) => void): void {
    this.optimizationCallbacks.push(callback);
  }

  /**
   * Update performance metrics from external sources
   */
  updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    this.currentMetrics.performance = {
      ...this.currentMetrics.performance,
      ...metrics
    };
  }

  /**
   * Force a resource check and optimization
   */
  async performResourceCheck(): Promise<ResourceCheckResult> {
    await this.collectMetrics();
    const issues = this.analyzeResourceUsage();
    const recommendations = this.generateOptimizationRecommendations();
    
    return {
      timestamp: Date.now(),
      metrics: this.currentMetrics,
      issues,
      recommendations,
      overallHealth: this.calculateOverallHealth()
    };
  }

  /**
   * Get resource usage trends
   */
  getResourceTrends(): ResourceTrends {
    const recentHistory = this.getPerformanceHistory(1); // Last hour
    
    if (recentHistory.length < 2) {
      return {
        memory: 'stable',
        cpu: 'stable',
        responseTime: 'stable',
        errorRate: 'stable'
      };
    }

    const latest = recentHistory[recentHistory.length - 1];
    const previous = recentHistory[Math.floor(recentHistory.length / 2)];

    return {
      memory: this.calculateTrend(previous.metrics.memory.percentage, latest.metrics.memory.percentage),
      cpu: this.calculateTrend(previous.metrics.cpu.usage, latest.metrics.cpu.usage),
      responseTime: this.calculateTrend(previous.metrics.performance.averageResponseTime, latest.metrics.performance.averageResponseTime),
      errorRate: this.calculateTrend(previous.metrics.performance.errorRate, latest.metrics.performance.errorRate)
    };
  }

  /**
   * Shutdown the resource monitor
   */
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.performanceHistory = [];
    this.alertCallbacks = [];
    this.optimizationCallbacks = [];
  }

  // Private methods

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      this.analyzeAndAlert();
      this.cleanupHistory();
    }, this.config.monitoringIntervalMs);

    // Initial collection
    this.collectMetrics();
  }

  private async collectMetrics(): Promise<void> {
    // Collect memory metrics
    this.currentMetrics.memory = await this.collectMemoryMetrics();
    
    // Collect CPU metrics
    this.currentMetrics.cpu = await this.collectCpuMetrics();
    
    // Collect disk metrics
    this.currentMetrics.disk = await this.collectDiskMetrics();
    
    // Collect network metrics
    this.currentMetrics.network = await this.collectNetworkMetrics();
    
    // Store snapshot
    this.performanceHistory.push({
      timestamp: Date.now(),
      metrics: { ...this.currentMetrics }
    });
  }

  private async collectMemoryMetrics(): Promise<MemoryMetrics> {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const used = usage.heapUsed / 1024 / 1024; // MB
      const total = usage.heapTotal / 1024 / 1024; // MB
      
      return {
        used,
        available: total - used,
        percentage: (used / total) * 100
      };
    }
    
    return { used: 0, available: 0, percentage: 0 };
  }

  private async collectCpuMetrics(): Promise<CpuMetrics> {
    let usage = 0;
    let cores = 1;
    
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const cpuUsage = process.cpuUsage();
      usage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    }
    
    if (typeof require !== 'undefined') {
      try {
        const os = require('os');
        cores = os.cpus().length;
      } catch {
        // Fallback to single core
      }
    }
    
    return {
      usage: Math.min(usage * 100, 100), // Convert to percentage
      cores,
      temperature: 0 // Would need hardware integration
    };
  }

  private async collectDiskMetrics(): Promise<DiskMetrics> {
    // Disk metrics would require OS-specific implementation
    return {
      used: 0,
      available: 0,
      percentage: 0
    };
  }

  private async collectNetworkMetrics(): Promise<NetworkMetrics> {
    // Network metrics would require OS-specific implementation
    return {
      bytesIn: 0,
      bytesOut: 0,
      latency: 0
    };
  }

  private analyzeResourceUsage(): ResourceIssue[] {
    const issues: ResourceIssue[] = [];
    
    // Check memory usage
    if (this.currentMetrics.memory.percentage > this.alertThresholds.memoryUsagePercent) {
      issues.push({
        type: 'memory',
        severity: this.currentMetrics.memory.percentage > 90 ? 'critical' : 'warning',
        message: `Memory usage is ${this.currentMetrics.memory.percentage.toFixed(1)}%`,
        value: this.currentMetrics.memory.percentage,
        threshold: this.alertThresholds.memoryUsagePercent
      });
    }
    
    // Check CPU usage
    if (this.currentMetrics.cpu.usage > this.alertThresholds.cpuUsagePercent) {
      issues.push({
        type: 'cpu',
        severity: this.currentMetrics.cpu.usage > 90 ? 'critical' : 'warning',
        message: `CPU usage is ${this.currentMetrics.cpu.usage.toFixed(1)}%`,
        value: this.currentMetrics.cpu.usage,
        threshold: this.alertThresholds.cpuUsagePercent
      });
    }
    
    // Check response time
    if (this.currentMetrics.performance.averageResponseTime > this.alertThresholds.responseTimeMs) {
      issues.push({
        type: 'performance',
        severity: this.currentMetrics.performance.averageResponseTime > 5000 ? 'critical' : 'warning',
        message: `Average response time is ${this.currentMetrics.performance.averageResponseTime}ms`,
        value: this.currentMetrics.performance.averageResponseTime,
        threshold: this.alertThresholds.responseTimeMs
      });
    }
    
    // Check error rate
    if (this.currentMetrics.performance.errorRate > this.alertThresholds.errorRatePercent) {
      issues.push({
        type: 'reliability',
        severity: this.currentMetrics.performance.errorRate > 10 ? 'critical' : 'warning',
        message: `Error rate is ${this.currentMetrics.performance.errorRate.toFixed(1)}%`,
        value: this.currentMetrics.performance.errorRate,
        threshold: this.alertThresholds.errorRatePercent
      });
    }
    
    // Check cache hit rate
    if (this.currentMetrics.performance.cacheHitRate < this.alertThresholds.cacheHitRatePercent) {
      issues.push({
        type: 'performance',
        severity: 'info',
        message: `Cache hit rate is ${this.currentMetrics.performance.cacheHitRate.toFixed(1)}%`,
        value: this.currentMetrics.performance.cacheHitRate,
        threshold: this.alertThresholds.cacheHitRatePercent
      });
    }
    
    return issues;
  }

  private generateOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const issues = this.analyzeResourceUsage();
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'memory':
          recommendations.push({
            type: 'memory_optimization',
            priority: issue.severity === 'critical' ? 'high' : 'medium',
            description: 'Reduce memory usage by clearing caches and optimizing data structures',
            actions: [
              'Clear expired cache entries',
              'Optimize conversation context storage',
              'Reduce message history length',
              'Enable aggressive garbage collection'
            ],
            estimatedImpact: 'Reduce memory usage by 20-40%'
          });
          break;
          
        case 'cpu':
          recommendations.push({
            type: 'cpu_optimization',
            priority: issue.severity === 'critical' ? 'high' : 'medium',
            description: 'Reduce CPU usage by optimizing processing algorithms',
            actions: [
              'Enable response caching',
              'Reduce animation complexity',
              'Optimize pattern rendering',
              'Use background processing for non-critical tasks'
            ],
            estimatedImpact: 'Reduce CPU usage by 15-30%'
          });
          break;
          
        case 'performance':
          if (issue.message.includes('response time')) {
            recommendations.push({
              type: 'response_optimization',
              priority: 'high',
              description: 'Improve response times through caching and optimization',
              actions: [
                'Enable aggressive caching',
                'Optimize AI processing pipeline',
                'Use local processing where possible',
                'Implement response streaming'
              ],
              estimatedImpact: 'Reduce response time by 30-50%'
            });
          } else if (issue.message.includes('cache hit rate')) {
            recommendations.push({
              type: 'cache_optimization',
              priority: 'medium',
              description: 'Improve cache efficiency and hit rates',
              actions: [
                'Increase cache size',
                'Optimize cache eviction strategy',
                'Pre-warm frequently used data',
                'Implement smarter caching algorithms'
              ],
              estimatedImpact: 'Increase cache hit rate by 20-40%'
            });
          }
          break;
          
        case 'reliability':
          recommendations.push({
            type: 'reliability_improvement',
            priority: 'high',
            description: 'Reduce error rates through better error handling',
            actions: [
              'Implement better input validation',
              'Add fallback mechanisms',
              'Improve error recovery',
              'Enhance monitoring and logging'
            ],
            estimatedImpact: 'Reduce error rate by 50-70%'
          });
          break;
      }
    }
    
    return recommendations;
  }

  private analyzeAndAlert(): void {
    if (!this.config.enableAlerts) return;
    
    const issues = this.analyzeResourceUsage();
    
    for (const issue of issues) {
      const alert: ResourceAlert = {
        timestamp: Date.now(),
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
        currentValue: issue.value,
        threshold: issue.threshold,
        recommendations: this.generateOptimizationRecommendations()
          .filter(rec => this.isRelevantRecommendation(rec, issue))
      };
      
      // Notify alert callbacks
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('Error in alert callback:', error);
        }
      });
    }
    
    // Generate and send optimization recommendations
    if (this.config.enableAutoOptimization) {
      const recommendations = this.generateOptimizationRecommendations();
      recommendations.forEach(recommendation => {
        this.optimizationCallbacks.forEach(callback => {
          try {
            callback(recommendation);
          } catch (error) {
            console.error('Error in optimization callback:', error);
          }
        });
      });
    }
  }

  private isRelevantRecommendation(recommendation: OptimizationRecommendation, issue: ResourceIssue): boolean {
    switch (issue.type) {
      case 'memory':
        return recommendation.type === 'memory_optimization';
      case 'cpu':
        return recommendation.type === 'cpu_optimization';
      case 'performance':
        return recommendation.type === 'response_optimization' || recommendation.type === 'cache_optimization';
      case 'reliability':
        return recommendation.type === 'reliability_improvement';
      default:
        return false;
    }
  }

  private calculateOverallHealth(): 'excellent' | 'good' | 'fair' | 'poor' {
    const issues = this.analyzeResourceUsage();
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const warningIssues = issues.filter(i => i.severity === 'warning').length;
    
    if (criticalIssues > 0) return 'poor';
    if (warningIssues > 2) return 'fair';
    if (warningIssues > 0) return 'good';
    return 'excellent';
  }

  private calculateTrend(previous: number, current: number): 'improving' | 'stable' | 'degrading' {
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'degrading' : 'improving';
  }

  private cleanupHistory(): void {
    const cutoffTime = Date.now() - (this.config.historyRetentionHours * 60 * 60 * 1000);
    this.performanceHistory = this.performanceHistory.filter(snapshot => snapshot.timestamp >= cutoffTime);
    
    // Also limit by max entries
    if (this.performanceHistory.length > this.config.maxHistoryEntries) {
      this.performanceHistory = this.performanceHistory.slice(-this.config.maxHistoryEntries);
    }
  }
}

// Type definitions

export interface SystemMetrics {
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  performance: PerformanceMetrics;
}

export interface MemoryMetrics {
  used: number; // MB
  available: number; // MB
  percentage: number;
}

export interface CpuMetrics {
  usage: number; // percentage
  cores: number;
  temperature: number; // celsius
}

export interface DiskMetrics {
  used: number; // GB
  available: number; // GB
  percentage: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  latency: number; // ms
}

export interface PerformanceMetrics {
  averageResponseTime: number; // ms
  requestsPerSecond: number;
  errorRate: number; // percentage
  cacheHitRate: number; // percentage
  uptime: number; // seconds
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: SystemMetrics;
}

export interface ResourceIssue {
  type: 'memory' | 'cpu' | 'disk' | 'network' | 'performance' | 'reliability';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
}

export interface ResourceAlert {
  timestamp: number;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  recommendations: OptimizationRecommendation[];
}

export interface OptimizationRecommendation {
  type: 'memory_optimization' | 'cpu_optimization' | 'response_optimization' | 'cache_optimization' | 'reliability_improvement';
  priority: 'low' | 'medium' | 'high';
  description: string;
  actions: string[];
  estimatedImpact: string;
}

export interface ResourceCheckResult {
  timestamp: number;
  metrics: SystemMetrics;
  issues: ResourceIssue[];
  recommendations: OptimizationRecommendation[];
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ResourceTrends {
  memory: 'improving' | 'stable' | 'degrading';
  cpu: 'improving' | 'stable' | 'degrading';
  responseTime: 'improving' | 'stable' | 'degrading';
  errorRate: 'improving' | 'stable' | 'degrading';
}