import * as fc from 'fast-check';
import { OccupancyDetectorImpl } from './OccupancyDetectorImpl';
import { DeviceManager } from '../interfaces/DeviceManager';
import { Device, DeviceStatus, DeviceCommand, DeviceType } from '../types';

/**
 * Mock DeviceManager for testing occupancy-based device control
 */
class MockDeviceManager implements DeviceManager {
  private devices: Map<string, Device> = new Map();
  private deviceStates: Map<string, 'on' | 'off'> = new Map();
  private commandHistory: Array<{ deviceId: string; command: DeviceCommand }> = [];

  async registerDevice(deviceId: string, deviceType: DeviceType): Promise<Device> {
    const device: Device = {
      id: deviceId,
      type: deviceType,
      name: `Device ${deviceId}`,
      location: 'test-location',
      capabilities: ['power'],
      normalPowerRange: { min: 0, max: 1000 },
      isOnline: true,
      lastSeen: new Date(),
    };
    this.devices.set(deviceId, device);
    this.deviceStates.set(deviceId, 'on'); // Default to on
    return device;
  }

  async discoverDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    return {
      deviceId,
      isOnline: true,
      powerState: this.deviceStates.get(deviceId) || 'off',
      lastUpdated: new Date(),
    };
  }

  async sendCommand(deviceId: string, command: DeviceCommand): Promise<void> {
    this.commandHistory.push({ deviceId, command });
    if (command.action === 'turn_on') {
      this.deviceStates.set(deviceId, 'on');
    } else if (command.action === 'turn_off') {
      this.deviceStates.set(deviceId, 'off');
    }
  }

  subscribeToTelemetry(deviceId: string, callback: any): void {
    // Not needed for this test
  }

  getCommandHistory() {
    return this.commandHistory;
  }

  getDeviceState(deviceId: string): 'on' | 'off' | undefined {
    return this.deviceStates.get(deviceId);
  }

  clearCommandHistory() {
    this.commandHistory = [];
  }
}

