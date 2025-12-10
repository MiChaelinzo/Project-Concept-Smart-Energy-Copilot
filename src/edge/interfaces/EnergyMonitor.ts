/**
 * EnergyMonitor interface
 * Responsibility: Collects, aggregates, and persists energy consumption data
 */

export interface EnergyMonitor {
  /**
   * Record energy consumption for a device
   */
  recordConsumption(deviceId: string, watts: number, timestamp: Date): void;

  /**
   * Get current consumption for a device
   */
  getCurrentConsumption(deviceId: string): Promise<number>;

  /**
   * Get historical energy data for a device within a time range
   */
  getHistoricalData(deviceId: string, range: TimeRange): Promise<EnergyData[]>;

  /**
   * Get total consumption across all devices for a time range
   */
  getTotalConsumption(range: TimeRange): Promise<number>;

  /**
   * Calculate carbon footprint from energy consumption
   */
  calculateCarbonFootprint(energyKwh: number): number;
}

export interface EnergyData {
  deviceId: string;
  timestamp: Date;
  watts: number;
  cumulativeKwh: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}
