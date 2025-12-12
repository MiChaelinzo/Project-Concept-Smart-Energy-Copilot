import { EnergyMonitor, EnergyData, TimeRange } from '../interfaces/EnergyMonitor';
import { 
  ErrorHandler, 
  ErrorCategory, 
  ErrorSeverity,
  globalErrorHandler 
} from '../../common/ErrorHandler';

/**
 * EnergyMonitorImpl implementation
 * Collects, aggregates, and persists energy consumption data
 */
export class EnergyMonitorImpl implements EnergyMonitor {
  private energyReadings: Map<string, EnergyData[]> = new Map();
  private currentConsumption: Map<string, number> = new Map();
  private errorHandler: ErrorHandler;
  
  // Standard carbon conversion factor: 0.92 lbs CO2 per kWh
  private readonly CARBON_CONVERSION_FACTOR = 0.92;
  
  // Data validation thresholds
  private readonly MAX_REASONABLE_WATTS = 50000; // 50kW max per device
  private readonly MAX_READINGS_PER_DEVICE = 100000; // Memory management

  constructor() {
    this.errorHandler = globalErrorHandler;
  }

  /**
   * Record energy consumption for a device
   * Requirements: 1.2, 1.5
   */
  recordConsumption(deviceId: string, watts: number, timestamp: Date): void {
    try {
      // Validate inputs
      this.validateDeviceId(deviceId);
      this.validateWatts(watts);
      this.validateTimestamp(timestamp);

      // Check for extreme outliers and log warning
      if (watts > this.MAX_REASONABLE_WATTS) {
        this.errorHandler.handleError(
          ErrorCategory.DATA_VALIDATION,
          ErrorSeverity.MEDIUM,
          `Extremely high power consumption detected: ${watts}W for device ${deviceId}`,
          {
            component: 'EnergyMonitorImpl',
            operation: 'recordConsumption',
            deviceId,
            timestamp: new Date(),
            metadata: { watts, threshold: this.MAX_REASONABLE_WATTS }
          }
        );
      }

      // Initialize storage for device if needed
      if (!this.energyReadings.has(deviceId)) {
        this.energyReadings.set(deviceId, []);
      }

      const readings = this.energyReadings.get(deviceId)!;

      // Memory management - prevent unlimited growth
      if (readings.length >= this.MAX_READINGS_PER_DEVICE) {
        // Remove oldest 10% of readings
        const removeCount = Math.floor(this.MAX_READINGS_PER_DEVICE * 0.1);
        readings.splice(0, removeCount);
        
        this.errorHandler.handleError(
          ErrorCategory.SYSTEM,
          ErrorSeverity.LOW,
          `Trimmed old readings for device ${deviceId} to manage memory`,
          {
            component: 'EnergyMonitorImpl',
            operation: 'recordConsumption',
            deviceId,
            timestamp: new Date(),
            metadata: { removedCount: removeCount, totalReadings: readings.length }
          }
        );
      }

      // Calculate cumulative kWh
      let cumulativeKwh = 0;

      if (readings.length > 0) {
        const lastReading = readings[readings.length - 1];
        
        // Validate timestamp ordering
        if (timestamp < lastReading.timestamp) {
          this.errorHandler.handleError(
            ErrorCategory.DATA_VALIDATION,
            ErrorSeverity.MEDIUM,
            `Out-of-order timestamp detected for device ${deviceId}`,
            {
              component: 'EnergyMonitorImpl',
              operation: 'recordConsumption',
              deviceId,
              timestamp: new Date(),
              metadata: { 
                newTimestamp: timestamp.toISOString(),
                lastTimestamp: lastReading.timestamp.toISOString()
              }
            }
          );
        }

        const timeDiffHours = (timestamp.getTime() - lastReading.timestamp.getTime()) / (1000 * 60 * 60);
        
        // Validate reasonable time difference (not more than 24 hours gap)
        if (timeDiffHours > 24) {
          this.errorHandler.handleError(
            ErrorCategory.DATA_VALIDATION,
            ErrorSeverity.MEDIUM,
            `Large time gap detected for device ${deviceId}: ${timeDiffHours.toFixed(2)} hours`,
            {
              component: 'EnergyMonitorImpl',
              operation: 'recordConsumption',
              deviceId,
              timestamp: new Date(),
              metadata: { timeDiffHours }
            }
          );
        }

        const energyIncrement = (watts * Math.max(0, timeDiffHours)) / 1000; // Convert to kWh, ensure non-negative
        cumulativeKwh = lastReading.cumulativeKwh + energyIncrement;
      }

      // Store the reading
      const energyData: EnergyData = {
        deviceId,
        timestamp,
        watts,
        cumulativeKwh
      };

      readings.push(energyData);
      this.currentConsumption.set(deviceId, watts);

    } catch (error) {
      this.errorHandler.handleError(
        ErrorCategory.DATA_VALIDATION,
        ErrorSeverity.HIGH,
        `Failed to record consumption for device ${deviceId}: ${(error as Error).message}`,
        {
          component: 'EnergyMonitorImpl',
          operation: 'recordConsumption',
          deviceId,
          timestamp: new Date(),
          metadata: { watts, originalError: (error as Error).message }
        },
        error as Error
      );
      
      throw error;
    }
  }

