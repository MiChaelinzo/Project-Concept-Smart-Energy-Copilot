/**
 * Mobile App Integration Interface
 * Provides comprehensive mobile app connectivity and features
 */

export interface MobileDevice {
  id: string;
  name: string;
  platform: 'ios' | 'android';
  version: string;
  pushToken?: string;
  userId: string;
  lastSeen: Date;
  capabilities: MobileCapabilities;
  preferences: MobilePreferences;
}

export interface MobileCapabilities {
  pushNotifications: boolean;
  biometricAuth: boolean;
  nfc: boolean;
  bluetooth: boolean;
  camera: boolean;
  microphone: boolean;
  location: boolean;
  backgroundProcessing: boolean;
}

export interface MobilePreferences {
  notifications: NotificationPreferences;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  units: 'metric' | 'imperial';
  autoSync: boolean;
  offlineMode: boolean;
  energyAlerts: boolean;
  securityAlerts: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  energyUpdates: boolean;
  deviceAlerts: boolean;
  securityNotifications: boolean;
  weatherAlerts: boolean;
  maintenanceReminders: boolean;
  costAlerts: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface MobileNotification {
  id: string;
  type: 'energy' | 'device' | 'security' | 'weather' | 'maintenance' | 'cost' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  timestamp: Date;
  expiresAt?: Date;
  imageUrl?: string;
  deepLink?: string;
}

export interface NotificationAction {
  id: string;
  title: string;
  type: 'button' | 'input' | 'dismiss';
  destructive?: boolean;
  authRequired?: boolean;
}

export interface MobileSession {
  sessionId: string;
  deviceId: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  isActive: boolean;
  location?: GeolocationData;
  networkInfo: NetworkInfo;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  strength: number; // 0-100
  isMetered: boolean;
  ssid?: string;
}

export interface MobileCommand {
  id: string;
  type: 'device_control' | 'scene_activation' | 'data_sync' | 'configuration' | 'diagnostic';
  deviceId: string;
  command: string;
  parameters: Record<string, any>;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface MobileSync {
  lastSync: Date;
  syncStatus: 'idle' | 'syncing' | 'error';
  pendingChanges: number;
  conflictResolution: 'server_wins' | 'client_wins' | 'manual';
  syncData: {
    devices: SyncItem[];
    scenes: SyncItem[];
    schedules: SyncItem[];
    preferences: SyncItem[];
  };
}

export interface SyncItem {
  id: string;
  type: string;
  lastModified: Date;
  checksum: string;
  conflicted: boolean;
}

export interface MobileAnalytics {
  sessionDuration: number;
  screenViews: ScreenView[];
  userActions: UserAction[];
  performanceMetrics: PerformanceMetrics;
  crashReports: CrashReport[];
}

export interface ScreenView {
  screen: string;
  timestamp: Date;
  duration: number;
  exitReason: 'navigation' | 'background' | 'crash';
}

export interface UserAction {
  action: string;
  screen: string;
  timestamp: Date;
  parameters?: Record<string, any>;
  success: boolean;
}

export interface PerformanceMetrics {
  appStartTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  batteryLevel: number;
  thermalState: 'normal' | 'fair' | 'serious' | 'critical';
}

export interface CrashReport {
  id: string;
  timestamp: Date;
  stackTrace: string;
  deviceInfo: MobileDevice;
  appVersion: string;
  osVersion: string;
  memoryUsage: number;
  userActions: UserAction[];
}

export interface MobileAppIntegration {
  /**
   * Register a new mobile device
   */
  registerDevice(device: Omit<MobileDevice, 'id' | 'lastSeen'>): Promise<MobileDevice>;

  /**
   * Update device information
   */
  updateDevice(deviceId: string, updates: Partial<MobileDevice>): Promise<void>;

  /**
   * Get device information
   */
  getDevice(deviceId: string): Promise<MobileDevice | null>;

  /**
   * Get all devices for a user
   */
  getUserDevices(userId: string): Promise<MobileDevice[]>;

  /**
   * Send push notification to device(s)
   */
  sendNotification(deviceIds: string[], notification: MobileNotification): Promise<void>;

  /**
   * Send notification to all user devices
   */
  sendUserNotification(userId: string, notification: MobileNotification): Promise<void>;

