import {
  BehaviorLearningEngine,
  EnergyProfile,
  TimeWindow,
  AdaptiveSchedule,
  ScheduledAction,
  ScheduleOverride,
  PeakUsagePrediction
} from '../interfaces/BehaviorLearningEngine';
import { EnergyData } from '../interfaces/EnergyMonitor';

/**
 * BehaviorLearningEngineImpl implementation
 * Analyzes usage patterns and generates adaptive schedules
 */
export class BehaviorLearningEngineImpl implements BehaviorLearningEngine {
  private schedules: Map<string, AdaptiveSchedule> = new Map();
  private overrideHistory: Map<string, ScheduleOverride[]> = new Map();

  /**
   * Analyze usage patterns from historical data
   * Requirements: 2.1
   */
  analyzeUsagePattern(deviceId: string, historicalData: EnergyData[]): EnergyProfile {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    if (!historicalData || historicalData.length === 0) {
      throw new Error('Historical data cannot be empty');
    }

    // Calculate average consumption
    const totalWatts = historicalData.reduce((sum, data) => sum + data.watts, 0);
    const averageConsumption = totalWatts / historicalData.length;

    // Calculate usage variability (standard deviation)
    const variance = historicalData.reduce((sum, data) => {
      const diff = data.watts - averageConsumption;
      return sum + (diff * diff);
    }, 0) / historicalData.length;
    const usageVariability = Math.sqrt(variance);

    // Identify typical on/off times by analyzing power consumption patterns
    const typicalOnTimes = this.identifyOnTimes(historicalData, averageConsumption);
    const typicalOffTimes = this.identifyOffTimes(historicalData, averageConsumption);

    return {
      deviceId,
      typicalOnTimes,
      typicalOffTimes,
      averageConsumption,
      usageVariability
    };
  }

  /**
   * Generate an adaptive schedule from an energy profile
   * Requirements: 2.2
   */
  generateSchedule(profile: EnergyProfile): AdaptiveSchedule {
    if (!profile || !profile.deviceId) {
      throw new Error('Invalid energy profile');
    }

    const scheduledActions: ScheduledAction[] = [];

    // Generate turn_on actions from typical on times
    for (const timeWindow of profile.typicalOnTimes) {
      scheduledActions.push({
        time: timeWindow.start,
        action: 'turn_on',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
      });
    }

    // Generate turn_off actions from typical off times
    for (const timeWindow of profile.typicalOffTimes) {
      scheduledActions.push({
        time: timeWindow.start,
        action: 'turn_off',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
      });
    }

    // Calculate confidence based on usage variability
    // Lower variability = higher confidence
    const confidence = Math.max(0, Math.min(1, 1 - (profile.usageVariability / (profile.averageConsumption + 1))));

    const schedule: AdaptiveSchedule = {
      deviceId: profile.deviceId,
      scheduledActions,
      confidence,
      lastUpdated: new Date()
    };

    // Store the schedule
    this.schedules.set(profile.deviceId, schedule);

    return schedule;
  }

  /**
   * Update schedule based on user override
   * Requirements: 2.5
   */
  updateSchedule(deviceId: string, userOverride: ScheduleOverride): void {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    if (!userOverride) {
      throw new Error('User override cannot be null');
    }

    // Store the override in history
    if (!this.overrideHistory.has(deviceId)) {
      this.overrideHistory.set(deviceId, []);
    }
    this.overrideHistory.get(deviceId)!.push(userOverride);

    // Get the current schedule
    const currentSchedule = this.schedules.get(deviceId);
    if (!currentSchedule) {
      return; // No schedule to update
    }

    // Analyze override patterns from recent history
    const recentOverrides = this.getRecentOverrides(deviceId, 3); // Last 3 days
    
    if (recentOverrides.length >= 3) {
      // User has overridden 3+ times, update the schedule
      const overrideTime = this.formatTime(userOverride.timestamp);
      const overrideAction = this.extractActionFromOverride(userOverride);

      // Check if there's already a scheduled action at this time
      const existingActionIndex = currentSchedule.scheduledActions.findIndex(
        action => action.time === overrideTime
      );

      if (existingActionIndex >= 0) {
        // Update existing action
        currentSchedule.scheduledActions[existingActionIndex].action = overrideAction;
      } else {
        // Add new scheduled action
        currentSchedule.scheduledActions.push({
          time: overrideTime,
          action: overrideAction,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
        });
      }

      currentSchedule.lastUpdated = new Date();
      this.schedules.set(deviceId, currentSchedule);
    }
  }

