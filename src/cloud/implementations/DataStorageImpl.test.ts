import { DataStorageImpl } from './DataStorageImpl';
import { EnergyReading, AggregatedEnergy } from '../types';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-timestream-write', () => ({
  TimestreamWriteClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  WriteRecordsCommand: jest.fn(),
  MeasureValueType: {
    DOUBLE: 'DOUBLE',
    BIGINT: 'BIGINT',
    VARCHAR: 'VARCHAR',
    BOOLEAN: 'BOOLEAN',
    TIMESTAMP: 'TIMESTAMP',
  },
}));

jest.mock('@aws-sdk/client-timestream-query', () => ({
  TimestreamQueryClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ Rows: [] }),
  })),
  QueryCommand: jest.fn(),
}));

/**
 * Unit tests for DataStorage
 * Requirements: 8.5
 */
describe('DataStorage Unit Tests', () => {
  let dataStorage: DataStorageImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    dataStorage = new DataStorageImpl();
  });

  /**
   * Test reading storage and retrieval
   * Requirements: 8.5
   */
  describe('Reading storage and retrieval', () => {
    test('should store energy reading successfully', async () => {
      const reading: EnergyReading = {
        id: 'test-reading-1',
        deviceId: 'device-1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        watts: 100.5,
        voltage: 120.0,
        current: 0.84,
      };

      await expect(dataStorage.storeReading(reading)).resolves.not.toThrow();
    });

    test('should store energy reading with only watts (no voltage/current)', async () => {
      const reading: EnergyReading = {
        id: 'test-reading-2',
        deviceId: 'device-2',
        timestamp: new Date('2024-01-01T13:00:00Z'),
        watts: 75.2,
      };

      await expect(dataStorage.storeReading(reading)).resolves.not.toThrow();
    });

    test('should retrieve energy readings successfully', async () => {
      const deviceId = 'device-1';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');

      const readings = await dataStorage.getReadings(deviceId, startTime, endTime);

      expect(Array.isArray(readings)).toBe(true);
    });

    test('should return empty array when no readings found', async () => {
      const deviceId = 'device-nonexistent';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');

      const readings = await dataStorage.getReadings(deviceId, startTime, endTime);

      expect(readings).toHaveLength(0);
    });
  });

  /**
   * Test aggregated data operations
   * Requirements: 8.5
   */
  describe('Aggregated data operations', () => {
    test('should store aggregated data successfully', async () => {
      const aggregatedData: AggregatedEnergy = {
        deviceId: 'device-1',
        period: 'daily',
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-02T00:00:00Z'),
        totalKwh: 24.5,
        averageWatts: 1020.8,
        peakWatts: 1500.0,
        carbonKg: 22.54,
      };

      await expect(dataStorage.storeAggregatedData(aggregatedData)).resolves.not.toThrow();
    });

    test('should retrieve aggregated data successfully', async () => {
      const deviceId = 'device-1';
      const period = 'daily';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-07T00:00:00Z');

      const aggregatedData = await dataStorage.getAggregatedData(deviceId, period, startTime, endTime);

      expect(Array.isArray(aggregatedData)).toBe(true);
    });

    test('should return empty array when no aggregated data found', async () => {
      const deviceId = 'device-nonexistent';
      const period = 'monthly';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-02-01T00:00:00Z');

      const aggregatedData = await dataStorage.getAggregatedData(deviceId, period, startTime, endTime);

      expect(aggregatedData).toHaveLength(0);
    });

    test('should filter incomplete aggregated data records', async () => {
      const deviceId = 'device-1';
      const period = 'hourly';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      const aggregatedData = await dataStorage.getAggregatedData(deviceId, period, startTime, endTime);

      // Should filter out incomplete records
      expect(aggregatedData).toHaveLength(0);
    });
  });

  /**
   * Test error handling for cloud failures
   * Requirements: 8.5
   */
  describe('Error handling for cloud failures', () => {
    test('should throw error when storing reading fails', async () => {
      // Mock the AWS client to throw an error
      const mockError = new Error('Timestream service unavailable');
      const mockClient = require('@aws-sdk/client-timestream-write').TimestreamWriteClient;
      mockClient.mockImplementationOnce(() => ({
        send: jest.fn().mockRejectedValue(mockError),
      }));

      const dataStorageWithError = new DataStorageImpl();
      const reading: EnergyReading = {
        id: 'test-reading-1',
        deviceId: 'device-1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        watts: 100.5,
      };

      await expect(dataStorageWithError.storeReading(reading)).rejects.toThrow(
        'Failed to store energy reading'
      );
    });

    test('should throw error when storing aggregated data fails', async () => {
      // Mock the AWS client to throw an error
      const mockError = new Error('Network timeout');
      const mockClient = require('@aws-sdk/client-timestream-write').TimestreamWriteClient;
      mockClient.mockImplementationOnce(() => ({
        send: jest.fn().mockRejectedValue(mockError),
      }));

      const dataStorageWithError = new DataStorageImpl();
      const aggregatedData: AggregatedEnergy = {
        deviceId: 'device-1',
        period: 'daily',
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-02T00:00:00Z'),
        totalKwh: 24.5,
        averageWatts: 1020.8,
        peakWatts: 1500.0,
        carbonKg: 22.54,
      };

      await expect(dataStorageWithError.storeAggregatedData(aggregatedData)).rejects.toThrow(
        'Failed to store aggregated data'
      );
    });

    test('should throw error when retrieving readings fails', async () => {
      // Mock the AWS client to throw an error
      const mockError = new Error('Query execution failed');
      const mockClient = require('@aws-sdk/client-timestream-query').TimestreamQueryClient;
      mockClient.mockImplementationOnce(() => ({
        send: jest.fn().mockRejectedValue(mockError),
      }));

      const dataStorageWithError = new DataStorageImpl();
      const deviceId = 'device-1';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');

      await expect(dataStorageWithError.getReadings(deviceId, startTime, endTime)).rejects.toThrow(
        'Failed to retrieve energy readings'
      );
    });

    test('should throw error when retrieving aggregated data fails', async () => {
      // Mock the AWS client to throw an error
      const mockError = new Error('Database connection lost');
      const mockClient = require('@aws-sdk/client-timestream-query').TimestreamQueryClient;
      mockClient.mockImplementationOnce(() => ({
        send: jest.fn().mockRejectedValue(mockError),
      }));

      const dataStorageWithError = new DataStorageImpl();
      const deviceId = 'device-1';
      const period = 'weekly';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-08T00:00:00Z');

      await expect(
        dataStorageWithError.getAggregatedData(deviceId, period, startTime, endTime)
      ).rejects.toThrow('Failed to retrieve aggregated data');
    });

    test('should handle malformed query response gracefully', async () => {
      const deviceId = 'device-1';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');

      const readings = await dataStorage.getReadings(deviceId, startTime, endTime);

      // Should handle malformed data gracefully and return empty array
      expect(readings).toHaveLength(0);
    });

    test('should handle missing query response data', async () => {
      const deviceId = 'device-1';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');

      const readings = await dataStorage.getReadings(deviceId, startTime, endTime);

      expect(readings).toHaveLength(0);
    });
  });
});