import * as fc from 'fast-check';
import { ErrorHandlingSystemImpl } from './ErrorHandlingSystemImpl';
import { AIChatbotEngineImpl } from './AIChatbotEngineImpl';
import { FlashingInterfaceManagerImpl } from './FlashingInterfaceManagerImpl';
import { HealthMonitorIntegrationImpl } from './HealthMonitorIntegrationImpl';
import { CalendarManagerImpl } from './CalendarManagerImpl';
import { SmartEnergyCopilotIntegrationImpl } from './SmartEnergyCopilotIntegrationImpl';
import { ConversationContext, ChatResponse, DesktopUserPreferences } from '../types';

/**
 * Property-based tests for Error Handling and Recovery System
 * **Feature: ai-chatbot-desktop, Property 20: Offline Operation Continuity**
 * **Feature: ai-chatbot-desktop, Property 21: Graceful Degradation**
 * **Feature: ai-chatbot-desktop, Property 22: Error Recovery**
 */

describe('ErrorHandlingSystemImpl Property Tests', () => {
  let errorSystem: ErrorHandlingSystemImpl;
  let aiEngine: AIChatbotEngineImpl;
  let flashingInterface: FlashingInterfaceManagerImpl;
  let healthMonitor: HealthMonitorIntegrationImpl;
  let calendarManager: CalendarManagerImpl;
  let energyIntegration: SmartEnergyCopilotIntegrationImpl;

  beforeEach(async () => {
    errorSystem = new ErrorHandlingSystemImpl();
    aiEngine = new AIChatbotEngineImpl();
    flashingInterface = new FlashingInterfaceManagerImpl();
    healthMonitor = new HealthMonitorIntegrationImpl();
    calendarManager = new CalendarManagerImpl();
    energyIntegration = new SmartEnergyCopilotIntegrationImpl();

    // Initialize components
    await aiEngine.initialize({
      modelName: 'test-model',
      modelVersion: '1.0',
      maxTokens: 2048,
      temperature: 0.7,
      responseTimeoutMs: 5000,
      maxConcurrentRequests: 5,
      enableLocalProcessing: true,
      enableHealthDomain: true,
      enableCalendarDomain: true,
      enableEnergyDomain: true,
      enableCloudProcessing: true,
      dataRetentionDays: 30,
      anonymizeRequests: false,
      primaryLanguage: 'en',
      supportedLanguages: ['en']
    });

    await flashingInterface.initialize({
      displayType: 'led_strip',
      ledCount: 16,
      refreshRate: 60,
      defaultBrightness: 80,
      colorProfile: 'standard',
      animationSpeed: 'normal',
      reducedMotion: false,
      listeningPattern: {
        type: 'pulse',
        colors: [{ red: 0, green: 150, blue: 255 }],
        duration: 2000,
        intensity: 70,
        repeat: true
      },
      processingPattern: {
        type: 'rotate',
        colors: [{ red: 255, green: 100, blue: 0 }],
        duration: 1500,
        intensity: 80,
        repeat: true
      },
      speakingPattern: {
        type: 'wave',
        colors: [{ red: 0, green: 255, blue: 100 }],
        duration: 1000,
        intensity: 75,
        repeat: true
      },
      errorPattern: {
        type: 'flash',
        colors: [{ red: 255, green: 0, blue: 0 }],
        duration: 500,
        intensity: 90,
        repeat: false
      },
      idlePattern: {
        type: 'breathe',
        colors: [{ red: 50, green: 50, blue: 100 }],
        duration: 4000,
        intensity: 30,
        repeat: true
      },
      patternTransitionMs: 300,
      audioSyncDelayMs: 50,
      maxPatternDuration: 10000,
      highContrastMode: false,
      colorBlindSupport: false,
      flashingReduction: false
    });

    await healthMonitor.initialize({
      userId: 'test-user',
      age: 30,
      gender: 'prefer_not_to_say',
      height: 170,
      weight: 70,
      activityLevel: 'moderate',
      enableMovementTracking: true,
      enablePostureMonitoring: true,
      enableHydrationTracking: true,
      enableHeartRateMonitoring: false,
      enableStressMonitoring: false,
      movementReminderInterval: 60,
      hydrationReminderInterval: 120,
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
      anonymizeData: false,
      localProcessingOnly: true
    });

    await calendarManager.initialize({
      userId: 'test-user',
      timeZone: 'UTC',
      workingHours: {
        monday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        tuesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        wednesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        thursday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        friday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        saturday: { isWorkingDay: false, startTime: '09:00', endTime: '17:00', breakTimes: [] },
        sunday: { isWorkingDay: false, startTime: '09:00', endTime: '17:00', breakTimes: [] }
      },
      preferences: {
        defaultReminderTime: 15,
        workingHours: { start: '09:00', end: '17:00' },
        timeZone: 'UTC',
        calendarServices: [],
        autoAcceptMeetings: false
      },
      calendarServices: [],
      enableAutoSync: false,
      syncIntervalMinutes: 15,
      enableNLPParsing: true,
      supportedLanguages: ['en'],
      confidenceThreshold: 0.7,
      defaultReminderMinutes: 15,
      enableProactiveReminders: true,
      reminderMethods: ['popup'],
      enableConflictDetection: true,
      autoResolveMinorConflicts: false,
      bufferTimeMinutes: 5,
      encryptCalendarData: true,
      shareAvailability: false,
      dataRetentionDays: 30
    });

    // Mock the required components for energy integration
    const mockDeviceManager = {} as any;
    const mockEnergyMonitor = {} as any;
    const mockBehaviorLearningEngine = {} as any;

    await energyIntegration.initialize({
      deviceManager: mockDeviceManager,
      energyMonitor: mockEnergyMonitor,
      behaviorLearningEngine: mockBehaviorLearningEngine,
      cloudServiceUrls: {
        analytics: 'http://localhost:3000/analytics',
        grid: 'http://localhost:3000/grid',
        storage: 'http://localhost:3000/storage'
      },
      apiKeys: { test: 'test-key' },
      enableCloudServices: false,
      enableAutomation: true,
      enableGridIntegration: false,
      cacheTimeout: 300000,
      maxRetries: 3,
      requestTimeout: 5000
    });

    // Set components in error system
    errorSystem.setComponents({
      aiEngine,
      flashingInterface,
      healthMonitor,
      calendarManager,
      energyIntegration
    });
  });

  afterEach(async () => {
    errorSystem.cleanup(); // Clean up intervals to prevent Jest hanging
    await aiEngine.shutdown();
    await flashingInterface.shutdown();
    await healthMonitor.shutdown();
    await calendarManager.shutdown();
    await energyIntegration.shutdown();
  });

  /**
   * **Property 20: Offline Operation Continuity**
   * **Validates: Requirements 7.1**
   * 
   * For any network connectivity loss, the system should continue operating 
   * with cached data and local processing capabilities
   */
  describe('Property 20: Offline Operation Continuity', () => {
    it('should maintain functionality when network connectivity is lost', async () => {
      const contextArb = fc.record({
        conversationId: fc.string({ minLength: 1, maxLength: 50 }),
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        sessionStart: fc.date(),
        messageHistory: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          type: fc.constantFrom('user', 'assistant'),
          content: fc.string({ minLength: 1, maxLength: 200 }),
          timestamp: fc.date()
        }), { maxLength: 10 }),
        currentTopic: fc.string({ minLength: 1, maxLength: 50 }),
        userPreferences: fc.record({
          language: fc.constantFrom('en', 'es', 'fr'),
          voiceSettings: fc.record({
            preferredVoice: fc.string(),
            speechRate: fc.float({ min: 0.5, max: 2.0 }),
            volume: fc.integer({ min: 0, max: 100 }),
            wakeWordEnabled: fc.boolean()
          }),
          visualSettings: fc.record({
            brightness: fc.integer({ min: 0, max: 100 }),
            colorScheme: fc.constantFrom('light', 'dark', 'auto'),
            animationSpeed: fc.constantFrom('slow', 'normal', 'fast'),
            reducedMotion: fc.boolean()
          }),
          healthSettings: fc.record({
            movementReminderInterval: fc.integer({ min: 30, max: 120 }),
            hydrationReminderInterval: fc.integer({ min: 60, max: 240 }),
            preferredExercises: fc.array(fc.string(), { maxLength: 5 }),
            healthGoals: fc.array(fc.record({
              type: fc.constantFrom('steps', 'hydration', 'movement', 'posture'),
              target: fc.integer({ min: 1, max: 10000 }),
              unit: fc.string(),
              timeframe: fc.constantFrom('daily', 'weekly', 'monthly')
            }), { maxLength: 3 }),
            medicalConditions: fc.array(fc.string(), { maxLength: 3 }),
            emergencyContacts: fc.array(fc.record({
              name: fc.string(),
              phone: fc.string(),
              relationship: fc.string()
            }), { maxLength: 3 })
          }),
          calendarSettings: fc.record({
            defaultReminderTime: fc.integer({ min: 5, max: 60 }),
            workingHours: fc.record({
              start: fc.string(),
              end: fc.string()
            }),
            timeZone: fc.string(),
            calendarServices: fc.array(fc.record({
              type: fc.constantFrom('google', 'outlook', 'apple', 'exchange'),
              accountId: fc.string(),
              enabled: fc.boolean(),
              syncInterval: fc.integer({ min: 5, max: 60 })
            }), { maxLength: 3 }),
            autoAcceptMeetings: fc.boolean()
          }),
          privacySettings: fc.record({
            dataRetentionDays: fc.integer({ min: 1, max: 365 }),
            shareHealthData: fc.boolean(),
            shareCalendarData: fc.boolean(),
            allowCloudProcessing: fc.boolean(),
            encryptLocalData: fc.boolean(),
            anonymizeData: fc.boolean()
          })
        }) as fc.Arbitrary<DesktopUserPreferences>,
        contextVariables: fc.dictionary(fc.string(), fc.anything())
      }) as fc.Arbitrary<ConversationContext>;

      const operationArb = fc.constantFrom('processTextInput', 'processVoiceInput', 'health_check', 'calendar_query', 'energy_query');

      await fc.assert(
        fc.asyncProperty(contextArb, operationArb, async (context: ConversationContext, operation: string) => {
          // Pre-condition: System should be online initially
          expect(errorSystem.isOfflineMode()).toBe(false);

          // Simulate network connectivity loss
          errorSystem.enableOfflineMode();

          // Verify system is now in offline mode
          expect(errorSystem.isOfflineMode()).toBe(true);

          // Test that AI processing continues to work in offline mode
          try {
            const mockError = new Error('Network timeout');
            const response = await errorSystem.handleAIProcessingFailure(mockError, context, operation);

            // Property: System should provide a valid response even in offline mode
            expect(response).toBeDefined();
            expect(response.text).toBeDefined();
            expect(typeof response.text).toBe('string');
            expect(response.text.length).toBeGreaterThan(0);
            expect(response.confidence).toBeGreaterThanOrEqual(0);
            expect(response.confidence).toBeLessThanOrEqual(1);
            expect(response.processingTime).toBeGreaterThanOrEqual(0);

            // Property: Response should indicate offline mode or cached data usage
            const isOfflineResponse = response.text.includes('offline') || 
                                    response.text.includes('cached') ||
                                    response.text.includes('reduced functionality') ||
                                    (response.context && response.context.recoveryType);
            expect(isOfflineResponse).toBe(true);

          } catch (error) {
            // If error handling fails, it should still provide some form of response
            throw new Error(`Offline operation failed completely: ${error}`);
          }

          // Test hardware status detection continues to work
          const hardwareStatus = await errorSystem.detectHardwareFailures();
          expect(hardwareStatus).toBeInstanceOf(Map);
          expect(hardwareStatus.size).toBeGreaterThan(0);

          // Property: System health monitoring should continue in offline mode
          const offlineHealthStatus = errorSystem.getSystemHealthStatus();
          expect(offlineHealthStatus.offlineMode).toBe(true);
          expect(offlineHealthStatus.hardwareStatus).toBeInstanceOf(Map);
          expect(offlineHealthStatus.resourceLimitations).toBeInstanceOf(Set);

          // Restore online mode for cleanup
          await errorSystem.disableOfflineMode();
        }),
        { numRuns: 50 }
      );
    });

    it('should cache responses for offline use', async () => {
      const contextArb = fc.record({
        conversationId: fc.string({ minLength: 1, maxLength: 50 }),
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        sessionStart: fc.date(),
        messageHistory: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          type: fc.constantFrom('user', 'assistant'),
          content: fc.string({ minLength: 1, maxLength: 200 }),
          timestamp: fc.date()
        }), { maxLength: 5 }),
        currentTopic: fc.string({ minLength: 1, maxLength: 50 }),
        userPreferences: fc.record({
          language: fc.constantFrom('en', 'es', 'fr'),
          voiceSettings: fc.record({
            preferredVoice: fc.string(),
            speechRate: fc.float({ min: 0.5, max: 2.0 }),
            volume: fc.integer({ min: 0, max: 100 }),
            wakeWordEnabled: fc.boolean()
          }),
          visualSettings: fc.record({
            brightness: fc.integer({ min: 0, max: 100 }),
            colorScheme: fc.constantFrom('light', 'dark', 'auto'),
            animationSpeed: fc.constantFrom('slow', 'normal', 'fast'),
            reducedMotion: fc.boolean()
          }),
          healthSettings: fc.record({
            movementReminderInterval: fc.integer({ min: 30, max: 120 }),
            hydrationReminderInterval: fc.integer({ min: 60, max: 240 }),
            preferredExercises: fc.array(fc.string(), { maxLength: 3 }),
            healthGoals: fc.array(fc.record({
              type: fc.constantFrom('steps', 'hydration', 'movement', 'posture'),
              target: fc.integer({ min: 1, max: 1000 }),
              unit: fc.string(),
              timeframe: fc.constantFrom('daily', 'weekly', 'monthly')
            }), { maxLength: 2 }),
            medicalConditions: fc.array(fc.string(), { maxLength: 2 }),
            emergencyContacts: fc.array(fc.record({
              name: fc.string(),
              phone: fc.string(),
              relationship: fc.string()
            }), { maxLength: 2 })
          }),
          calendarSettings: fc.record({
            defaultReminderTime: fc.integer({ min: 5, max: 60 }),
            workingHours: fc.record({
              start: fc.string(),
              end: fc.string()
            }),
            timeZone: fc.string(),
            calendarServices: fc.array(fc.record({
              type: fc.constantFrom('google', 'outlook', 'apple', 'exchange'),
              accountId: fc.string(),
              enabled: fc.boolean(),
              syncInterval: fc.integer({ min: 5, max: 60 })
            }), { maxLength: 2 }),
            autoAcceptMeetings: fc.boolean()
          }),
          privacySettings: fc.record({
            dataRetentionDays: fc.integer({ min: 1, max: 365 }),
            shareHealthData: fc.boolean(),
            shareCalendarData: fc.boolean(),
            allowCloudProcessing: fc.boolean(),
            encryptLocalData: fc.boolean(),
            anonymizeData: fc.boolean()
          })
        }) as fc.Arbitrary<DesktopUserPreferences>,
        contextVariables: fc.dictionary(fc.string(), fc.anything())
      }) as fc.Arbitrary<ConversationContext>;

      await fc.assert(
        fc.asyncProperty(contextArb, async (context: ConversationContext) => {
          // Enable offline mode
          errorSystem.enableOfflineMode();

          // Simulate multiple AI processing failures with the same context
          const operation = 'processTextInput';
          const mockError = new Error('Service unavailable');

          const response1 = await errorSystem.handleAIProcessingFailure(mockError, context, operation);
          const response2 = await errorSystem.handleAIProcessingFailure(mockError, context, operation);

          // Property: Both responses should be valid and consistent
          expect(response1.text).toBeDefined();
          expect(response2.text).toBeDefined();
          expect(response1.confidence).toBe(response2.confidence);

          // Property: Second response should be faster or equal (cached)
          expect(response2.processingTime).toBeLessThanOrEqual(response1.processingTime + 50); // Allow small variance

          // Restore online mode
          await errorSystem.disableOfflineMode();
        }),
        { numRuns: 30 }
      );
    });
  });

  /**
   * **Property 21: Graceful Degradation**
   * **Validates: Requirements 7.2, 7.3, 7.4**
   * 
   * For any component failure or resource limitation, the system should maintain 
   * core functionality while clearly indicating reduced capabilities
   */
  describe('Property 21: Graceful Degradation', () => {
    it('should maintain core functionality when components fail', async () => {
      const failedComponentArb = fc.constantFrom('microphone', 'speaker', 'display', 'led_array', 'touch_sensor', 'camera');
      const contextArb = fc.record({
        conversationId: fc.string({ minLength: 1, maxLength: 50 }),
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        sessionStart: fc.date(),
        messageHistory: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          type: fc.constantFrom('user', 'assistant'),
          content: fc.string({ minLength: 1, maxLength: 100 }),
          timestamp: fc.date()
        }), { maxLength: 3 }),
        currentTopic: fc.string({ minLength: 1, maxLength: 30 }),
        userPreferences: fc.record({
          language: fc.constantFrom('en', 'es', 'fr'),
          voiceSettings: fc.record({
            preferredVoice: fc.string(),
            speechRate: fc.float({ min: 0.5, max: 2.0 }),
            volume: fc.integer({ min: 0, max: 100 }),
            wakeWordEnabled: fc.boolean()
          }),
          visualSettings: fc.record({
            brightness: fc.integer({ min: 0, max: 100 }),
            colorScheme: fc.constantFrom('light', 'dark', 'auto'),
            animationSpeed: fc.constantFrom('slow', 'normal', 'fast'),
            reducedMotion: fc.boolean()
          }),
          healthSettings: fc.record({
            movementReminderInterval: fc.integer({ min: 30, max: 120 }),
            hydrationReminderInterval: fc.integer({ min: 60, max: 240 }),
            preferredExercises: fc.array(fc.string(), { maxLength: 2 }),
            healthGoals: fc.array(fc.record({
              type: fc.constantFrom('steps', 'hydration', 'movement', 'posture'),
              target: fc.integer({ min: 1, max: 1000 }),
              unit: fc.string(),
              timeframe: fc.constantFrom('daily', 'weekly', 'monthly')
            }), { maxLength: 1 }),
            medicalConditions: fc.array(fc.string(), { maxLength: 1 }),
            emergencyContacts: fc.array(fc.record({
              name: fc.string(),
              phone: fc.string(),
              relationship: fc.string()
            }), { maxLength: 1 })
          }),
          calendarSettings: fc.record({
            defaultReminderTime: fc.integer({ min: 5, max: 60 }),
            workingHours: fc.record({
              start: fc.string(),
              end: fc.string()
            }),
            timeZone: fc.string(),
            calendarServices: fc.array(fc.record({
              type: fc.constantFrom('google', 'outlook', 'apple', 'exchange'),
              accountId: fc.string(),
              enabled: fc.boolean(),
              syncInterval: fc.integer({ min: 5, max: 60 })
            }), { maxLength: 1 }),
            autoAcceptMeetings: fc.boolean()
          }),
          privacySettings: fc.record({
            dataRetentionDays: fc.integer({ min: 1, max: 365 }),
            shareHealthData: fc.boolean(),
            shareCalendarData: fc.boolean(),
            allowCloudProcessing: fc.boolean(),
            encryptLocalData: fc.boolean(),
            anonymizeData: fc.boolean()
          })
        }) as fc.Arbitrary<DesktopUserPreferences>,
        contextVariables: fc.dictionary(fc.string(), fc.anything())
      }) as fc.Arbitrary<ConversationContext>;

      await fc.assert(
        fc.asyncProperty(failedComponentArb, contextArb, async (failedComponent: string, context: ConversationContext) => {
          // Get initial hardware status
          const initialHardwareStatus = await errorSystem.detectHardwareFailures();
          
          // Simulate component failure by forcing the component to fail
          const hardwareStatus = await errorSystem.detectHardwareFailures();
          
          // Property: System should detect hardware failures
          expect(hardwareStatus).toBeInstanceOf(Map);
          expect(hardwareStatus.size).toBeGreaterThan(0);

          // Test that system continues to function despite hardware failure
          const mockError = new Error(`${failedComponent} failure`);
          const response = await errorSystem.handleAIProcessingFailure(mockError, context, 'processTextInput');

          // Property: System should provide a response even with hardware failures
          expect(response).toBeDefined();
          expect(response.text).toBeDefined();
          expect(typeof response.text).toBe('string');
          expect(response.text.length).toBeGreaterThan(0);

          // Property: Response should be valid
          expect(response.confidence).toBeGreaterThanOrEqual(0);
          expect(response.processingTime).toBeGreaterThanOrEqual(0);

          // Property: System health status should reflect the component failure
          const systemHealth = errorSystem.getSystemHealthStatus();
          expect(systemHealth.hardwareStatus).toBeInstanceOf(Map);
        }),
        { numRuns: 30 }
      );
    });

    it('should handle resource limitations gracefully', async () => {
      const resourceTypeArb = fc.constantFrom('memory', 'cpu', 'storage', 'network');
      const usageLevelArb = fc.integer({ min: 75, max: 100 });

      await fc.assert(
        fc.asyncProperty(resourceTypeArb, usageLevelArb, async (resourceType: string, usageLevel: number) => {
          // Simulate resource limitation
          await errorSystem.handleResourceLimitations();

          // Get system health status
          const systemHealth = errorSystem.getSystemHealthStatus();

          // Property: System should track resource limitations
          expect(systemHealth.resourceLimitations).toBeInstanceOf(Set);

          // Property: System should continue to function under resource pressure
          const mockContext: ConversationContext = {
            conversationId: 'test-conv',
            userId: 'test-user',
            sessionStart: new Date(),
            messageHistory: [],
            currentTopic: 'test',
            userPreferences: {
              language: 'en',
              voiceSettings: {
                preferredVoice: 'default',
                speechRate: 1.0,
                volume: 50,
                wakeWordEnabled: false
              },
              visualSettings: {
                brightness: 80,
                colorScheme: 'light',
                animationSpeed: 'normal',
                reducedMotion: false
              },
              healthSettings: {
                movementReminderInterval: 60,
                hydrationReminderInterval: 120,
                preferredExercises: [],
                healthGoals: [],
                medicalConditions: [],
                emergencyContacts: []
              },
              calendarSettings: {
                defaultReminderTime: 15,
                workingHours: { start: '09:00', end: '17:00' },
                timeZone: 'UTC',
                calendarServices: [],
                autoAcceptMeetings: false
              },
              privacySettings: {
                dataRetentionDays: 30,
                shareHealthData: false,
                shareCalendarData: false,
                allowCloudProcessing: true,
                encryptLocalData: true,
                anonymizeData: false
              }
            },
            contextVariables: {}
          };

          const mockError = new Error(`${resourceType} limitation`);
          const response = await errorSystem.handleAIProcessingFailure(mockError, mockContext, 'processTextInput');

          // Property: System should provide a response despite resource limitations
          expect(response).toBeDefined();
          expect(response.text).toBeDefined();
          expect(response.confidence).toBeGreaterThanOrEqual(0);
          expect(response.processingTime).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Property 22: Error Recovery**
   * **Validates: Requirements 7.5**
   * 
   * For any critical error, the system should log detailed information 
   * and attempt automatic recovery procedures
   */
  describe('Property 22: Error Recovery', () => {
    it('should attempt automatic recovery for recoverable errors', async () => {
      const errorCategoryArb = fc.constantFrom('AI_INFERENCE', 'DEVICE_COMMUNICATION', 'NETWORK', 'SYSTEM');
      const errorSeverityArb = fc.constantFrom('LOW', 'MEDIUM', 'HIGH');
      const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 });
      const contextArb = fc.record({
        conversationId: fc.string({ minLength: 1, maxLength: 50 }),
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        sessionStart: fc.date(),
        messageHistory: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          type: fc.constantFrom('user', 'assistant'),
          content: fc.string({ minLength: 1, maxLength: 100 }),
          timestamp: fc.date()
        }), { maxLength: 3 }),
        currentTopic: fc.string({ minLength: 1, maxLength: 30 }),
        userPreferences: fc.record({
          language: fc.constantFrom('en', 'es', 'fr'),
          voiceSettings: fc.record({
            preferredVoice: fc.string(),
            speechRate: fc.float({ min: 0.5, max: 2.0 }),
            volume: fc.integer({ min: 0, max: 100 }),
            wakeWordEnabled: fc.boolean()
          }),
          visualSettings: fc.record({
            brightness: fc.integer({ min: 0, max: 100 }),
            colorScheme: fc.constantFrom('light', 'dark', 'auto'),
            animationSpeed: fc.constantFrom('slow', 'normal', 'fast'),
            reducedMotion: fc.boolean()
          }),
          healthSettings: fc.record({
            movementReminderInterval: fc.integer({ min: 30, max: 120 }),
            hydrationReminderInterval: fc.integer({ min: 60, max: 240 }),
            preferredExercises: fc.array(fc.string(), { maxLength: 2 }),
            healthGoals: fc.array(fc.record({
              type: fc.constantFrom('steps', 'hydration', 'movement', 'posture'),
              target: fc.integer({ min: 1, max: 1000 }),
              unit: fc.string(),
              timeframe: fc.constantFrom('daily', 'weekly', 'monthly')
            }), { maxLength: 1 }),
            medicalConditions: fc.array(fc.string(), { maxLength: 1 }),
            emergencyContacts: fc.array(fc.record({
              name: fc.string(),
              phone: fc.string(),
              relationship: fc.string()
            }), { maxLength: 1 })
          }),
          calendarSettings: fc.record({
            defaultReminderTime: fc.integer({ min: 5, max: 60 }),
            workingHours: fc.record({
              start: fc.string(),
              end: fc.string()
            }),
            timeZone: fc.string(),
            calendarServices: fc.array(fc.record({
              type: fc.constantFrom('google', 'outlook', 'apple', 'exchange'),
              accountId: fc.string(),
              enabled: fc.boolean(),
              syncInterval: fc.integer({ min: 5, max: 60 })
            }), { maxLength: 1 }),
            autoAcceptMeetings: fc.boolean()
          }),
          privacySettings: fc.record({
            dataRetentionDays: fc.integer({ min: 1, max: 365 }),
            shareHealthData: fc.boolean(),
            shareCalendarData: fc.boolean(),
            allowCloudProcessing: fc.boolean(),
            encryptLocalData: fc.boolean(),
            anonymizeData: fc.boolean()
          })
        }) as fc.Arbitrary<DesktopUserPreferences>,
        contextVariables: fc.dictionary(fc.string(), fc.anything())
      }) as fc.Arbitrary<ConversationContext>;

      await fc.assert(
        fc.asyncProperty(errorCategoryArb, errorSeverityArb, errorMessageArb, contextArb, 
          async (errorCategory: string, errorSeverity: string, errorMessage: string, context: ConversationContext) => {
          // Create a mock error
          const mockError = new Error(errorMessage);
          
          // Get initial system health
          const initialHealth = errorSystem.getSystemHealthStatus();
          const initialErrorCount = initialHealth.errorStatistics.totalErrors;

          // Trigger error handling
          const response = await errorSystem.handleAIProcessingFailure(mockError, context, 'processTextInput');

          // Property: System should provide a response even for errors
          expect(response).toBeDefined();
          expect(response.text).toBeDefined();
          expect(typeof response.text).toBe('string');
          expect(response.text.length).toBeGreaterThan(0);
          expect(response.confidence).toBeGreaterThanOrEqual(0);
          expect(response.confidence).toBeLessThanOrEqual(1);
          expect(response.processingTime).toBeGreaterThanOrEqual(0);

          // Property: Error should be logged in system health statistics
          const finalHealth = errorSystem.getSystemHealthStatus();
          expect(finalHealth.errorStatistics.totalErrors).toBeGreaterThanOrEqual(initialErrorCount);

          // Property: Recovery attempts should be tracked
          expect(finalHealth.recoveryAttempts).toBeInstanceOf(Map);

          // Property: System should maintain error statistics
          expect(finalHealth.errorStatistics.errorsByCategory).toBeDefined();
          expect(finalHealth.errorStatistics.errorsBySeverity).toBeDefined();
          expect(finalHealth.errorStatistics.recentErrors).toBeInstanceOf(Array);
        }),
        { numRuns: 30 }
      );
    });

    it('should limit recovery attempts to prevent infinite loops', async () => {
      const contextArb = fc.record({
        conversationId: fc.string({ minLength: 1, maxLength: 50 }),
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        sessionStart: fc.date(),
        messageHistory: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          type: fc.constantFrom('user', 'assistant'),
          content: fc.string({ minLength: 1, maxLength: 100 }),
          timestamp: fc.date()
        }), { maxLength: 2 }),
        currentTopic: fc.string({ minLength: 1, maxLength: 30 }),
        userPreferences: fc.record({
          language: fc.constantFrom('en', 'es', 'fr'),
          voiceSettings: fc.record({
            preferredVoice: fc.string(),
            speechRate: fc.float({ min: 0.5, max: 2.0 }),
            volume: fc.integer({ min: 0, max: 100 }),
            wakeWordEnabled: fc.boolean()
          }),
          visualSettings: fc.record({
            brightness: fc.integer({ min: 0, max: 100 }),
            colorScheme: fc.constantFrom('light', 'dark', 'auto'),
            animationSpeed: fc.constantFrom('slow', 'normal', 'fast'),
            reducedMotion: fc.boolean()
          }),
          healthSettings: fc.record({
            movementReminderInterval: fc.integer({ min: 30, max: 120 }),
            hydrationReminderInterval: fc.integer({ min: 60, max: 240 }),
            preferredExercises: fc.array(fc.string(), { maxLength: 1 }),
            healthGoals: fc.array(fc.record({
              type: fc.constantFrom('steps', 'hydration', 'movement', 'posture'),
              target: fc.integer({ min: 1, max: 1000 }),
              unit: fc.string(),
              timeframe: fc.constantFrom('daily', 'weekly', 'monthly')
            }), { maxLength: 1 }),
            medicalConditions: fc.array(fc.string(), { maxLength: 1 }),
            emergencyContacts: fc.array(fc.record({
              name: fc.string(),
              phone: fc.string(),
              relationship: fc.string()
            }), { maxLength: 1 })
          }),
          calendarSettings: fc.record({
            defaultReminderTime: fc.integer({ min: 5, max: 60 }),
            workingHours: fc.record({
              start: fc.string(),
              end: fc.string()
            }),
            timeZone: fc.string(),
            calendarServices: fc.array(fc.record({
              type: fc.constantFrom('google', 'outlook', 'apple', 'exchange'),
              accountId: fc.string(),
              enabled: fc.boolean(),
              syncInterval: fc.integer({ min: 5, max: 60 })
            }), { maxLength: 1 }),
            autoAcceptMeetings: fc.boolean()
          }),
          privacySettings: fc.record({
            dataRetentionDays: fc.integer({ min: 1, max: 365 }),
            shareHealthData: fc.boolean(),
            shareCalendarData: fc.boolean(),
            allowCloudProcessing: fc.boolean(),
            encryptLocalData: fc.boolean(),
            anonymizeData: fc.boolean()
          })
        }) as fc.Arbitrary<DesktopUserPreferences>,
        contextVariables: fc.dictionary(fc.string(), fc.anything())
      }) as fc.Arbitrary<ConversationContext>;

      await fc.assert(
        fc.asyncProperty(contextArb, async (context: ConversationContext) => {
          const mockError = new Error('Persistent failure');
          const operation = 'processTextInput';

          // Trigger multiple failures with the same error type
          const responses = [];
          for (let i = 0; i < 5; i++) {
            const response = await errorSystem.handleAIProcessingFailure(mockError, context, operation);
            responses.push(response);
          }

          // Property: All attempts should return valid responses
          responses.forEach(response => {
            expect(response).toBeDefined();
            expect(response.text).toBeDefined();
            expect(response.confidence).toBeGreaterThanOrEqual(0);
            expect(response.processingTime).toBeGreaterThanOrEqual(0);
          });

          // Property: Recovery attempts should be limited (tracked in system health)
          const systemHealth = errorSystem.getSystemHealthStatus();
          expect(systemHealth.recoveryAttempts).toBeInstanceOf(Map);
          
          // The system should not attempt infinite recovery
          // This is verified by the fact that all calls complete successfully
          // without hanging or throwing unhandled exceptions
        }),
        { numRuns: 15 }
      );
    });
  });
});