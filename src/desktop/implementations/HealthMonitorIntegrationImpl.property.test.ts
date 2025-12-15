import * as fc from 'fast-check';
import { HealthMonitorIntegrationImpl } from './HealthMonitorIntegrationImpl';
import { HealthMonitorConfig } from '../interfaces/HealthMonitorIntegration';
import { ActivityData, HealthPreferences } from '../types';

describe('HealthMonitorIntegrationImpl Property Tests', () => {
  
  /**
   * **Feature: ai-chatbot-desktop, Property 8: Time-Based Health Reminders**
   * **Validates: Requirements 3.1**
   * 
   * For any sedentary period exceeding 60 minutes, the Health_Monitor should trigger appropriate movement reminders
   */
  describe('Property 8: Time-Based Health Reminders', () => {
    it('should trigger movement reminders for any sedentary period exceeding threshold', async () => {
      await fc.assert(fc.asyncProperty(
        fc.integer({ min: 61, max: 300 }), // sedentary minutes above threshold
        fc.integer({ min: 30, max: 120 }), // threshold minutes
        async (sedentaryMinutes, thresholdMinutes) => {
          // Arrange
          const healthMonitor = new HealthMonitorIntegrationImpl();
          const config: HealthMonitorConfig = {
            userId: 'test-user',
            age: 30,
            gender: 'other',
            height: 170,
            weight: 70,
            activityLevel: 'moderate',
            enableMovementTracking: true,
            enablePostureMonitoring: false,
            enableHydrationTracking: false,
            enableHeartRateMonitoring: false,
            enableStressMonitoring: false,
            movementReminderInterval: thresholdMinutes,
            hydrationReminderInterval: 60,
            postureCheckInterval: 30,
            quietHours: { start: '22:00', end: '07:00' },
            dailyStepsGoal: 8000,
            dailyWaterGoal: 2000,
            maxSedentaryTime: 60,
            targetSleepHours: 8,
            syncWithFitnessApps: false,
            shareDataWithDoctor: false,
            emergencyContactsEnabled: false,
            dataRetentionDays: 30,
            anonymizeData: true,
            localProcessingOnly: true
          };

          await healthMonitor.initialize(config);

          // Simulate sedentary period by setting last movement time in the past
          const now = new Date();
          const lastMovementTime = new Date(now.getTime() - sedentaryMinutes * 60 * 1000);
          
          // Track initial movement to set baseline
          const initialMovement: ActivityData = {
            timestamp: lastMovementTime,
            type: 'movement',
            value: 1,
            unit: 'activity',
            confidence: 1.0
          };
          healthMonitor.trackActivity(initialMovement);

          // Act & Assert
          if (sedentaryMinutes >= thresholdMinutes) {
            // Should detect sedentary behavior when exceeding threshold
            const isDetected = healthMonitor.detectSedentaryBehavior(thresholdMinutes);
            expect(isDetected).toBe(true);

            // Should generate health insights with movement reminder
            const insights = await healthMonitor.generateHealthInsights();
            const movementReminders = insights.filter(insight => 
              insight.type === 'reminder' && 
              insight.message.toLowerCase().includes('sedentary') ||
              insight.message.toLowerCase().includes('move')
            );
            expect(movementReminders.length).toBeGreaterThan(0);
            
            // Reminder should be actionable
            expect(movementReminders[0].actionRequired).toBe(true);
            
            // Priority should be appropriate based on duration
            if (sedentaryMinutes > 90) {
              expect(movementReminders[0].priority).toBe('high');
            } else {
              expect(['medium', 'high']).toContain(movementReminders[0].priority);
            }
          } else {
            // Should not detect sedentary behavior when below threshold
            const isDetected = healthMonitor.detectSedentaryBehavior(thresholdMinutes);
            expect(isDetected).toBe(false);
          }

          await healthMonitor.shutdown();
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * **Feature: ai-chatbot-desktop, Property 9: Personalized Health Suggestions**
   * **Validates: Requirements 3.2, 3.4, 3.5**
   * 
   * For any health reminder or recommendation, the content should be personalized based on user preferences and historical data
   */
  describe('Property 9: Personalized Health Suggestions', () => {
    it('should provide personalized health suggestions based on user preferences and data', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          age: fc.integer({ min: 18, max: 80 }),
          activityLevel: fc.constantFrom('sedentary', 'light', 'moderate', 'active', 'very_active') as fc.Arbitrary<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>,
          dailyWaterGoal: fc.integer({ min: 1500, max: 4000 }),
          hydrationInterval: fc.integer({ min: 30, max: 180 }),
          timeSinceHydration: fc.integer({ min: 30, max: 300 })
        }),
        async (userProfile) => {
          // Arrange
          const healthMonitor = new HealthMonitorIntegrationImpl();
          const config: HealthMonitorConfig = {
            userId: 'test-user',
            age: userProfile.age,
            gender: 'other',
            height: 170,
            weight: 70,
            activityLevel: userProfile.activityLevel,
            enableMovementTracking: true,
            enablePostureMonitoring: true,
            enableHydrationTracking: true,
            enableHeartRateMonitoring: false,
            enableStressMonitoring: false,
            movementReminderInterval: 60,
            hydrationReminderInterval: userProfile.hydrationInterval,
            postureCheckInterval: 30,
            quietHours: { start: '22:00', end: '07:00' },
            dailyStepsGoal: 8000,
            dailyWaterGoal: userProfile.dailyWaterGoal,
            maxSedentaryTime: 60,
            targetSleepHours: 8,
            syncWithFitnessApps: false,
            shareDataWithDoctor: false,
            emergencyContactsEnabled: false,
            dataRetentionDays: 30,
            anonymizeData: true,
            localProcessingOnly: true
          };

          await healthMonitor.initialize(config);

          // Simulate time since last hydration
          const lastHydrationTime = new Date(Date.now() - userProfile.timeSinceHydration * 60 * 1000);
          (healthMonitor as any).setLastHydrationTime(lastHydrationTime);
          
          // Act
          const hydrationInsight = await healthMonitor.monitorHydration();
          
          // Assert
          if (userProfile.timeSinceHydration >= userProfile.hydrationInterval) {
            // Should provide personalized hydration reminder
            expect(hydrationInsight).not.toBeNull();
            expect(hydrationInsight!.type).toBe('reminder');
            expect(hydrationInsight!.message).toContain('hydration');
            
            // Message should be personalized (contain specific amounts or timing)
            const hasPersonalization = 
              /\d+ml/.test(hydrationInsight!.message) || // Contains specific ml amount
              /\d+\s*minutes/.test(hydrationInsight!.message); // Contains specific time
            expect(hasPersonalization).toBe(true);
            
            // Priority should reflect urgency based on time elapsed
            if (userProfile.timeSinceHydration > 120) {
              expect(hydrationInsight!.priority).toBe('high');
            } else {
              expect(['medium', 'high']).toContain(hydrationInsight!.priority);
            }
          } else {
            // Should not provide reminder if within interval
            expect(hydrationInsight).toBeNull();
          }

          // Test general health insights personalization
          const insights = await healthMonitor.generateHealthInsights();
          
          // All insights should contain user-specific data
          insights.forEach(insight => {
            expect(insight.data).toBeDefined();
            expect(insight.timestamp).toBeInstanceOf(Date);
            expect(['reminder', 'suggestion', 'alert', 'encouragement']).toContain(insight.type);
            expect(['low', 'medium', 'high']).toContain(insight.priority);
          });

          await healthMonitor.shutdown();
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * **Feature: ai-chatbot-desktop, Property 10: Health Data Retrieval**
   * **Validates: Requirements 3.3**
   * 
   * For any health-related query, the system should return current, accurate health metrics and appropriate recommendations
   */
  describe('Property 10: Health Data Retrieval', () => {
    it('should return accurate health data for any health-related query', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          steps: fc.integer({ min: 0, max: 20000 }),
          postureScore: fc.integer({ min: 0, max: 100 }),
          hydrationLevel: fc.integer({ min: 0, max: 100 }),
          sedentaryTime: fc.integer({ min: 0, max: 300 }),
          heartRate: fc.integer({ min: 50, max: 120 })
        }),
        fc.constantFrom('steps', 'posture', 'hydration', 'water', 'health status', 'overall health'),
        async (healthData, queryType) => {
          // Arrange
          const healthMonitor = new HealthMonitorIntegrationImpl();
          const config: HealthMonitorConfig = {
            userId: 'test-user',
            age: 30,
            gender: 'other',
            height: 170,
            weight: 70,
            activityLevel: 'moderate',
            enableMovementTracking: true,
            enablePostureMonitoring: true,
            enableHydrationTracking: true,
            enableHeartRateMonitoring: true,
            enableStressMonitoring: false,
            movementReminderInterval: 60,
            hydrationReminderInterval: 60,
            postureCheckInterval: 30,
            quietHours: { start: '22:00', end: '07:00' },
            dailyStepsGoal: 8000,
            dailyWaterGoal: 2000,
            maxSedentaryTime: 60,
            targetSleepHours: 8,
            syncWithFitnessApps: false,
            shareDataWithDoctor: false,
            emergencyContactsEnabled: false,
            dataRetentionDays: 30,
            anonymizeData: true,
            localProcessingOnly: true
          };

          await healthMonitor.initialize(config);

          // Set up health data by tracking activities
          const activities: ActivityData[] = [
            { timestamp: new Date(), type: 'steps', value: healthData.steps, unit: 'steps', confidence: 1.0 },
            { timestamp: new Date(), type: 'posture', value: healthData.postureScore, unit: 'score', confidence: 1.0 },
            { timestamp: new Date(), type: 'heartRate', value: healthData.heartRate, unit: 'bpm', confidence: 1.0 }
          ];

          activities.forEach(activity => healthMonitor.trackActivity(activity));

          // Act
          const response = await healthMonitor.processHealthQuery(queryType);

          // Assert
          // Response should always contain an answer
          expect(response.answer).toBeDefined();
          expect(typeof response.answer).toBe('string');
          expect(response.answer.length).toBeGreaterThan(0);

          // Response should contain relevant data
          expect(response.data).toBeDefined();
          
          // Confidence should be reasonable
          expect(response.confidence).toBeGreaterThan(0);
          expect(response.confidence).toBeLessThanOrEqual(1);

          // Should provide recommendations array
          expect(Array.isArray(response.recommendations)).toBe(true);

          // Should provide follow-up questions
          expect(Array.isArray(response.followUpQuestions)).toBe(true);

          // Should include sources
          expect(Array.isArray(response.sources)).toBe(true);
          expect(response.sources.length).toBeGreaterThan(0);

          // Query-specific validations
          if (queryType.includes('steps')) {
            expect(response.answer.toLowerCase()).toContain('steps');
            if (response.data && 'steps' in response.data) {
              expect(response.data.steps).toBe(healthData.steps);
            }
          }

          if (queryType.includes('posture')) {
            expect(response.answer.toLowerCase()).toContain('posture');
            if (response.data && 'postureScore' in response.data) {
              expect(response.data.postureScore).toBe(healthData.postureScore);
            }
          }

          if (queryType.includes('hydration') || queryType.includes('water')) {
            expect(response.answer.toLowerCase()).toMatch(/hydration|water/);
            if (response.data && 'hydrationLevel' in response.data) {
              expect(typeof response.data.hydrationLevel).toBe('number');
            }
          }

          // Health status queries should return comprehensive data
          if (queryType.includes('health status') || queryType.includes('overall')) {
            const status = await healthMonitor.getHealthStatus();
            expect(status.overall).toMatch(/excellent|good|fair|poor/);
            expect(status.metrics).toBeDefined();
            expect(status.trends).toBeDefined();
            expect(Array.isArray(status.recommendations)).toBe(true);
            expect(status.lastUpdated).toBeInstanceOf(Date);
          }

          await healthMonitor.shutdown();
        }
      ), { numRuns: 100 });
    });
  });
});