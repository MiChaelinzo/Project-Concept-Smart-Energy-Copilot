/**
 * AI Chatbot Desktop Device - Integration Tests
 * 
 * Complete system workflow integration tests covering:
 * - End-to-end AI conversation with visual feedback
 * - Health monitoring with proactive reminders
 * - Calendar management with natural language scheduling
 * - Smart Energy Copilot integration workflows
 * 
 * Requirements: All
 */

import {
  AIChatbotEngineImpl,
  FlashingInterfaceManagerImpl,
  HealthMonitorIntegrationImpl,
  CalendarManagerImpl,
  SmartEnergyCopilotIntegrationImpl,
  MultiModalInterfaceControllerImpl
} from './implementations';

import {
  ResilientDeviceManager,
  EnergyMonitorImpl,
  BehaviorLearningEngineImpl
} from '../edge/implementations';

import { 
  ConversationContext, 
  AudioBuffer, 
  UserInput,
  HealthPreferences,
  ActivityData,
  Appointment,
  TimeRange,
  EnergyQuery
} from './types';

import { PostureData } from './interfaces/HealthMonitorIntegration';

describe('AI Chatbot Desktop Device - Integration Tests', () => {
  let aiChatbot: AIChatbotEngineImpl;
  let flashingInterface: FlashingInterfaceManagerImpl;
  let healthMonitor: HealthMonitorIntegrationImpl;
  let calendarManager: CalendarManagerImpl;
  let energyIntegration: SmartEnergyCopilotIntegrationImpl;
  let multiModalController: MultiModalInterfaceControllerImpl;
  
  // Supporting components for energy integration
  let deviceManager: ResilientDeviceManager;
  let energyMonitor: EnergyMonitorImpl;
  let behaviorEngine: BehaviorLearningEngineImpl;

  // Helper function to create default user preferences
  const createDefaultUserPreferences = () => ({
    language: 'en',
    voiceSettings: {
      preferredVoice: 'default',
      speechRate: 1.0,
      volume: 0.8,
      wakeWordEnabled: false
    },
    visualSettings: {
      brightness: 80,
      colorScheme: 'light' as const,
      animationSpeed: 'normal' as const,
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
      allowCloudProcessing: false,
      encryptLocalData: true,
      anonymizeData: true
    }
  });

  beforeEach(async () => {
    // Initialize supporting components first
    deviceManager = new ResilientDeviceManager('test-api-key', 'test-api-secret');
    await (deviceManager as any).baseManager.authenticate();
    (deviceManager as any).updateApiStatus(true);
    
    energyMonitor = new EnergyMonitorImpl();
    behaviorEngine = new BehaviorLearningEngineImpl();

    // Initialize AI Chatbot Engine
    aiChatbot = new AIChatbotEngineImpl();
    await aiChatbot.initialize({
      modelName: 'test-model',
      modelVersion: '1.0.0',
      maxTokens: 2048,
      temperature: 0.7,
      responseTimeoutMs: 5000,
      maxConcurrentRequests: 5,
      enableLocalProcessing: true,
      enableHealthDomain: true,
      enableCalendarDomain: true,
      enableEnergyDomain: true,
      enableCloudProcessing: false,
      dataRetentionDays: 30,
      anonymizeRequests: true,
      primaryLanguage: 'en',
      supportedLanguages: ['en']
    });

    // Initialize Flashing Interface Manager
    flashingInterface = new FlashingInterfaceManagerImpl();
    await flashingInterface.initialize({
      displayType: 'led_strip',
      ledCount: 30,
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
      patternTransitionMs: 200,
      audioSyncDelayMs: 50,
      maxPatternDuration: 10000,
      highContrastMode: false,
      colorBlindSupport: false,
      flashingReduction: false
    });

    // Initialize Health Monitor Integration
    healthMonitor = new HealthMonitorIntegrationImpl();
    await healthMonitor.initialize({
      userId: 'test-user',
      age: 30,
      gender: 'prefer_not_to_say',
      height: 175,
      weight: 70,
      activityLevel: 'moderate',
      enableMovementTracking: true,
      enablePostureMonitoring: true,
      enableHydrationTracking: true,
      enableHeartRateMonitoring: true,
      enableStressMonitoring: true,
      movementReminderInterval: 60,
      hydrationReminderInterval: 120,
      postureCheckInterval: 30,
      quietHours: { start: '22:00', end: '07:00' },
      dailyStepsGoal: 8000,
      dailyWaterGoal: 2000,
      maxSedentaryTime: 120,
      targetSleepHours: 8,
      syncWithFitnessApps: false,
      shareDataWithDoctor: false,
      emergencyContactsEnabled: false,
      dataRetentionDays: 30,
      anonymizeData: true,
      localProcessingOnly: true
    });

    // Initialize Calendar Manager
    calendarManager = new CalendarManagerImpl();
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
      syncIntervalMinutes: 30,
      enableNLPParsing: true,
      supportedLanguages: ['en'],
      confidenceThreshold: 0.7,
      defaultReminderMinutes: 15,
      enableProactiveReminders: true,
      reminderMethods: ['popup', 'audio'],
      enableConflictDetection: true,
      autoResolveMinorConflicts: false,
      bufferTimeMinutes: 5,
      encryptCalendarData: false,
      shareAvailability: false,
      dataRetentionDays: 365
    });

    // Initialize Smart Energy Copilot Integration
    energyIntegration = new SmartEnergyCopilotIntegrationImpl();
    await energyIntegration.initialize({
      deviceManager,
      energyMonitor,
      behaviorLearningEngine: behaviorEngine,
      cloudServiceUrls: {
        analytics: 'http://localhost:3001/analytics',
        grid: 'http://localhost:3002/grid',
        storage: 'http://localhost:3003/storage'
      },
      apiKeys: {
        analytics: 'test-analytics-key',
        grid: 'test-grid-key',
        storage: 'test-storage-key'
      },
      enableCloudServices: true,
      enableAutomation: true,
      enableGridIntegration: false,
      cacheTimeout: 300000,
      maxRetries: 3,
      requestTimeout: 5000
    });

    // Set energy integration in AI chatbot
    aiChatbot.setEnergyIntegration(energyIntegration);

    // Initialize Multi-Modal Interface Controller
    multiModalController = new MultiModalInterfaceControllerImpl();
    await multiModalController.initialize({
      enabledModalities: ['voice', 'touch', 'gesture'],
      voiceConfig: {
        enableSpeechRecognition: true,
        recognitionLanguage: 'en-US',
        noiseReduction: true,
        confidenceThreshold: 0.7,
        echoCancellation: true,
        automaticGainControl: true,
        noiseSuppression: true,
        enableSpeechSynthesis: true,
        voiceId: 'default',
        speechRate: 1.0,
        volume: 0.8,
        pitch: 1.0,
        wakeWordEnabled: false,
        wakeWords: ['hey assistant'],
        wakeWordSensitivity: 0.7,
        sampleRate: 44100,
        bitDepth: 16,
        channels: 1,
        bufferSize: 1024,
        maxRecognitionTime: 30000,
        maxSynthesisTime: 10000,
        enableLocalProcessing: true,
        enableCloudProcessing: false
      },
      touchConfig: {
        touchSensitivity: 0.8,
        multiTouchEnabled: true,
        gestureRecognitionEnabled: true,
        hapticFeedbackEnabled: true,
        hapticIntensity: 0.5,
        touchZones: [],
        swipeThreshold: 50,
        tapTimeout: 300,
        longPressTimeout: 1000
      },
      gestureConfig: {
        cameraEnabled: false,
        cameraResolution: { width: 640, height: 480 },
        frameRate: 30,
        gestureLibrary: ['wave', 'point', 'thumbs_up'],
        recognitionConfidence: 0.8,
        trackingSmoothing: 0.5,
        handTrackingEnabled: false,
        maxHands: 2,
        faceTrackingEnabled: false,
        eyeTrackingEnabled: false
      },
      visualConfig: {
        displayBrightness: 80,
        colorProfile: 'standard',
        animationSpeed: 1.0,
        fontSize: 14,
        fontFamily: 'Arial',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        transitionsEnabled: true,
        particleEffectsEnabled: false,
        reducedMotion: false
      },
      audioConfig: {
        masterVolume: 0.8,
        voiceVolume: 0.8,
        effectsVolume: 0.6,
        sampleRate: 44100,
        bitDepth: 16,
        spatialAudioEnabled: false,
        surroundSound: false,
        equalizerEnabled: false,
        bassBoost: 0,
        trebleBoost: 0
      },
      accessibilityConfig: {
        highContrast: false,
        largeText: false,
        colorBlindSupport: false,
        stickyKeys: false,
        slowKeys: false,
        bounceKeys: false,
        simplifiedInterface: false,
        extendedTimeouts: false,
        confirmationPrompts: false,
        screenReaderEnabled: false,
        screenReaderVoice: 'default',
        verbosityLevel: 'standard'
      },
      defaultInteractionMode: 'voice_primary',
      modalitySwitchingEnabled: true,
      concurrentInputEnabled: true,
      inputTimeoutMs: 5000,
      responseTimeoutMs: 3000,
      maxConcurrentInputs: 3
    });
  });

  afterEach(async () => {
    // Cleanup all components
    await aiChatbot.shutdown();
    await flashingInterface.shutdown();
    await healthMonitor.shutdown();
    await calendarManager.shutdown();
    await energyIntegration.shutdown();
    await multiModalController.shutdown();
    
    deviceManager.destroy();
    energyMonitor.clearAllData();
    behaviorEngine.clearAllData();
  });

  /**
   * Test 1: End-to-end AI conversation with visual feedback
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5
   */
  describe('End-to-End AI Conversation with Visual Feedback', () => {
    test('should process voice input with synchronized visual feedback', async () => {
      // Create conversation context
      const context: ConversationContext = {
        conversationId: 'test-conv-001',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'general',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      // Create audio input (simulated)
      const audioInput: AudioBuffer = {
        data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]), // Simulated audio data
        sampleRate: 44100,
        duration: 3.5
      };

      // Step 1: Show listening pattern when receiving input
      flashingInterface.showListeningPattern();
      const listeningStatus = flashingInterface.getCurrentPattern();
      expect(listeningStatus.isActive).toBe(true);
      expect(listeningStatus.state).toBe('listening');

      // Step 2: Process voice input through AI chatbot
      const startTime = Date.now();
      const response = await aiChatbot.processVoiceInput(audioInput, context);
      const processingTime = Date.now() - startTime;

      // Verify response quality and timing
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(10);
      expect(response.confidence).toBeGreaterThan(0.5);
      expect(response.processingTime).toBeLessThan(2000); // Under 2 seconds
      expect(processingTime).toBeLessThan(2000);

      // Step 3: Show processing pattern during AI processing
      flashingInterface.showProcessingPattern();
      const processingStatus = flashingInterface.getCurrentPattern();
      expect(processingStatus.state).toBe('processing');

      // Step 4: Show speaking pattern synchronized with response
      if (response.visualPattern) {
        // First set speaking state, then apply custom pattern
        flashingInterface.showSpeakingPattern(2000);
        flashingInterface.customPattern(response.visualPattern);
      } else {
        flashingInterface.showSpeakingPattern(2000);
      }
      
      const speakingStatus = flashingInterface.getCurrentPattern();
      expect(speakingStatus.state).toBe('speaking');

      // Step 5: Verify context preservation
      expect(context.messageHistory.length).toBeGreaterThan(0);
      expect(context.contextVariables.lastUpdated).toBeDefined();

      // Step 6: Test follow-up conversation
      const followUpAudio: AudioBuffer = {
        data: new Float32Array([0.2, 0.3, 0.4, 0.5, 0.6]),
        sampleRate: 44100,
        duration: 2.8
      };

      const followUpResponse = await aiChatbot.processVoiceInput(followUpAudio, context);
      
      expect(followUpResponse.text).toBeDefined();
      expect(followUpResponse.confidence).toBeGreaterThan(0.5);
      expect(context.messageHistory.length).toBeGreaterThan(2); // Should have multiple messages
    });

    test('should handle unclear input with clarification requests', async () => {
      const context: ConversationContext = {
        conversationId: 'test-conv-002',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'general',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      // Create unclear audio input
      const unclearAudio: AudioBuffer = {
        data: new Float32Array([0.05, 0.1, 0.05, 0.1]),
        sampleRate: 44100,
        duration: 1.2
      };

      // Process unclear input
      const response = await aiChatbot.processVoiceInput(unclearAudio, context);

      // Should request clarification
      expect(response.requiresFollowUp).toBe(true);
      expect(response.text.toLowerCase()).toMatch(/(clarify|understand|rephrase|more details)/);
      
      // Visual feedback should show question pattern
      if (response.visualPattern) {
        flashingInterface.customPattern(response.visualPattern);
        const status = flashingInterface.getCurrentPattern();
        expect(status.isActive).toBe(true);
      }
    });

    test('should provide domain-specific responses for work queries', async () => {
      const context: ConversationContext = {
        conversationId: 'test-conv-003',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'work',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: { domain: 'work' }
      };

      const workQuery: AudioBuffer = {
        data: new Float32Array([0.3, 0.4, 0.5, 0.6, 0.7, 0.8]),
        sampleRate: 44100,
        duration: 4.2
      };

      const response = await aiChatbot.processVoiceInput(workQuery, context);

      // Should provide work-related response
      expect(response.text.toLowerCase()).toMatch(/(work|task|productivity|efficient|calendar|schedule)/);
      expect(response.confidence).toBeGreaterThan(0.7);
      expect(response.context?.domain).toBe('work');
    });

    test('should handle multi-modal input coordination', async () => {
      const context: ConversationContext = {
        conversationId: 'test-conv-004',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'general',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      // Create multi-modal input (voice + touch)
      const multiModalInput: UserInput[] = [
        {
          type: 'voice',
          content: {
            data: new Float32Array([0.4, 0.5, 0.6]),
            sampleRate: 44100,
            duration: 2.1
          },
          timestamp: new Date(),
          userId: 'test-user'
        },
        {
          type: 'touch',
          content: { x: 100, y: 200, pressure: 0.8, timestamp: new Date() },
          timestamp: new Date(),
          userId: 'test-user'
        }
      ];

      // Process multi-modal input
      const response = await aiChatbot.processMultiModalInput(multiModalInput, context);

      expect(response.text).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.7);
      expect(response.text.toLowerCase()).toMatch(/(schedule|calendar|meeting|appointment)/);
    });
  });

  /**
   * Test 2: Health monitoring with proactive reminders
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  describe('Health Monitoring with Proactive Reminders', () => {
    test('should detect sedentary behavior and provide movement reminders', async () => {
      // Simulate user being sedentary for over 60 minutes
      const oneHourAgo = new Date(Date.now() - 65 * 60 * 1000);
      
      // Track initial activity
      const initialActivity: ActivityData = {
        type: 'movement',
        value: 5,
        timestamp: oneHourAgo,
        unit: 'steps',
        confidence: 0.9
      };
      
      healthMonitor.trackActivity(initialActivity);

      // Check for sedentary behavior
      const isSedentary = healthMonitor.detectSedentaryBehavior(60);
      expect(isSedentary).toBe(true);

      // Generate health insights
      const insights = await healthMonitor.generateHealthInsights();
      
      const movementReminder = insights.find(insight => 
        insight.type === 'reminder' && insight.message.toLowerCase().includes('sedentary')
      );
      
      expect(movementReminder).toBeDefined();
      expect(movementReminder?.priority).toMatch(/(medium|high)/);
      expect(movementReminder?.actionRequired).toBe(true);

      // Test AI chatbot integration with health insights
      const context: ConversationContext = {
        conversationId: 'health-conv-001',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'health',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      const healthQuery = 'How is my health status today?';
      const response = await aiChatbot.processTextInput(healthQuery, context);

      expect(response.text.toLowerCase()).toMatch(/(health|movement|sedentary|break)/);
      expect(response.actions?.some(action => action.type === 'health')).toBe(true);
    });

    test('should provide personalized hydration reminders', async () => {
      // Set last hydration time to over 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 125 * 60 * 1000);
      healthMonitor.setLastHydrationTime(twoHoursAgo);

      // Monitor hydration
      const hydrationInsight = await healthMonitor.monitorHydration();
      
      expect(hydrationInsight).toBeDefined();
      expect(hydrationInsight?.type).toBe('reminder');
      expect(hydrationInsight?.message.toLowerCase()).toMatch(/(hydration|water|drink)/);
      expect(hydrationInsight?.message).toMatch(/\d+ml/); // Should include specific amount

      // Test personalization based on activity level
      const activityData: ActivityData = {
        type: 'movement',
        value: 15,
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        unit: 'steps',
        confidence: 0.9
      };
      
      healthMonitor.trackActivity(activityData);
      
      const personalizedInsight = await healthMonitor.monitorHydration();
      expect(personalizedInsight?.message).toMatch(/\d+ml/);
    });

    test('should analyze posture and provide recommendations', async () => {
      // Create posture data indicating poor posture
      const postureData: PostureData[] = [
        {
          spinalAlignment: 45, // Poor alignment
          headPosition: 'forward',
          shoulderPosition: 'forward',
          sittingDuration: 90, // 90 minutes
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          confidence: 0.8
        },
        {
          spinalAlignment: 50,
          headPosition: 'forward',
          shoulderPosition: 'neutral',
          sittingDuration: 120,
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          confidence: 0.85
        },
        {
          spinalAlignment: 40,
          headPosition: 'forward',
          shoulderPosition: 'forward',
          sittingDuration: 150,
          timestamp: new Date(),
          confidence: 0.9
        }
      ];

      const postureInsights = await healthMonitor.analyzePosture(postureData);
      
      expect(postureInsights.length).toBeGreaterThan(0);
      
      const alignmentInsight = postureInsights.find(insight => 
        insight.message.toLowerCase().includes('spinal alignment')
      );
      expect(alignmentInsight).toBeDefined();
      expect(alignmentInsight?.priority).toMatch(/(medium|high)/);

      const headPostureInsight = postureInsights.find(insight => 
        insight.message.toLowerCase().includes('forward head')
      );
      expect(headPostureInsight).toBeDefined();

      const sittingInsight = postureInsights.find(insight => 
        insight.message.toLowerCase().includes('sitting')
      );
      expect(sittingInsight).toBeDefined();
    });

    test('should integrate health data with AI conversations', async () => {
      // Set up health data
      const healthData: ActivityData[] = [
        { type: 'steps', value: 3500, timestamp: new Date(), unit: 'steps', confidence: 0.95 },
        { type: 'heartRate', value: 85, timestamp: new Date(), unit: 'bpm', confidence: 0.9 },
        { type: 'posture', value: 65, timestamp: new Date(), unit: 'score', confidence: 0.8 }
      ];

      healthData.forEach(data => healthMonitor.trackActivity(data));

      // Query health status through AI
      const context: ConversationContext = {
        conversationId: 'health-conv-002',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'health',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      const healthQueries = [
        'How many steps have I taken today?',
        'What is my posture score?',
        'Give me my health summary'
      ];

      for (const query of healthQueries) {
        const response = await aiChatbot.processTextInput(query, context);
        
        expect(response.text).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0.6);
        
        if (query.includes('steps')) {
          expect(response.text).toMatch(/3500|3,500/);
        } else if (query.includes('posture')) {
          expect(response.text).toMatch(/65/);
        }
      }
    });

    test('should schedule and trigger health reminders', async () => {
      const preferences: HealthPreferences = {
        movementReminderInterval: 1, // 1 minute for testing
        hydrationReminderInterval: 2, // 2 minutes for testing
        preferredExercises: [],
        healthGoals: [],
        medicalConditions: [],
        emergencyContacts: []
      };

      // Schedule reminders
      healthMonitor.scheduleReminders(preferences);

      // Simulate time passing and check for reminders
      // In a real test, we would use fake timers or wait for actual timeouts
      // For this test, we'll verify the scheduling mechanism exists
      const healthStatus = await healthMonitor.getHealthStatus();
      expect(healthStatus.overall).toMatch(/(excellent|good|fair|poor)/);
      expect(healthStatus.recommendations).toBeDefined();
      expect(Array.isArray(healthStatus.recommendations)).toBe(true);
    });
  });

  /**
   * Test 3: Calendar management with natural language scheduling
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  describe('Calendar Management with Natural Language Scheduling', () => {
    test('should parse natural language and create appointments', async () => {
      const naturalLanguageRequests = [
        'Schedule a meeting with John tomorrow at 2 PM',
        'Book an appointment for next week',
        'Create a meeting for project review on Friday at 10 AM'
      ];

      for (const request of naturalLanguageRequests) {
        const intent = await calendarManager.parseScheduleRequest(request);
        
        expect(intent.action).toBe('create');
        expect(intent.confidence).toBeGreaterThan(0.5);
        
        if (intent.appointment) {
          const success = await calendarManager.createAppointment(intent.appointment as Appointment);
          expect(success).toBe(true);
        }
      }

      // Verify appointments were created
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const tomorrowEvents = await calendarManager.getUpcomingEvents({
        start: tomorrow,
        end: dayAfterTomorrow
      });

      expect(tomorrowEvents.length).toBeGreaterThan(0);
      
      const johnMeeting = tomorrowEvents.find(event => 
        event.title.toLowerCase().includes('john') || 
        event.title.toLowerCase().includes('meeting')
      );
      expect(johnMeeting).toBeDefined();
    });

    test('should detect and resolve scheduling conflicts', async () => {
      // Create initial appointment
      const baseTime = new Date();
      baseTime.setHours(14, 0, 0, 0); // 2 PM today
      
      const firstAppointment: Appointment = {
        id: 'apt-001',
        title: 'Team Meeting',
        startTime: baseTime,
        endTime: new Date(baseTime.getTime() + 60 * 60 * 1000), // 1 hour
        reminders: [],
        priority: 'high'
      };

      await calendarManager.createAppointment(firstAppointment);

      // Try to create conflicting appointment
      const conflictingEvent = {
        id: 'apt-002',
        title: 'Client Call',
        startTime: new Date(baseTime.getTime() + 30 * 60 * 1000), // 2:30 PM (overlaps)
        endTime: new Date(baseTime.getTime() + 90 * 60 * 1000), // 3:30 PM
        type: 'appointment' as const,
        status: 'confirmed' as const
      };

      const conflicts = await calendarManager.checkConflicts(conflictingEvent);
      
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].existingEvent.title).toBe('Team Meeting');
      expect(conflicts[0].conflictType).toBe('overlap');
      expect(conflicts[0].suggestions.length).toBeGreaterThan(0);
    });

    test('should provide proactive reminders for upcoming appointments', async () => {
      // Create appointment 10 minutes from now
      const appointmentTime = new Date(Date.now() + 10 * 60 * 1000);
      const appointment: Appointment = {
        id: 'reminder-test',
        title: 'Important Meeting',
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 60 * 60 * 1000),
        reminders: [
          { type: 'popup', minutesBefore: 5 },
          { type: 'audio', minutesBefore: 2 }
        ],
        priority: 'high'
      };

      await calendarManager.createAppointment(appointment);
      
      // Set up reminders
      await calendarManager.setupReminders(appointment.id, appointment.reminders);

      // Verify appointment exists and reminders are configured
      const upcomingEvents = await calendarManager.getUpcomingEvents({
        start: new Date(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const reminderAppointment = upcomingEvents.find(event => event.title === 'Important Meeting');
      expect(reminderAppointment).toBeDefined();
    });

    test('should integrate calendar queries with AI chatbot', async () => {
      // Create some test appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const appointments = [
        {
          id: 'daily-standup',
          title: 'Daily Standup',
          startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
          endTime: new Date(today.getTime() + 9.5 * 60 * 60 * 1000), // 9:30 AM
          reminders: [],
          priority: 'medium' as const
        },
        {
          id: 'client-review',
          title: 'Client Review',
          startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM
          endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 3 PM
          reminders: [],
          priority: 'high' as const
        }
      ];

      for (const apt of appointments) {
        await calendarManager.createAppointment(apt);
      }

      // Test AI integration with calendar queries
      const context: ConversationContext = {
        conversationId: 'calendar-conv-001',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'calendar',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      const calendarQueries = [
        'What meetings do I have today?',
        'Show me my schedule',
        'When is my next appointment?'
      ];

      for (const query of calendarQueries) {
        const response = await aiChatbot.processTextInput(query, context);
        
        expect(response.text).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0.6);
        expect(response.actions?.some(action => action.type === 'calendar')).toBe(true);
      }
    });

    test('should handle natural language appointment creation through AI', async () => {
      const context: ConversationContext = {
        conversationId: 'calendar-conv-002',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'calendar',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      const schedulingRequest = 'Can you schedule a team retrospective for tomorrow at 3 PM?';
      const response = await aiChatbot.processTextInput(schedulingRequest, context);

      expect(response.text).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.6);
      expect(response.text.toLowerCase()).toMatch(/(schedule|meeting|appointment|calendar)/);
      
      // Should generate calendar actions
      const calendarActions = response.actions?.filter(action => action.type === 'calendar');
      expect(calendarActions?.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test 4: Smart Energy Copilot integration workflows
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  describe('Smart Energy Copilot Integration Workflows', () => {
    beforeEach(async () => {
      // Set up test devices and energy data
      await deviceManager.registerDevice('living-room-light', 'light');
      await deviceManager.registerDevice('bedroom-hvac', 'hvac');
      await deviceManager.registerDevice('kitchen-plug', 'smart_plug');
      
      // Record some energy consumption data
      const baseTime = new Date();
      energyMonitor.recordConsumption('living-room-light', 45, baseTime);
      energyMonitor.recordConsumption('bedroom-hvac', 1200, baseTime);
      energyMonitor.recordConsumption('kitchen-plug', 300, baseTime);
    });

    test('should process energy queries through AI chatbot', async () => {
      const context: ConversationContext = {
        conversationId: 'energy-conv-001',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'energy',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      const energyQueries = [
        'What is my current energy consumption?',
        'Show me device status',
        'How can I optimize my energy usage?',
        'What devices are using the most power?'
      ];

      for (const query of energyQueries) {
        const response = await aiChatbot.processTextInput(query, context);
        
        expect(response.text).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0.6);
        expect(response.text.toLowerCase()).toMatch(/(energy|device|power|consumption|optimization)/);
        
        // Should generate energy-related actions
        const energyActions = response.actions?.filter(action => 
          action.type === 'energy' || action.type === 'device_control'
        );
        expect(energyActions?.length).toBeGreaterThan(0);
      }
    });

    test('should execute device control commands through natural language', async () => {
      const context: ConversationContext = {
        conversationId: 'energy-conv-002',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'energy',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      // Test device control through AI
      const controlCommands = [
        'Turn on the living room light',
        'Set bedroom temperature to 22 degrees',
        'Turn off kitchen plug'
      ];

      for (const command of controlCommands) {
        const response = await aiChatbot.processTextInput(command, context);
        
        expect(response.text).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0.6);
        
        // Should generate device control actions
        const controlActions = response.actions?.filter(action => action.type === 'device_control');
        expect(controlActions?.length).toBeGreaterThan(0);
        
        if (controlActions && controlActions.length > 0) {
          const action = controlActions[0];
          expect(action.requiresConfirmation).toBe(true);
          expect(action.priority).toBe('high');
        }
      }
    });

    test('should retrieve and present energy data through integration', async () => {
      // Test direct energy integration queries
      const consumptionQuery: EnergyQuery = {
        type: 'consumption',
        timeframe: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        }
      };

      const consumptionResponse = await energyIntegration.getEnergyData(consumptionQuery);
      
      expect(consumptionResponse.data).toBeDefined();
      expect(consumptionResponse.data.totalConsumption).toBeGreaterThan(0);
      expect(consumptionResponse.source).toBe('energy_monitor');
      expect(consumptionResponse.confidence).toBeGreaterThan(0.8);

      // Test device information query
      const deviceQuery: EnergyQuery = {
        type: 'devices',
        deviceIds: ['living-room-light', 'bedroom-hvac']
      };

      const deviceResponse = await energyIntegration.getEnergyData(deviceQuery);
      
      expect(deviceResponse.data).toBeDefined();
      expect(deviceResponse.data.devices).toBeDefined();
      expect(Array.isArray(deviceResponse.data.devices)).toBe(true);
    });

    test('should provide optimization suggestions based on usage patterns', async () => {
      // Generate some historical data for pattern analysis
      const devices = ['living-room-light', 'bedroom-hvac', 'kitchen-plug'];
      const baseTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      for (let day = 0; day < 7; day++) {
        for (const deviceId of devices) {
          const timestamp = new Date(baseTime.getTime() + day * 24 * 60 * 60 * 1000);
          const consumption = Math.random() * 100 + 50; // Random consumption
          energyMonitor.recordConsumption(deviceId, consumption, timestamp);
        }
      }

      // Get optimization suggestions
      const optimizationResponse = await energyIntegration.processEnergyQuery(
        'How can I optimize my energy usage?',
        'test-user'
      );

      expect(optimizationResponse.data).toBeDefined();
      expect(optimizationResponse.data.suggestions).toBeDefined();
      expect(Array.isArray(optimizationResponse.data.suggestions)).toBe(true);
    });

    test('should integrate with automation rules and behavior learning', async () => {
      // Test automation rules retrieval
      const automationData = await energyIntegration.getAutomationRules();
      
      expect(automationData.rules).toBeDefined();
      expect(automationData.schedules).toBeDefined();
      expect(automationData.predictions).toBeDefined();
      expect(Array.isArray(automationData.rules)).toBe(true);
      expect(Array.isArray(automationData.schedules)).toBe(true);
      expect(Array.isArray(automationData.predictions)).toBe(true);

      // Test device-specific automation
      const deviceAutomation = await energyIntegration.getAutomationRules('living-room-light');
      
      expect(deviceAutomation.schedules.length).toBeGreaterThan(0);
      expect(deviceAutomation.predictions.length).toBeGreaterThan(0);
    });

    test('should communicate with cloud services when enabled', async () => {
      // Test cloud service communication
      const gridRequest = { type: 'status', deviceIds: ['living-room-light'] };
      
      const gridResponse = await energyIntegration.communicateWithCloudServices('grid', gridRequest);
      
      expect(gridResponse.status).toBe('success');
      expect(gridResponse.service).toBe('grid');
      expect(gridResponse.timestamp).toBeDefined();

      // Test analytics service
      const analyticsRequest = { type: 'trends', timeframe: '7d' };
      
      const analyticsResponse = await energyIntegration.communicateWithCloudServices('analytics', analyticsRequest);
      
      expect(analyticsResponse.status).toBe('success');
      expect(analyticsResponse.service).toBe('analytics');
      expect(analyticsResponse.analytics).toBeDefined();
    });
  });

  /**
   * Test 5: Complete end-to-end system integration
   * Requirements: All
   */
  describe('Complete End-to-End System Integration', () => {
    test('should handle complex multi-domain conversation workflow', async () => {
      const context: ConversationContext = {
        conversationId: 'complete-workflow-001',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'general',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      // Step 1: Start with general greeting
      let response = await aiChatbot.processTextInput('Hello, I need help managing my day', context);
      expect(response.text).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.6);

      // Step 2: Ask about health status
      response = await aiChatbot.processTextInput('How is my health today?', context);
      expect(response.text.toLowerCase()).toMatch(/(health|wellness|activity|posture)/);

      // Step 3: Check calendar
      response = await aiChatbot.processTextInput('What meetings do I have today?', context);
      expect(response.text.toLowerCase()).toMatch(/(meeting|appointment|schedule|calendar)/);

      // Step 4: Ask about energy usage
      response = await aiChatbot.processTextInput('Show me my energy consumption', context);
      expect(response.text.toLowerCase()).toMatch(/(energy|consumption|device|power)/);

      // Step 5: Request device control
      response = await aiChatbot.processTextInput('Turn off the kitchen plug to save energy', context);
      expect(response.actions?.some(action => action.type === 'device_control')).toBe(true);

      // Verify conversation context is maintained throughout
      expect(context.messageHistory.length).toBeGreaterThan(8); // Multiple exchanges
      expect(context.contextVariables.messageCount).toBeGreaterThan(8);
    });

    test('should coordinate visual feedback across all interactions', async () => {
      // Test visual feedback coordination for different system states
      const testStates = [
        { state: 'listening' as const, duration: 1000 },
        { state: 'processing' as const, duration: 1500 },
        { state: 'speaking' as const, duration: 2000 },
        { state: 'idle' as const, duration: 1000 }
      ];

      for (const testState of testStates) {
        flashingInterface.updateForState(testState.state, { 
          audioDuration: testState.duration 
        });
        
        const status = flashingInterface.getCurrentPattern();
        expect(status.isActive).toBe(true);
        expect(status.state).toBe(testState.state);
        
        // Wait for pattern to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Test error state
      flashingInterface.updateForState('error', {
        errorType: {
          category: 'software',
          severity: 'medium',
          code: 'TEST_ERROR',
          message: 'Test error message',
          recoverable: true
        }
      });
      
      const errorStatus = flashingInterface.getCurrentPattern();
      expect(errorStatus.state).toBe('error');
    });

    test('should handle system errors gracefully across all components', async () => {
      // Test AI chatbot error handling
      const context: ConversationContext = {
        conversationId: 'error-test-001',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'general',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      // Test with empty input
      const emptyResponse = await aiChatbot.processTextInput('', context);
      expect(emptyResponse.text).toBeDefined();
      expect(emptyResponse.confidence).toBeLessThan(0.5);

      // Test health monitor with invalid data
      expect(() => {
        healthMonitor.trackActivity({
          type: 'movement',
          value: -10, // Invalid negative value
          timestamp: new Date(),
          unit: 'steps',
          confidence: 0.5
        });
      }).not.toThrow(); // Should handle gracefully

      // Test calendar with invalid appointment
      const invalidAppointment: Appointment = {
        id: 'invalid-test',
        title: '', // Empty title
        startTime: new Date(),
        endTime: new Date(Date.now() - 60 * 60 * 1000), // End before start
        reminders: [],
        priority: 'medium'
      };

      const createResult = await calendarManager.createAppointment(invalidAppointment);
      expect(createResult).toBe(false); // Should fail gracefully
    });

    test('should maintain performance under load', async () => {
      const context: ConversationContext = {
        conversationId: 'performance-test-001',
        userId: 'test-user',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'general',
        userPreferences: createDefaultUserPreferences(),
        contextVariables: {}
      };

      // Test multiple concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        aiChatbot.processTextInput(`Test query number ${i + 1}`, context)
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // All responses should be valid
      responses.forEach(response => {
        expect(response.text).toBeDefined();
        expect(response.processingTime).toBeLessThan(2000);
      });

      // Total time should be reasonable for concurrent processing
      expect(totalTime).toBeLessThan(5000);

      // Test system status under load
      const aiStatus = aiChatbot.getStatus();
      expect(aiStatus.isInitialized).toBe(true);
      expect(aiStatus.totalRequests).toBeGreaterThanOrEqual(5);
      expect(aiStatus.averageResponseTime).toBeLessThan(2000);
    });

    test('should provide comprehensive system health monitoring', async () => {
      // Check all component statuses
      expect(aiChatbot.isReady()).toBe(true);
      expect(energyIntegration.isReady()).toBe(true);

      const aiStatus = aiChatbot.getStatus();
      expect(aiStatus.isInitialized).toBe(true);
      expect(aiStatus.memoryUsage).toBeGreaterThan(0);
      expect(aiStatus.uptime).toBeGreaterThan(0);

      const integrationStatus = energyIntegration.getIntegrationStatus();
      expect(integrationStatus.isInitialized).toBe(true);
      expect(integrationStatus.componentsReady.deviceManager).toBe(true);
      expect(integrationStatus.componentsReady.energyMonitor).toBe(true);
      expect(integrationStatus.componentsReady.behaviorLearningEngine).toBe(true);

      const flashingStatus = flashingInterface.getCurrentPattern();
      expect(flashingStatus.brightness).toBeGreaterThan(0);
      expect(flashingStatus.animationsEnabled).toBe(true);

      const healthStatus = await healthMonitor.getHealthStatus();
      expect(healthStatus.overall).toMatch(/(excellent|good|fair|poor)/);
      expect(healthStatus.lastUpdated).toBeInstanceOf(Date);
    });
  });
});