  /**
   * Predict peak usage for a given date
   * Requirements: 2.4
   */
  predictPeakUsage(date: Date): PeakUsagePrediction {
    if (!date || isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    // Analyze all schedules to find peak usage time
    let predictedPeakTime = '12:00';
    let predictedPeakWatts = 0;
    let totalConfidence = 0;
    let scheduleCount = 0;

    for (const [deviceId, schedule] of this.schedules.entries()) {
      // Find turn_on actions which indicate device usage
      const onActions = schedule.scheduledActions.filter(action => action.action === 'turn_on');
      
      for (const action of onActions) {
        // For simplicity, assume each device contributes to peak
        // In a real system, we'd use historical consumption data
        predictedPeakWatts += 100; // Placeholder value
        totalConfidence += schedule.confidence;
        scheduleCount++;
        
        // Use the first on-time as predicted peak (simplified)
        if (scheduleCount === 1) {
          predictedPeakTime = action.time;
        }
      }
    }

    const confidence = scheduleCount > 0 ? totalConfidence / scheduleCount : 0;

    return {
      date,
      predictedPeakTime,
      predictedPeakWatts,
      confidence
    };
  }

  /**
   * Identify typical "on" times from historical data
   */
  private identifyOnTimes(data: EnergyData[], avgConsumption: number): TimeWindow[] {
    const threshold = avgConsumption * 0.5; // Device is "on" if above 50% of average
    const timeWindows: TimeWindow[] = [];
    
    let windowStart: string | null = null;
    
    for (let i = 0; i < data.length; i++) {
      const reading = data[i];
      const isOn = reading.watts > threshold;
      
      if (isOn && windowStart === null) {
        // Start of an "on" period
        windowStart = this.formatTime(reading.timestamp);
      } else if (!isOn && windowStart !== null) {
        // End of an "on" period
        const windowEnd = this.formatTime(reading.timestamp);
        timeWindows.push({ start: windowStart, end: windowEnd });
        windowStart = null;
      }
    }
    
    // Close any open window
    if (windowStart !== null && data.length > 0) {
      const lastTime = this.formatTime(data[data.length - 1].timestamp);
      timeWindows.push({ start: windowStart, end: lastTime });
    }
    
    return this.consolidateTimeWindows(timeWindows);
  }

  /**
   * Identify typical "off" times from historical data
   */
  private identifyOffTimes(data: EnergyData[], avgConsumption: number): TimeWindow[] {
    const threshold = avgConsumption * 0.5; // Device is "off" if below 50% of average
    const timeWindows: TimeWindow[] = [];
    
    let windowStart: string | null = null;
    
    for (let i = 0; i < data.length; i++) {
      const reading = data[i];
      const isOff = reading.watts <= threshold;
      
      if (isOff && windowStart === null) {
        // Start of an "off" period
        windowStart = this.formatTime(reading.timestamp);
      } else if (!isOff && windowStart !== null) {
        // End of an "off" period
        const windowEnd = this.formatTime(reading.timestamp);
        timeWindows.push({ start: windowStart, end: windowEnd });
        windowStart = null;
      }
    }
    
    // Close any open window
    if (windowStart !== null && data.length > 0) {
      const lastTime = this.formatTime(data[data.length - 1].timestamp);
      timeWindows.push({ start: windowStart, end: lastTime });
    }
    
    return this.consolidateTimeWindows(timeWindows);
  }

  /**
   * Consolidate overlapping or adjacent time windows
   */
  private consolidateTimeWindows(windows: TimeWindow[]): TimeWindow[] {
    if (windows.length === 0) return [];
    
    // Sort by start time
    const sorted = windows.sort((a, b) => a.start.localeCompare(b.start));
    const consolidated: TimeWindow[] = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = consolidated[consolidated.length - 1];
      
      // If windows overlap or are adjacent, merge them
      if (current.start <= last.end) {
        last.end = current.end > last.end ? current.end : last.end;
      } else {
        consolidated.push(current);
      }
    }
    
    return consolidated;
  }

  /**
   * Format timestamp to HH:MM format
   */
  private formatTime(timestamp: Date): string {
    const hours = timestamp.getHours().toString().padStart(2, '0');
    const minutes = timestamp.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Get recent overrides for a device within the last N days
   */
  private getRecentOverrides(deviceId: string, days: number): ScheduleOverride[] {
    const overrides = this.overrideHistory.get(deviceId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return overrides.filter(override => override.timestamp >= cutoffDate);
  }

  /**
   * Extract action type from override
   */
  private extractActionFromOverride(override: ScheduleOverride): 'turn_on' | 'turn_off' {
    // Simplified: assume override action has an 'action' property
    if (override.action && typeof override.action === 'object' && 'action' in override.action) {
      return override.action.action === 'turn_on' ? 'turn_on' : 'turn_off';
    }
    // Default to turn_on if we can't determine
    return 'turn_on';
  }

  /**
   * Get schedule for a device (for testing)
   */
  getSchedule(deviceId: string): AdaptiveSchedule | undefined {
    return this.schedules.get(deviceId);
  }

  /**
   * Get override history for a device (for testing)
   */
  getOverrideHistory(deviceId: string): ScheduleOverride[] {
    return this.overrideHistory.get(deviceId) || [];
  }

  /**
   * Clear all data (for testing)
   */
  clearAllData(): void {
    this.schedules.clear();
    this.overrideHistory.clear();
  }
}
