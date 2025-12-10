import { DeviceManager } from '../interfaces/DeviceManager';
import { Device, DeviceStatus, DeviceCommand, DeviceType, TelemetryCallback, TelemetryData } from '../types';

/**
 * TuyaDeviceManager implementation
 * Manages registration, discovery, and communication with Tuya IoT devices
 */
export class TuyaDeviceManager implements DeviceManager {
  private devices: Map<string, Device> = new Map();
  private telemetrySubscriptions: Map<string, TelemetryCallback[]> = new Map();
  private authenticated: boolean = false;
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  /**
   * Authenticate with Tuya Cloud API
   */
  async authenticate(): Promise<void> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Invalid credentials: API key and secret are required');
    }
    
    // Simulate authentication with Tuya Cloud API
    // In a real implementation, this would make an HTTP request to Tuya's OAuth endpoint
    this.authenticated = true;
  }

  /**
   * Ensure the manager is authenticated before operations
   */
  private ensureAuthenticated(): void {
    if (!this.authenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
  }

  /**
   * Register a new device with the system
   */
  async registerDevice(deviceId: string, deviceType: DeviceType): Promise<Device> {
    this.ensureAuthenticated();

    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    // Check if device already registered
    if (this.devices.has(deviceId)) {
      return this.devices.get(deviceId)!;
    }

    // Create new device with default values
    const device: Device = {
      id: deviceId,
      type: deviceType,
      name: `${deviceType}_${deviceId}`,
      location: 'unknown',
      capabilities: this.getDefaultCapabilities(deviceType),
      normalPowerRange: this.getDefaultPowerRange(deviceType),
      isOnline: true,
      lastSeen: new Date()
    };

    this.devices.set(deviceId, device);
    return device;
  }

  /**
   * Discover all available Tuya devices
   */
  async discoverDevices(): Promise<Device[]> {
    this.ensureAuthenticated();

    // In a real implementation, this would query Tuya Cloud API for devices
    // For now, return all registered devices
    return Array.from(this.devices.values());
  }

  /**
   * Get the current status of a specific device
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    this.ensureAuthenticated();

    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // In a real implementation, this would query the device's current state
    return {
      deviceId: device.id,
      isOnline: device.isOnline,
      powerState: 'off',
      lastUpdated: new Date()
    };
  }

  /**
   * Send a command to a specific device via Tuya Cloud API
   */
  async sendCommand(deviceId: string, command: DeviceCommand): Promise<void> {
    this.ensureAuthenticated();

    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    if (!device.isOnline) {
      throw new Error(`Device is offline: ${deviceId}`);
    }

    // Validate command
    if (!command.action) {
      throw new Error('Command action is required');
    }

    // In a real implementation, this would send the command via Tuya Cloud API
    // For now, we just validate and simulate success
    device.lastSeen = new Date();
  }

  /**
   * Subscribe to telemetry data from a device
   */
  subscribeToTelemetry(deviceId: string, callback: TelemetryCallback): void {
    if (!callback) {
      throw new Error('Callback is required');
    }

    if (!this.telemetrySubscriptions.has(deviceId)) {
      this.telemetrySubscriptions.set(deviceId, []);
    }

    this.telemetrySubscriptions.get(deviceId)!.push(callback);
  }

  /**
   * Simulate receiving telemetry data (for testing purposes)
   */
  simulateTelemetry(data: TelemetryData): void {
    const callbacks = this.telemetrySubscriptions.get(data.deviceId);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Get default capabilities for a device type
   */
  private getDefaultCapabilities(deviceType: DeviceType): string[] {
    const capabilityMap: Record<DeviceType, string[]> = {
      smart_plug: ['power_control', 'energy_monitoring'],
      energy_sensor: ['energy_monitoring'],
      camera: ['video_stream', 'motion_detection'],
      hvac: ['temperature_control', 'fan_control', 'energy_monitoring'],
      light: ['power_control', 'brightness_control']
    };

    return capabilityMap[deviceType] || [];
  }

  /**
   * Get default power range for a device type
   */
  private getDefaultPowerRange(deviceType: DeviceType): { min: number; max: number } {
    const powerRangeMap: Record<DeviceType, { min: number; max: number }> = {
      smart_plug: { min: 0, max: 1800 },
      energy_sensor: { min: 0, max: 0 },
      camera: { min: 5, max: 15 },
      hvac: { min: 500, max: 3000 },
      light: { min: 5, max: 100 }
    };

    return powerRangeMap[deviceType] || { min: 0, max: 1000 };
  }

  /**
   * Get all registered devices (for testing)
   */
  getRegisteredDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  /**
   * Clear all devices (for testing)
   */
  clearDevices(): void {
    this.devices.clear();
    this.telemetrySubscriptions.clear();
  }
}
