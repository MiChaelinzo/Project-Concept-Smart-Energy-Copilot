import { MobileAPI } from '../interfaces/MobileAPI';
import { DashboardData, DeviceControlRequest, HistoricalDataRequest } from '../types';
import { Device, DeviceStatus } from '../../edge/types';
import { DeviceManager } from '../../edge/interfaces/DeviceManager';
import { EnergyMonitor } from '../../edge/interfaces/EnergyMonitor';
import { CarbonDashboard } from '../../cloud/interfaces/CarbonDashboard';
import { ScheduleExecutor } from '../../edge/interfaces/ScheduleExecutor';

/**
 * MobileAPIImpl implementation
 * Provides API endpoints for mobile app interactions
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class MobileAPIImpl implements MobileAPI {
  constructor(
    private deviceManager: DeviceManager,
    private energyMonitor: EnergyMonitor,
    private carbonDashboard: CarbonDashboard,
    private scheduleExecutor: ScheduleExecutor
  ) {}

  /**
   * Get all registered devices
   * Requirements: 7.1
   */
  async getDevices(): Promise<Device[]> {
    return await this.deviceManager.discoverDevices();
  }

  /**
   * Get status for a specific device
   * Requirements: 7.1
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    return await this.deviceManager.getDeviceStatus(deviceId);
  }

  /**
   * Send a control command to a device
   * Requirements: 7.2
   */
  async controlDevice(request: DeviceControlRequest): Promise<void> {
    if (!request.deviceId || request.deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    if (!request.action) {
      throw new Error('Action is required');
    }

    await this.deviceManager.sendCommand(request.deviceId, {
      action: request.action,
      parameters: request.parameters
    });
  }

  /**
   * Get dashboard data for carbon footprint and savings
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3
   */
  async getDashboardData(startDate: Date, endDate: Date): Promise<DashboardData> {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    return await this.carbonDashboard.getDashboardData(startDate, endDate);
  }

  /**
   * Get historical energy data
   * Requirements: 7.3
   */
  async getHistoricalData(request: HistoricalDataRequest): Promise<any[]> {
    if (!request.startDate || !request.endDate) {
      throw new Error('Start date and end date are required');
    }

    if (request.startDate > request.endDate) {
      throw new Error('Start date must be before end date');
    }

    // If deviceId is provided, get data for that device
    if (request.deviceId) {
      return await this.energyMonitor.getHistoricalData(request.deviceId, {
        start: request.startDate,
        end: request.endDate
      });
    }

    // Otherwise, get data for all devices
    const devices = await this.deviceManager.discoverDevices();
    const allData: any[] = [];

    for (const device of devices) {
      const deviceData = await this.energyMonitor.getHistoricalData(device.id, {
        start: request.startDate,
        end: request.endDate
      });
      allData.push(...deviceData);
    }

    return allData;
  }

  /**
   * Enable or disable adaptive schedule for a device
   * Requirements: 7.4
   */
  async toggleAdaptiveSchedule(deviceId: string, enabled: boolean): Promise<void> {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    if (enabled) {
      this.scheduleExecutor.resumeSchedule(deviceId);
    } else {
      this.scheduleExecutor.pauseSchedule(deviceId);
    }
  }
}
