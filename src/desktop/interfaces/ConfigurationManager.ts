/**
 * Configuration Manager Interface
 * Handles user preferences, device configuration, and system settings
 */

export interface UserPreferences {
  // AI Chatbot preferences
  voiceSettings: {
    language: string;
    speechRate: number;
    volume: number;
    wakeWord: string;
  };
  
  // Visual interface preferences
  visualFeedback: {
    brightness: number;
    colorScheme: 'default' | 'high-contrast' | 'colorblind-friendly';
    animationSpeed: 'slow' | 'normal' | 'fast';
    enablePatterns: boolean;
  };
  
  // Health monitoring preferences
  healthSettings: {
    sedentaryReminderInterval: number; // minutes
    hydrationReminderInterval: number; // minutes
    enablePostureMonitoring: boolean;
    privacyMode: boolean;
  };
  
  // Calendar preferences
  calendarSettings: {
    defaultReminderTime: number; // minutes before event
    workingHours: {
      start: string; // HH:MM format
      end: string;   // HH:MM format
    };
    timeZone: string;
    externalCalendars: ExternalCalendarConfig[];
  };
  
  // Privacy and security
  privacySettings: {
    localProcessingOnly: boolean;
    dataRetentionDays: number;
    shareAnonymousUsage: boolean;
    requireConfirmationForActions: boolean;
  };
  
  // Accessibility
  accessibilitySettings: {
    enableVoiceOnly: boolean;
    enableHighContrast: boolean;
    enableLargeText: boolean;
    enableScreenReader: boolean;
  };
}

export interface ExternalCalendarConfig {
  type: 'google' | 'outlook' | 'exchange';
  credentials: Record<string, any>;
  syncEnabled: boolean;
  lastSync?: Date;
}

export interface DeviceConfiguration {
  // T5 Hardware settings
  hardware: {
    deviceId: string;
    firmwareVersion: string;
    sensors: {
      microphone: SensorConfig;
      camera: SensorConfig;
      accelerometer: SensorConfig;
      lightSensor: SensorConfig;
    };
    display: {
      type: 'led' | 'lcd' | 'oled';
      resolution: { width: number; height: number };
      brightness: number;
    };
    audio: {
      inputGain: number;
      outputVolume: number;
      noiseReduction: boolean;
    };
  };
  
  // Network configuration
  network: {
    wifi: {
      ssid: string;
      security: 'wpa2' | 'wpa3' | 'open';
      autoConnect: boolean;
    };
    bluetooth: {
      enabled: boolean;
      discoverable: boolean;
      pairedDevices: string[];
    };
    cloudEndpoints: {
      aiService: string;
      energyService: string;
      calendarService: string;
      healthService: string;
    };
  };
  
  // Performance settings
  performance: {
    cpuThrottling: boolean;
    memoryLimit: number; // MB
    cacheSize: number;   // MB
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

export interface SensorConfig {
  enabled: boolean;
  sensitivity: number;
  calibrationData?: Record<string, any>;
}

export interface SystemStatus {
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  networkStatus: {
    connected: boolean;
    signalStrength?: number;
    latency?: number;
  };
  componentStatus: {
    aiEngine: 'healthy' | 'degraded' | 'error';
    healthMonitor: 'healthy' | 'degraded' | 'error';
    calendarManager: 'healthy' | 'degraded' | 'error';
    flashingInterface: 'healthy' | 'degraded' | 'error';
    voiceProcessor: 'healthy' | 'degraded' | 'error';
  };
  lastUpdate: Date;
}

export interface DiagnosticInfo {
  systemInfo: {
    version: string;
    buildDate: Date;
    platform: string;
    nodeVersion: string;
  };
  errorLogs: ErrorLog[];
  performanceMetrics: PerformanceMetric[];
  configurationSummary: Record<string, any>;
}

export interface ErrorLog {
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  component: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface PerformanceMetric {
  timestamp: Date;
  metric: string;
  value: number;
  unit: string;
  component: string;
}

export interface UpdateInfo {
  currentVersion: string;
  availableVersion?: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  downloadUrl?: string;
  updateSize?: number;
  criticalUpdate: boolean;
}

export interface ConfigurationManager {
  // User preferences management
  getUserPreferences(): Promise<UserPreferences>;
  updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void>;
  resetUserPreferences(): Promise<void>;
  exportUserPreferences(): Promise<string>; // JSON string
  importUserPreferences(data: string): Promise<void>;
  
  // Device configuration
  getDeviceConfiguration(): Promise<DeviceConfiguration>;
  updateDeviceConfiguration(config: Partial<DeviceConfiguration>): Promise<void>;
  resetDeviceConfiguration(): Promise<void>;
  calibrateSensors(): Promise<void>;
  
  // System monitoring
  getSystemStatus(): Promise<SystemStatus>;
  getDiagnosticInfo(): Promise<DiagnosticInfo>;
  runSystemDiagnostics(): Promise<DiagnosticInfo>;
  
  // Update and maintenance
  checkForUpdates(): Promise<UpdateInfo>;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  rollbackUpdate(): Promise<void>;
  
  // Backup and restore
  createSystemBackup(): Promise<string>; // Returns backup ID
  restoreFromBackup(backupId: string): Promise<void>;
  listBackups(): Promise<string[]>;
  deleteBackup(backupId: string): Promise<void>;
  
  // Configuration validation
  validateConfiguration(config: Partial<DeviceConfiguration>): Promise<ValidationResult>;
  validateUserPreferences(preferences: Partial<UserPreferences>): Promise<ValidationResult>;
  
  // Personalization features
  getPersonalizedRecommendations(): Promise<PersonalizationRecommendation[]>;
  applyPersonalizationRecommendation(recommendationId: string): Promise<void>;
  getUsageAnalytics(): Promise<UsageAnalytics>;
}

export interface PersonalizationRecommendation {
  type: 'health' | 'performance' | 'comfort' | 'wellness' | 'security';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestedValue: any;
  currentValue: any;
  field: string; // Dot notation path to the preference field
}

export interface UsageAnalytics {
  totalInteractions: number;
  averageSessionDuration: number; // minutes
  mostUsedFeatures: FeatureUsage[];
  peakUsageHours: number[]; // Hours of day (0-23)
  preferenceChangeFrequency: number; // Changes per week
  lastAnalyzed: Date;
}

export interface FeatureUsage {
  feature: string;
  usage: number; // Percentage of total usage
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface PersonalizationRecommendation {
  type: 'health' | 'performance' | 'comfort' | 'wellness' | 'security';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestedValue: any;
  currentValue: any;
  field: string; // Dot notation path to the preference field
}

export interface UsageAnalytics {
  totalInteractions: number;
  averageSessionDuration: number; // minutes
  mostUsedFeatures: FeatureUsage[];
  peakUsageHours: number[]; // Hours of day (0-23)
  preferenceChangeFrequency: number; // Changes per week
  lastAnalyzed: Date;
}

export interface FeatureUsage {
  feature: string;
  usage: number; // Percentage of total usage
}