describe('OccupancyDetector Property-Based Tests', () => {
  
  /**
   * Feature: smart-energy-copilot, Property 9: Occupancy-based device control
   * Validates: Requirements 4.2
   * 
   * For any location with no detected occupancy for 5 consecutive minutes, 
   * all designated devices in that location should be turned off.
   */
  test('Property 9: Occupancy-based device control - devices turn off after 5 minutes unoccupied', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random location name
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        
        // Generate array of device IDs for the location
        fc.array(
          fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ).map(arr => [...new Set(arr)]), // Ensure unique device IDs
        
        async (location, deviceIds) => {
          // Use a short threshold for testing (100ms instead of 5 minutes)
          const testThresholdMs = 100;
          const mockDeviceManager = new MockDeviceManager();
          const detector = new OccupancyDetectorImpl(mockDeviceManager, testThresholdMs);

          // Register devices for the location
          for (const deviceId of deviceIds) {
            await mockDeviceManager.registerDevice(deviceId, 'smart_plug');
          }
          detector.registerDevicesForLocation(location, deviceIds);

          // Simulate unoccupied detection
          const emptyImage = Buffer.alloc(100); // Small buffer simulating empty room
          // Fill with low brightness values to simulate no occupancy
          for (let i = 0; i < emptyImage.length; i++) {
            emptyImage[i] = 10; // Low brightness
          }

          // Detect occupancy (should be unoccupied)
          const result = await detector.detectOccupancy(emptyImage, location);
          
          // Wait for the threshold period plus a small buffer
          await new Promise(resolve => setTimeout(resolve, testThresholdMs + 50));

          // Verify all devices in the location were turned off
          for (const deviceId of deviceIds) {
            const deviceState = mockDeviceManager.getDeviceState(deviceId);
            expect(deviceState).toBe('off');
          }

          // Verify turn_off commands were sent to all devices
          const commandHistory = mockDeviceManager.getCommandHistory();
          const turnOffCommands = commandHistory.filter(
            cmd => cmd.command.action === 'turn_off' && deviceIds.includes(cmd.deviceId)
          );
          expect(turnOffCommands.length).toBe(deviceIds.length);

          // Cleanup
          detector.cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000); // Increase timeout for async property test

  /**
   * Feature: smart-energy-copilot, Property 10: Occupancy state restoration
   * Validates: Requirements 4.3
   * 
   * For any device that was turned off due to absence, when occupancy is detected again,
   * the device should be restored to its previous state (round-trip property).
   */
  test('Property 10: Occupancy state restoration - devices restore to previous state when occupancy returns', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random location name
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        
        // Generate array of device IDs for the location
        fc.array(
          fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ).map(arr => [...new Set(arr)]), // Ensure unique device IDs
        
        // Generate initial device states (some on, some off)
        fc.array(fc.constantFrom('on' as const, 'off' as const), { minLength: 1, maxLength: 5 }),
        
        async (location, deviceIds, initialStates) => {
          // Ensure we have matching number of states and devices
          const states = initialStates.slice(0, deviceIds.length);
          while (states.length < deviceIds.length) {
            states.push('on');
          }

          // Use a short threshold for testing (100ms instead of 5 minutes)
          const testThresholdMs = 100;
          const mockDeviceManager = new MockDeviceManager();
          const detector = new OccupancyDetectorImpl(mockDeviceManager, testThresholdMs);

          // Register devices with their initial states
          for (let i = 0; i < deviceIds.length; i++) {
            await mockDeviceManager.registerDevice(deviceIds[i], 'smart_plug');
            // Set initial state
            if (states[i] === 'off') {
              await mockDeviceManager.sendCommand(deviceIds[i], { action: 'turn_off' });
            }
          }
          
          // Clear command history to track only occupancy-related commands
          mockDeviceManager.clearCommandHistory();
          
          // Register devices for the location
          detector.registerDevicesForLocation(location, deviceIds);

          // Step 1: Simulate unoccupied detection (devices should turn off after threshold)
          const emptyImage = Buffer.alloc(100);
          for (let i = 0; i < emptyImage.length; i++) {
            emptyImage[i] = 10; // Low brightness = no occupancy
          }
          await detector.detectOccupancy(emptyImage, location);
          
          // Wait for the threshold period to trigger device shutdown
          await new Promise(resolve => setTimeout(resolve, testThresholdMs + 50));

          // Verify all devices were turned off
          for (const deviceId of deviceIds) {
            const deviceState = mockDeviceManager.getDeviceState(deviceId);
            expect(deviceState).toBe('off');
          }

          // Step 2: Simulate occupancy detected (devices should restore to previous state)
          // Use a larger buffer to ensure proper brightness detection
          const occupiedImage = Buffer.alloc(2000);
          for (let i = 0; i < occupiedImage.length; i++) {
            occupiedImage[i] = 200; // High brightness = occupancy detected
          }
          const occupancyResult = await detector.detectOccupancy(occupiedImage, location);
          
          // Give a small delay for restoration to complete
          await new Promise(resolve => setTimeout(resolve, 50));

          // Step 3: Verify devices were restored to their ORIGINAL states (before shutdown)
          for (let i = 0; i < deviceIds.length; i++) {
            const deviceId = deviceIds[i];
            const originalState = states[i];
            const currentState = mockDeviceManager.getDeviceState(deviceId);
            
            // Only devices that were originally 'on' should be restored to 'on'
            // Devices that were originally 'off' should remain 'off'
            expect(currentState).toBe(originalState);
          }

          // Verify that turn_on commands were sent only for devices that were originally 'on'
          const commandHistory = mockDeviceManager.getCommandHistory();
          const turnOnCommands = commandHistory.filter(
            cmd => cmd.command.action === 'turn_on' && deviceIds.includes(cmd.deviceId)
          );
          
          const expectedTurnOnCount = states.filter(state => state === 'on').length;
          expect(turnOnCommands.length).toBe(expectedTurnOnCount);

          // Cleanup
          detector.cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000); // Increase timeout for async property test
});
