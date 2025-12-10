import { ScheduleExecutorImpl } from './ScheduleExecutorImpl';
import { DeviceManager } from '../interfaces/DeviceManager';
import { AdaptiveSchedule, ScheduledAction, ScheduleOverride } from '../interfaces/BehaviorLearningEngine';
import { DeviceCommand } from '../types';

/**
 * Unit tests for ScheduleExecutorImpl
 * Requirements: 2.3
 */

// Mock DeviceManager
class MockDeviceManager implements DeviceManager {
  public commandHistory: Array<{ deviceId: string; command: DeviceCommand }> = [];
  public shouldFail: boolean = false;

  async registerDevice(deviceId: string, deviceType: any): Promise<any> {
    return {} as any;
  }

  async discoverDevices(): Promise<any[]> {
    return [];
  }

  async getDeviceStatus(deviceId: string): Promise<any> {
    return {} as any;
  }

  async sendCommand(deviceId: string, command: DeviceCommand): Promise<void> {
    // Always record the attempt
    this.commandHistory.push({ deviceId, command });
    
    if (this.shouldFail) {
      throw new Error('Command failed');
    }
  }

  subscribeToTelemetry(deviceId: string, callback: any): void {
    // Mock implementation
  }

  clearHistory(): void {
    this.commandHistory = [];
  }
}

