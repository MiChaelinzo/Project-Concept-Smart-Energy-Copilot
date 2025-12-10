import { Device, DeviceStatus, DeviceCommand, DeviceType, TelemetryCallback } from '../types';

/**
 * DeviceManager interface
 * Responsibility: Manages registration, discovery, and communication with Tuya IoT devices
 */
export interface DeviceManager {
  /**
   * Register a new device with the system
   */
  registerDevice(deviceId: string, deviceType: DeviceType): Promise<Device>;

  /**
   * Discover all available Tuya devices
   */
  discoverDevices(): Promise<Device[]>;

  /**
   * Get the current status of a specific device
   */
  getDeviceStatus(deviceId: string): Promise<DeviceStatus>;

  /**
   * Send a command to a specific device
   */
  sendCommand(deviceId: string, command: DeviceCommand): Promise<void>;

  /**
   * Subscribe to telemetry data from a device
   */
  subscribeToTelemetry(deviceId: string, callback: TelemetryCallback): void;
}
