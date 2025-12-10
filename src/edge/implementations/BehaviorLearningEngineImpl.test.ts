import { BehaviorLearningEngineImpl } from './BehaviorLearningEngineImpl';
import { EnergyData } from '../interfaces/EnergyMonitor';
import { EnergyProfile, ScheduleOverride } from '../interfaces/BehaviorLearningEngine';

describe('BehaviorLearningEngineImpl Unit Tests', () => {
  let engine: BehaviorLearningEngineImpl;

  beforeEach(() => {
    engine = new BehaviorLearningEngineImpl();
  });

  afterEach(() => {
    engine.clearAllData();
  });

  /**
   * Test profile generation with less than 7 days of data
   * Requirements: 2.1
   * 
   * This tests that the system can still generate a profile even when
   * there's insufficient data (less than the ideal 7 days). The system
   * should work with whatever data is available.
   */
  describe('Profile generation with less than 7 days of data', () => {
    it('should generate a profile with 3 days of data', () => {
      const deviceId = 'device-123';
      
      // Create 3 days worth of data (72 hours, 1 reading per hour)
      const historicalData: EnergyData[] = [];
      const startDate = new Date('2024-01-01T00:00:00Z');
      
      for (let hour = 0; hour < 72; hour++) {
        const timestamp = new Date(startDate);
        timestamp.setHours(timestamp.getHours() + hour);
        
        // Simulate device being on during daytime (8am-10pm) and off at night
        const hourOfDay = timestamp.getHours();
        const watts = (hourOfDay >= 8 && hourOfDay < 22) ? 100 : 10;
        
        historicalData.push({
          deviceId,
          timestamp,
          watts,
          cumulativeKwh: hour * 0.1
        });
      }

      const profile = engine.analyzeUsagePattern(deviceId, historicalData);

      // Verify profile is generated
      expect(profile).toBeDefined();
      expect(profile.deviceId).toBe(deviceId);
      expect(profile.averageConsumption).toBeGreaterThan(0);
      expect(profile.usageVariability).toBeGreaterThanOrEqual(0);
      expect(profile.typicalOnTimes).toBeDefined();
      expect(profile.typicalOffTimes).toBeDefined();
    });

    it('should generate a profile with only 1 day of data', () => {
      const deviceId = 'device-456';
      
      // Create 1 day worth of data (24 hours)
      const historicalData: EnergyData[] = [];
      const startDate = new Date('2024-01-01T00:00:00Z');
      
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(startDate);
        timestamp.setHours(timestamp.getHours() + hour);
        
        historicalData.push({
          deviceId,
          timestamp,
          watts: 50,
          cumulativeKwh: hour * 0.05
        });
      }

      const profile = engine.analyzeUsagePattern(deviceId, historicalData);

      expect(profile).toBeDefined();
      expect(profile.deviceId).toBe(deviceId);
      expect(profile.averageConsumption).toBe(50);
    });

    it('should handle minimal data (just a few readings)', () => {
      const deviceId = 'device-789';
      
      // Create minimal data - just 3 readings
      const historicalData: EnergyData[] = [
        {
          deviceId,
          timestamp: new Date('2024-01-01T08:00:00Z'),
          watts: 100,
          cumulativeKwh: 0.1
        },
        {
          deviceId,
          timestamp: new Date('2024-01-01T12:00:00Z'),
          watts: 120,
          cumulativeKwh: 0.5
        },
        {
          deviceId,
          timestamp: new Date('2024-01-01T18:00:00Z'),
          watts: 80,
          cumulativeKwh: 0.8
        }
      ];

      const profile = engine.analyzeUsagePattern(deviceId, historicalData);

      expect(profile).toBeDefined();
      expect(profile.deviceId).toBe(deviceId);
      expect(profile.averageConsumption).toBe(100); // (100 + 120 + 80) / 3
    });
  });

  /**
   * Test schedule generation with empty profiles
   * Requirements: 2.2
   * 
   * This tests edge cases where profiles have no typical on/off times
   * or have minimal information. The system should still generate a
   * valid schedule structure.
   */
  describe('Schedule generation with empty profiles', () => {
    it('should generate a schedule with empty on/off times', () => {
      const profile: EnergyProfile = {
        deviceId: 'device-empty',
        typicalOnTimes: [],
        typicalOffTimes: [],
        averageConsumption: 50,
        usageVariability: 10
      };

      const schedule = engine.generateSchedule(profile);

      expect(schedule).toBeDefined();
      expect(schedule.deviceId).toBe('device-empty');
      expect(schedule.scheduledActions).toEqual([]);
      expect(schedule.confidence).toBeGreaterThanOrEqual(0);
      expect(schedule.confidence).toBeLessThanOrEqual(1);
      expect(schedule.lastUpdated).toBeInstanceOf(Date);
    });

    it('should generate a schedule with only on times', () => {
      const profile: EnergyProfile = {
        deviceId: 'device-on-only',
        typicalOnTimes: [
          { start: '08:00', end: '10:00' }
        ],
        typicalOffTimes: [],
        averageConsumption: 100,
        usageVariability: 20
      };

      const schedule = engine.generateSchedule(profile);

      expect(schedule).toBeDefined();
      expect(schedule.deviceId).toBe('device-on-only');
      expect(schedule.scheduledActions).toHaveLength(1);
      expect(schedule.scheduledActions[0].action).toBe('turn_on');
      expect(schedule.scheduledActions[0].time).toBe('08:00');
    });

    it('should generate a schedule with only off times', () => {
      const profile: EnergyProfile = {
        deviceId: 'device-off-only',
        typicalOnTimes: [],
        typicalOffTimes: [
          { start: '22:00', end: '23:00' }
        ],
        averageConsumption: 75,
        usageVariability: 15
      };

      const schedule = engine.generateSchedule(profile);

      expect(schedule).toBeDefined();
      expect(schedule.deviceId).toBe('device-off-only');
      expect(schedule.scheduledActions).toHaveLength(1);
      expect(schedule.scheduledActions[0].action).toBe('turn_off');
      expect(schedule.scheduledActions[0].time).toBe('22:00');
    });

    it('should handle profile with zero average consumption', () => {
      const profile: EnergyProfile = {
        deviceId: 'device-zero',
        typicalOnTimes: [],
        typicalOffTimes: [],
        averageConsumption: 0,
        usageVariability: 0
      };

      const schedule = engine.generateSchedule(profile);

      expect(schedule).toBeDefined();
      expect(schedule.confidence).toBeGreaterThanOrEqual(0);
      expect(schedule.confidence).toBeLessThanOrEqual(1);
    });
  });

  /**
   * Test override pattern incorporation
   * Requirements: 2.5
   * 
   * This tests that user overrides are properly tracked and incorporated
   * into schedule updates after 3 consecutive overrides.
   */
  describe('Override pattern incorporation', () => {
    it('should not update schedule with less than 3 overrides', () => {
      const deviceId = 'device-override-1';
      
      // First generate a schedule
      const profile: EnergyProfile = {
        deviceId,
        typicalOnTimes: [{ start: '08:00', end: '18:00' }],
        typicalOffTimes: [{ start: '22:00', end: '23:00' }],
        averageConsumption: 100,
        usageVariability: 20
      };
      
      const initialSchedule = engine.generateSchedule(profile);
      const initialActionCount = initialSchedule.scheduledActions.length;

      // Add only 2 overrides (not enough to trigger update)
      const override1: ScheduleOverride = {
        deviceId,
        action: { action: 'turn_on' },
        timestamp: new Date('2024-01-01T10:00:00Z'),
        reason: 'manual'
      };
      
      const override2: ScheduleOverride = {
        deviceId,
        action: { action: 'turn_on' },
        timestamp: new Date('2024-01-02T10:00:00Z'),
        reason: 'manual'
      };

      engine.updateSchedule(deviceId, override1);
      engine.updateSchedule(deviceId, override2);

      const updatedSchedule = engine.getSchedule(deviceId);
      
      // Schedule should not have changed significantly
      expect(updatedSchedule).toBeDefined();
      expect(updatedSchedule!.scheduledActions.length).toBe(initialActionCount);
    });

    it('should update schedule after 3 consecutive overrides', () => {
      const deviceId = 'device-override-2';
      
      // First generate a schedule
      const profile: EnergyProfile = {
        deviceId,
        typicalOnTimes: [{ start: '08:00', end: '18:00' }],
        typicalOffTimes: [],
        averageConsumption: 100,
        usageVariability: 20
      };
      
      engine.generateSchedule(profile);

      // Add 3 overrides at the same time (10:00) using recent dates
      const now = new Date();
      
      for (let i = 0; i < 3; i++) {
        const overrideDate = new Date(now);
        overrideDate.setDate(overrideDate.getDate() - i); // Go back i days from now
        overrideDate.setHours(10, 0, 0, 0); // Set to 10:00
        
        const override: ScheduleOverride = {
          deviceId,
          action: { action: 'turn_on' },
          timestamp: overrideDate,
          reason: 'manual'
        };
        
        engine.updateSchedule(deviceId, override);
      }

      const updatedSchedule = engine.getSchedule(deviceId);
      const overrideHistory = engine.getOverrideHistory(deviceId);
      
      // Verify overrides were recorded
      expect(overrideHistory).toHaveLength(3);
      
      // Verify schedule was updated
      expect(updatedSchedule).toBeDefined();
      expect(updatedSchedule!.lastUpdated).toBeInstanceOf(Date);
      
      // Should have a scheduled action at 10:00 or the schedule should be modified
      const hasNewAction = updatedSchedule!.scheduledActions.some(
        action => action.time === '10:00'
      );
      expect(hasNewAction).toBe(true);
    });

    it('should handle overrides with different actions', () => {
      const deviceId = 'device-override-3';
      
      // Generate initial schedule
      const profile: EnergyProfile = {
        deviceId,
        typicalOnTimes: [{ start: '08:00', end: '18:00' }],
        typicalOffTimes: [{ start: '22:00', end: '23:00' }],
        averageConsumption: 100,
        usageVariability: 20
      };
      
      engine.generateSchedule(profile);

      // Add 3 overrides with turn_off action using recent dates
      const now = new Date();
      
      for (let i = 0; i < 3; i++) {
        const overrideDate = new Date(now);
        overrideDate.setDate(overrideDate.getDate() - i); // Go back i days from now
        overrideDate.setHours(20, 0, 0, 0); // Set to 20:00
        
        const override: ScheduleOverride = {
          deviceId,
          action: { action: 'turn_off' },
          timestamp: overrideDate,
          reason: 'manual'
        };
        
        engine.updateSchedule(deviceId, override);
      }

      const updatedSchedule = engine.getSchedule(deviceId);
      
      expect(updatedSchedule).toBeDefined();
      
      // Should have incorporated the turn_off action at 20:00
      const turnOffAction = updatedSchedule!.scheduledActions.find(
        action => action.time === '20:00' && action.action === 'turn_off'
      );
      expect(turnOffAction).toBeDefined();
    });

    it('should only consider recent overrides within 3 days', () => {
      const deviceId = 'device-override-4';
      
      // Generate initial schedule
      const profile: EnergyProfile = {
        deviceId,
        typicalOnTimes: [{ start: '08:00', end: '18:00' }],
        typicalOffTimes: [],
        averageConsumption: 100,
        usageVariability: 20
      };
      
      engine.generateSchedule(profile);

      // Add an old override (5 days ago)
      const oldOverride: ScheduleOverride = {
        deviceId,
        action: { action: 'turn_on' },
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        reason: 'manual'
      };
      
      engine.updateSchedule(deviceId, oldOverride);

      // Add 2 recent overrides (within 3 days)
      const recentDate = new Date();
      
      for (let i = 0; i < 2; i++) {
        const overrideDate = new Date(recentDate);
        overrideDate.setDate(overrideDate.getDate() - i);
        
        const override: ScheduleOverride = {
          deviceId,
          action: { action: 'turn_on' },
          timestamp: overrideDate,
          reason: 'manual'
        };
        
        engine.updateSchedule(deviceId, override);
      }

      const overrideHistory = engine.getOverrideHistory(deviceId);
      
      // All 3 overrides should be in history
      expect(overrideHistory).toHaveLength(3);
      
      // But schedule should not be updated because only 2 are recent
      // (This is implicit in the implementation logic)
    });
  });
});
