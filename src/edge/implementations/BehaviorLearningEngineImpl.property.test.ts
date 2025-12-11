import * as fc from 'fast-check';
import { BehaviorLearningEngineImpl } from './BehaviorLearningEngineImpl';
import { EnergyProfile, TimeWindow } from '../interfaces/BehaviorLearningEngine';

describe('BehaviorLearningEngine Property-Based Tests', () => {
  
  /**
   * Feature: smart-energy-copilot, Property 3: Profile-to-schedule generation
   * Validates: Requirements 2.2
   * 
   * For any valid energy profile, the system should generate an adaptive schedule 
   * with at least one scheduled action.
   */
  test('Property 3: Profile-to-schedule generation', () => {
    fc.assert(
      fc.property(
        // Generate valid energy profiles
        fc.record({
          deviceId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          typicalOnTimes: fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 23 }).chain(h => 
                fc.integer({ min: 0, max: 59 }).map(m => 
                  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                )
              ),
              end: fc.integer({ min: 0, max: 23 }).chain(h => 
                fc.integer({ min: 0, max: 59 }).map(m => 
                  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                )
              )
            }),
            { minLength: 0, maxLength: 5 }
          ),
          typicalOffTimes: fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 23 }).chain(h => 
                fc.integer({ min: 0, max: 59 }).map(m => 
                  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                )
              ),
              end: fc.integer({ min: 0, max: 23 }).chain(h => 
                fc.integer({ min: 0, max: 59 }).map(m => 
                  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                )
              )
            }),
            { minLength: 0, maxLength: 5 }
          ),
          averageConsumption: fc.float({ min: Math.fround(0.1), max: Math.fround(5000), noNaN: true }),
          usageVariability: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true })
        }),
        
        (profile: EnergyProfile) => {
          const engine = new BehaviorLearningEngineImpl();
          
          // Generate schedule from the profile
          const schedule = engine.generateSchedule(profile);
          
          // Property: Schedule should have at least one scheduled action
          // if the profile has any typical on/off times
          const hasTimeWindows = profile.typicalOnTimes.length > 0 || profile.typicalOffTimes.length > 0;
          
          if (hasTimeWindows) {
            expect(schedule.scheduledActions.length).toBeGreaterThan(0);
          }
          
          // Additional invariants that should always hold:
          
          // 1. Schedule should have the correct device ID
          expect(schedule.deviceId).toBe(profile.deviceId);
          
          // 2. Schedule should have a valid confidence value (0-1)
          expect(schedule.confidence).toBeGreaterThanOrEqual(0);
          expect(schedule.confidence).toBeLessThanOrEqual(1);
          
          // 3. Schedule should have a lastUpdated timestamp
          expect(schedule.lastUpdated).toBeInstanceOf(Date);
          expect(schedule.lastUpdated.getTime()).toBeLessThanOrEqual(Date.now());
          
          // 4. All scheduled actions should have valid structure
          for (const action of schedule.scheduledActions) {
            // Time should be in HH:MM format
            expect(action.time).toMatch(/^\d{2}:\d{2}$/);
            
            // Action should be either turn_on or turn_off
            expect(['turn_on', 'turn_off']).toContain(action.action);
            
            // Days of week should be valid (0-6)
            expect(action.daysOfWeek).toBeInstanceOf(Array);
            for (const day of action.daysOfWeek) {
              expect(day).toBeGreaterThanOrEqual(0);
              expect(day).toBeLessThanOrEqual(6);
            }
          }
          
          // 5. Number of scheduled actions should match the number of time windows
          const expectedActionCount = profile.typicalOnTimes.length + profile.typicalOffTimes.length;
          expect(schedule.scheduledActions.length).toBe(expectedActionCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 5: Override learning
   * Validates: Requirements 2.5
   * 
   * For any device with an adaptive schedule, when a user override occurs,
   * the next schedule update should incorporate the override pattern.
   */
  test('Property 5: Override learning', () => {
    fc.assert(
      fc.property(
        // Generate a valid device ID
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        
        // Generate an initial energy profile with at least one time window
        fc.record({
          typicalOnTimes: fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 23 }).chain(h => 
                fc.integer({ min: 0, max: 59 }).map(m => 
                  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                )
              ),
              end: fc.integer({ min: 0, max: 23 }).chain(h => 
                fc.integer({ min: 0, max: 59 }).map(m => 
                  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                )
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          typicalOffTimes: fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 23 }).chain(h => 
                fc.integer({ min: 0, max: 59 }).map(m => 
                  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                )
              ),
              end: fc.integer({ min: 0, max: 23 }).chain(h => 
                fc.integer({ min: 0, max: 59 }).map(m => 
                  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                )
              )
            }),
            { minLength: 0, maxLength: 3 }
          ),
          averageConsumption: fc.float({ min: Math.fround(100), max: Math.fround(2000), noNaN: true }),
          usageVariability: fc.float({ min: Math.fround(10), max: Math.fround(500), noNaN: true })
        }),
        
        // Generate override action (turn_on or turn_off)
        fc.constantFrom('turn_on' as const, 'turn_off' as const),
        
        // Generate override time (hour and minute)
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        
        (deviceId, profileData, overrideAction, overrideHour, overrideMinute) => {
          const engine = new BehaviorLearningEngineImpl();
          
          // Create a complete energy profile
          const profile: EnergyProfile = {
            deviceId,
            ...profileData
          };
          
          // Generate initial schedule
          const initialSchedule = engine.generateSchedule(profile);
          const initialActionCount = initialSchedule.scheduledActions.length;
          
          // Create override timestamp
          const overrideTime = `${overrideHour.toString().padStart(2, '0')}:${overrideMinute.toString().padStart(2, '0')}`;
          
          // Check if override time already exists in initial schedule
          const initialActionAtOverrideTime = initialSchedule.scheduledActions.find(
            action => action.time === overrideTime
          );
          
          // Create 3 user overrides (requirement says 3 consecutive days triggers update)
          // Use recent dates (within the last 3 days) so they're considered "recent"
          const now = new Date();
          const baseDate = new Date(now);
          baseDate.setDate(now.getDate() - 2); // Start 2 days ago
          
          for (let i = 0; i < 3; i++) {
            const overrideDate = new Date(baseDate);
            overrideDate.setDate(baseDate.getDate() + i);
            overrideDate.setHours(overrideHour, overrideMinute, 0, 0);
            
            const override = {
              deviceId,
              action: { action: overrideAction },
              timestamp: overrideDate,
              reason: 'manual' as const
            };
            
            engine.updateSchedule(deviceId, override);
          }
          
          // Get the updated schedule
          const updatedSchedule = engine.getSchedule(deviceId);
          
          // Property: The schedule should incorporate the override pattern
          expect(updatedSchedule).toBeDefined();
          
          if (updatedSchedule) {
            // Check if the override time is now in the schedule
            const hasOverrideTime = updatedSchedule.scheduledActions.some(
              action => action.time === overrideTime
            );
            
            // The schedule should now include the override time
            expect(hasOverrideTime).toBe(true);
            
            // Find the action at the override time
            const overrideScheduledAction = updatedSchedule.scheduledActions.find(
              action => action.time === overrideTime
            );
            
            // The action at the override time should match the override action
            expect(overrideScheduledAction?.action).toBe(overrideAction);
            
            // The schedule should have been updated (lastUpdated should be >= initial)
            expect(updatedSchedule.lastUpdated.getTime()).toBeGreaterThanOrEqual(initialSchedule.lastUpdated.getTime());
            
            // The schedule should either have the same number of actions (if time existed)
            // or one more action (if new time was added)
            expect(updatedSchedule.scheduledActions.length).toBeGreaterThanOrEqual(initialActionCount);
            expect(updatedSchedule.scheduledActions.length).toBeLessThanOrEqual(initialActionCount + 1);
            
            // If the override action differs from the initial action at that time,
            // verify the action was updated
            if (initialActionAtOverrideTime && initialActionAtOverrideTime.action !== overrideAction) {
              expect(overrideScheduledAction?.action).toBe(overrideAction);
              expect(overrideScheduledAction?.action).not.toBe(initialActionAtOverrideTime.action);
            }
          }
          
          // Clean up for next test
          engine.clearAllData();
        }
      ),
      { numRuns: 20 }
    );
  });
});
