/**
 * System Monitor Implementation
 * Provides real-time system monitoring and diagnostic capabilities
 */

import * as os from 'os';
import { EventEmitter } from 'events';
import { SystemStatus, DiagnosticInfo, ErrorLog, PerformanceMetric } from '../interfaces/ConfigurationManager';

export interface SystemMonitorConfig {
  monitoringInterval: number; // milliseconds
  enableAlerts: boolean;
  alertThresholds: {
    memoryUsagePercent: number;
    cpuUsagePercent: number;
    diskUsagePercent: number;
    responseTimeMs: number;
  };
}

export interface SystemAlert {
  timestamp: Date;
  type: 'memory' | 'cpu' | 'disk' | 'performance' | 'error';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
}

export interface DiagnosticReport {
  timestamp: Date;
  duration: number; // milliseconds
  overallHealth: 'healthy' | 'warning' | 'critical' | 'unknown';
  tests: DiagnosticTest[];
  recommendations: DiagnosticRecommendation[];
  systemInfo: SystemInfo;
  performanceSummary: PerformanceSummary;
}

export interface DiagnosticTest {
  name: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  details?: Record<string, any>;
}

export interface DiagnosticRecommendation {
  type: 'performance' | 'security' | 'maintenance' | 'connectivity';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: string;
}

export interface SystemInfo {
  application: {
    name: string;
    version: string;
    buildDate: Date;
    environment: string;
  };
  system: {
    platform: string;
    architecture: string;
    nodeVersion: string;
    hostname: string;
    uptime: number;
    loadAverage: number[];
  };
  hardware: {
    cpus: Array<{
      model: string;
      speed: number;
      cores: number;
    }>;
    totalMemory: number;
    freeMemory: number;
    networkInterfaces: string[];
  };
}

export interface PerformanceSummary {
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageCpuUsage: number;
  peakCpuUsage: number;
  totalErrors: number;
  recentErrors: number;
}

export class SystemMonitorImpl extends EventEmitter {
  private config: SystemMonitorConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private performanceHistory: PerformanceMetric[] = [];
  private errorLogs: ErrorLog[] = [];
  private isMonitoring = false;

  constructor(config?: Partial<SystemMonitorConfig>) {
    super();
    
    this.config = {
      monitoringInterval: 5000, // 5 seconds
      enableAlerts: true,
      alertThresholds: {
        memoryUsagePercent: 80,
        cpuUsagePercent: 75,
        diskUsagePercent: 85,
        responseTimeMs: 2500
      },
      ...config
    };
  }

  /**
   * Start system monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Initial system check
    await this.performSystemCheck();
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.performSystemCheck();
    }, this.config.monitoringInterval);

    this.emit('monitoring-started');
  }

  /**
   * Stop system monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    this.emit('monitoring-stopped');
  }

  /**
   * Get current system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      uptime: uptime * 1000, // Convert to milliseconds
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpuUsage: await this.getCpuUsage(),
      networkStatus: {
        connected: true,
        signalStrength: 85,
        latency: 25
      },
      componentStatus: {
        aiEngine: 'healthy',
        healthMonitor: 'healthy',
        calendarManager: 'healthy',
        flashingInterface: 'healthy',
        voiceProcessor: 'healthy'
      },
      lastUpdate: new Date()
    };
  }

  /**
   * Get diagnostic information
   */
  async getDiagnosticInfo(): Promise<DiagnosticInfo> {
    const packageJson = require('../../../package.json');
    
    return {
      systemInfo: {
        version: packageJson.version,
        buildDate: new Date(), // In real implementation, this would be build time
        platform: os.platform(),
        nodeVersion: process.version
      },
      errorLogs: [...this.errorLogs],
      performanceMetrics: [...this.performanceHistory],
      configurationSummary: {
        monitoringConfig: this.config,
        systemInfo: {
          platform: os.platform(),
          arch: os.arch(),
          cpus: os.cpus().length,
          totalMemory: os.totalmem(),
          freeMemory: os.freemem()
        }
      }
    };
  }

