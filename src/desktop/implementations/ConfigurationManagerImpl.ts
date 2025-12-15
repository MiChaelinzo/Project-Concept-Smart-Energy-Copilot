/**
 * Configuration Manager Implementation
 * Handles user preferences, device configuration, and system settings
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigurationManager,
  UserPreferences,
  DeviceConfiguration,
  SystemStatus,
  DiagnosticInfo,
  UpdateInfo,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ErrorLog,
  PerformanceMetric,
  PersonalizationRecommendation,
  UsageAnalytics
} from '../interfaces/ConfigurationManager';

export class ConfigurationManagerImpl implements ConfigurationManager {
  private readonly configDir: string;
  private readonly userPrefsFile: string;
  private readonly deviceConfigFile: string;
  private readonly backupDir: string;
  private readonly logsDir: string;
  
  private userPreferences: UserPreferences | null = null;
  private deviceConfiguration: DeviceConfiguration | null = null;
  private performanceMetrics: PerformanceMetric[] = [];
  private errorLogs: ErrorLog[] = [];

  constructor(baseDir?: string) {
    this.configDir = baseDir || path.join(os.homedir(), '.ai-chatbot-desktop');
    this.userPrefsFile = path.join(this.configDir, 'user-preferences.json');
    this.deviceConfigFile = path.join(this.configDir, 'device-config.json');
    this.backupDir = path.join(this.configDir, 'backups');
    this.logsDir = path.join(this.configDir, 'logs');
    
    this.initializeDirectories();
    this.startPerformanceMonitoring();
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (error) {
      this.logError('ConfigurationManager', 'Failed to initialize directories', error);
    }
  }

  private startPerformanceMonitoring(): void {
    // Monitor system performance every 30 seconds
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000);
  }

  private async collectPerformanceMetrics(): Promise<void> {
    const timestamp = new Date();
    
    // Memory usage
    const memUsage = process.memoryUsage();
    this.performanceMetrics.push({
      timestamp,
      metric: 'memory_heap_used',
      value: memUsage.heapUsed / 1024 / 1024, // MB
      unit: 'MB',
      component: 'system'
    });

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.performanceMetrics.push({
      timestamp,
      metric: 'cpu_user_time',
      value: cpuUsage.user / 1000, // milliseconds
      unit: 'ms',
      component: 'system'
    });

    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  private logError(component: string, message: string, error?: any): void {
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
    
    console.error(`[${component}] ${message}`, error);
  }

  async getUserPreferences(): Promise<UserPreferences> {
    if (this.userPreferences) {
      return this.userPreferences;
    }

    try {
      const data = await fs.readFile(this.userPrefsFile, 'utf-8');
      this.userPreferences = JSON.parse(data);
      return this.userPreferences!;
    } catch (error) {
      // Return default preferences if file doesn't exist
      this.userPreferences = this.getDefaultUserPreferences();
      await this.saveUserPreferences();
      return this.userPreferences;
    }
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const current = await this.getUserPreferences();
    
    // Validate preferences before updating
    const validation = await this.validateUserPreferences(preferences);
    if (!validation.valid) {
      throw new Error(`Invalid preferences: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    // Log preference changes for audit trail
    this.logPreferenceChanges(current, preferences);
    
    this.userPreferences = this.mergeDeep(current, preferences);
    await this.saveUserPreferences();
    
    // Trigger preference change event for other components
    await this.notifyPreferenceChange(preferences);
  }

  private logPreferenceChanges(current: UserPreferences, changes: Partial<UserPreferences>): void {
    const changeLog = {
      timestamp: new Date().toISOString(),
      changes: this.getPreferenceChanges(current, changes),
      userId: 'default' // In a multi-user system, this would be the actual user ID
    };
    
    console.log('User preferences updated:', changeLog);
  }

  private getPreferenceChanges(current: UserPreferences, changes: Partial<UserPreferences>): Record<string, { from: any; to: any }> {
    const changeMap: Record<string, { from: any; to: any }> = {};
    
    const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
      const flattened: Record<string, any> = {};
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenObject(obj[key], fullKey));
        } else {
          flattened[fullKey] = obj[key];
        }
      }
      return flattened;
    };
    
    const currentFlat = flattenObject(current);
    const changesFlat = flattenObject(changes);
    
    for (const key in changesFlat) {
      if (currentFlat[key] !== changesFlat[key]) {
        changeMap[key] = {
          from: currentFlat[key],
          to: changesFlat[key]
        };
      }
    }
    
    return changeMap;
  }

  private async notifyPreferenceChange(preferences: Partial<UserPreferences>): Promise<void> {
    // In a real implementation, this would notify other components about preference changes
    // For example, if voice settings changed, notify the voice processor
    if (preferences.voiceSettings) {
      console.log('Voice settings changed, notifying voice processor...');
    }
    
    if (preferences.visualFeedback) {
      console.log('Visual feedback settings changed, notifying flashing interface...');
    }
    
    if (preferences.healthSettings) {
      console.log('Health settings changed, notifying health monitor...');
    }
    
    if (preferences.calendarSettings) {
      console.log('Calendar settings changed, notifying calendar manager...');
    }
  }

  async resetUserPreferences(): Promise<void> {
    this.userPreferences = this.getDefaultUserPreferences();
    await this.saveUserPreferences();
  }

  async exportUserPreferences(): Promise<string> {
    const preferences = await this.getUserPreferences();
    return JSON.stringify(preferences, null, 2);
  }

  async importUserPreferences(data: string): Promise<void> {
    try {
      const preferences = JSON.parse(data);
      const validation = await this.validateUserPreferences(preferences);
      
      if (!validation.valid) {
        throw new Error(`Invalid preferences: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      this.userPreferences = preferences;
      await this.saveUserPreferences();
    } catch (error) {
      this.logError('ConfigurationManager', 'Failed to import user preferences', error);
      throw error;
    }
  }

  async getDeviceConfiguration(): Promise<DeviceConfiguration> {
    if (this.deviceConfiguration) {
      return this.deviceConfiguration;
    }

    try {
      const data = await fs.readFile(this.deviceConfigFile, 'utf-8');
      this.deviceConfiguration = JSON.parse(data);
      return this.deviceConfiguration!;
    } catch (error) {
      // Return default configuration if file doesn't exist
      this.deviceConfiguration = this.getDefaultDeviceConfiguration();
      await this.saveDeviceConfiguration();
      return this.deviceConfiguration;
    }
  }

  async updateDeviceConfiguration(config: Partial<DeviceConfiguration>): Promise<void> {
    const current = await this.getDeviceConfiguration();
    this.deviceConfiguration = this.mergeDeep(current, config);
    await this.saveDeviceConfiguration();
  }

  async resetDeviceConfiguration(): Promise<void> {
    this.deviceConfiguration = this.getDefaultDeviceConfiguration();
    await this.saveDeviceConfiguration();
  }

  async calibrateSensors(): Promise<void> {
    // Simulate sensor calibration
    const config = await this.getDeviceConfiguration();
    
    // Update calibration data for each sensor
    const calibrationData = {
      timestamp: new Date().toISOString(),
      calibrated: true,
      baseline: Math.random() * 100
    };

    config.hardware.sensors.microphone.calibrationData = calibrationData;
    config.hardware.sensors.camera.calibrationData = calibrationData;
    config.hardware.sensors.accelerometer.calibrationData = calibrationData;
    config.hardware.sensors.lightSensor.calibrationData = calibrationData;

    await this.updateDeviceConfiguration(config);
  }

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
      cpuUsage: Math.random() * 100, // Simplified CPU usage
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
      performanceMetrics: [...this.performanceMetrics],
      configurationSummary: {
        userPreferences: await this.getUserPreferences(),
        deviceConfiguration: await this.getDeviceConfiguration()
      }
    };
  }

  async runSystemDiagnostics(): Promise<DiagnosticInfo> {
    // Run comprehensive diagnostics
    await this.collectPerformanceMetrics();
    
    // Test component health
    const components = ['aiEngine', 'healthMonitor', 'calendarManager', 'flashingInterface', 'voiceProcessor'];
    for (const component of components) {
      try {
        // Simulate component health check
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logError(component, 'Health check failed', error);
      }
    }

    return this.getDiagnosticInfo();
  }

  async checkForUpdates(): Promise<UpdateInfo> {
    const packageJson = require('../../../package.json');
    
    // Simulate update check
    return {
      currentVersion: packageJson.version,
      availableVersion: '1.1.0',
      updateAvailable: true,
      releaseNotes: 'Bug fixes and performance improvements',
      downloadUrl: 'https://example.com/updates/v1.1.0',
      updateSize: 50 * 1024 * 1024, // 50MB
      criticalUpdate: false
    };
  }

  async downloadUpdate(): Promise<void> {
    // Simulate update download
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async installUpdate(): Promise<void> {
    // Simulate update installation
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async rollbackUpdate(): Promise<void> {
    // Simulate update rollback
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async createSystemBackup(): Promise<string> {
    const backupId = `backup_${Date.now()}`;
    const backupPath = path.join(this.backupDir, `${backupId}.json`);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      userPreferences: await this.getUserPreferences(),
      deviceConfiguration: await this.getDeviceConfiguration(),
      version: require('../../../package.json').version
    };

    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    return backupId;
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    const backupPath = path.join(this.backupDir, `${backupId}.json`);
    
    try {
      const data = await fs.readFile(backupPath, 'utf-8');
      const backup = JSON.parse(data);
      
      this.userPreferences = backup.userPreferences;
      this.deviceConfiguration = backup.deviceConfiguration;
      
      await this.saveUserPreferences();
      await this.saveDeviceConfiguration();
    } catch (error) {
      this.logError('ConfigurationManager', 'Failed to restore from backup', error);
      throw error;
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(file => file.endsWith('.json') && file.startsWith('backup_'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backupPath = path.join(this.backupDir, `${backupId}.json`);
    await fs.unlink(backupPath);
  }

  async validateConfiguration(config: Partial<DeviceConfiguration>): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate hardware settings
    if (config.hardware?.display?.brightness !== undefined) {
      if (config.hardware.display.brightness < 0 || config.hardware.display.brightness > 100) {
        errors.push({
          field: 'hardware.display.brightness',
          message: 'Brightness must be between 0 and 100',
          code: 'INVALID_RANGE'
        });
      }
    }

    // Validate performance settings
    if (config.performance?.memoryLimit !== undefined) {
      if (config.performance.memoryLimit < 128) {
        warnings.push({
          field: 'performance.memoryLimit',
          message: 'Memory limit below 128MB may cause performance issues',
          suggestion: 'Consider setting at least 256MB'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateUserPreferences(preferences: Partial<UserPreferences>): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate voice settings
    if (preferences.voiceSettings?.speechRate !== undefined) {
      if (preferences.voiceSettings.speechRate < 0.5 || preferences.voiceSettings.speechRate > 2.0) {
        errors.push({
          field: 'voiceSettings.speechRate',
          message: 'Speech rate must be between 0.5 and 2.0',
          code: 'INVALID_RANGE'
        });
      }
    }

    if (preferences.voiceSettings?.volume !== undefined) {
      if (preferences.voiceSettings.volume < 0 || preferences.voiceSettings.volume > 1.0) {
        errors.push({
          field: 'voiceSettings.volume',
          message: 'Volume must be between 0 and 1.0',
          code: 'INVALID_RANGE'
        });
      }
    }

    // Validate visual feedback settings
    if (preferences.visualFeedback?.brightness !== undefined) {
      if (preferences.visualFeedback.brightness < 0 || preferences.visualFeedback.brightness > 100) {
        errors.push({
          field: 'visualFeedback.brightness',
          message: 'Brightness must be between 0 and 100',
          code: 'INVALID_RANGE'
        });
      }
    }

    // Validate health settings
    if (preferences.healthSettings?.sedentaryReminderInterval !== undefined) {
      if (preferences.healthSettings.sedentaryReminderInterval < 15) {
        warnings.push({
          field: 'healthSettings.sedentaryReminderInterval',
          message: 'Very frequent reminders may be disruptive',
          suggestion: 'Consider intervals of 30 minutes or more'
        });
      }
      
      if (preferences.healthSettings.sedentaryReminderInterval > 480) { // 8 hours
        warnings.push({
          field: 'healthSettings.sedentaryReminderInterval',
          message: 'Very long intervals may reduce health benefits',
          suggestion: 'Consider intervals of 2 hours or less'
        });
      }
    }

    if (preferences.healthSettings?.hydrationReminderInterval !== undefined) {
      if (preferences.healthSettings.hydrationReminderInterval < 30) {
        warnings.push({
          field: 'healthSettings.hydrationReminderInterval',
          message: 'Very frequent hydration reminders may be excessive',
          suggestion: 'Consider intervals of 60 minutes or more'
        });
      }
    }

    // Validate calendar settings
    if (preferences.calendarSettings?.defaultReminderTime !== undefined) {
      if (preferences.calendarSettings.defaultReminderTime < 0) {
        errors.push({
          field: 'calendarSettings.defaultReminderTime',
          message: 'Reminder time cannot be negative',
          code: 'INVALID_VALUE'
        });
      }
      
      if (preferences.calendarSettings.defaultReminderTime > 1440) { // 24 hours
        warnings.push({
          field: 'calendarSettings.defaultReminderTime',
          message: 'Very long reminder times may not be effective',
          suggestion: 'Consider reminder times of 24 hours or less'
        });
      }
    }

    // Validate working hours
    if (preferences.calendarSettings?.workingHours) {
      const { start, end } = preferences.calendarSettings.workingHours;
      if (start && end) {
        const startTime = this.parseTime(start);
        const endTime = this.parseTime(end);
        
        if (!startTime || !endTime) {
          errors.push({
            field: 'calendarSettings.workingHours',
            message: 'Working hours must be in HH:MM format',
            code: 'INVALID_FORMAT'
          });
        } else if (startTime >= endTime) {
          errors.push({
            field: 'calendarSettings.workingHours',
            message: 'Start time must be before end time',
            code: 'INVALID_RANGE'
          });
        }
      }
    }

    // Validate privacy settings
    if (preferences.privacySettings?.dataRetentionDays !== undefined) {
      if (preferences.privacySettings.dataRetentionDays < 1) {
        errors.push({
          field: 'privacySettings.dataRetentionDays',
          message: 'Data retention must be at least 1 day',
          code: 'INVALID_RANGE'
        });
      }
      
      if (preferences.privacySettings.dataRetentionDays > 365) {
        warnings.push({
          field: 'privacySettings.dataRetentionDays',
          message: 'Long data retention periods may impact privacy',
          suggestion: 'Consider shorter retention periods for better privacy'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private parseTime(timeString: string): number | null {
    const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    
    return hours * 60 + minutes; // Return minutes since midnight
  }

  // Personalization features
  async getPersonalizedRecommendations(): Promise<PersonalizationRecommendation[]> {
    const preferences = await this.getUserPreferences();
    const systemStatus = await this.getSystemStatus();
    const recommendations: PersonalizationRecommendation[] = [];

    // Analyze usage patterns and suggest improvements
    if (preferences.healthSettings.sedentaryReminderInterval > 120) {
      recommendations.push({
        type: 'health',
        priority: 'medium',
        title: 'Optimize Movement Reminders',
        description: 'Based on health research, shorter reminder intervals can improve wellness',
        suggestedValue: 60,
        currentValue: preferences.healthSettings.sedentaryReminderInterval,
        field: 'healthSettings.sedentaryReminderInterval'
      });
    }

    // Visual feedback optimization based on time of day
    const currentHour = new Date().getHours();
    if (currentHour >= 18 || currentHour <= 6) { // Evening/night
      if (preferences.visualFeedback.brightness > 50) {
        recommendations.push({
          type: 'comfort',
          priority: 'low',
          title: 'Reduce Evening Brightness',
          description: 'Lower brightness in the evening can reduce eye strain and improve sleep',
          suggestedValue: 30,
          currentValue: preferences.visualFeedback.brightness,
          field: 'visualFeedback.brightness'
        });
      }
    }

    // Performance optimization suggestions
    if (systemStatus.memoryUsage.percentage > 80) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Optimize Memory Usage',
        description: 'High memory usage detected. Consider reducing cache size or enabling performance mode',
        suggestedValue: true,
        currentValue: false,
        field: 'performance.optimizationMode'
      });
    }

    // Calendar optimization based on usage
    const workingHours = preferences.calendarSettings.workingHours;
    const workDuration = this.parseTime(workingHours.end)! - this.parseTime(workingHours.start)!;
    if (workDuration > 10 * 60) { // More than 10 hours
      recommendations.push({
        type: 'wellness',
        priority: 'medium',
        title: 'Consider Shorter Work Days',
        description: 'Long work days can impact productivity and health. Consider breaks or shorter sessions',
        suggestedValue: '09:00-17:00',
        currentValue: `${workingHours.start}-${workingHours.end}`,
        field: 'calendarSettings.workingHours'
      });
    }

    return recommendations;
  }

  async applyPersonalizationRecommendation(recommendationId: string): Promise<void> {
    const recommendations = await this.getPersonalizedRecommendations();
    const recommendation = recommendations.find(r => r.field === recommendationId);
    
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    // Apply the recommendation
    const updatePath = recommendation.field.split('.');
    const preferences = await this.getUserPreferences();
    
    let current: any = preferences;
    for (let i = 0; i < updatePath.length - 1; i++) {
      current = current[updatePath[i]];
    }
    
    current[updatePath[updatePath.length - 1]] = recommendation.suggestedValue;
    
    await this.updateUserPreferences(preferences);
    
    console.log(`Applied personalization recommendation: ${recommendation.title}`);
  }

  async getUsageAnalytics(): Promise<UsageAnalytics> {
    // In a real implementation, this would analyze actual usage data
    return {
      totalInteractions: Math.floor(Math.random() * 1000) + 500,
      averageSessionDuration: Math.floor(Math.random() * 30) + 15, // minutes
      mostUsedFeatures: [
        { feature: 'Voice Commands', usage: 45 },
        { feature: 'Health Reminders', usage: 30 },
        { feature: 'Calendar Management', usage: 20 },
        { feature: 'Visual Feedback', usage: 5 }
      ],
      peakUsageHours: [9, 10, 14, 15, 16], // Hours of day
      preferenceChangeFrequency: Math.floor(Math.random() * 10) + 1, // Changes per week
      lastAnalyzed: new Date()
    };
  }

  private async saveUserPreferences(): Promise<void> {
    if (this.userPreferences) {
      await fs.writeFile(this.userPrefsFile, JSON.stringify(this.userPreferences, null, 2));
    }
  }

  private async saveDeviceConfiguration(): Promise<void> {
    if (this.deviceConfiguration) {
      await fs.writeFile(this.deviceConfigFile, JSON.stringify(this.deviceConfiguration, null, 2));
    }
  }

  private getDefaultUserPreferences(): UserPreferences {
    return {
      voiceSettings: {
        language: 'en-US',
        speechRate: 1.0,
        volume: 0.8,
        wakeWord: 'hey assistant'
      },
      visualFeedback: {
        brightness: 80,
        colorScheme: 'default',
        animationSpeed: 'normal',
        enablePatterns: true
      },
      healthSettings: {
        sedentaryReminderInterval: 60,
        hydrationReminderInterval: 120,
        enablePostureMonitoring: true,
        privacyMode: false
      },
      calendarSettings: {
        defaultReminderTime: 15,
        workingHours: {
          start: '09:00',
          end: '17:00'
        },
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        externalCalendars: []
      },
      privacySettings: {
        localProcessingOnly: false,
        dataRetentionDays: 30,
        shareAnonymousUsage: true,
        requireConfirmationForActions: false
      },
      accessibilitySettings: {
        enableVoiceOnly: false,
        enableHighContrast: false,
        enableLargeText: false,
        enableScreenReader: false
      }
    };
  }

  private getDefaultDeviceConfiguration(): DeviceConfiguration {
    return {
      hardware: {
        deviceId: `device_${Date.now()}`,
        firmwareVersion: '1.0.0',
        sensors: {
          microphone: { enabled: true, sensitivity: 0.8 },
          camera: { enabled: true, sensitivity: 0.7 },
          accelerometer: { enabled: true, sensitivity: 0.6 },
          lightSensor: { enabled: true, sensitivity: 0.5 }
        },
        display: {
          type: 'led',
          resolution: { width: 64, height: 64 },
          brightness: 80
        },
        audio: {
          inputGain: 0.8,
          outputVolume: 0.7,
          noiseReduction: true
        }
      },
      network: {
        wifi: {
          ssid: '',
          security: 'wpa2',
          autoConnect: true
        },
        bluetooth: {
          enabled: true,
          discoverable: false,
          pairedDevices: []
        },
        cloudEndpoints: {
          aiService: 'https://api.example.com/ai',
          energyService: 'https://api.example.com/energy',
          calendarService: 'https://api.example.com/calendar',
          healthService: 'https://api.example.com/health'
        }
      },
      performance: {
        cpuThrottling: false,
        memoryLimit: 512,
        cacheSize: 128,
        logLevel: 'info'
      }
    };
  }

  private mergeDeep(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeDeep(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}