  /**
   * Get notification history
   */
  getNotificationHistory(deviceId: string, limit?: number): Promise<MobileNotification[]>;

  /**
   * Mark notification as read
   */
  markNotificationRead(deviceId: string, notificationId: string): Promise<void>;

  /**
   * Start mobile session
   */
  startSession(deviceId: string, location?: GeolocationData): Promise<MobileSession>;

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId: string, location?: GeolocationData): Promise<void>;

  /**
   * End mobile session
   */
  endSession(sessionId: string): Promise<void>;

  /**
   * Execute command from mobile device
   */
  executeCommand(command: MobileCommand): Promise<MobileCommand>;

  /**
   * Get command status
   */
  getCommandStatus(commandId: string): Promise<MobileCommand>;

  /**
   * Get command history
   */
  getCommandHistory(deviceId: string, limit?: number): Promise<MobileCommand[]>;

  /**
   * Sync data with mobile device
   */
  syncData(deviceId: string, clientData: any): Promise<MobileSync>;

  /**
   * Get sync status
   */
  getSyncStatus(deviceId: string): Promise<MobileSync>;

  /**
   * Resolve sync conflicts
   */
  resolveSyncConflicts(deviceId: string, resolutions: Record<string, any>): Promise<void>;

  /**
   * Track mobile analytics
   */
  trackAnalytics(deviceId: string, analytics: Partial<MobileAnalytics>): Promise<void>;

  /**
   * Get analytics data
   */
  getAnalytics(deviceId: string, timeRange?: { start: Date; end: Date }): Promise<MobileAnalytics>;

  /**
   * Report crash
   */
  reportCrash(deviceId: string, crashReport: CrashReport): Promise<void>;

  /**
   * Get app configuration for mobile device
   */
  getAppConfiguration(deviceId: string): Promise<MobileAppConfiguration>;

  /**
   * Update app configuration
   */
  updateAppConfiguration(deviceId: string, config: Partial<MobileAppConfiguration>): Promise<void>;

  /**
   * Get real-time device data for mobile display
   */
  getRealtimeData(deviceId: string): Promise<MobileRealtimeData>;

  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(deviceId: string, callback: (data: MobileRealtimeData) => void): Promise<string>;

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromUpdates(subscriptionId: string): Promise<void>;

  /**
   * Authenticate mobile device with biometrics
   */
  authenticateWithBiometrics(deviceId: string, biometricData: BiometricData): Promise<AuthenticationResult>;

  /**
   * Generate QR code for device pairing
   */
  generatePairingQR(userId: string): Promise<PairingQRData>;

  /**
   * Pair device using QR code
   */
  pairDeviceWithQR(qrData: string, deviceInfo: Partial<MobileDevice>): Promise<MobileDevice>;
}

export interface MobileAppConfiguration {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    darkMode: boolean;
  };
  features: {
    voiceControl: boolean;
    geofencing: boolean;
    automation: boolean;
    energyAnalytics: boolean;
    weatherIntegration: boolean;
  };
  limits: {
    maxDevices: number;
    maxScenes: number;
    maxSchedules: number;
    syncInterval: number;
  };
  security: {
    biometricRequired: boolean;
    sessionTimeout: number;
    maxFailedAttempts: number;
  };
}

export interface MobileRealtimeData {
  timestamp: Date;
  devices: {
    id: string;
    name: string;
    status: 'online' | 'offline';
    state: Record<string, any>;
    energyUsage: number;
  }[];
  totalEnergyUsage: number;
  energyCost: number;
  weather: {
    temperature: number;
    conditions: string;
    humidity: number;
  };
  alerts: {
    id: string;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  systemStatus: {
    online: boolean;
    lastUpdate: Date;
    performance: number; // 0-100
  };
}

export interface BiometricData {
  type: 'fingerprint' | 'face' | 'voice' | 'iris';
  data: string; // Encrypted biometric template
  quality: number; // 0-100
  timestamp: Date;
}

export interface AuthenticationResult {
  success: boolean;
  confidence: number; // 0-100
  userId?: string;
  sessionToken?: string;
  expiresAt?: Date;
  error?: string;
}

export interface PairingQRData {
  qrCode: string; // Base64 encoded QR code image
  pairingToken: string;
  expiresAt: Date;
  instructions: string;
}