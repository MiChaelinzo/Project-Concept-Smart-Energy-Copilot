/**
 * Deployment Manager Interface
 * Handles installation, deployment, and maintenance procedures
 */

import { ValidationResult, ValidationError, ValidationWarning } from './ConfigurationManager';

export interface InstallationConfig {
  targetDirectory: string;
  createDesktopShortcut: boolean;
  createStartMenuEntry: boolean;
  autoStart: boolean;
  installAsService: boolean;
  dataDirectory: string;
  logDirectory: string;
}

export interface DeploymentEnvironment {
  type: 'development' | 'staging' | 'production';
  platform: 'windows' | 'linux' | 'macos';
  architecture: 'x64' | 'arm64';
  nodeVersion: string;
  dependencies: Record<string, string>;
}

export interface InstallationProgress {
  stage: 'downloading' | 'extracting' | 'configuring' | 'installing' | 'finalizing';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // seconds
}

export interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  schedule: string; // cron expression
  lastRun?: Date;
  nextRun: Date;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: ComponentHealth[];
  recommendations: HealthRecommendation[];
  lastCheck: Date;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  message: string;
  metrics?: Record<string, number>;
}

export interface HealthRecommendation {
  type: 'performance' | 'security' | 'maintenance' | 'configuration';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: string;
  automated: boolean;
}

export interface DeploymentPackage {
  version: string;
  platform: string;
  architecture: string;
  size: number;
  checksum: string;
  downloadUrl: string;
  releaseNotes: string;
  dependencies: string[];
  minimumRequirements: SystemRequirements;
}

export interface SystemRequirements {
  os: string;
  memory: number; // MB
  storage: number; // MB
  cpu: string;
  network: boolean;
  sensors?: string[];
}

export interface DeploymentManager {
  // Installation procedures
  checkSystemRequirements(): Promise<SystemRequirements>;
  validateInstallationEnvironment(): Promise<ValidationResult>;
  downloadPackage(version?: string): Promise<DeploymentPackage>;
  installSystem(config: InstallationConfig, onProgress?: (progress: InstallationProgress) => void): Promise<void>;
  uninstallSystem(): Promise<void>;
  
  // Deployment management
  getDeploymentInfo(): Promise<DeploymentEnvironment>;
  createDeploymentPackage(): Promise<string>; // Returns package path
  deployToEnvironment(environment: DeploymentEnvironment, packagePath: string): Promise<void>;
  
  // System maintenance
  getMaintenanceTasks(): Promise<MaintenanceTask[]>;
  scheduleMaintenanceTask(task: Omit<MaintenanceTask, 'id' | 'lastRun' | 'nextRun'>): Promise<string>;
  runMaintenanceTask(taskId: string): Promise<void>;
  enableMaintenanceTask(taskId: string, enabled: boolean): Promise<void>;
  
  // Health monitoring
  checkSystemHealth(): Promise<SystemHealth>;
  runHealthDiagnostics(): Promise<SystemHealth>;
  applyHealthRecommendation(recommendationId: string): Promise<void>;
  
  // Service management
  startService(): Promise<void>;
  stopService(): Promise<void>;
  restartService(): Promise<void>;
  getServiceStatus(): Promise<'running' | 'stopped' | 'error'>;
  
  // Log management
  getLogs(component?: string, level?: string, limit?: number): Promise<ErrorLog[]>;
  clearLogs(olderThan?: Date): Promise<void>;
  exportLogs(format: 'json' | 'csv' | 'txt'): Promise<string>;
  
  // Configuration deployment
  deployConfiguration(config: Record<string, any>): Promise<void>;
  rollbackConfiguration(): Promise<void>;
  validateDeploymentConfiguration(config: Record<string, any>): Promise<ValidationResult>;
}

export interface ErrorLog {
  timestamp: Date;
  level: string;
  component: string;
  message: string;
  stack?: string;
}

export interface SecurityIssue {
  type: 'file_permissions' | 'weak_credentials' | 'outdated_dependencies' | 'configuration_exposure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  recommendation?: string;
}