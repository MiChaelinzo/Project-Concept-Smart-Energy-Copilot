import { AnomalyDetector, AnomalyResult, AnomalyEvent } from '../interfaces/AnomalyDetector';
import { DeviceManager } from '../interfaces/DeviceManager';
import { Device } from '../types';

/**
 * AnomalyDetectorImpl implementation
 * Monitors device behavior for unusual patterns indicating safety issues
 */
export class AnomalyDetectorImpl implements AnomalyDetector {
  private anomalyHistory: Map<string, AnomalyEvent[]> = new Map();
  private deviceManager: DeviceManager;
  private devices: Map<string, Device> = new Map();
  private disabledDevices: Set<string> = new Set();
  private notificationCallback?: (deviceId: string, anomaly: AnomalyEvent) => void;

  // Anomaly threshold: 50% above normal range
  private readonly ANOMALY_THRESHOLD_PERCENT = 0.5;
  
  // Repeated anomaly threshold: 3 anomalies within 24 hours
  private readonly REPEATED_ANOMALY_COUNT = 3;
  private readonly REPEATED_ANOMALY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(deviceManager: DeviceManager) {
    this.deviceManager = deviceManager;
  }

  /**
   * Set notification callback for anomaly alerts
   * Requirements: 6.3
   */
  setNotificationCallback(callback: (deviceId: string, anomaly: AnomalyEvent) => void): void {
    this.notificationCallback = callback;
  }

  /**
   * Register a device for anomaly monitoring
   */
  registerDevice(device: Device): void {
    this.devices.set(device.id, device);
  }

  /**
   * Check if current power consumption is anomalous
   * Requirements: 6.1
   */
  checkForAnomalies(deviceId: string, currentWatts: number): AnomalyResult {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    if (currentWatts < 0) {
      throw new Error('Power consumption cannot be negative');
    }

    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not registered for anomaly monitoring`);
    }

    const { normalPowerRange } = device;
    const threshold = normalPowerRange.max * (1 + this.ANOMALY_THRESHOLD_PERCENT);

    // Check if consumption exceeds threshold
    if (currentWatts > threshold) {
      const anomalyEvent: AnomalyEvent = {
        deviceId,
        timestamp: new Date(),
        normalRange: normalPowerRange,
        actualValue: currentWatts,
        actionTaken: 'device_shutdown'
      };

      // Record the anomaly
      this.recordAnomaly(anomalyEvent);

      // Shut down the device (Requirements: 6.2)
      this.shutdownDevice(deviceId);

      // Send notification (Requirements: 6.3)
      if (this.notificationCallback) {
        this.notificationCallback(deviceId, anomalyEvent);
      }

      // Check if device should be disabled (Requirements: 6.4)
      if (this.shouldDisableDevice(deviceId)) {
        this.disabledDevices.add(deviceId);
      }

      return {
        isAnomaly: true,
        severity: 'high',
        reason: `Power consumption (${currentWatts}W) exceeds threshold (${threshold.toFixed(2)}W) by ${((currentWatts - threshold) / threshold * 100).toFixed(1)}%`,
        recommendedAction: 'Device has been shut down. Please inspect the device before re-enabling.'
      };
    }

    return {
      isAnomaly: false,
      severity: 'low'
    };
  }

  /**
   * Shut down a device due to anomaly
   * Requirements: 6.2
   */
  private async shutdownDevice(deviceId: string): Promise<void> {
    try {
      await this.deviceManager.sendCommand(deviceId, {
        action: 'turn_off'
      });
    } catch (error) {
      // Log error but don't throw - we still want to record the anomaly
      console.error(`Failed to shutdown device ${deviceId}:`, error);
    }
  }

  /**
   * Record an anomaly event
   * Requirements: 6.5
   */
  recordAnomaly(anomaly: AnomalyEvent): void {
    if (!anomaly.deviceId || anomaly.deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    if (!anomaly.timestamp || isNaN(anomaly.timestamp.getTime())) {
      throw new Error('Invalid timestamp');
    }

    if (!this.anomalyHistory.has(anomaly.deviceId)) {
      this.anomalyHistory.set(anomaly.deviceId, []);
    }

    const history = this.anomalyHistory.get(anomaly.deviceId)!;
    history.push(anomaly);
  }

  /**
   * Get anomaly history for a device
   * Requirements: 6.5
   */
  async getAnomalyHistory(deviceId: string): Promise<AnomalyEvent[]> {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    return this.anomalyHistory.get(deviceId) || [];
  }

  /**
   * Determine if a device should be disabled due to repeated anomalies
   * Requirements: 6.4
   */
  shouldDisableDevice(deviceId: string): boolean {
    if (!deviceId || deviceId.trim() === '') {
      return false;
    }

    const history = this.anomalyHistory.get(deviceId);
    if (!history || history.length < this.REPEATED_ANOMALY_COUNT) {
      return false;
    }

    // Get the most recent anomalies
    const recentAnomalies = history.slice(-this.REPEATED_ANOMALY_COUNT);
    const oldestRecentAnomaly = recentAnomalies[0];
    const newestAnomaly = recentAnomalies[recentAnomalies.length - 1];

    // Check if all 3 anomalies occurred within 24 hours
    const timeDiff = newestAnomaly.timestamp.getTime() - oldestRecentAnomaly.timestamp.getTime();
    
    return timeDiff <= this.REPEATED_ANOMALY_WINDOW_MS;
  }

  /**
   * Check if a device is disabled
   */
  isDeviceDisabled(deviceId: string): boolean {
    return this.disabledDevices.has(deviceId);
  }

  /**
   * Re-enable a disabled device (for user review)
   */
  enableDevice(deviceId: string): void {
    this.disabledDevices.delete(deviceId);
  }

  /**
   * Clear all anomaly history (for testing)
   */
  clearHistory(): void {
    this.anomalyHistory.clear();
    this.disabledDevices.clear();
  }

  /**
   * Get all device IDs with anomaly history (for testing)
   */
  getDeviceIdsWithAnomalies(): string[] {
    return Array.from(this.anomalyHistory.keys());
  }
}
