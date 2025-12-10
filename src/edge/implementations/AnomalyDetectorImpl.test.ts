import { AnomalyDetectorImpl } from './AnomalyDetectorImpl';
import { DeviceManager } from '../interfaces/DeviceManager';
import { Device, DeviceCommand } from '../types';

/**
 * Unit tests for AnomalyDetectorImpl
 * Requirements: 6.1, 6.2, 6.4
 */

describe('AnomalyDetectorImpl Unit Tests', () => {
  let anomalyDetector: AnomalyDetectorImpl;
  let mockDeviceManager: jest.Mocked<DeviceManager>;
  let testDevice: Device;

  beforeEach(() => {
    // Create mock device manager
    mockDeviceManager = {
      registerDevice: jest.fn(),
      discoverDevices: jest.fn(),
      getDeviceStatus: jest.fn(),
      sendCommand: jest.fn().mockResolvedValue(undefined),
      subscribeToTelemetry: jest.fn()
    } as jest.Mocked<DeviceManager>;

    anomalyDetector = new AnomalyDetectorImpl(mockDeviceManager);

    // Create test device with normal power range
    testDevice = {
      id: 'test-device-1',
      type: 'smart_plug',
      name: 'Test Smart Plug',
      location: 'Living Room',
      capabilities: ['power_monitoring', 'remote_control'],
      normalPowerRange: { min: 10, max: 100 },
      isOnline: true,
      lastSeen: new Date()
    };

    anomalyDetector.registerDevice(testDevice);
  });

  afterEach(() => {
    anomalyDetector.clearHistory();
  });

  /**
   * Test: False positive handling
   * Ensures that power consumption just below the threshold is not flagged as anomaly
   * Requirements: 6.1
   */
  describe('False positive handling', () => {
    test('should not flag consumption at exactly the threshold as anomaly', () => {
      // Threshold is 50% above max: 100 * 1.5 = 150W
      const thresholdValue = 150;
      
      const result = anomalyDetector.checkForAnomalies(testDevice.id, thresholdValue);
      
      expect(result.isAnomaly).toBe(false);
      expect(result.severity).toBe('low');
      expect(mockDeviceManager.sendCommand).not.toHaveBeenCalled();
    });

    test('should not flag consumption just below threshold as anomaly', () => {
      // Just below threshold: 149.99W
      const belowThreshold = 149.99;
      
      const result = anomalyDetector.checkForAnomalies(testDevice.id, belowThreshold);
      
      expect(result.isAnomaly).toBe(false);
      expect(result.severity).toBe('low');
      expect(mockDeviceManager.sendCommand).not.toHaveBeenCalled();
    });

    test('should not flag normal consumption within range as anomaly', () => {
      // Normal consumption: 50W (within 10-100 range)
      const normalValue = 50;
      
      const result = anomalyDetector.checkForAnomalies(testDevice.id, normalValue);
      
      expect(result.isAnomaly).toBe(false);
      expect(result.severity).toBe('low');
      expect(mockDeviceManager.sendCommand).not.toHaveBeenCalled();
    });
  });

  /**
   * Test: Device shutdown failure recovery
   * Ensures that anomaly is still recorded even if device shutdown fails
   * Requirements: 6.2
   */
  describe('Device shutdown failure recovery', () => {
    test('should record anomaly even when device shutdown fails', async () => {
      // Mock sendCommand to reject (simulate shutdown failure)
      mockDeviceManager.sendCommand.mockRejectedValueOnce(new Error('Device unreachable'));
      
      const anomalousValue = 200; // Well above threshold of 150W
      
      const result = anomalyDetector.checkForAnomalies(testDevice.id, anomalousValue);
      
      // Anomaly should still be detected
      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe('high');
      
      // Shutdown should have been attempted
      expect(mockDeviceManager.sendCommand).toHaveBeenCalledWith(testDevice.id, {
        action: 'turn_off'
      });
      
      // Anomaly should be recorded in history
      const history = await anomalyDetector.getAnomalyHistory(testDevice.id);
      expect(history).toHaveLength(1);
      expect(history[0].deviceId).toBe(testDevice.id);
      expect(history[0].actualValue).toBe(anomalousValue);
    });

    test('should continue monitoring after shutdown failure', async () => {
      // First anomaly with shutdown failure
      mockDeviceManager.sendCommand.mockRejectedValueOnce(new Error('Network timeout'));
      anomalyDetector.checkForAnomalies(testDevice.id, 200);
      
      // Second anomaly with successful shutdown
      mockDeviceManager.sendCommand.mockResolvedValueOnce(undefined);
      const result = anomalyDetector.checkForAnomalies(testDevice.id, 180);
      
      expect(result.isAnomaly).toBe(true);
      expect(mockDeviceManager.sendCommand).toHaveBeenCalledTimes(2);
      
      // Both anomalies should be recorded
      const history = await anomalyDetector.getAnomalyHistory(testDevice.id);
      expect(history).toHaveLength(2);
    });

    test('should send notification even when shutdown fails', () => {
      const notifications: any[] = [];
      anomalyDetector.setNotificationCallback((deviceId, anomaly) => {
        notifications.push({ deviceId, anomaly });
      });
      
      // Mock shutdown failure
      mockDeviceManager.sendCommand.mockRejectedValueOnce(new Error('Device offline'));
      
      anomalyDetector.checkForAnomalies(testDevice.id, 200);
      
      // Notification should still be sent
      expect(notifications).toHaveLength(1);
      expect(notifications[0].deviceId).toBe(testDevice.id);
    });
  });

  /**
   * Test: Boundary values at 50% threshold
   * Tests exact boundary conditions for the 50% threshold
   * Requirements: 6.1, 6.4
   */
  describe('Boundary values at 50% threshold', () => {
    test('should flag consumption at exactly threshold + 0.01W as anomaly', () => {
      // Threshold is 150W, test 150.01W
      const justAboveThreshold = 150.01;
      
      const result = anomalyDetector.checkForAnomalies(testDevice.id, justAboveThreshold);
      
      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.reason).toContain('150.01');
      expect(mockDeviceManager.sendCommand).toHaveBeenCalledWith(testDevice.id, {
        action: 'turn_off'
      });
    });

    test('should calculate threshold correctly for different max values', () => {
      // Device with max 200W -> threshold should be 300W
      const highPowerDevice: Device = {
        ...testDevice,
        id: 'high-power-device',
        normalPowerRange: { min: 50, max: 200 }
      };
      
      anomalyDetector.registerDevice(highPowerDevice);
      
      // Test at threshold (300W) - should not be anomaly
      let result = anomalyDetector.checkForAnomalies(highPowerDevice.id, 300);
      expect(result.isAnomaly).toBe(false);
      
      // Test just above threshold (300.01W) - should be anomaly
      result = anomalyDetector.checkForAnomalies(highPowerDevice.id, 300.01);
      expect(result.isAnomaly).toBe(true);
    });

    test('should handle zero max power range edge case', () => {
      // Device with max 0W (unusual but valid edge case)
      const zeroMaxDevice: Device = {
        ...testDevice,
        id: 'zero-max-device',
        normalPowerRange: { min: 0, max: 0 }
      };
      
      anomalyDetector.registerDevice(zeroMaxDevice);
      
      // Any positive consumption should be anomaly (threshold is 0 * 1.5 = 0)
      const result = anomalyDetector.checkForAnomalies(zeroMaxDevice.id, 0.01);
      
      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe('high');
    });

    test('should handle very small power ranges correctly', () => {
      // Device with very small max (1W) -> threshold should be 1.5W
      const lowPowerDevice: Device = {
        ...testDevice,
        id: 'low-power-device',
        normalPowerRange: { min: 0.1, max: 1 }
      };
      
      anomalyDetector.registerDevice(lowPowerDevice);
      
      // Test at 1.5W (threshold) - should not be anomaly
      let result = anomalyDetector.checkForAnomalies(lowPowerDevice.id, 1.5);
      expect(result.isAnomaly).toBe(false);
      
      // Test at 1.51W - should be anomaly
      result = anomalyDetector.checkForAnomalies(lowPowerDevice.id, 1.51);
      expect(result.isAnomaly).toBe(true);
    });

    test('should disable device after exactly 3 anomalies within 24 hours', () => {
      const now = new Date();
      
      // Create 3 anomalies within 24 hours
      for (let i = 0; i < 3; i++) {
        // Manually create and record anomaly events with controlled timestamps
        const anomaly = {
          deviceId: testDevice.id,
          timestamp: new Date(now.getTime() + i * 1000), // 1 second apart
          normalRange: testDevice.normalPowerRange,
          actualValue: 200,
          actionTaken: 'device_shutdown'
        };
        anomalyDetector.recordAnomaly(anomaly);
      }
      
      // After 3 anomalies, device should be disabled
      const shouldDisable = anomalyDetector.shouldDisableDevice(testDevice.id);
      expect(shouldDisable).toBe(true);
    });

    test('should not disable device with 3 anomalies spanning more than 24 hours', () => {
      const now = new Date();
      
      // Create 3 anomalies spanning 25 hours
      const anomaly1 = {
        deviceId: testDevice.id,
        timestamp: new Date(now.getTime()),
        normalRange: testDevice.normalPowerRange,
        actualValue: 200,
        actionTaken: 'device_shutdown'
      };
      
      const anomaly2 = {
        deviceId: testDevice.id,
        timestamp: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours later
        normalRange: testDevice.normalPowerRange,
        actualValue: 200,
        actionTaken: 'device_shutdown'
      };
      
      const anomaly3 = {
        deviceId: testDevice.id,
        timestamp: new Date(now.getTime() + 25 * 60 * 60 * 1000), // 25 hours later
        normalRange: testDevice.normalPowerRange,
        actualValue: 200,
        actionTaken: 'device_shutdown'
      };
      
      anomalyDetector.recordAnomaly(anomaly1);
      anomalyDetector.recordAnomaly(anomaly2);
      anomalyDetector.recordAnomaly(anomaly3);
      
      // Should not disable because anomalies span more than 24 hours
      const shouldDisable = anomalyDetector.shouldDisableDevice(testDevice.id);
      expect(shouldDisable).toBe(false);
    });

    test('should handle exactly 24 hour boundary for repeated anomalies', () => {
      const now = new Date();
      
      // Create 3 anomalies with exactly 24 hours between first and last
      const anomaly1 = {
        deviceId: testDevice.id,
        timestamp: new Date(now.getTime()),
        normalRange: testDevice.normalPowerRange,
        actualValue: 200,
        actionTaken: 'device_shutdown'
      };
      
      const anomaly2 = {
        deviceId: testDevice.id,
        timestamp: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours
        normalRange: testDevice.normalPowerRange,
        actualValue: 200,
        actionTaken: 'device_shutdown'
      };
      
      const anomaly3 = {
        deviceId: testDevice.id,
        timestamp: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Exactly 24 hours
        normalRange: testDevice.normalPowerRange,
        actualValue: 200,
        actionTaken: 'device_shutdown'
      };
      
      anomalyDetector.recordAnomaly(anomaly1);
      anomalyDetector.recordAnomaly(anomaly2);
      anomalyDetector.recordAnomaly(anomaly3);
      
      // Should disable because exactly 24 hours is within the window
      const shouldDisable = anomalyDetector.shouldDisableDevice(testDevice.id);
      expect(shouldDisable).toBe(true);
    });
  });
});
