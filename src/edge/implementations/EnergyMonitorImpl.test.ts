import { EnergyMonitorImpl } from './EnergyMonitorImpl';
import { TimeRange } from '../interfaces/EnergyMonitor';

describe('EnergyMonitor Unit Tests', () => {
  let monitor: EnergyMonitorImpl;

  beforeEach(() => {
    monitor = new EnergyMonitorImpl();
  });

  describe('recordConsumption', () => {
    test('should reject negative energy values', () => {
      expect(() => {
        monitor.recordConsumption('device1', -100, new Date());
      }).toThrow('Energy consumption cannot be negative');
    });

    test('should reject empty device ID', () => {
      expect(() => {
        monitor.recordConsumption('', 100, new Date());
      }).toThrow('Device ID cannot be empty');
    });

    test('should reject invalid timestamp', () => {
      expect(() => {
        monitor.recordConsumption('device1', 100, new Date('invalid'));
      }).toThrow('Invalid timestamp');
    });

    test('should handle zero consumption edge case', () => {
      const timestamp = new Date('2024-01-01T00:00:00Z');
      
      expect(() => {
        monitor.recordConsumption('device1', 0, timestamp);
      }).not.toThrow();

      const readings = monitor.getAllReadings('device1');
      expect(readings).toHaveLength(1);
      expect(readings[0].watts).toBe(0);
    });

    test('should handle extreme outlier values', () => {
      const timestamp = new Date('2024-01-01T00:00:00Z');
      const extremeWatts = 50000; // Very high consumption
      
      expect(() => {
        monitor.recordConsumption('device1', extremeWatts, timestamp);
      }).not.toThrow();

      const readings = monitor.getAllReadings('device1');
      expect(readings).toHaveLength(1);
      expect(readings[0].watts).toBe(extremeWatts);
    });
  });

  describe('getCurrentConsumption', () => {
    test('should return 0 for device with no readings', async () => {
      const consumption = await monitor.getCurrentConsumption('nonexistent');
      expect(consumption).toBe(0);
    });

    test('should return last recorded consumption', async () => {
      const baseTime = new Date('2024-01-01T00:00:00Z');
      
      monitor.recordConsumption('device1', 100, baseTime);
      monitor.recordConsumption('device1', 200, new Date(baseTime.getTime() + 60000));
      monitor.recordConsumption('device1', 150, new Date(baseTime.getTime() + 120000));

      const consumption = await monitor.getCurrentConsumption('device1');
      expect(consumption).toBe(150);
    });

    test('should reject empty device ID', async () => {
      await expect(monitor.getCurrentConsumption('')).rejects.toThrow('Device ID cannot be empty');
    });
  });

  describe('getHistoricalData', () => {
    test('should return empty array for device with no readings', async () => {
      const range: TimeRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-02T00:00:00Z')
      };

      const data = await monitor.getHistoricalData('nonexistent', range);
      expect(data).toEqual([]);
    });

    test('should filter readings within time range', async () => {
      const baseTime = new Date('2024-01-01T00:00:00Z');
      
      monitor.recordConsumption('device1', 100, new Date(baseTime.getTime()));
      monitor.recordConsumption('device1', 200, new Date(baseTime.getTime() + 60 * 60 * 1000));
      monitor.recordConsumption('device1', 300, new Date(baseTime.getTime() + 2 * 60 * 60 * 1000));
      monitor.recordConsumption('device1', 400, new Date(baseTime.getTime() + 3 * 60 * 60 * 1000));

      const range: TimeRange = {
        start: new Date(baseTime.getTime() + 30 * 60 * 1000), // 30 minutes after first
        end: new Date(baseTime.getTime() + 2.5 * 60 * 60 * 1000) // 2.5 hours after first
      };

      const data = await monitor.getHistoricalData('device1', range);
      expect(data).toHaveLength(2);
      expect(data[0].watts).toBe(200);
      expect(data[1].watts).toBe(300);
    });

    test('should reject invalid time range (start after end)', async () => {
      const range: TimeRange = {
        start: new Date('2024-01-02T00:00:00Z'),
        end: new Date('2024-01-01T00:00:00Z')
      };

      await expect(monitor.getHistoricalData('device1', range)).rejects.toThrow('Start time must be before end time');
    });

    test('should reject empty device ID', async () => {
      const range: TimeRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-02T00:00:00Z')
      };

      await expect(monitor.getHistoricalData('', range)).rejects.toThrow('Device ID cannot be empty');
    });
  });

  describe('getTotalConsumption', () => {
    test('should return 0 for time range with no readings', async () => {
      const range: TimeRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-02T00:00:00Z')
      };

      const total = await monitor.getTotalConsumption(range);
      expect(total).toBe(0);
    });

    test('should aggregate consumption across multiple devices', async () => {
      const baseTime = new Date('2024-01-01T00:00:00Z');
      
      // Device 1: 100W for 1 hour = 0.1 kWh
      monitor.recordConsumption('device1', 100, baseTime);
      monitor.recordConsumption('device1', 100, new Date(baseTime.getTime() + 60 * 60 * 1000));

      // Device 2: 200W for 1 hour = 0.2 kWh
      monitor.recordConsumption('device2', 200, baseTime);
      monitor.recordConsumption('device2', 200, new Date(baseTime.getTime() + 60 * 60 * 1000));

      const range: TimeRange = {
        start: new Date(baseTime.getTime() - 1000),
        end: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000)
      };

      const total = await monitor.getTotalConsumption(range);
      expect(total).toBeCloseTo(0.3, 3); // 0.1 + 0.2 = 0.3 kWh
    });

    test('should reject invalid time range', async () => {
      const range: TimeRange = {
        start: new Date('2024-01-02T00:00:00Z'),
        end: new Date('2024-01-01T00:00:00Z')
      };

      await expect(monitor.getTotalConsumption(range)).rejects.toThrow('Start time must be before end time');
    });
  });

  describe('calculateCarbonFootprint', () => {
    test('should calculate carbon footprint correctly', () => {
      const energyKwh = 100;
      const carbon = monitor.calculateCarbonFootprint(energyKwh);
      
      // 100 kWh * 0.92 lbs CO2/kWh = 92 lbs CO2
      expect(carbon).toBe(92);
    });

    test('should handle zero energy consumption', () => {
      const carbon = monitor.calculateCarbonFootprint(0);
      expect(carbon).toBe(0);
    });

    test('should reject negative energy values', () => {
      expect(() => {
        monitor.calculateCarbonFootprint(-100);
      }).toThrow('Energy consumption cannot be negative');
    });

    test('should handle very large energy values', () => {
      const energyKwh = 1000000;
      const carbon = monitor.calculateCarbonFootprint(energyKwh);
      
      expect(carbon).toBe(920000); // 1,000,000 * 0.92
    });
  });

  describe('edge cases and integration', () => {
    test('should handle multiple devices with different consumption patterns', async () => {
      const baseTime = new Date('2024-01-01T00:00:00Z');
      
      // High consumption device
      monitor.recordConsumption('hvac', 3000, baseTime);
      monitor.recordConsumption('hvac', 3000, new Date(baseTime.getTime() + 60 * 60 * 1000));

      // Low consumption device
      monitor.recordConsumption('light', 10, baseTime);
      monitor.recordConsumption('light', 10, new Date(baseTime.getTime() + 60 * 60 * 1000));

      // Zero consumption device
      monitor.recordConsumption('sensor', 0, baseTime);
      monitor.recordConsumption('sensor', 0, new Date(baseTime.getTime() + 60 * 60 * 1000));

      const hvacConsumption = await monitor.getCurrentConsumption('hvac');
      const lightConsumption = await monitor.getCurrentConsumption('light');
      const sensorConsumption = await monitor.getCurrentConsumption('sensor');

      expect(hvacConsumption).toBe(3000);
      expect(lightConsumption).toBe(10);
      expect(sensorConsumption).toBe(0);
    });

    test('should maintain data integrity across operations', async () => {
      const baseTime = new Date('2024-01-01T00:00:00Z');
      
      // Record some data
      monitor.recordConsumption('device1', 100, baseTime);
      monitor.recordConsumption('device1', 150, new Date(baseTime.getTime() + 60 * 60 * 1000));

      // Query current consumption
      const current = await monitor.getCurrentConsumption('device1');
      expect(current).toBe(150);

      // Query historical data
      const range: TimeRange = {
        start: baseTime,
        end: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000)
      };
      const historical = await monitor.getHistoricalData('device1', range);
      expect(historical).toHaveLength(2);

      // Verify cumulative calculation
      expect(historical[0].cumulativeKwh).toBe(0);
      expect(historical[1].cumulativeKwh).toBeGreaterThan(0);
    });
  });
});
