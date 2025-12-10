import * as fc from 'fast-check';
import { AnomalyDetectorImpl } from './AnomalyDetectorImpl';
import { TuyaDeviceManager } from './TuyaDeviceManager';
import { Device, DeviceType } from '../types';
import { AnomalyEvent } from '../interfaces/AnomalyDetector';

describe('AnomalyDetector Property-Based Tests', () => {
  
  /**
   * Feature: smart-energy-copilot, Property 14: Anomaly detection and response
   * Validates: Requirements 6.1, 6.2
   * 
   * For any device with a defined normal power range, when consumption exceeds 
   * the maximum by 50%, the system should classify it as an anomaly and 
   * immediately shut down the device.
   */
  test('Property 14: Anomaly detection and response', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate device configuration
        fc.record({
          deviceId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          deviceType: fc.constantFrom<DeviceType>('smart_plug', 'hvac', 'light', 'camera', 'energy_sensor'),
          normalMin: fc.nat({ max: 100 }),
          normalMax: fc.integer({ min: 101, max: 2000 })
        }),
        
        // Generate power consumption value that exceeds threshold
        fc.float({ min: Math.fround(1.51), max: Math.fround(3.0), noNaN: true }), // Multiplier > 1.5 (50% above max)
        
        async ({ deviceId, deviceType, normalMin, normalMax }, multiplier) => {
          // Setup
          const deviceManager = new TuyaDeviceManager('test-key', 'test-secret');
          await deviceManager.authenticate();
          
          const anomalyDetector = new AnomalyDetectorImpl(deviceManager);
          
          // Register device with DeviceManager first
          await deviceManager.registerDevice(deviceId, deviceType);
          
          // Register device with custom power range for anomaly detection
          const device: Device = {
            id: deviceId,
            type: deviceType,
            name: `test_${deviceType}`,
            location: 'test_location',
            capabilities: ['power_control'],
            normalPowerRange: { min: normalMin, max: normalMax },
            isOnline: true,
            lastSeen: new Date()
          };
          
          anomalyDetector.registerDevice(device);
          
          // Track if device was shut down
          let shutdownCalled = false;
          const originalSendCommand = deviceManager.sendCommand.bind(deviceManager);
          deviceManager.sendCommand = async (devId: string, command: any) => {
            if (devId === deviceId && command.action === 'turn_off') {
              shutdownCalled = true;
            }
            return originalSendCommand(devId, command);
          };
          
          // Track if notification was sent
          let notificationSent = false;
          anomalyDetector.setNotificationCallback((devId, anomaly) => {
            if (devId === deviceId) {
              notificationSent = true;
            }
          });
          
          // Calculate anomalous power consumption (exceeds max by 50%)
          const anomalousWatts = normalMax * multiplier;
          
          // Test: Check for anomalies
          const result = anomalyDetector.checkForAnomalies(deviceId, anomalousWatts);
          
          // Verify: Anomaly was detected
          expect(result.isAnomaly).toBe(true);
          expect(result.severity).toBe('high');
          
          // Verify: Device was shut down (Requirement 6.2)
          expect(shutdownCalled).toBe(true);
          
          // Verify: Notification was sent (Requirement 6.3)
          expect(notificationSent).toBe(true);
          
          // Verify: Anomaly was logged (Requirement 6.5)
          const history = await anomalyDetector.getAnomalyHistory(deviceId);
          expect(history.length).toBeGreaterThan(0);
          
          const lastAnomaly = history[history.length - 1];
          expect(lastAnomaly.deviceId).toBe(deviceId);
          expect(lastAnomaly.actualValue).toBe(anomalousWatts);
          expect(lastAnomaly.normalRange.min).toBe(normalMin);
          expect(lastAnomaly.normalRange.max).toBe(normalMax);
          expect(lastAnomaly.actionTaken).toBe('device_shutdown');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Non-anomalous consumption should not trigger shutdown
   * 
   * For any device with a defined normal power range, when consumption is within
   * the threshold (≤ 50% above max), the system should NOT classify it as an anomaly.
   */
  test('Property: Non-anomalous consumption does not trigger response', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate device configuration
        fc.record({
          deviceId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          deviceType: fc.constantFrom<DeviceType>('smart_plug', 'hvac', 'light', 'camera', 'energy_sensor'),
          normalMin: fc.nat({ max: 100 }),
          normalMax: fc.integer({ min: 101, max: 2000 })
        }),
        
        // Generate power consumption within acceptable range (0 to 1.5x max)
        fc.float({ min: 0, max: Math.fround(1.5), noNaN: true }),
        
        async ({ deviceId, deviceType, normalMin, normalMax }, multiplier) => {
          // Setup
          const deviceManager = new TuyaDeviceManager('test-key', 'test-secret');
          await deviceManager.authenticate();
          
          const anomalyDetector = new AnomalyDetectorImpl(deviceManager);
          
          // Register device with DeviceManager first
          await deviceManager.registerDevice(deviceId, deviceType);
          
          // Register device for anomaly detection
          const device: Device = {
            id: deviceId,
            type: deviceType,
            name: `test_${deviceType}`,
            location: 'test_location',
            capabilities: ['power_control'],
            normalPowerRange: { min: normalMin, max: normalMax },
            isOnline: true,
            lastSeen: new Date()
          };
          
          anomalyDetector.registerDevice(device);
          
          // Track if device was shut down
          let shutdownCalled = false;
          const originalSendCommand = deviceManager.sendCommand.bind(deviceManager);
          deviceManager.sendCommand = async (devId: string, command: any) => {
            if (devId === deviceId && command.action === 'turn_off') {
              shutdownCalled = true;
            }
            return originalSendCommand(devId, command);
          };
          
          // Calculate normal power consumption (within threshold)
          const normalWatts = normalMax * multiplier;
          
          // Test: Check for anomalies
          const result = anomalyDetector.checkForAnomalies(deviceId, normalWatts);
          
          // Verify: No anomaly detected
          expect(result.isAnomaly).toBe(false);
          
          // Verify: Device was NOT shut down
          expect(shutdownCalled).toBe(false);
          
          // Verify: No anomaly logged
          const history = await anomalyDetector.getAnomalyHistory(deviceId);
          expect(history.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 15: Repeated anomaly handling
   * Validates: Requirements 6.4
   * 
   * For any device that experiences 3 anomaly events within a 24-hour period,
   * automatic control for that device should be disabled.
   */
  test('Property 15: Repeated anomaly handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate device configuration
        fc.record({
          deviceId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          deviceType: fc.constantFrom<DeviceType>('smart_plug', 'hvac', 'light', 'camera', 'energy_sensor'),
          normalMin: fc.nat({ max: 100 }),
          normalMax: fc.integer({ min: 101, max: 2000 })
        }),
        
        // Generate time intervals between anomalies (in milliseconds)
        // All within 24 hours to trigger the disable condition
        fc.array(
          fc.integer({ min: 1000, max: 3600000 }), // 1 second to 1 hour between anomalies
          { minLength: 2, maxLength: 2 } // 2 intervals for 3 anomalies
        ),
        
        async ({ deviceId, deviceType, normalMin, normalMax }, timeIntervals) => {
          // Setup
          const deviceManager = new TuyaDeviceManager('test-key', 'test-secret');
          await deviceManager.authenticate();
          
          const anomalyDetector = new AnomalyDetectorImpl(deviceManager);
          
          // Register device with DeviceManager first
          await deviceManager.registerDevice(deviceId, deviceType);
          
          // Register device for anomaly detection
          const device: Device = {
            id: deviceId,
            type: deviceType,
            name: `test_${deviceType}`,
            location: 'test_location',
            capabilities: ['power_control'],
            normalPowerRange: { min: normalMin, max: normalMax },
            isOnline: true,
            lastSeen: new Date()
          };
          
          anomalyDetector.registerDevice(device);
          
          // Calculate anomalous power consumption (exceeds max by 50%)
          const anomalousWatts = normalMax * 2.0; // 100% above max (well over 50% threshold)
          
          // Create 3 anomaly events within 24 hours
          const baseTime = new Date();
          const anomalies: AnomalyEvent[] = [];
          
          // First anomaly at base time
          anomalies.push({
            deviceId,
            timestamp: new Date(baseTime.getTime()),
            normalRange: { min: normalMin, max: normalMax },
            actualValue: anomalousWatts,
            actionTaken: 'device_shutdown'
          });
          
          // Second anomaly after first interval
          anomalies.push({
            deviceId,
            timestamp: new Date(baseTime.getTime() + timeIntervals[0]),
            normalRange: { min: normalMin, max: normalMax },
            actualValue: anomalousWatts,
            actionTaken: 'device_shutdown'
          });
          
          // Third anomaly after second interval
          anomalies.push({
            deviceId,
            timestamp: new Date(baseTime.getTime() + timeIntervals[0] + timeIntervals[1]),
            normalRange: { min: normalMin, max: normalMax },
            actualValue: anomalousWatts,
            actionTaken: 'device_shutdown'
          });
          
          // Verify the total time span is within 24 hours
          const totalTimeSpan = timeIntervals[0] + timeIntervals[1];
          const twentyFourHoursMs = 24 * 60 * 60 * 1000;
          expect(totalTimeSpan).toBeLessThanOrEqual(twentyFourHoursMs);
          
          // Record all 3 anomalies
          anomalies.forEach(anomaly => {
            anomalyDetector.recordAnomaly(anomaly);
          });
          
          // Test: Check if device should be disabled after 3 anomalies within 24 hours
          const shouldDisable = anomalyDetector.shouldDisableDevice(deviceId);
          
          // Verify: Device should be disabled (Requirement 6.4)
          expect(shouldDisable).toBe(true);
          
          // Verify: Anomaly history contains all 3 events
          const history = await anomalyDetector.getAnomalyHistory(deviceId);
          expect(history.length).toBe(3);
          
          // Verify: All anomalies are for the correct device
          history.forEach(event => {
            expect(event.deviceId).toBe(deviceId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Anomalies outside 24-hour window should not trigger disable
   * 
   * For any device that experiences anomalies spread over more than 24 hours,
   * automatic control should NOT be disabled.
   */
  test('Property: Anomalies outside 24-hour window do not trigger disable', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate device configuration
        fc.record({
          deviceId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          deviceType: fc.constantFrom<DeviceType>('smart_plug', 'hvac', 'light', 'camera', 'energy_sensor'),
          normalMin: fc.nat({ max: 100 }),
          normalMax: fc.integer({ min: 101, max: 2000 })
        }),
        
        // Generate time intervals that exceed 24 hours total
        fc.integer({ min: 25 * 60 * 60 * 1000, max: 48 * 60 * 60 * 1000 }), // 25-48 hours
        
        async ({ deviceId, deviceType, normalMin, normalMax }, totalTimeSpan) => {
          // Setup
          const deviceManager = new TuyaDeviceManager('test-key', 'test-secret');
          await deviceManager.authenticate();
          
          const anomalyDetector = new AnomalyDetectorImpl(deviceManager);
          
          // Register device with DeviceManager first
          await deviceManager.registerDevice(deviceId, deviceType);
          
          // Register device for anomaly detection
          const device: Device = {
            id: deviceId,
            type: deviceType,
            name: `test_${deviceType}`,
            location: 'test_location',
            capabilities: ['power_control'],
            normalPowerRange: { min: normalMin, max: normalMax },
            isOnline: true,
            lastSeen: new Date()
          };
          
          anomalyDetector.registerDevice(device);
          
          // Calculate anomalous power consumption
          const anomalousWatts = normalMax * 2.0;
          
          // Create 3 anomaly events spread over more than 24 hours
          const baseTime = new Date();
          const anomalies: AnomalyEvent[] = [];
          
          // First anomaly at base time
          anomalies.push({
            deviceId,
            timestamp: new Date(baseTime.getTime()),
            normalRange: { min: normalMin, max: normalMax },
            actualValue: anomalousWatts,
            actionTaken: 'device_shutdown'
          });
          
          // Second anomaly halfway through the time span
          anomalies.push({
            deviceId,
            timestamp: new Date(baseTime.getTime() + totalTimeSpan / 2),
            normalRange: { min: normalMin, max: normalMax },
            actualValue: anomalousWatts,
            actionTaken: 'device_shutdown'
          });
          
          // Third anomaly at the end of the time span (> 24 hours from first)
          anomalies.push({
            deviceId,
            timestamp: new Date(baseTime.getTime() + totalTimeSpan),
            normalRange: { min: normalMin, max: normalMax },
            actualValue: anomalousWatts,
            actionTaken: 'device_shutdown'
          });
          
          // Record all 3 anomalies
          anomalies.forEach(anomaly => {
            anomalyDetector.recordAnomaly(anomaly);
          });
          
          // Test: Check if device should be disabled
          const shouldDisable = anomalyDetector.shouldDisableDevice(deviceId);
          
          // Verify: Device should NOT be disabled (anomalies span > 24 hours)
          expect(shouldDisable).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 16: Anomaly logging completeness
   * Validates: Requirements 6.5
   * 
   * For any anomaly event, the system log should contain the timestamp, 
   * device identifier, and consumption values.
   */
  test('Property 16: Anomaly logging completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate device configuration
        fc.record({
          deviceId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          deviceType: fc.constantFrom<DeviceType>('smart_plug', 'hvac', 'light', 'camera', 'energy_sensor'),
          normalMin: fc.nat({ max: 100 }),
          normalMax: fc.integer({ min: 101, max: 2000 })
        }),
        
        // Generate anomalous power consumption value
        fc.float({ min: 0, max: 10000, noNaN: true }),
        
        async ({ deviceId, deviceType, normalMin, normalMax }, actualValue) => {
          // Setup
          const deviceManager = new TuyaDeviceManager('test-key', 'test-secret');
          await deviceManager.authenticate();
          
          const anomalyDetector = new AnomalyDetectorImpl(deviceManager);
          
          // Register device with DeviceManager first
          await deviceManager.registerDevice(deviceId, deviceType);
          
          // Register device for anomaly detection
          const device: Device = {
            id: deviceId,
            type: deviceType,
            name: `test_${deviceType}`,
            location: 'test_location',
            capabilities: ['power_control'],
            normalPowerRange: { min: normalMin, max: normalMax },
            isOnline: true,
            lastSeen: new Date()
          };
          
          anomalyDetector.registerDevice(device);
          
          // Create an anomaly event
          const timestamp = new Date();
          const anomalyEvent: AnomalyEvent = {
            deviceId,
            timestamp,
            normalRange: { min: normalMin, max: normalMax },
            actualValue,
            actionTaken: 'device_shutdown'
          };
          
          // Test: Record the anomaly
          anomalyDetector.recordAnomaly(anomalyEvent);
          
          // Verify: Anomaly was logged
          const history = await anomalyDetector.getAnomalyHistory(deviceId);
          expect(history.length).toBeGreaterThan(0);
          
          // Find the logged anomaly
          const loggedAnomaly = history.find(a => 
            a.timestamp.getTime() === timestamp.getTime() &&
            a.actualValue === actualValue
          );
          
          // Verify: Log contains all required fields (Requirement 6.5)
          expect(loggedAnomaly).toBeDefined();
          expect(loggedAnomaly!.deviceId).toBe(deviceId); // Device identifier
          expect(loggedAnomaly!.timestamp).toEqual(timestamp); // Timestamp
          expect(loggedAnomaly!.actualValue).toBe(actualValue); // Consumption value
          expect(loggedAnomaly!.normalRange.min).toBe(normalMin); // Normal range (consumption context)
          expect(loggedAnomaly!.normalRange.max).toBe(normalMax); // Normal range (consumption context)
          expect(loggedAnomaly!.actionTaken).toBe('device_shutdown'); // Action taken
        }
      ),
      { numRuns: 100 }
    );
  });
});
