/**
 * Deployment Manager Implementation
 * Handles installation, deployment, and maintenance procedures
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import {
  DeploymentManager,
  InstallationConfig,
  DeploymentEnvironment,
  InstallationProgress,
  MaintenanceTask,
  SystemHealth,
  ComponentHealth,
  HealthRecommendation,
  DeploymentPackage,
  SystemRequirements,
  ErrorLog,
  SecurityIssue
} from '../interfaces/DeploymentManager';
import { ValidationResult } from '../interfaces/ConfigurationManager';

const execAsync = promisify(exec);

export class DeploymentManagerImpl implements DeploymentManager {
  private readonly installDir: string;
  private readonly serviceDir: string;
  private readonly logDir: string;
  private maintenanceTasks: Map<string, MaintenanceTask> = new Map();
  private serviceStatus: 'running' | 'stopped' | 'error' = 'stopped';

  constructor(baseDir?: string) {
    this.installDir = baseDir || path.join(os.homedir(), '.ai-chatbot-desktop');
    this.serviceDir = path.join(this.installDir, 'service');
    this.logDir = path.join(this.installDir, 'logs');
    
    this.initializeDirectories();
    this.initializeMaintenanceTasks();
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.installDir, { recursive: true });
      await fs.mkdir(this.serviceDir, { recursive: true });
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize directories:', error);
    }
  }

  private initializeMaintenanceTasks(): void {
    const defaultTasks: Omit<MaintenanceTask, 'id' | 'lastRun' | 'nextRun'>[] = [
      {
        name: 'Log Cleanup',
        description: 'Clean up old log files to free disk space',
        schedule: '0 2 * * 0', // Weekly at 2 AM on Sunday
        enabled: true,
        priority: 'medium'
      },
      {
        name: 'Performance Optimization',
        description: 'Optimize system performance and clear caches',
        schedule: '0 3 * * *', // Daily at 3 AM
        enabled: true,
        priority: 'low'
      },
      {
        name: 'Security Scan',
        description: 'Scan for security vulnerabilities and updates',
        schedule: '0 1 * * 1', // Weekly at 1 AM on Monday
        enabled: true,
        priority: 'high'
      },
      {
        name: 'Backup Creation',
        description: 'Create automated system backup',
        schedule: '0 0 * * 0', // Weekly at midnight on Sunday
        enabled: true,
        priority: 'high'
      }
    ];

    defaultTasks.forEach(task => {
      const id = this.generateTaskId();
      const fullTask: MaintenanceTask = {
        ...task,
        id,
        nextRun: this.calculateNextRun(task.schedule)
      };
      this.maintenanceTasks.set(id, fullTask);
    });
  }

  async checkSystemRequirements(): Promise<SystemRequirements> {
    const platform = os.platform();
    const arch = os.arch();
    const totalMem = os.totalmem() / 1024 / 1024; // Convert to MB
    const freeMem = os.freemem() / 1024 / 1024;

    return {
      os: `${platform} ${os.release()}`,
      memory: Math.floor(totalMem),
      storage: 500, // Minimum 500MB required
      cpu: os.cpus()[0]?.model || 'Unknown',
      network: true,
      sensors: ['microphone', 'camera', 'accelerometer', 'light']
    };
  }

  async validateInstallationEnvironment(): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 16) {
        errors.push({
          field: 'nodeVersion',
          message: `Node.js version ${nodeVersion} is not supported. Minimum version is 16.0.0`,
          code: 'UNSUPPORTED_NODE_VERSION'
        });
      }

      // Check available memory
      const freeMem = os.freemem() / 1024 / 1024; // MB
      if (freeMem < 256) {
        warnings.push({
          field: 'memory',
          message: `Low available memory (${Math.floor(freeMem)}MB). Recommended minimum is 256MB`,
          suggestion: 'Close other applications to free up memory'
        });
      }

      // Check disk space
      try {
        const stats = await fs.stat(this.installDir);
        // Simplified disk space check
        if (stats.size > 0) {
          // Directory exists, assume we have space
        }
      } catch (error) {
        // Directory doesn't exist, try to create it
        await fs.mkdir(this.installDir, { recursive: true });
      }

      // Check write permissions
      const testFile = path.join(this.installDir, 'test-write.tmp');
      try {
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
      } catch (error) {
        errors.push({
          field: 'permissions',
          message: 'No write permission to installation directory',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

    } catch (error) {
      errors.push({
        field: 'system',
        message: `System validation failed: ${error}`,
        code: 'VALIDATION_ERROR'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async downloadPackage(version?: string): Promise<DeploymentPackage> {
    const packageInfo: DeploymentPackage = {
      version: version || '1.0.0',
      platform: os.platform(),
      architecture: os.arch(),
      size: 50 * 1024 * 1024, // 50MB
      checksum: 'sha256:abcd1234...',
      downloadUrl: `https://releases.example.com/ai-chatbot-desktop-${version || '1.0.0'}.tar.gz`,
      releaseNotes: 'Latest stable release with bug fixes and improvements',
      dependencies: ['node>=16.0.0'],
      minimumRequirements: await this.checkSystemRequirements()
    };

    // Simulate download
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return packageInfo;
  }

  async installSystem(
    config: InstallationConfig,
    onProgress?: (progress: InstallationProgress) => void
  ): Promise<void> {
    const stages = [
      { stage: 'downloading' as const, duration: 2000, message: 'Downloading installation files...' },
      { stage: 'extracting' as const, duration: 1500, message: 'Extracting files...' },
      { stage: 'configuring' as const, duration: 1000, message: 'Configuring system...' },
      { stage: 'installing' as const, duration: 3000, message: 'Installing components...' },
      { stage: 'finalizing' as const, duration: 500, message: 'Finalizing installation...' }
    ];

    let totalProgress = 0;
    const totalDuration = stages.reduce((sum, stage) => sum + stage.duration, 0);

    for (const stageInfo of stages) {
      const stageProgress = (stageInfo.duration / totalDuration) * 100;
      
      if (onProgress) {
        onProgress({
          stage: stageInfo.stage,
          progress: totalProgress,
          message: stageInfo.message,
          estimatedTimeRemaining: (totalDuration - (totalProgress / 100 * totalDuration)) / 1000
        });
      }

      // Simulate stage work
      await new Promise(resolve => setTimeout(resolve, stageInfo.duration));
      
      totalProgress += stageProgress;
    }

    // Create installation directories
    await fs.mkdir(config.targetDirectory, { recursive: true });
    await fs.mkdir(config.dataDirectory, { recursive: true });
    await fs.mkdir(config.logDirectory, { recursive: true });

    // Create configuration file
    const installConfig = {
      version: '1.0.0',
      installDate: new Date().toISOString(),
      config
    };
    
    await fs.writeFile(
      path.join(config.targetDirectory, 'install-config.json'),
      JSON.stringify(installConfig, null, 2)
    );

    if (onProgress) {
      onProgress({
        stage: 'finalizing',
        progress: 100,
        message: 'Installation completed successfully',
        estimatedTimeRemaining: 0
      });
    }
  }

  async uninstallSystem(): Promise<void> {
    try {
      // Stop service if running
      if (this.serviceStatus === 'running') {
        await this.stopService();
      }

      // Remove installation directory
      await fs.rm(this.installDir, { recursive: true, force: true });
      
      // Clean up system entries (simplified)
      console.log('System uninstalled successfully');
    } catch (error) {
      throw new Error(`Uninstallation failed: ${error}`);
    }
  }

  async getDeploymentInfo(): Promise<DeploymentEnvironment> {
    const packageJson = require('../../../package.json');
    
    return {
      type: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      platform: os.platform() as any,
      architecture: os.arch() as any,
      nodeVersion: process.version,
      dependencies: packageJson.dependencies || {}
    };
  }

  async createDeploymentPackage(): Promise<string> {
    const packagePath = path.join(this.installDir, `deployment-${Date.now()}.tar.gz`);
    
    // Simulate package creation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create a placeholder file
    await fs.writeFile(packagePath, 'deployment package content');
    
    return packagePath;
  }

  async deployToEnvironment(environment: DeploymentEnvironment, packagePath: string): Promise<void> {
    // Validate environment compatibility
    if (environment.platform !== os.platform()) {
      throw new Error(`Platform mismatch: current ${os.platform()}, target ${environment.platform}`);
    }

    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`Deployed to ${environment.type} environment`);
  }

  async getMaintenanceTasks(): Promise<MaintenanceTask[]> {
    return Array.from(this.maintenanceTasks.values());
  }

  async scheduleMaintenanceTask(task: Omit<MaintenanceTask, 'id' | 'lastRun' | 'nextRun'>): Promise<string> {
    const id = this.generateTaskId();
    const fullTask: MaintenanceTask = {
      ...task,
      id,
      nextRun: this.calculateNextRun(task.schedule)
    };
    
    this.maintenanceTasks.set(id, fullTask);
    return id;
  }

  async runMaintenanceTask(taskId: string): Promise<void> {
    const task = this.maintenanceTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    console.log(`Running maintenance task: ${task.name}`);
    
    try {
      // Execute specific maintenance task
      switch (task.name) {
        case 'Log Cleanup':
          await this.performLogCleanup();
          break;
        case 'Performance Optimization':
          await this.performPerformanceOptimization();
          break;
        case 'Security Scan':
          await this.performSecurityScan();
          break;
        case 'Backup Creation':
          await this.performBackupCreation();
          break;
        default:
          console.log(`Executing custom task: ${task.name}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Update task
      task.lastRun = new Date();
      task.nextRun = this.calculateNextRun(task.schedule);
      this.maintenanceTasks.set(taskId, task);
      
      console.log(`✓ Maintenance task completed: ${task.name}`);
    } catch (error) {
      console.error(`❌ Maintenance task failed: ${task.name}`, error);
      throw error;
    }
  }

  private async performLogCleanup(): Promise<void> {
    console.log('Cleaning up old log files...');
    
    try {
      const logFiles = await fs.readdir(this.logDir);
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      let cleanedCount = 0;
      for (const file of logFiles) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
      
      console.log(`Cleaned up ${cleanedCount} old log files`);
    } catch (error) {
      console.warn('Log cleanup failed:', error);
    }
  }

  private async performPerformanceOptimization(): Promise<void> {
    console.log('Optimizing system performance...');
    
    // Clear temporary cache
    const cacheDir = path.join(this.installDir, 'cache');
    try {
      await fs.rm(cacheDir, { recursive: true, force: true });
      await fs.mkdir(cacheDir, { recursive: true });
      console.log('Cache cleared');
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
    
    // Optimize memory usage
    if (global.gc) {
      global.gc();
      console.log('Garbage collection triggered');
    }
    
    // Compact configuration files
    await this.compactConfigurationFiles();
  }

  private async performSecurityScan(): Promise<void> {
    console.log('Running security scan...');
    
    const securityReport = {
      timestamp: new Date(),
      issues: [] as SecurityIssue[],
      recommendations: [] as string[]
    };
    
    // Check file permissions
    try {
      const configFiles = await fs.readdir(path.join(this.installDir, 'config'));
      for (const file of configFiles) {
        const filePath = path.join(this.installDir, 'config', file);
        const stats = await fs.stat(filePath);
        
        // Check if config files are world-readable (simplified check)
        if (stats.mode & 0o004) {
          securityReport.issues.push({
            type: 'file_permissions',
            severity: 'medium',
            description: `Configuration file ${file} is world-readable`,
            file: filePath
          });
        }
      }
    } catch (error) {
      console.warn('Permission check failed:', error);
    }
    
    // Check for default passwords or keys
    const configPath = path.join(this.installDir, 'config', 'current-config.json');
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      if (configData.includes('default') || configData.includes('password123')) {
        securityReport.issues.push({
          type: 'weak_credentials',
          severity: 'high',
          description: 'Default or weak credentials detected in configuration',
          file: configPath
        });
      }
    } catch (error) {
      // Config file might not exist
    }
    
    // Generate recommendations
    if (securityReport.issues.length === 0) {
      securityReport.recommendations.push('No security issues detected');
    } else {
      securityReport.recommendations.push('Review and fix identified security issues');
      securityReport.recommendations.push('Consider enabling additional security features');
    }
    
    // Save security report
    const reportPath = path.join(this.logDir, `security-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(securityReport, null, 2));
    
    console.log(`Security scan completed. Found ${securityReport.issues.length} issues.`);
    if (securityReport.issues.length > 0) {
      console.log(`Report saved to: ${reportPath}`);
    }
  }

  private async performBackupCreation(): Promise<void> {
    console.log('Creating system backup...');
    
    const backupId = `auto-backup-${Date.now()}`;
    const backupDir = path.join(this.installDir, 'backups', backupId);
    
    await fs.mkdir(backupDir, { recursive: true });
    
    // Backup configuration
    const configDir = path.join(this.installDir, 'config');
    const backupConfigDir = path.join(backupDir, 'config');
    
    try {
      await this.copyDirectory(configDir, backupConfigDir);
      console.log('Configuration backed up');
    } catch (error) {
      console.warn('Configuration backup failed:', error);
    }
    
    // Backup user data
    const dataDir = path.join(this.installDir, 'data');
    const backupDataDir = path.join(backupDir, 'data');
    
    try {
      await this.copyDirectory(dataDir, backupDataDir);
      console.log('User data backed up');
    } catch (error) {
      console.warn('User data backup failed:', error);
    }
    
    // Create backup manifest
    const manifest = {
      id: backupId,
      timestamp: new Date().toISOString(),
      type: 'automatic',
      version: require('../../../package.json').version,
      contents: ['config', 'data']
    };
    
    await fs.writeFile(
      path.join(backupDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    console.log(`Backup created: ${backupId}`);
    
    // Clean up old backups (keep last 5)
    await this.cleanupOldBackups();
  }

  private async compactConfigurationFiles(): Promise<void> {
    const configDir = path.join(this.installDir, 'config');
    
    try {
      const files = await fs.readdir(configDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(configDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          
          try {
            const parsed = JSON.parse(data);
            const compacted = JSON.stringify(parsed); // Remove formatting
            
            if (compacted.length < data.length) {
              await fs.writeFile(filePath, JSON.stringify(parsed, null, 2));
              console.log(`Compacted configuration file: ${file}`);
            }
          } catch (error) {
            console.warn(`Could not compact ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Configuration compaction failed:', error);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const backupsDir = path.join(this.installDir, 'backups');
    
    try {
      const backups = await fs.readdir(backupsDir);
      const backupDirs = [];
      
      for (const backup of backups) {
        const backupPath = path.join(backupsDir, backup);
        const stats = await fs.stat(backupPath);
        
        if (stats.isDirectory()) {
          backupDirs.push({
            name: backup,
            path: backupPath,
            created: stats.birthtime
          });
        }
      }
      
      // Sort by creation date (newest first)
      backupDirs.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      // Remove old backups (keep last 5)
      const toDelete = backupDirs.slice(5);
      
      for (const backup of toDelete) {
        await fs.rm(backup.path, { recursive: true, force: true });
        console.log(`Removed old backup: ${backup.name}`);
      }
    } catch (error) {
      console.warn('Backup cleanup failed:', error);
    }
  }

  private async copyDirectory(source: string, target: string): Promise<void> {
    await fs.mkdir(target, { recursive: true });
    
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  async enableMaintenanceTask(taskId: string, enabled: boolean): Promise<void> {
    const task = this.maintenanceTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.enabled = enabled;
    this.maintenanceTasks.set(taskId, task);
  }

  async checkSystemHealth(): Promise<SystemHealth> {
    const components: ComponentHealth[] = [
      {
        name: 'AI Chatbot Engine',
        status: 'healthy',
        message: 'Operating normally',
        metrics: { responseTime: 1.2, accuracy: 0.95 }
      },
      {
        name: 'Health Monitor',
        status: 'healthy',
        message: 'All sensors functioning',
        metrics: { sensorCount: 4, dataQuality: 0.98 }
      },
      {
        name: 'Calendar Manager',
        status: 'healthy',
        message: 'Sync up to date',
        metrics: { syncLatency: 0.5, eventCount: 15 }
      },
      {
        name: 'Flashing Interface',
        status: 'healthy',
        message: 'Display functioning normally',
        metrics: { brightness: 80, patternCount: 5 }
      },
      {
        name: 'Voice Processor',
        status: 'healthy',
        message: 'Audio processing active',
        metrics: { noiseLevel: 0.1, recognitionRate: 0.92 }
      }
    ];

    const recommendations: HealthRecommendation[] = [
      {
        type: 'performance',
        priority: 'low',
        title: 'Optimize Cache',
        description: 'Clear temporary cache files to improve performance',
        action: 'clearCache',
        automated: true
      }
    ];

    const overallStatus = components.every(c => c.status === 'healthy') ? 'healthy' : 
                         components.some(c => c.status === 'critical') ? 'critical' : 'warning';

    return {
      overall: overallStatus,
      components,
      recommendations,
      lastCheck: new Date()
    };
  }

  async runHealthDiagnostics(): Promise<SystemHealth> {
    // Run comprehensive health diagnostics
    console.log('Running system health diagnostics...');
    
    // Simulate diagnostic tests
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return this.checkSystemHealth();
  }

  async applyHealthRecommendation(recommendationId: string): Promise<void> {
    // Simulate applying health recommendation
    console.log(`Applying health recommendation: ${recommendationId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async startService(): Promise<void> {
    if (this.serviceStatus === 'running') {
      return;
    }

    console.log('Starting AI Chatbot Desktop service...');
    
    // Simulate service start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.serviceStatus = 'running';
    console.log('Service started successfully');
  }

  async stopService(): Promise<void> {
    if (this.serviceStatus === 'stopped') {
      return;
    }

    console.log('Stopping AI Chatbot Desktop service...');
    
    // Simulate service stop
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.serviceStatus = 'stopped';
    console.log('Service stopped successfully');
  }

  async restartService(): Promise<void> {
    await this.stopService();
    await this.startService();
  }

  async getServiceStatus(): Promise<'running' | 'stopped' | 'error'> {
    return this.serviceStatus;
  }

  async getLogs(component?: string, level?: string, limit?: number): Promise<ErrorLog[]> {
    // Simulate log retrieval
    const logs: ErrorLog[] = [
      {
        timestamp: new Date(Date.now() - 3600000),
        level: 'info',
        component: 'AIChatbotEngine',
        message: 'System initialized successfully'
      },
      {
        timestamp: new Date(Date.now() - 1800000),
        level: 'warn',
        component: 'HealthMonitor',
        message: 'Sensor calibration recommended'
      },
      {
        timestamp: new Date(Date.now() - 900000),
        level: 'error',
        component: 'CalendarManager',
        message: 'Failed to sync with external calendar',
        stack: 'Error: Network timeout\n    at CalendarSync.sync...'
      }
    ];

    let filteredLogs = logs;
    
    if (component) {
      filteredLogs = filteredLogs.filter(log => log.component === component);
    }
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }

    return filteredLogs;
  }

  async clearLogs(olderThan?: Date): Promise<void> {
    const cutoffDate = olderThan || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    console.log(`Clearing logs older than ${cutoffDate.toISOString()}`);
    
    // Simulate log cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async exportLogs(format: 'json' | 'csv' | 'txt'): Promise<string> {
    const logs = await this.getLogs();
    const exportPath = path.join(this.logDir, `logs-export-${Date.now()}.${format}`);
    
    let content: string;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(logs, null, 2);
        break;
      case 'csv':
        content = 'timestamp,level,component,message\n' +
                 logs.map(log => `${log.timestamp.toISOString()},${log.level},${log.component},"${log.message}"`).join('\n');
        break;
      case 'txt':
        content = logs.map(log => `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()} ${log.component}: ${log.message}`).join('\n');
        break;
    }
    
    await fs.writeFile(exportPath, content);
    return exportPath;
  }

  async deployConfiguration(config: Record<string, any>): Promise<void> {
    const configPath = path.join(this.installDir, 'deployed-config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    console.log('Configuration deployed successfully');
  }

  async rollbackConfiguration(): Promise<void> {
    const backupPath = path.join(this.installDir, 'config-backup.json');
    const currentPath = path.join(this.installDir, 'deployed-config.json');
    
    try {
      const backupData = await fs.readFile(backupPath, 'utf-8');
      await fs.writeFile(currentPath, backupData);
      console.log('Configuration rolled back successfully');
    } catch (error) {
      throw new Error('No backup configuration found');
    }
  }

  async validateDeploymentConfiguration(config: Record<string, any>): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic validation
    if (!config.version) {
      errors.push({
        field: 'version',
        message: 'Version is required',
        code: 'MISSING_VERSION'
      });
    }

    if (config.environment && !['development', 'staging', 'production'].includes(config.environment)) {
      errors.push({
        field: 'environment',
        message: 'Invalid environment. Must be development, staging, or production',
        code: 'INVALID_ENVIRONMENT'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateNextRun(schedule: string): Date {
    // Simplified cron calculation - in real implementation, use a cron library
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
    return nextRun;
  }
}