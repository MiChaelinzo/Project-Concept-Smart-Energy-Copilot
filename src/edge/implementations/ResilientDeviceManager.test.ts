import { ResilientDeviceManager } from './ResilientDeviceManager';
import { TuyaDeviceManager } from './TuyaDeviceManager';
import { DeviceCommand, DeviceType } from '../types';

// Mock the TuyaDeviceManager
jest.mock('./TuyaDeviceManager');

describe('ResilientDeviceManager', () => {
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

  describe('Command Queueing', () => {
    it('should queue commands when API is unavailable', async () => {
      // Simulate API failure
      mockTuyaManager.sendCommand.mockRejectedValue(new Error('API unavailable'));

      const deviceId = 'test-device';
      const command: DeviceCommand = { action: 'turn_on' };

      // This should queue the command instead of throwing
      await manager.sendCommand(deviceId, command);

      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.size).toBe(1);
    }, 10000);

    it('should handle queue overflow by removing oldest commands', async () => {
      // Set a small queue size for testing
      (manager as any).MAX_QUEUE_SIZE = 2;

      // Force API to be unavailable
      (manager as any).apiStatus.isAvailable = false;

      const deviceId = 'test-device';
      const command: DeviceCommand = { action: 'turn_on' };

      // Add 3 commands (should overflow)
      await manager.sendCommand(deviceId, command);
      await manager.sendCommand(deviceId, command);
      await manager.sendCommand(deviceId, command);

      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.size).toBe(2); // Should only keep 2 commands
    }, 10000);

    it('should process queued commands when API becomes available', async () => {
      // Start with API failure, then success
      mockTuyaManager.sendCommand
        .mockRejectedValueOnce(new Error('API unavailable'))
        .mockResolvedValue(undefined);

      const deviceId = 'test-device';
      const command: DeviceCommand = { action: 'turn_on' };

      // Queue a command by forcing API failure
      (manager as any).apiStatus.isAvailable = false;
      await manager.sendCommand(deviceId, command);
      expect(manager.getQueueStatus().size).toBe(1);

      // Simulate API becoming available and process queue
      (manager as any).apiStatus.isAvailable = true;
      await (manager as any).processQueuedCommands();

      expect(manager.getQueueStatus().size).toBe(0);
      expect(mockTuyaManager.sendCommand).toHaveBeenCalledWith(deviceId, command);
    }, 10000);
  });

  describe('Cache Expiration', () => {
    it('should handle cache expiration', async () => {
      // Set a very short TTL for testing
      (manager as any).CACHE_TTL_MS = 1;

      const mockDevice = {
        id: 'test-device',
        type: 'smart_plug' as DeviceType,
        name: 'Test Device',
        location: 'test',
        capabilities: [],
        normalPowerRange: { min: 0, max: 100 },
        isOnline: true,
        lastSeen: new Date()
      };

      mockTuyaManager.registerDevice.mockResolvedValue(mockDevice);

      // Register device to cache it
      await manager.registerDevice('test-device', 'smart_plug');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      // Mock API failure to force cache lookup
      mockTuyaManager.registerDevice.mockRejectedValue(new Error('API unavailable'));

      // Should throw since cache expired
      await expect(manager.registerDevice('test-device', 'smart_plug'))
        .rejects.toThrow('API unavailable');
    });
  });

  describe('Command Deduplication', () => {
    it('should handle command deduplication in queue', async () => {
      // Force API to be unavailable
      (manager as any).apiStatus.isAvailable = false;

      const deviceId = 'test-device';
      const command: DeviceCommand = { action: 'turn_on' };

      // Add multiple identical commands
      await manager.sendCommand(deviceId, command);
      await manager.sendCommand(deviceId, command);

      // Should have 2 commands (no deduplication by default)
      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.size).toBe(2);
    }, 10000);
  });

  describe('API Status Monitoring', () => {
    it('should track consecutive failures', () => {
      // Simulate multiple failures
      (manager as any).updateApiStatus(false);
      (manager as any).updateApiStatus(false);
      (manager as any).updateApiStatus(false);

      const apiStatus = manager.getApiStatus();
      expect(apiStatus.consecutiveFailures).toBe(3);
    });

    it('should reset consecutive failures on success', () => {
      // Simulate failures then success
      (manager as any).updateApiStatus(false);
      (manager as any).updateApiStatus(false);
      (manager as any).updateApiStatus(true);

      const apiStatus = manager.getApiStatus();
      expect(apiStatus.consecutiveFailures).toBe(0);
      expect(apiStatus.isAvailable).toBe(true);
    });

    it('should mark API as unavailable after max consecutive failures', () => {
      // Simulate max failures
      for (let i = 0; i < 5; i++) {
        (manager as any).updateApiStatus(false);
      }

      const apiStatus = manager.getApiStatus();
      expect(apiStatus.isAvailable).toBe(false);
    });
  });
});