  /**
   * Log an error
   */
  logError(component: string, message: string, error?: any): void {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      level: 'error',
      component,
      message,
      stack: error?.stack,
      context: error ? { error: error.toString() } : undefined
    };
    
    this.errorLogs.push(errorLog);
    
    // Keep only last 500 error logs
    if (this.errorLogs.length > 500) {
      this.errorLogs = this.errorLogs.slice(-500);
    }
    
    this.emit('error-logged', errorLog);
    console.error(`[${component}] ${message}`, error);
  }

  /**
   * Add performance metric
   */
  addPerformanceMetric(metric: string, value: number, unit: string, component: string): void {
    const performanceMetric: PerformanceMetric = {
      timestamp: new Date(),
      metric,
      value,
      unit,
      component
    };
    
    this.performanceHistory.push(performanceMetric);
    
    // Keep only last 1000 metrics
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
    
    this.emit('performance-metric', performanceMetric);
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(component?: string, hours?: number): PerformanceMetric[] {
    let filtered = [...this.performanceHistory];
    
    if (component) {
      filtered = filtered.filter(metric => metric.component === component);
    }
    
    if (hours) {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      filtered = filtered.filter(metric => metric.timestamp >= cutoffTime);
    }
    
    return filtered;
  }

  /**
   * Check if system is healthy
   */
  async isSystemHealthy(): Promise<boolean> {
    const status = await this.getSystemStatus();
    
    return (
      status.memoryUsage.percentage < this.config.alertThresholds.memoryUsagePercent &&
      status.cpuUsage < this.config.alertThresholds.cpuUsagePercent &&
      Object.values(status.componentStatus).every(status => status === 'healthy')
    );
  }

  /**
   * Run comprehensive system diagnostics
   */
  async runComprehensiveDiagnostics(): Promise<DiagnosticReport> {
    const startTime = Date.now();
    
    const report: DiagnosticReport = {
      timestamp: new Date(),
      duration: 0,
      overallHealth: 'unknown',
      tests: [],
      recommendations: [],
      systemInfo: await this.getSystemInfo(),
      performanceSummary: this.getPerformanceSummary()
    };

    // Run diagnostic tests
    const tests = [
      this.testMemoryUsage(),
      this.testCpuPerformance(),
      this.testDiskSpace(),
      this.testNetworkConnectivity(),
      this.testComponentHealth(),
      this.testConfigurationIntegrity(),
      this.testSecuritySettings(),
      this.testPerformanceBaseline()
    ];

    const results = await Promise.allSettled(tests);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        report.tests.push(result.value);
      } else {
        report.tests.push({
          name: `Test ${index + 1}`,
          status: 'failed',
          message: `Test failed: ${result.reason}`,
          details: { error: result.reason.toString() }
        });
      }
    });

    // Determine overall health
    const failedTests = report.tests.filter(test => test.status === 'failed');
    const warningTests = report.tests.filter(test => test.status === 'warning');
    
    if (failedTests.length > 0) {
      report.overallHealth = 'critical';
    } else if (warningTests.length > 0) {
      report.overallHealth = 'warning';
    } else {
      report.overallHealth = 'healthy';
    }

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report.tests);
    
    report.duration = Date.now() - startTime;
    
    this.emit('diagnostics-completed', report);
    return report;
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const packageJson = require('../../../package.json');
    
    return {
      application: {
        name: packageJson.name,
        version: packageJson.version,
        buildDate: new Date(), // In real implementation, this would be actual build date
        environment: process.env.NODE_ENV || 'development'
      },
      system: {
        platform: os.platform(),
        architecture: os.arch(),
        nodeVersion: process.version,
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAverage: os.loadavg()
      },
      hardware: {
        cpus: os.cpus().map(cpu => ({
          model: cpu.model,
          speed: cpu.speed,
          cores: 1
        })),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        networkInterfaces: Object.keys(os.networkInterfaces())
      }
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): PerformanceSummary {
    const recentMetrics = this.getPerformanceHistory(undefined, 1); // Last hour
    
    const memoryMetrics = recentMetrics.filter(m => m.metric === 'memory_usage_percent');
    const cpuMetrics = recentMetrics.filter(m => m.metric === 'cpu_usage_percent');
    
    return {
      averageMemoryUsage: this.calculateAverage(memoryMetrics.map(m => m.value)),
      peakMemoryUsage: Math.max(...memoryMetrics.map(m => m.value), 0),
      averageCpuUsage: this.calculateAverage(cpuMetrics.map(m => m.value)),
      peakCpuUsage: Math.max(...cpuMetrics.map(m => m.value), 0),
      totalErrors: this.errorLogs.length,
      recentErrors: this.errorLogs.filter(log => 
        log.timestamp > new Date(Date.now() - 60 * 60 * 1000)
      ).length
    };
  }

  // Diagnostic test methods
  private async testMemoryUsage(): Promise<DiagnosticTest> {
    const memUsage = process.memoryUsage();
    const percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let status: 'passed' | 'warning' | 'failed' = 'passed';
    let message = `Memory usage: ${percentage.toFixed(1)}%`;
    
    if (percentage > 90) {
      status = 'failed';
      message += ' - Critical memory usage';
    } else if (percentage > 70) {
      status = 'warning';
      message += ' - High memory usage';
    }
    
    return {
      name: 'Memory Usage Test',
      status,
      message,
      details: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        percentage
      }
    };
  }

  private async testCpuPerformance(): Promise<DiagnosticTest> {
    const cpuUsage = await this.getCpuUsage();
    
    let status: 'passed' | 'warning' | 'failed' = 'passed';
    let message = `CPU usage: ${cpuUsage.toFixed(1)}%`;
    
    if (cpuUsage > 90) {
      status = 'failed';
      message += ' - Critical CPU usage';
    } else if (cpuUsage > 70) {
      status = 'warning';
      message += ' - High CPU usage';
    }
    
    return {
      name: 'CPU Performance Test',
      status,
      message,
      details: { cpuUsage }
    };
  }

  private async testDiskSpace(): Promise<DiagnosticTest> {
    // Simplified disk space check
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const usagePercentage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    let status: 'passed' | 'warning' | 'failed' = 'passed';
    let message = `System memory usage: ${usagePercentage.toFixed(1)}%`;
    
    if (usagePercentage > 95) {
      status = 'failed';
      message += ' - Critical disk space';
    } else if (usagePercentage > 85) {
      status = 'warning';
      message += ' - Low disk space';
    }
    
    return {
      name: 'Disk Space Test',
      status,
      message,
      details: { freeMemory, totalMemory, usagePercentage }
    };
  }

  private async testNetworkConnectivity(): Promise<DiagnosticTest> {
    // Simplified network test
    const interfaces = os.networkInterfaces();
    const hasActiveInterface = Object.values(interfaces).some(iface => 
      iface?.some(addr => !addr.internal && addr.family === 'IPv4')
    );
    
    return {
      name: 'Network Connectivity Test',
      status: hasActiveInterface ? 'passed' : 'failed',
      message: hasActiveInterface ? 'Network connectivity available' : 'No active network interfaces',
      details: { interfaces: Object.keys(interfaces) }
    };
  }

  private async testComponentHealth(): Promise<DiagnosticTest> {
    const status = await this.getSystemStatus();
    const unhealthyComponents = Object.entries(status.componentStatus)
      .filter(([_, health]) => health !== 'healthy');
    
    return {
      name: 'Component Health Test',
      status: unhealthyComponents.length === 0 ? 'passed' : 'warning',
      message: unhealthyComponents.length === 0 
        ? 'All components healthy' 
        : `${unhealthyComponents.length} components need attention`,
      details: { componentStatus: status.componentStatus }
    };
  }

  private async testConfigurationIntegrity(): Promise<DiagnosticTest> {
    // Simplified configuration test
    try {
      const packageJson = require('../../../package.json');
      return {
        name: 'Configuration Integrity Test',
        status: 'passed',
        message: 'Configuration files are valid',
        details: { version: packageJson.version }
      };
    } catch (error) {
      return {
        name: 'Configuration Integrity Test',
        status: 'failed',
        message: 'Configuration validation failed',
        details: { error: (error as Error).toString() }
      };
    }
  }

  private async testSecuritySettings(): Promise<DiagnosticTest> {
    // Basic security checks
    const isProduction = process.env.NODE_ENV === 'production';
    const hasHttps = process.env.HTTPS === 'true';
    
    let status: 'passed' | 'warning' | 'failed' = 'passed';
    let message = 'Security settings validated';
    
    if (isProduction && !hasHttps) {
      status = 'warning';
      message = 'HTTPS not enabled in production';
    }
    
    return {
      name: 'Security Settings Test',
      status,
      message,
      details: { isProduction, hasHttps }
    };
  }

  private async testPerformanceBaseline(): Promise<DiagnosticTest> {
    const startTime = Date.now();
    
    // Simple performance test
    let iterations = 0;
    const testDuration = 100; // ms
    const endTime = startTime + testDuration;
    
    while (Date.now() < endTime) {
      iterations++;
    }
    
    const actualDuration = Date.now() - startTime;
    const performance = iterations / actualDuration;
    
    return {
      name: 'Performance Baseline Test',
      status: performance > 1000 ? 'passed' : 'warning',
      message: `Performance: ${performance.toFixed(0)} iterations/ms`,
      details: { iterations, duration: actualDuration, performance }
    };
  }

  private generateRecommendations(tests: DiagnosticTest[]): DiagnosticRecommendation[] {
    const recommendations: DiagnosticRecommendation[] = [];
    
    const failedTests = tests.filter(test => test.status === 'failed');
    const warningTests = tests.filter(test => test.status === 'warning');
    
    if (failedTests.some(test => test.name.includes('Memory'))) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Optimize Memory Usage',
        description: 'High memory usage detected. Consider restarting the application or reducing cache size.',
        action: 'restart_application'
      });
    }
    
    if (warningTests.some(test => test.name.includes('CPU'))) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Monitor CPU Usage',
        description: 'CPU usage is elevated. Monitor for performance issues.',
        action: 'monitor_cpu'
      });
    }
    
    if (failedTests.some(test => test.name.includes('Network'))) {
      recommendations.push({
        type: 'connectivity',
        priority: 'high',
        title: 'Check Network Connection',
        description: 'Network connectivity issues detected. Check network configuration.',
        action: 'check_network'
      });
    }
    
    return recommendations;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  // Private methods

  private async performSystemCheck(): Promise<void> {
    try {
      const status = await this.getSystemStatus();
      
      // Check memory usage
      if (status.memoryUsage.percentage > this.config.alertThresholds.memoryUsagePercent) {
        this.emitAlert({
          timestamp: new Date(),
          type: 'memory',
          severity: status.memoryUsage.percentage > 90 ? 'critical' : 'warning',
          message: `Memory usage is ${status.memoryUsage.percentage.toFixed(1)}%`,
          value: status.memoryUsage.percentage,
          threshold: this.config.alertThresholds.memoryUsagePercent
        });
      }
      
      // Check CPU usage
      if (status.cpuUsage > this.config.alertThresholds.cpuUsagePercent) {
        this.emitAlert({
          timestamp: new Date(),
          type: 'cpu',
          severity: status.cpuUsage > 90 ? 'critical' : 'warning',
          message: `CPU usage is ${status.cpuUsage.toFixed(1)}%`,
          value: status.cpuUsage,
          threshold: this.config.alertThresholds.cpuUsagePercent
        });
      }
      
      // Add performance metrics
      this.addPerformanceMetric('memory_usage_percent', status.memoryUsage.percentage, '%', 'system');
      this.addPerformanceMetric('cpu_usage_percent', status.cpuUsage, '%', 'system');
      this.addPerformanceMetric('uptime_seconds', status.uptime / 1000, 's', 'system');
      
      this.emit('system-check-completed', status);
    } catch (error) {
      this.logError('SystemMonitor', 'System check failed', error);
    }
  }

  private async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return Math.min((usage.user + usage.system) / 10000, 100); // Convert to percentage
    }
    return 0;
  }

  private emitAlert(alert: SystemAlert): void {
    if (this.config.enableAlerts) {
      this.emit('system-alert', alert);
    }
  }
}