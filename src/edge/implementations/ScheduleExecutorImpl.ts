import { ScheduleExecutor } from '../interfaces/ScheduleExecutor';
import { AdaptiveSchedule, ScheduleOverride, ScheduledAction } from '../interfaces/BehaviorLearningEngine';
import { DeviceManager } from '../interfaces/DeviceManager';
import { DeviceCommand } from '../types';

/**
 * Implementation of ScheduleExecutor
 * Executes scheduled device actions with time-based triggers
 */
export class ScheduleExecutorImpl implements ScheduleExecutor {
  private deviceManager: DeviceManager;
  private activeSchedules: Map<string, AdaptiveSchedule>;
  private pausedDevices: Set<string>;
  private scheduledTimers: Map<string, NodeJS.Timeout[]>;
  private overrideCallbacks: Map<string, (override: ScheduleOverride) => void>;

  constructor(deviceManager: DeviceManager) {
    this.deviceManager = deviceManager;
    this.activeSchedules = new Map();
    this.pausedDevices = new Set();
    this.scheduledTimers = new Map();
    this.overrideCallbacks = new Map();
  }

  /**
   * Execute a schedule for a device
   * Sets up time-based triggers for all scheduled actions
   */
  executeSchedule(schedule: AdaptiveSchedule): void {
    // Clear any existing timers for this device
    this.clearScheduleTimers(schedule.deviceId);

    // Store the schedule
    this.activeSchedules.set(schedule.deviceId, schedule);

    // Don't set up timers if the device is paused
    if (this.pausedDevices.has(schedule.deviceId)) {
      return;
    }

    // Set up timers for each scheduled action
    const timers: NodeJS.Timeout[] = [];
    
    for (const action of schedule.scheduledActions) {
      const timer = this.scheduleAction(schedule.deviceId, action);
      if (timer) {
        timers.push(timer);
      }
    }

    this.scheduledTimers.set(schedule.deviceId, timers);
  }

  /**
   * Handle a user override of the schedule
   * Executes the override action and notifies any registered callbacks
   */
  handleOverride(deviceId: string, override: ScheduleOverride): void {
    // Execute the override command
    const command: DeviceCommand = override.action;
    this.deviceManager.sendCommand(deviceId, command).catch(error => {
      console.error(`Failed to execute override for device ${deviceId}:`, error);
    });

    // Notify any registered callbacks about the override
    const callback = this.overrideCallbacks.get(deviceId);
    if (callback) {
      callback(override);
    }
  }

  /**
   * Pause schedule execution for a device
   * Clears all active timers but keeps the schedule stored
   */
  pauseSchedule(deviceId: string): void {
    this.pausedDevices.add(deviceId);
    this.clearScheduleTimers(deviceId);
  }

  /**
   * Resume schedule execution for a device
   * Re-establishes time-based triggers for the stored schedule
   */
  resumeSchedule(deviceId: string): void {
    this.pausedDevices.delete(deviceId);
    
    // Re-execute the schedule if one exists
    const schedule = this.activeSchedules.get(deviceId);
    if (schedule) {
      this.executeSchedule(schedule);
    }
  }

  /**
   * Register a callback to be notified when overrides occur
   */
  onOverride(deviceId: string, callback: (override: ScheduleOverride) => void): void {
    this.overrideCallbacks.set(deviceId, callback);
  }

  /**
   * Get the active schedule for a device
   */
  getActiveSchedule(deviceId: string): AdaptiveSchedule | undefined {
    return this.activeSchedules.get(deviceId);
  }

  /**
   * Check if a device's schedule is paused
   */
  isSchedulePaused(deviceId: string): boolean {
    return this.pausedDevices.has(deviceId);
  }

  /**
   * Clear all timers for a device
   */
  private clearScheduleTimers(deviceId: string): void {
    const timers = this.scheduledTimers.get(deviceId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      this.scheduledTimers.delete(deviceId);
    }
  }

  /**
   * Schedule a single action
   * Returns a timer that will execute the action at the scheduled time
   */
  private scheduleAction(deviceId: string, action: ScheduledAction): NodeJS.Timeout | null {
    const now = new Date();
    const currentDay = now.getDay();
    
    // Check if this action should run today
    if (!action.daysOfWeek.includes(currentDay)) {
      // Schedule for the next valid day
      return this.scheduleForNextValidDay(deviceId, action);
    }

    // Parse the scheduled time
    const [hours, minutes] = action.time.split(':').map(Number);
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If the time has passed today, schedule for the next valid day
    if (scheduledTime <= now) {
      return this.scheduleForNextValidDay(deviceId, action);
    }

    // Calculate delay until scheduled time
    const delay = scheduledTime.getTime() - now.getTime();

    // Set up the timer
    return setTimeout(() => {
      this.executeAction(deviceId, action);
      // Reschedule for the next occurrence
      this.scheduleAction(deviceId, action);
    }, delay);
  }

  /**
   * Schedule an action for the next valid day
   */
  private scheduleForNextValidDay(deviceId: string, action: ScheduledAction): NodeJS.Timeout | null {
    const now = new Date();
    const currentDay = now.getDay();
    
    // Find the next valid day
    let daysUntilNext = Infinity;
    for (const validDay of action.daysOfWeek) {
      let diff = validDay - currentDay;
      if (diff <= 0) {
        diff += 7;
      }
      if (diff < daysUntilNext) {
        daysUntilNext = diff;
      }
    }

    // If no valid days found, return null
    if (daysUntilNext === Infinity) {
      return null;
    }

    // Calculate the next scheduled time
    const [hours, minutes] = action.time.split(':').map(Number);
    const nextScheduledTime = new Date(now);
    nextScheduledTime.setDate(now.getDate() + daysUntilNext);
    nextScheduledTime.setHours(hours, minutes, 0, 0);

    const delay = nextScheduledTime.getTime() - now.getTime();

    // Set up the timer
    return setTimeout(() => {
      this.executeAction(deviceId, action);
      // Reschedule for the next occurrence
      this.scheduleAction(deviceId, action);
    }, delay);
  }

  /**
   * Execute a scheduled action
   */
  private executeAction(deviceId: string, action: ScheduledAction): void {
    // Don't execute if the device is paused
    if (this.pausedDevices.has(deviceId)) {
      return;
    }

    const command: DeviceCommand = {
      action: action.action,
      parameters: {}
    };

    this.deviceManager.sendCommand(deviceId, command).catch(error => {
      console.error(`Failed to execute scheduled action for device ${deviceId}:`, error);
    });
  }

  /**
   * Clean up all timers (useful for testing and shutdown)
   */
  cleanup(): void {
    for (const [deviceId] of Array.from(this.scheduledTimers)) {
      this.clearScheduleTimers(deviceId);
    }
    this.activeSchedules.clear();
    this.pausedDevices.clear();
    this.overrideCallbacks.clear();
  }
}
