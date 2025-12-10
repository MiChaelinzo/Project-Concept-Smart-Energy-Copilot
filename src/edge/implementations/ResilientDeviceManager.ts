import { DeviceManager } from '../interfaces/DeviceManager';
import { Device, DeviceStatus, DeviceCommand, DeviceType, TelemetryCallback, TelemetryData } from '../types';
import { TuyaDeviceManager } from './TuyaDeviceManager';

/**
 * Command queue entry for offline operations
 */
interface QueuedCommand {
  id: string;
  deviceId: string;
  command: DeviceCommand;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * API availability status
 */
interface ApiStatus {
  isAvailable: boolean;
  lastChecked: Date;
  consecutiveFailures: number;
}

/**
 * Cached data entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

/**
 * ResilientDeviceManager implementation
 * Extends TuyaDeviceManager with cloud resilience and offline operation capabilities
 */
export class ResilientDeviceManager implements DeviceManager {
  private baseManager: TuyaDeviceManager;
  private commandQueue: Map<string, QueuedCommand> = new Map();
  private apiStatus: ApiStatus = {
    isAvailable: true,
    lastChecked: new Date(),
    consecutiveFailures: 0
  };
  private cache: Map<string, CacheEntry<any>> = new Map();
  private retryTimer: NodeJS.Timeout | null = null;
  private monitoringTimer: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly API_CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds
  private readonly RETRY_INTERVAL_MS = 60 * 1000; // 60 seconds
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  constructor(apiKey: string, apiSecret: string) {
    this.baseManager = new TuyaDeviceManager(apiKey, apiSecret);
    // Delay starting timers to avoid issues during testing
    setTimeout(() => {
      this.startApiMonitoring();
      this.startRetryProcessor();
    }, 100);
  }

  /**
   * Register a new device with the system
   */
  async registerDevice(deviceId: string, deviceType: DeviceType): Promise<Device> {
    try {
      const device = await this.baseManager.registerDevice(deviceId, deviceType);
      this.updateApiStatus(true);
      this.cacheData(`device_${deviceId}`, device);
      return device;
    } catch (error) {
      this.updateApiStatus(false);
      
      // Try to return cached device if available
      const cachedDevice = this.getCachedData<Device>(`device_${deviceId}`);
      if (cachedDevice) {
        return cachedDevice;
      }
      
      throw error;
    }
  }

  /**
   * Discover all available Tuya devices
   */
  async discoverDevices(): Promise<Device[]> {
    try {
      const devices = await this.baseManager.discoverDevices();
      this.updateApiStatus(true);
      this.cacheData('all_devices', devices);
      return devices;
    } catch (error) {
      this.updateApiStatus(false);
      
      // Try to return cached devices if available
      const cachedDevices = this.getCachedData<Device[]>('all_devices');
      if (cachedDevices) {
        return cachedDevices;
      }
      
      throw error;
    }
  }

  /**
   * Get the current status of a specific device
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    try {
      const status = await this.baseManager.getDeviceStatus(deviceId);
      this.updateApiStatus(true);
      this.cacheData(`status_${deviceId}`, status);
      return status;
    } catch (error) {
      this.updateApiStatus(false);
      
      // Try to return cached status if available
      const cachedStatus = this.getCachedData<DeviceStatus>(`status_${deviceId}`);
      if (cachedStatus) {
        return cachedStatus;
      }
      
      throw error;
    }
  }

  /**
   * Send a command to a specific device with queueing and retry logic
   */
  async sendCommand(deviceId: string, command: DeviceCommand): Promise<void> {
    if (this.apiStatus.isAvailable) {
      try {
        await this.sendCommandWithRetry(deviceId, command);
        this.updateApiStatus(true);
        return;
      } catch (error) {
        this.updateApiStatus(false);
        // Fall through to queueing logic
      }
    }

    // Queue the command for later transmission
    this.queueCommand(deviceId, command);
  }

