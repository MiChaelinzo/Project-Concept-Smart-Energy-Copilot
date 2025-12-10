import { AdaptiveSchedule, ScheduleOverride } from './BehaviorLearningEngine';

/**
 * ScheduleExecutor interface
 * Responsibility: Executes scheduled device actions and handles user overrides
 */
export interface ScheduleExecutor {
  /**
   * Execute a schedule for a device
   */
  executeSchedule(schedule: AdaptiveSchedule): void;

  /**
   * Handle a user override of the schedule
   */
  handleOverride(deviceId: string, override: ScheduleOverride): void;

  /**
   * Pause schedule execution for a device
   */
  pauseSchedule(deviceId: string): void;

  /**
   * Resume schedule execution for a device
   */
  resumeSchedule(deviceId: string): void;
}
