/**
 * Mobile app type definitions
 */

export interface DashboardData {
  totalEnergyKwh: number;
  energySavedKwh: number;
  carbonFootprintKg: number;
  percentageChange: number;
  projectedAnnualSavings?: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface DeviceControlRequest {
  deviceId: string;
  action: 'turn_on' | 'turn_off' | 'set_value';
  parameters?: Record<string, any>;
}

export interface HistoricalDataRequest {
  deviceId?: string; // Optional - if not provided, get all devices
  startDate: Date;
  endDate: Date;
  granularity: 'hourly' | 'daily' | 'weekly';
}