describe('ScheduleExecutorImpl', () => {
  let executor: ScheduleExecutorImpl;
  let mockDeviceManager: MockDeviceManager;

  beforeEach(() => {
    mockDeviceManager = new MockDeviceManager();
    executor = new ScheduleExecutorImpl(mockDeviceManager);
    jest.useFakeTimers();
  });

  afterEach(() => {
    executor.cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Schedule execution at boundary times', () => {
    /**
     * Test: Schedule execution at midnight (00:00)
     * Validates that schedules work correctly at the day boundary
     */
    it('should execute schedule at midnight boundary (00:00)', () => {
      // Set current time to 23:59:50 (10 seconds before midnight)
      const now = new Date('2024-01-01T23:59:50Z');
      jest.setSystemTime(now);

      const schedule: AdaptiveSchedule = {
        deviceId: 'device-1',
        scheduledActions: [
          {
            time: '00:00',
            action: 'turn_on',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
          }
        ],
        confidence: 0.9,
        lastUpdated: now
      };

      executor.executeSchedule(schedule);

      // Fast-forward to midnight (10 seconds) - use runOnlyPendingTimers to avoid infinite loop
      jest.advanceTimersByTime(10000);
      jest.runOnlyPendingTimers();

      // Command should be executed at midnight
      expect(mockDeviceManager.commandHistory.length).toBeGreaterThanOrEqual(1);
      expect(mockDeviceManager.commandHistory[0]).toEqual({
        deviceId: 'device-1',
        command: { action: 'turn_on', parameters: {} }
      });
    });

    /**
     * Test: Schedule execution at end of day (23:59)
     * Validates that schedules work correctly near the end of the day
     */
    it('should execute schedule at end of day boundary (23:59)', () => {
      // Set current time to 23:58:50
      const now = new Date('2024-01-01T23:58:50Z');
      jest.setSystemTime(now);

      const schedule: AdaptiveSchedule = {
        deviceId: 'device-2',
        scheduledActions: [
          {
            time: '23:59',
            action: 'turn_off',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
          }
        ],
        confidence: 0.85,
        lastUpdated: now
      };

      executor.executeSchedule(schedule);

      // Fast-forward to 23:59 (70 seconds)
      jest.advanceTimersByTime(70000);
      jest.runOnlyPendingTimers();

      // Command should be executed at 23:59
      expect(mockDeviceManager.commandHistory.length).toBeGreaterThanOrEqual(1);
      expect(mockDeviceManager.commandHistory[0]).toEqual({
        deviceId: 'device-2',
        command: { action: 'turn_off', parameters: {} }
      });
    });

    /**
     * Test: Schedule execution when time has already passed
     * Validates that past times are scheduled for the next valid day
     */
    it('should schedule for next day when scheduled time has passed', () => {
      // Set current time to 14:00 (2 PM) on Monday
      const now = new Date('2024-01-01T14:00:00Z'); // Jan 1, 2024 is Monday (day 1)
      jest.setSystemTime(now);

      const schedule: AdaptiveSchedule = {
        deviceId: 'device-3',
        scheduledActions: [
          {
            time: '10:00', // Already passed today
            action: 'turn_on',
            daysOfWeek: [2] // Tuesday only (next day, day 2)
          }
        ],
        confidence: 0.8,
        lastUpdated: now
      };

      executor.executeSchedule(schedule);

      // Advance by 1 hour - should not execute (next execution is tomorrow at 10am, 20 hours away)
      jest.advanceTimersByTime(3600000);
      // Don't run pending timers yet - just check that nothing executed
      expect(mockDeviceManager.commandHistory).toHaveLength(0);

      // Advance to next Tuesday at 10:00 (20 hours from now: 10 hours to midnight + 10 hours to 10am)
      jest.advanceTimersByTime(20 * 3600000);
      jest.runOnlyPendingTimers();
      expect(mockDeviceManager.commandHistory.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Concurrent override handling', () => {
    /**
     * Test: Multiple overrides in quick succession
     * Validates that all overrides are processed correctly
     */
    it('should handle multiple concurrent overrides correctly', async () => {
      const deviceId = 'device-4';
      const overrides: ScheduleOverride[] = [];

      // Register callback to track overrides
      executor.onOverride(deviceId, (override) => {
        overrides.push(override);
      });

      // Execute multiple overrides rapidly
      const override1: ScheduleOverride = {
        deviceId,
        action: { action: 'turn_on', parameters: {} },
        timestamp: new Date(),
        reason: 'manual'
      };

      const override2: ScheduleOverride = {
        deviceId,
        action: { action: 'turn_off', parameters: {} },
        timestamp: new Date(),
        reason: 'occupancy'
      };

      const override3: ScheduleOverride = {
        deviceId,
        action: { action: 'turn_on', parameters: {} },
        timestamp: new Date(),
        reason: 'manual'
      };

      // Execute overrides concurrently
      executor.handleOverride(deviceId, override1);
      executor.handleOverride(deviceId, override2);
      executor.handleOverride(deviceId, override3);

      // Wait for async operations
      await jest.runAllTimersAsync();

      // All overrides should be recorded
      expect(overrides).toHaveLength(3);
      expect(overrides[0].reason).toBe('manual');
      expect(overrides[1].reason).toBe('occupancy');
      expect(overrides[2].reason).toBe('manual');

      // All commands should be sent
      expect(mockDeviceManager.commandHistory).toHaveLength(3);
    });

    /**
     * Test: Override during scheduled execution
     * Validates that overrides don't interfere with scheduled actions
     */
    it('should handle override during scheduled execution', async () => {
      const now = new Date('2024-01-01T10:00:00Z');
      jest.setSystemTime(now);

      const schedule: AdaptiveSchedule = {
        deviceId: 'device-5',
        scheduledActions: [
          {
            time: '10:05',
            action: 'turn_on',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
          }
        ],
        confidence: 0.9,
        lastUpdated: now
      };

      executor.executeSchedule(schedule);

      // Advance to 10:03 (3 minutes)
      jest.advanceTimersByTime(3 * 60000);

      // Execute override at 10:03
      const override: ScheduleOverride = {
        deviceId: 'device-5',
        action: { action: 'turn_off', parameters: {} },
        timestamp: new Date(),
        reason: 'manual'
      };

      executor.handleOverride('device-5', override);
      await Promise.resolve(); // Allow promise to resolve

      // Override should be executed
      expect(mockDeviceManager.commandHistory).toHaveLength(1);
      expect(mockDeviceManager.commandHistory[0].command.action).toBe('turn_off');

      mockDeviceManager.clearHistory();

      // Advance to 10:05 (2 more minutes)
      jest.advanceTimersByTime(2 * 60000);
      jest.runOnlyPendingTimers();

      // Scheduled action should still execute
      expect(mockDeviceManager.commandHistory.length).toBeGreaterThanOrEqual(1);
      expect(mockDeviceManager.commandHistory[0].command.action).toBe('turn_on');
    });

    /**
     * Test: Override with command failure
     * Validates graceful handling of failed override commands
     */
    it('should handle override command failures gracefully', async () => {
      const deviceId = 'device-6';
      
      const override: ScheduleOverride = {
        deviceId,
        action: { action: 'turn_on', parameters: {} },
        timestamp: new Date(),
        reason: 'manual'
      };

      // First verify it works normally
      executor.handleOverride(deviceId, override);
      await Promise.resolve();
      expect(mockDeviceManager.commandHistory.length).toBe(1);

      // Now test with failure
      mockDeviceManager.clearHistory();
      mockDeviceManager.shouldFail = true;

      // Should not throw error even when command fails
      expect(() => {
        executor.handleOverride(deviceId, override);
      }).not.toThrow();

      await Promise.resolve();

      // Command was attempted (sendCommand was called, even though it threw)
      expect(mockDeviceManager.commandHistory.length).toBe(1);
    });
  });

  describe('Pause/resume state transitions', () => {
    /**
     * Test: Pause prevents scheduled execution
     * Validates that paused schedules don't execute
     */
    it('should not execute scheduled actions when paused', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      jest.setSystemTime(now);

      const schedule: AdaptiveSchedule = {
        deviceId: 'device-7',
        scheduledActions: [
          {
            time: '10:05',
            action: 'turn_on',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
          }
        ],
        confidence: 0.9,
        lastUpdated: now
      };

      executor.executeSchedule(schedule);
      executor.pauseSchedule('device-7');

      // Advance to scheduled time
      jest.advanceTimersByTime(5 * 60000);

      // No command should be executed
      expect(mockDeviceManager.commandHistory).toHaveLength(0);
    });

    /**
     * Test: Resume restores scheduled execution
     * Validates that resumed schedules execute correctly
     */
    it('should resume scheduled execution after pause', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      jest.setSystemTime(now);

      const schedule: AdaptiveSchedule = {
        deviceId: 'device-8',
        scheduledActions: [
          {
            time: '10:10',
            action: 'turn_off',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
          }
        ],
        confidence: 0.85,
        lastUpdated: now
      };

      executor.executeSchedule(schedule);
      executor.pauseSchedule('device-8');

      // Advance to 10:05
      jest.advanceTimersByTime(5 * 60000);

      // Resume schedule
      executor.resumeSchedule('device-8');

      // Advance to 10:10 (5 more minutes)
      jest.advanceTimersByTime(5 * 60000);
      jest.runOnlyPendingTimers();

      // Command should be executed after resume
      expect(mockDeviceManager.commandHistory.length).toBeGreaterThanOrEqual(1);
      expect(mockDeviceManager.commandHistory[0].command.action).toBe('turn_off');
    });

    /**
     * Test: Multiple pause/resume cycles
     * Validates state consistency across multiple transitions
     */
    it('should handle multiple pause/resume cycles correctly', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      jest.setSystemTime(now);

      const schedule: AdaptiveSchedule = {
        deviceId: 'device-9',
        scheduledActions: [
          {
            time: '10:15',
            action: 'turn_on',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
          }
        ],
        confidence: 0.9,
        lastUpdated: now
      };

      executor.executeSchedule(schedule);

      // First pause
      executor.pauseSchedule('device-9');
      expect(executor.isSchedulePaused('device-9')).toBe(true);

      // First resume
      executor.resumeSchedule('device-9');
      expect(executor.isSchedulePaused('device-9')).toBe(false);

      // Second pause
      executor.pauseSchedule('device-9');
      expect(executor.isSchedulePaused('device-9')).toBe(true);

      // Second resume
      executor.resumeSchedule('device-9');
      expect(executor.isSchedulePaused('device-9')).toBe(false);

      // Advance to scheduled time
      jest.advanceTimersByTime(15 * 60000);
      jest.runOnlyPendingTimers();

      // Command should execute (schedule is active)
      expect(mockDeviceManager.commandHistory.length).toBeGreaterThanOrEqual(1);
    });

    /**
     * Test: Pause before schedule execution
     * Validates that pausing before executing a schedule works correctly
     */
    it('should handle pause before schedule execution', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      jest.setSystemTime(now);

      // Pause before executing schedule
      executor.pauseSchedule('device-10');

      const schedule: AdaptiveSchedule = {
        deviceId: 'device-10',
        scheduledActions: [
          {
            time: '10:05',
            action: 'turn_on',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
          }
        ],
        confidence: 0.9,
        lastUpdated: now
      };

      executor.executeSchedule(schedule);

      // Advance to scheduled time
      jest.advanceTimersByTime(5 * 60000);

      // No command should execute (was paused before schedule)
      expect(mockDeviceManager.commandHistory).toHaveLength(0);

      // Resume and verify schedule is stored
      executor.resumeSchedule('device-10');
      const activeSchedule = executor.getActiveSchedule('device-10');
      expect(activeSchedule).toBeDefined();
      expect(activeSchedule?.deviceId).toBe('device-10');
    });

    /**
     * Test: Resume without prior schedule
     * Validates graceful handling of resume when no schedule exists
     */
    it('should handle resume without prior schedule gracefully', () => {
      // Resume a device that has no schedule
      expect(() => {
        executor.resumeSchedule('device-11');
      }).not.toThrow();

      expect(executor.isSchedulePaused('device-11')).toBe(false);
    });
  });
});
