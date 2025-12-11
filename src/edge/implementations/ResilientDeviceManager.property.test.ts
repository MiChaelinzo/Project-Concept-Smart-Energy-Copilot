import * as fc from 'fast-check';
import { ResilientDeviceManager } from './ResilientDeviceManager';
import { TuyaDeviceManager } from './TuyaDeviceManager';
import { DeviceCommand, DeviceType } from '../types';

// Mock the TuyaDeviceManager
jest.mock('./TuyaDeviceManager');

describe('ResilientDeviceManager Property-Based Tests', () => {
  let manager: ResilientDeviceManager;
  let mockTuyaManager: jest.Mocked<TuyaDeviceManager>;
  const mockApiKey = 'test-api-key';
  const mockApiSecret = 'test-api-secret';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a proper mock instance
    mockTuyaManager = {
      registerDevice: jest.fn(),
      discoverDevices: jest.fn(),
      getDeviceStatus: jest.fn(),
      sendCommand: jest.fn(),
      subscribeToTelemetry: jest.fn(),
      authenticate: jest.fn(),
      simulateTelemetry: jest.fn(),
      getRegisteredDevices: jest.fn(),
      clearDevices: jest.fn()
    } as any;

    // Mock the constructor to return our mock instance
    (TuyaDeviceManager as jest.MockedClass<typeof TuyaDeviceManager>).mockImplementation(() => mockTuyaManager);
    
    manager = new ResilientDeviceManager(mockApiKey, mockApiSecret);
  });

  afterEach(() => {
    manager.destroy();
  });

  // Feature: smart-energy-copilot, Property 22: Command queueing resilience
  test('Property 22: Command queueing resilience', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            deviceId: fc.string({ minLength: 1, maxLength: 20 }),
            action: fc.constantFrom('turn_on', 'turn_off', 'set_value'),
            parameters: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (commands) => {
          // Force API to be unavailable to trigger queueing
          (manager as any).apiStatus.isAvailable = false;

          // Send all commands (should be queued)
          for (const cmd of commands) {
            const command: DeviceCommand = {
              action: cmd.action as any,
              parameters: cmd.parameters
            };
            await manager.sendCommand(cmd.deviceId, command);
          }

          // Verify all commands are queued
          const queueStatus = manager.getQueueStatus();
          expect(queueStatus.size).toBe(Math.min(commands.length, (manager as any).MAX_QUEUE_SIZE));

          // Simulate API becoming available
          (manager as any).apiStatus.isAvailable = true;
          mockTuyaManager.sendCommand.mockResolvedValue(undefined);

          // Process the queue
          await (manager as any).processQueuedCommands();

          // Verify queue is empty after processing
          const finalQueueStatus = manager.getQueueStatus();
          expect(finalQueueStatus.size).toBe(0);

          // Verify commands were sent to the base manager
          expect(mockTuyaManager.sendCommand).toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});