  /**
   * Subscribe to telemetry data from a device
   */
  subscribeToTelemetry(deviceId: string, callback: TelemetryCallback): void {
    this.baseManager.subscribeToTelemetry(deviceId, callback);
  }

  /**
   * Send command with exponential backoff retry
   */
  private async sendCommandWithRetry(
    deviceId: string, 
    command: DeviceCommand, 
    retryCount: number = 0
  ): Promise<void> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      await this.baseManager.sendCommand(deviceId, command);
    } catch (error) {
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        await this.sleep(delay);
        return this.sendCommandWithRetry(deviceId, command, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Queue a command for offline transmission
   */
  private queueCommand(deviceId: string, command: DeviceCommand): void {
    // Check queue size limit
    if (this.commandQueue.size >= this.MAX_QUEUE_SIZE) {
      // Remove oldest command
      const oldestKey = Array.from(this.commandQueue.keys())[0];
      this.commandQueue.delete(oldestKey);
    }

    const queuedCommand: QueuedCommand = {
      id: `${deviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId,
      command,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.commandQueue.set(queuedCommand.id, queuedCommand);
  }

  /**
   * Update API availability status
   */
  private updateApiStatus(isAvailable: boolean): void {
    this.apiStatus.lastChecked = new Date();
    
    if (isAvailable) {
      this.apiStatus.isAvailable = true;
      this.apiStatus.consecutiveFailures = 0;
    } else {
      this.apiStatus.consecutiveFailures++;
      if (this.apiStatus.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.apiStatus.isAvailable = false;
      }
    }
  }

  /**
   * Cache data with TTL
   */
  private cacheData<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_TTL_MS)
    };
    this.cache.set(key, entry);
  }

  /**
   * Get cached data if not expired
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Start API availability monitoring
   */
  private startApiMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        // Try a lightweight operation to check API availability
        await this.baseManager.discoverDevices();
        this.updateApiStatus(true);
      } catch (error) {
        this.updateApiStatus(false);
      }
    }, this.API_CHECK_INTERVAL_MS);
  }

  /**
   * Start retry processor for queued commands
   */
  private startRetryProcessor(): void {
    this.retryTimer = setInterval(async () => {
      if (this.apiStatus.isAvailable && this.commandQueue.size > 0) {
        await this.processQueuedCommands();
      }
    }, this.RETRY_INTERVAL_MS);
  }

  /**
   * Process all queued commands when API becomes available
   */
  private async processQueuedCommands(): Promise<void> {
    const commandsToProcess = Array.from(this.commandQueue.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Process oldest first

    for (const queuedCommand of commandsToProcess) {
      try {
        await this.sendCommandWithRetry(queuedCommand.deviceId, queuedCommand.command);
        this.commandQueue.delete(queuedCommand.id);
      } catch (error) {
        queuedCommand.retryCount++;
        
        if (queuedCommand.retryCount >= queuedCommand.maxRetries) {
          // Remove command after max retries
          this.commandQueue.delete(queuedCommand.id);
        }
        
        // Stop processing if API becomes unavailable
        this.updateApiStatus(false);
        break;
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get current queue status (for monitoring/debugging)
   */
  getQueueStatus(): { size: number; oldestCommand?: Date } {
    const commands = Array.from(this.commandQueue.values());
    const oldestCommand = commands.length > 0 
      ? commands.reduce((oldest, cmd) => cmd.timestamp < oldest ? cmd.timestamp : oldest, commands[0].timestamp)
      : undefined;

    return {
      size: this.commandQueue.size,
      oldestCommand
    };
  }

  /**
   * Get API status (for monitoring/debugging)
   */
  getApiStatus(): ApiStatus {
    return { ...this.apiStatus };
  }

  /**
   * Get cache status (for monitoring/debugging)
   */
  getCacheStatus(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Utility function for sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    this.commandQueue.clear();
    this.cache.clear();
  }
}