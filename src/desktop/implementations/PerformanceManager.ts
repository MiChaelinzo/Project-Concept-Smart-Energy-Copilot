import { PerformanceOptimizer } from './PerformanceOptimizer';
import { ResourceMonitor, OptimizationRecommendation, ResourceAlert } from './ResourceMonitor';
import { AIChatbotEngine } from '../interfaces/AIChatbotEngine';
import { FlashingInterfaceManager } from '../interfaces/FlashingInterfaceManager';

/**
 * Performance Manager for AI Chatbot Desktop Device
 * 
 * Coordinates performance optimization across all system components,
 * implements automatic tuning, and ensures consistent 2-second response times.
 */
export class PerformanceManager {
  private performanceOptimizer = new PerformanceOptimizer();
  private resourceMonitor = new ResourceMonitor();
  private aiEngine?: AIChatbotEngine;
  private flashingInterface?: FlashingInterfaceManager;
  
  private autoTuningEnabled = true;
  private autoTuningInterval?: NodeJS.Timeout;
  private performanceTargets = {
    maxResponseTimeMs: 2000,
    minCacheHitRate: 0.6,
    maxMemoryUsagePercent: 70,
    maxCpuUsagePercent: 60,
    maxErrorRatePercent: 2
  };
  
  private optimizationHistory: OptimizationAction[] = [];
  private initialized = false;

  /**
   * Initialize the performance manager
   */
  async initialize(config?: PerformanceManagerConfig): Promise<void> {
    if (config) {
      this.performanceTargets = { ...this.performanceTargets, ...config.targets };
      this.autoTuningEnabled = config.autoTuningEnabled ?? true;
    }

    // Initialize components
    await this.performanceOptimizer.initialize({
      responseTimeTarget: this.performanceTargets.maxResponseTimeMs,
      aggressiveOptimization: false
    });

    await this.resourceMonitor.initialize({
      enableAutoOptimization: this.autoTuningEnabled,
      enableAlerts: true
    });

    // Set up monitoring callbacks
    this.resourceMonitor.onAlert(this.handleResourceAlert.bind(this));
    this.resourceMonitor.onOptimizationRecommendation(this.handleOptimizationRecommendation.bind(this));

    // Start auto-tuning if enabled
    if (this.autoTuningEnabled) {
      this.startAutoTuning();
    }

    this.initialized = true;
  }

  /**
   * Register AI engine for performance optimization
   */
  registerAIEngine(engine: AIChatbotEngine): void {
    this.aiEngine = engine;
  }

  /**
   * Register flashing interface for animation optimization
   */
  registerFlashingInterface(flashingInterface: FlashingInterfaceManager): void {
    this.flashingInterface = flashingInterface;
  }

