/**
 * Cloud service type definitions
 */

export interface EnergyReading {
  id: string;
  deviceId: string;
  timestamp: Date;
  watts: number;
  voltage?: number;
  current?: number;
}

export interface AggregatedEnergy {
  deviceId: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startTime: Date;
  endTime: Date;
  totalKwh: number;
  averageWatts: number;
  peakWatts: number;
  carbonKg: number;
}

export interface Schedule {
  id: string;
  deviceId: string;
  enabled: boolean;
  actions: any[]; // ScheduledAction type
  createdAt: Date;
  updatedAt: Date;
  confidence: number;
}

export interface UserPreferences {
  userId: string;
  enableAdaptiveScheduling: boolean;
  enableOccupancyControl: boolean;
  enableVoiceControl: boolean;
  enableAnomalyDetection: boolean;
  notificationSettings: {
    anomalies: boolean;
    energySavings: boolean;
    scheduleChanges: boolean;
  };
  privacySettings: {
    storeImages: boolean;
    storeVoiceRecordings: boolean;
  };
}
