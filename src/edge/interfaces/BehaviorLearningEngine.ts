import { EnergyData } from './EnergyMonitor';

/**
 * BehaviorLearningEngine interface
 * Responsibility: Analyzes usage patterns and generates adaptive schedules
 */
export interface BehaviorLearningEngine {
  /**
   * Analyze usage patterns from historical data
   */
  analyzeUsagePattern(deviceId: string, historicalData: EnergyData[]): EnergyProfile;

  /**
   * Generate an adaptive schedule from an energy profile
   */
  generateSchedule(profile: EnergyProfile): AdaptiveSchedule;

  /**
   * Update schedule based on user override
   */
  updateSchedule(deviceId: string, userOverride: ScheduleOverride): void;

  /**
   * Predict peak usage for a given date
   */
  predictPeakUsage(date: Date): PeakUsagePrediction;
}

export interface EnergyProfile {
  deviceId: string;
  typicalOnTimes: TimeWindow[];
  typicalOffTimes: TimeWindow[];
  averageConsumption: number;
  usageVariability: number;
}

export interface TimeWindow {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface AdaptiveSchedule {
  deviceId: string;
  scheduledActions: ScheduledAction[];
  confidence: number;
  lastUpdated: Date;
}

export interface ScheduledAction {
  time: string; // HH:MM format
  action: 'turn_on' | 'turn_off';
  daysOfWeek: number[]; // 0-6
}

export interface ScheduleOverride {
  deviceId: string;
  action: any; // DeviceCommand type
  timestamp: Date;
  reason: 'manual' | 'occupancy' | 'anomaly';
}

export interface PeakUsagePrediction {
  date: Date;
  predictedPeakTime: string; // HH:MM format
  predictedPeakWatts: number;
  confidence: number;
}
