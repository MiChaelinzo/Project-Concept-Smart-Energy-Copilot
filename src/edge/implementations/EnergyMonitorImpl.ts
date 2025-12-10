import { EnergyMonitor, EnergyData, TimeRange } from '../interfaces/EnergyMonitor';

/**
 * EnergyMonitorImpl implementation
 * Collects, aggregates, and persists energy consumption data
 */
export class EnergyMonitorImpl implements EnergyMonitor {
  private energyReadings: Map<string, EnergyData[]> = new Map();
  private currentConsumption: Map<string, number> = new Map();
  
  // Standard carbon conversion factor: 0.92 lbs CO2 per kWh
  private readonly CARBON_CONVERSION_FACTOR = 0.92;

  /**
   * Record energy consumption for a device
   * Requirements: 1.2, 1.5
   */
  recordConsumption(deviceId: string, watts: number, timestamp: Date): void {
    // Validate inputs
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    if (watts < 0) {
      throw new Error('Energy consumption cannot be negative');
    }

    if (!timestamp || isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp');
    }

    // Initialize storage for device if needed
    if (!this.energyReadings.has(deviceId)) {
      this.energyReadings.set(deviceId, []);
    }

    // Calculate cumulative kWh
    const readings = this.energyReadings.get(deviceId)!;
    let cumulativeKwh = 0;

    if (readings.length > 0) {
      const lastReading = readings[readings.length - 1];
      const timeDiffHours = (timestamp.getTime() - lastReading.timestamp.getTime()) / (1000 * 60 * 60);
      const energyIncrement = (watts * timeDiffHours) / 1000; // Convert to kWh
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

    // Filter readings within the time range
    return readings.filter(reading => 
      reading.timestamp >= range.start && reading.timestamp <= range.end
    );
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
    for (const [deviceId, readings] of this.energyReadings.entries()) {
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
}
