import { DashboardData, DeviceControlRequest, HistoricalDataRequest } from '../types';
import { Device, DeviceStatus } from '../../edge/types';

/**
 * MobileAPI interface
 * Responsibility: Provides API endpoints for mobile app interactions
 */
export interface MobileAPI {
  /**
   * Get all registered devices
   */
  getDevices(): Promise<Device[]>;

  /**
   * Get status for a specific device
   */
  getDeviceStatus(deviceId: string): Promise<DeviceStatus>;

  /**
   * Send a control command to a device
   */
  controlDevice(request: DeviceControlRequest): Promise<void>;

  /**
   * Get dashboard data for carbon footprint and savings
   */
  getDashboardData(startDate: Date, endDate: Date): Promise<DashboardData>;

  /**
   * Get historical energy data
   */
  getHistoricalData(request: HistoricalDataRequest): Promise<any[]>;

  /**
   * Enable or disable adaptive schedule for a device
   */
  toggleAdaptiveSchedule(deviceId: string, enabled: boolean): Promise<void>;
}