  /**
   * Get current consumption for a device
   * Requirements: 1.3
   */
  async getCurrentConsumption(deviceId: string): Promise<number> {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    return this.currentConsumption.get(deviceId) || 0;
  }

  /**
   * Get historical energy data for a device within a time range
   * Requirements: 1.3
   */
  async getHistoricalData(deviceId: string, range: TimeRange): Promise<EnergyData[]> {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    if (!range || !range.start || !range.end) {
      throw new Error('Invalid time range');
    }

    if (range.start > range.end) {
      throw new Error('Start time must be before end time');
    }

    const readings = this.energyReadings.get(deviceId) || [];

    // Filter readings within the time range and convert to EnergyData format
    return readings
      .filter(reading => 
        reading.timestamp >= range.start && reading.timestamp <= range.end
      )
      .map(reading => ({
        deviceId: reading.deviceId,
        timestamp: reading.timestamp,
        watts: reading.watts,
        cumulativeKwh: reading.cumulativeKwh
      }));
  }

  /**
   * Get total consumption across all devices for a time range
   * Requirements: 1.4
   */
  async getTotalConsumption(range: TimeRange): Promise<number> {
    if (!range || !range.start || !range.end) {
      throw new Error('Invalid time range');
    }

    if (range.start > range.end) {
      throw new Error('Start time must be before end time');
    }

    let totalKwh = 0;

    // Iterate through all devices
    for (const [deviceId, readings] of Array.from(this.energyReadings.entries())) {
      // Find readings within the time range
      const filteredReadings = readings.filter(reading =>
        reading.timestamp >= range.start && reading.timestamp <= range.end
      );

      if (filteredReadings.length > 0) {
        // Get the last reading's cumulative value within the range
        const lastReading = filteredReadings[filteredReadings.length - 1];
        
        // Get the first reading's cumulative value (or 0 if it's the first ever)
        const firstReading = filteredReadings[0];
        const startIndex = readings.indexOf(firstReading);
        const startCumulative = startIndex > 0 ? readings[startIndex - 1].cumulativeKwh : 0;

        // Calculate consumption for this device in the range
        const deviceConsumption = lastReading.cumulativeKwh - startCumulative;
        totalKwh += deviceConsumption;
      }
    }

    return totalKwh;
  }

  /**
   * Calculate carbon footprint from energy consumption
   * Requirements: 5.1
   */
  calculateCarbonFootprint(energyKwh: number): number {
    if (energyKwh < 0) {
      throw new Error('Energy consumption cannot be negative');
    }

    // Convert kWh to lbs CO2 using standard conversion factor
    return energyKwh * this.CARBON_CONVERSION_FACTOR;
  }

  /**
   * Get all readings for a device (for testing)
   */
  getAllReadings(deviceId: string): EnergyData[] {
    return this.energyReadings.get(deviceId) || [];
  }

  /**
   * Clear all data (for testing)
   */
  clearAllData(): void {
    this.energyReadings.clear();
    this.currentConsumption.clear();
  }

  /**
   * Get all device IDs with readings (for testing)
   */
  getDeviceIds(): string[] {
    return Array.from(this.energyReadings.keys());
  }

  /**
   * Validate device ID
   */
  private validateDeviceId(deviceId: string): void {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }
  }

  /**
   * Validate watts value
   */
  private validateWatts(watts: number): void {
    if (watts < 0) {
      throw new Error('Energy consumption cannot be negative');
    }

    if (!Number.isFinite(watts)) {
      throw new Error('Energy consumption must be a finite number');
    }
  }

  /**
   * Validate timestamp
   */
  private validateTimestamp(timestamp: Date): void {
    if (!timestamp || isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp');
    }

    // Check if timestamp is too far in the future (more than 1 hour)
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (timestamp > oneHourFromNow) {
      throw new Error('Timestamp cannot be more than 1 hour in the future');
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    totalDevices: number;
    totalReadings: number;
    memoryUsage: number;
    oldestReading?: Date;
    newestReading?: Date;
  } {
    let totalReadings = 0;
    let oldestReading: Date | undefined;
    let newestReading: Date | undefined;

    for (const readings of Array.from(this.energyReadings.values())) {
      totalReadings += readings.length;
      
      if (readings.length > 0) {
        const firstReading = readings[0].timestamp;
        const lastReading = readings[readings.length - 1].timestamp;
        
        if (!oldestReading || firstReading < oldestReading) {
          oldestReading = firstReading;
        }
        
        if (!newestReading || lastReading > newestReading) {
          newestReading = lastReading;
        }
      }
    }

    // Rough memory usage estimation
    const memoryUsage = totalReadings * 100; // ~100 bytes per reading estimate

    return {
      totalDevices: this.energyReadings.size,
      totalReadings,
      memoryUsage,
      oldestReading,
      newestReading
    };
  }
}
