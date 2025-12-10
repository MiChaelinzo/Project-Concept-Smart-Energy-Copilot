/**
 * DeviceManager tests including property-based tests
 */

import * as fc from 'fast-check';
import { TuyaDeviceManager } from '../implementations/TuyaDeviceManager';
import { DeviceType } from '../types';

// Generators for property-based testing
const deviceIdGenerator = () => fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const deviceTypeGenerator = () => fc.constantFrom<DeviceType>('smart_plug', 'energy_sensor', 'camera', 'hvac', 'light');

describe('DeviceManager Tests', () => {
  describe('Property-Based Tests', () => {
    // Feature: smart-energy-copilot, Property 1: Device registration completeness
    // Validates: Requirements 1.1
    it('Property 1: Device registration completeness - registered devices appear in device list with energy tracking', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.tuple(deviceIdGenerator(), deviceTypeGenerator()), { minLength: 1, maxLength: 20 }),
          async (deviceSpecs) => {
            // Setup: Create a new device manager for each test
            const manager = new TuyaDeviceManager('test-api-key', 'test-api-secret');
            await manager.authenticate();

            // Remove duplicates - keep first occurrence of each device ID
            const uniqueDeviceSpecs = new Map<string, DeviceType>();
            for (const [deviceId, deviceType] of deviceSpecs) {
              if (!uniqueDeviceSpecs.has(deviceId)) {
                uniqueDeviceSpecs.set(deviceId, deviceType);
              }
            }

            // Register all unique devices
            const registeredDevices = [];
            for (const [deviceId, deviceType] of uniqueDeviceSpecs.entries()) {
              const device = await manager.registerDevice(deviceId, deviceType);
              registeredDevices.push(device);
            }

            // Get the device list
            const deviceList = manager.getRegisteredDevices();

            // Property: All registered devices should appear in the device list
            for (const [deviceId, deviceType] of uniqueDeviceSpecs.entries()) {
              const foundDevice = deviceList.find(d => d.id === deviceId);
              
              // Device should be in the list
              expect(foundDevice).toBeDefined();
              
              // Device should have correct type
              expect(foundDevice?.type).toBe(deviceType);
              
              // Device should have energy tracking initialized (capabilities)
              expect(foundDevice?.capabilities).toBeDefined();
              expect(Array.isArray(foundDevice?.capabilities)).toBe(true);
              
              // Device should have power range defined for energy tracking
              expect(foundDevice?.normalPowerRange).toBeDefined();
              expect(typeof foundDevice?.normalPowerRange.min).toBe('number');
              expect(typeof foundDevice?.normalPowerRange.max).toBe('number');
            }

            // Cleanup
            manager.clearDevices();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: smart-energy-copilot, Property 21: Command routing correctness
    // Validates: Requirements 8.3
    it('Property 21: Command routing correctness - commands are sent through Tuya Cloud API', async () => {
      await fc.assert(
        fc.asyncProperty(
          deviceIdGenerator(),
          deviceTypeGenerator(),
          fc.constantFrom('turn_on', 'turn_off', 'set_value'),
          async (deviceId, deviceType, action) => {
            // Setup: Create and authenticate manager
            const manager = new TuyaDeviceManager('test-api-key', 'test-api-secret');
            await manager.authenticate();

            // Register a device
            await manager.registerDevice(deviceId, deviceType);

            // Send command - should not throw if routing is correct
            await expect(
              manager.sendCommand(deviceId, { action: action as any })
            ).resolves.not.toThrow();

            // Cleanup
            manager.clearDevices();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    let manager: TuyaDeviceManager;

    beforeEach(async () => {
      manager = new TuyaDeviceManager('test-api-key', 'test-api-secret');
      await manager.authenticate();
    });

    afterEach(() => {
      manager.clearDevices();
    });

    // Test device discovery with empty results
    it('should return empty array when no devices are registered', async () => {
      const devices = await manager.discoverDevices();
      expect(devices).toEqual([]);
    });

    // Test authentication failure handling
    it('should throw error when operations are attempted without authentication', async () => {
      const unauthManager = new TuyaDeviceManager('test-key', 'test-secret');
      
      await expect(
        unauthManager.registerDevice('device-1', 'smart_plug')
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw error with invalid credentials', async () => {
      const invalidManager = new TuyaDeviceManager('', '');
      
      await expect(
        invalidManager.authenticate()
      ).rejects.toThrow('Invalid credentials');
    });

    // Test invalid device responses
    it('should throw error when getting status of non-existent device', async () => {
      await expect(
        manager.getDeviceStatus('non-existent-device')
      ).rejects.toThrow('Device not found');
    });

    it('should throw error when sending command to non-existent device', async () => {
      await expect(
        manager.sendCommand('non-existent-device', { action: 'turn_on' })
      ).rejects.toThrow('Device not found');
    });

    it('should throw error when registering device with empty ID', async () => {
      await expect(
        manager.registerDevice('', 'smart_plug')
      ).rejects.toThrow('Device ID cannot be empty');
    });

    it('should throw error when sending command without action', async () => {
      await manager.registerDevice('device-1', 'smart_plug');
      
      await expect(
        manager.sendCommand('device-1', { action: '' as any })
      ).rejects.toThrow('Command action is required');
    });
  });
});
