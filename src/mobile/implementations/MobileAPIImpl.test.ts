import { MobileAPIImpl } from './MobileAPIImpl';
import { DeviceManager } from '../../edge/interfaces/DeviceManager';
import { EnergyMonitor } from '../../edge/interfaces/EnergyMonitor';
import { CarbonDashboard } from '../../cloud/interfaces/CarbonDashboard';
import { ScheduleExecutor } from '../../edge/interfaces/ScheduleExecutor';
import { Device, DeviceStatus } from '../../edge/types';
import { DashboardData, DeviceControlRequest, HistoricalDataRequest } from '../types';



/**
 * Unit tests for MobileAPIImpl
 * Requirements: 7.1, 7.3, 7.4
 */
describe('MobileAPIImpl Unit Tests', () => {
  let mobileAPI: MobileAPIImpl;
  let mockDeviceManager: jest.Mocked<DeviceManager>;
  let mockEnergyMonitor: jest.Mocked<EnergyMonitor>;
  let mockCarbonDashboard: jest.Mocked<CarbonDashboard>;
  let mockScheduleExecutor: jest.Mocked<ScheduleExecutor>;

  beforeEach(() => {
    mockDeviceManager = {
      registerDevice: jest.fn(),
      discoverDevices: jest.fn(),
      getDeviceStatus: jest.fn(),
      sendCommand: jest.fn(),
      subscribeToTelemetry: jest.fn(),
    } as any;

    mockEnergyMonitor = {
      recordConsumption: jest.fn(),
      getCurrentConsumption: jest.fn(),
      getHistoricalData: jest.fn(),
      getTotalConsumption: jest.fn(),
      calculateCarbonFootprint: jest.fn(),
    } as any;

    mockCarbonDashboard = {
      getDashboardData: jest.fn(),
      calculateCarbonEmissions: jest.fn(),
      calculatePercentageChange: jest.fn(),
      calculateProjectedAnnualSavings: jest.fn(),
      getEnergySaved: jest.fn(),
    } as any;

    mockScheduleExecutor = {
      executeSchedule: jest.fn(),
      handleOverride: jest.fn(),
      pauseSchedule: jest.fn(),
      resumeSchedule: jest.fn(),
    } as any;

    mobileAPI = new MobileAPIImpl(
      mockDeviceManager,
      mockEnergyMonitor,
      mockCarbonDashboard,
      mockScheduleExecutor
    );
  });

  // Test empty device list display
  // Requirements: 7.1
  describe('getDevices - empty device list display', () => {
    test('should return empty array when no devices are registered', async () => {
      mockDeviceManager.discoverDevices.mockResolvedValue([]);
      const result = await mobileAPI.getDevices();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should handle device manager errors gracefully', async () => {
      mockDeviceManager.discoverDevices.mockRejectedValue(new Error('Device discovery failed'));
      await expect(mobileAPI.getDevices()).rejects.toThrow('Device discovery failed');
    });
  });

  // Test network failure during command sending
  // Requirements: 7.1, 7.3, 7.4
  describe('controlDevice - network failure handling', () => {
    test('should handle network failure during command sending', async () => {
      const request: DeviceControlRequest = {
        deviceId: 'device1',
        action: 'turn_on',
      };

      mockDeviceManager.sendCommand.mockRejectedValue(new Error('Network timeout'));
      await expect(mobileAPI.controlDevice(request)).rejects.toThrow('Network timeout');
    });

    test('should handle connection refused error', async () => {
      const request: DeviceControlRequest = {
        deviceId: 'device1',
        action: 'turn_off',
      };

      mockDeviceManager.sendCommand.mockRejectedValue(new Error('Connection refused'));
      await expect(mobileAPI.controlDevice(request)).rejects.toThrow('Connection refused');
    });

    test('should handle API unavailable error', async () => {
      const request: DeviceControlRequest = {
        deviceId: 'device1',
        action: 'set_value',
        parameters: { brightness: 50 },
      };

      mockDeviceManager.sendCommand.mockRejectedValue(new Error('Service unavailable'));
      await expect(mobileAPI.controlDevice(request)).rejects.toThrow('Service unavailable');
    });
  });

  // Test invalid time range handling
  // Requirements: 7.3
  describe('getHistoricalData - invalid time range handling', () => {
    test('should throw error when start date is after end date', async () => {
      const request: HistoricalDataRequest = {
        deviceId: 'device1',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-01-01'),
        granularity: 'daily',
      };

      await expect(mobileAPI.getHistoricalData(request)).rejects.toThrow(
        'Start date must be before end date'
      );
    });

    test('should throw error when start date is missing', async () => {
      const request: HistoricalDataRequest = {
        deviceId: 'device1',
        startDate: null as any,
        endDate: new Date('2024-01-31'),
        granularity: 'daily',
      };

      await expect(mobileAPI.getHistoricalData(request)).rejects.toThrow(
        'Start date and end date are required'
      );
    });

    test('should throw error when end date is missing', async () => {
      const request: HistoricalDataRequest = {
        deviceId: 'device1',
        startDate: new Date('2024-01-01'),
        endDate: null as any,
        granularity: 'daily',
      };

      await expect(mobileAPI.getHistoricalData(request)).rejects.toThrow(
        'Start date and end date are required'
      );
    });

    test('should handle same start and end date', async () => {
      const sameDate = new Date('2024-01-01');
      const request: HistoricalDataRequest = {
        deviceId: 'device1',
        startDate: sameDate,
        endDate: sameDate,
        granularity: 'daily',
      };

      const mockData = [
        { deviceId: 'device1', timestamp: sameDate, watts: 150, cumulativeKwh: 3.6 },
      ];

      mockEnergyMonitor.getHistoricalData.mockResolvedValue(mockData);
      const result = await mobileAPI.getHistoricalData(request);
      expect(result).toEqual(mockData);
    });
  });

  describe('getDashboardData - invalid time range handling', () => {
    test('should throw error when start date is after end date', async () => {
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-01-01');
      await expect(mobileAPI.getDashboardData(startDate, endDate)).rejects.toThrow(
        'Start date must be before end date'
      );
    });

    test('should throw error when start date is missing', async () => {
      const endDate = new Date('2024-01-31');
      await expect(mobileAPI.getDashboardData(null as any, endDate)).rejects.toThrow(
        'Start date and end date are required'
      );
    });

    test('should throw error when end date is missing', async () => {
      const startDate = new Date('2024-01-01');
      await expect(mobileAPI.getDashboardData(startDate, null as any)).rejects.toThrow(
        'Start date and end date are required'
      );
    });
  });

  describe('toggleAdaptiveSchedule - invalid input handling', () => {
    test('should throw error for empty device ID', async () => {
      await expect(mobileAPI.toggleAdaptiveSchedule('', true)).rejects.toThrow(
        'Device ID cannot be empty'
      );
    });

    test('should throw error for whitespace-only device ID', async () => {
      await expect(mobileAPI.toggleAdaptiveSchedule('   ', false)).rejects.toThrow(
        'Device ID cannot be empty'
      );
    });
  });
});