  /**
   * Optimize system performance based on current metrics
   */
  async optimizePerformance(): Promise<OptimizationResult> {
    if (!this.initialized) {
      throw new Error('Performance manager not initialized');
    }

    const startTime = Date.now();
    const initialMetrics = this.resourceMonitor.getCurrentMetrics();
    const actions: OptimizationAction[] = [];

    try {
      // Perform AI engine optimization
      if (this.aiEngine && typeof this.aiEngine.performAutoTuning === 'function') {
        await this.aiEngine.performAutoTuning();
        actions.push({
          type: 'ai_optimization',
          timestamp: Date.now(),
          description: 'Performed AI engine auto-tuning',
          success: true
        });
      }

      // Perform performance optimizer tuning
      await this.performanceOptimizer.autoTune();
      actions.push({
        type: 'cache_optimization',
        timestamp: Date.now(),
        description: 'Performed cache and memory optimization',
        success: true
      });

      // Optimize visual patterns if needed
      if (this.shouldOptimizeVisuals(initialMetrics)) {
        await this.optimizeVisualPerformance();
        actions.push({
          type: 'visual_optimization',
          timestamp: Date.now(),
          description: 'Optimized visual pattern rendering',
          success: true
        });
      }

      // Wait a moment for changes to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get updated metrics
      const finalMetrics = this.resourceMonitor.getCurrentMetrics();
      const improvement = this.calculateImprovement(initialMetrics, finalMetrics);

      const result: OptimizationResult = {
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        actions,
        initialMetrics,
        finalMetrics,
        improvement,
        success: actions.every(action => action.success)
      };

      // Store in history
      this.optimizationHistory.push(...actions);
      this.trimOptimizationHistory();

      return result;
    } catch (error) {
      const errorAction: OptimizationAction = {
        type: 'error',
        timestamp: Date.now(),
        description: `Optimization failed: ${error}`,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      actions.push(errorAction);
      this.optimizationHistory.push(errorAction);

      return {
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        actions,
        initialMetrics,
        finalMetrics: this.resourceMonitor.getCurrentMetrics(),
        improvement: {},
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): PerformanceReport {
    const currentMetrics = this.resourceMonitor.getCurrentMetrics();
    const trends = this.resourceMonitor.getResourceTrends();
    const optimizerMetrics = this.performanceOptimizer.getResourceMonitoring();
    
    return {
      timestamp: Date.now(),
      currentMetrics,
      trends,
      cacheMetrics: {
        hitRate: optimizerMetrics.cache.hitRate,
        size: optimizerMetrics.cache.size,
        efficiency: optimizerMetrics.cache.efficiency
      },
      performanceTargets: this.performanceTargets,
      targetCompliance: this.calculateTargetCompliance(currentMetrics),
      recentOptimizations: this.optimizationHistory.slice(-10),
      recommendations: this.generatePerformanceRecommendations(currentMetrics)
    };
  }

  /**
   * Update performance metrics from external sources
   */
  updateMetrics(source: string, metrics: Partial<any>): void {
    // Update resource monitor with performance data
    if (metrics.averageResponseTime !== undefined ||
        metrics.errorRate !== undefined ||
        metrics.requestsPerSecond !== undefined) {
      this.resourceMonitor.updatePerformanceMetrics(metrics);
    }
  }

  /**
   * Enable or disable automatic performance tuning
   */
  setAutoTuning(enabled: boolean): void {
    this.autoTuningEnabled = enabled;
    
    if (enabled && !this.autoTuningInterval) {
      this.startAutoTuning();
    } else if (!enabled && this.autoTuningInterval) {
      clearInterval(this.autoTuningInterval);
      this.autoTuningInterval = undefined;
    }
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(limit?: number): OptimizationAction[] {
    return limit 
      ? this.optimizationHistory.slice(-limit)
      : [...this.optimizationHistory];
  }

  /**
   * Shutdown the performance manager
   */
  async shutdown(): Promise<void> {
    if (this.autoTuningInterval) {
      clearInterval(this.autoTuningInterval);
    }

    await this.performanceOptimizer.shutdown();
    await this.resourceMonitor.shutdown();
    
    this.optimizationHistory = [];
    this.initialized = false;
  }

  // Private methods

  private startAutoTuning(): void {
    // Run auto-tuning every 2 minutes
    this.autoTuningInterval = setInterval(async () => {
      try {
        const metrics = this.resourceMonitor.getCurrentMetrics();
        
        // Only auto-tune if performance is below targets
        if (this.shouldAutoTune(metrics)) {
          await this.optimizePerformance();
        }
      } catch (error) {
        console.error('Auto-tuning failed:', error);
      }
    }, 2 * 60 * 1000);
  }

  private shouldAutoTune(metrics: any): boolean {
    return (
      metrics.performance.averageResponseTime > this.performanceTargets.maxResponseTimeMs ||
      metrics.performance.errorRate > this.performanceTargets.maxErrorRatePercent ||
      metrics.memory.percentage > this.performanceTargets.maxMemoryUsagePercent ||
      metrics.cpu.usage > this.performanceTargets.maxCpuUsagePercent ||
      metrics.performance.cacheHitRate < this.performanceTargets.minCacheHitRate
    );
  }

  private shouldOptimizeVisuals(metrics: any): boolean {
    return metrics.cpu.usage > 70 || metrics.memory.percentage > 80;
  }

  private async optimizeVisualPerformance(): Promise<void> {
    if (this.flashingInterface) {
      // Reduce animation complexity
      this.flashingInterface.setAnimationsEnabled(false);
      
      // Wait a moment then re-enable with optimized settings
      setTimeout(() => {
        if (this.flashingInterface) {
          this.flashingInterface.setAnimationsEnabled(true);
        }
      }, 5000);
    }
  }

  private calculateImprovement(initial: any, final: any): Record<string, number> {
    const improvement: Record<string, number> = {};
    
    // Calculate percentage improvements
    if (initial.performance.averageResponseTime > 0) {
      improvement.responseTime = ((initial.performance.averageResponseTime - final.performance.averageResponseTime) / initial.performance.averageResponseTime) * 100;
    }
    
    if (initial.memory.percentage > 0) {
      improvement.memoryUsage = ((initial.memory.percentage - final.memory.percentage) / initial.memory.percentage) * 100;
    }
    
    if (initial.cpu.usage > 0) {
      improvement.cpuUsage = ((initial.cpu.usage - final.cpu.usage) / initial.cpu.usage) * 100;
    }
    
    improvement.cacheHitRate = final.performance.cacheHitRate - initial.performance.cacheHitRate;
    improvement.errorRate = initial.performance.errorRate - final.performance.errorRate;
    
    return improvement;
  }

  private calculateTargetCompliance(metrics: any): TargetCompliance {
    return {
      responseTime: metrics.performance.averageResponseTime <= this.performanceTargets.maxResponseTimeMs,
      memoryUsage: metrics.memory.percentage <= this.performanceTargets.maxMemoryUsagePercent,
      cpuUsage: metrics.cpu.usage <= this.performanceTargets.maxCpuUsagePercent,
      errorRate: metrics.performance.errorRate <= this.performanceTargets.maxErrorRatePercent,
      cacheHitRate: metrics.performance.cacheHitRate >= this.performanceTargets.minCacheHitRate
    };
  }

  private generatePerformanceRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.performance.averageResponseTime > this.performanceTargets.maxResponseTimeMs) {
      recommendations.push('Enable aggressive caching to improve response times');
      recommendations.push('Consider increasing local processing to reduce network latency');
    }
    
    if (metrics.memory.percentage > this.performanceTargets.maxMemoryUsagePercent) {
      recommendations.push('Clear conversation history more frequently');
      recommendations.push('Reduce cache size or implement more aggressive eviction');
    }
    
    if (metrics.cpu.usage > this.performanceTargets.maxCpuUsagePercent) {
      recommendations.push('Reduce visual animation complexity');
      recommendations.push('Optimize AI processing algorithms');
    }
    
    if (metrics.performance.cacheHitRate < this.performanceTargets.minCacheHitRate) {
      recommendations.push('Increase cache size for better hit rates');
      recommendations.push('Optimize cache key generation strategy');
    }
    
    if (metrics.performance.errorRate > this.performanceTargets.maxErrorRatePercent) {
      recommendations.push('Implement better error handling and recovery');
      recommendations.push('Add more robust input validation');
    }
    
    return recommendations;
  }

  private handleResourceAlert(alert: ResourceAlert): void {
    console.warn('Resource Alert:', alert);
    
    // Trigger immediate optimization for critical alerts
    if (alert.severity === 'critical' && this.autoTuningEnabled) {
      setTimeout(() => {
        this.optimizePerformance().catch(error => {
          console.error('Emergency optimization failed:', error);
        });
      }, 1000);
    }
  }

  private handleOptimizationRecommendation(recommendation: OptimizationRecommendation): void {
    console.info('Optimization Recommendation:', recommendation);
    
    // Auto-apply high priority recommendations if auto-tuning is enabled
    if (recommendation.priority === 'high' && this.autoTuningEnabled) {
      this.applyRecommendation(recommendation);
    }
  }

  private async applyRecommendation(recommendation: OptimizationRecommendation): Promise<void> {
    try {
      switch (recommendation.type) {
        case 'memory_optimization':
          await this.performanceOptimizer.autoTune();
          break;
        case 'cpu_optimization':
          if (this.flashingInterface) {
            this.flashingInterface.setAnimationsEnabled(false);
            setTimeout(() => {
              if (this.flashingInterface) {
                this.flashingInterface.setAnimationsEnabled(true);
              }
            }, 10000);
          }
          break;
        case 'response_optimization':
          if (this.aiEngine && typeof this.aiEngine.performAutoTuning === 'function') {
            await this.aiEngine.performAutoTuning();
          }
          break;
      }
      
      this.optimizationHistory.push({
        type: 'auto_recommendation',
        timestamp: Date.now(),
        description: `Applied ${recommendation.type}: ${recommendation.description}`,
        success: true
      });
    } catch (error) {
      this.optimizationHistory.push({
        type: 'auto_recommendation',
        timestamp: Date.now(),
        description: `Failed to apply ${recommendation.type}`,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private trimOptimizationHistory(): void {
    // Keep only last 100 optimization actions
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory = this.optimizationHistory.slice(-100);
    }
  }
}

// Type definitions

export interface PerformanceManagerConfig {
  targets?: Partial<{
    maxResponseTimeMs: number;
    minCacheHitRate: number;
    maxMemoryUsagePercent: number;
    maxCpuUsagePercent: number;
    maxErrorRatePercent: number;
  }>;
  autoTuningEnabled?: boolean;
  autoTuningIntervalMs?: number;
}

export interface OptimizationAction {
  type: 'ai_optimization' | 'cache_optimization' | 'visual_optimization' | 'auto_recommendation' | 'error';
  timestamp: number;
  description: string;
  success: boolean;
  error?: string;
  metrics?: any;
}

export interface OptimizationResult {
  timestamp: number;
  duration: number;
  actions: OptimizationAction[];
  initialMetrics: any;
  finalMetrics: any;
  improvement: Record<string, number>;
  success: boolean;
  error?: string;
}

export interface PerformanceReport {
  timestamp: number;
  currentMetrics: any;
  trends: any;
  cacheMetrics: {
    hitRate: number;
    size: number;
    efficiency: number;
  };
  performanceTargets: any;
  targetCompliance: TargetCompliance;
  recentOptimizations: OptimizationAction[];
  recommendations: string[];
}

export interface TargetCompliance {
  responseTime: boolean;
  memoryUsage: boolean;
  cpuUsage: boolean;
  errorRate: boolean;
  cacheHitRate: boolean;
}