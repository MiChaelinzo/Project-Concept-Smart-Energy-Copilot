import { EnergyReading, AggregatedEnergy } from '../types';

/**
 * DataStorage interface
 * Responsibility: Manages persistence of energy data to cloud storage
 */
export interface DataStorage {
  /**
   * Store an energy reading
   */
  storeReading(reading: EnergyReading): Promise<void>;

  /**
   * Store aggregated energy data
   */
  storeAggregatedData(data: AggregatedEnergy): Promise<void>;

  /**
   * Retrieve readings for a device within a time range
   */
  getReadings(deviceId: string, startTime: Date, endTime: Date): Promise<EnergyReading[]>;

  /**
   * Retrieve aggregated data for a device
   */
  getAggregatedData(
    deviceId: string,
    period: 'hourly' | 'daily' | 'weekly' | 'monthly',
    startTime: Date,
    endTime: Date
  ): Promise<AggregatedEnergy[]>;
}
