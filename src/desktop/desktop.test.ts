/**
 * Basic tests for AI Chatbot Desktop Device module setup
 */

// Interfaces are imported for type checking only

import {
  AIChatbotEngineImpl,
  FlashingInterfaceManagerImpl,
  HealthMonitorIntegrationImpl,
  CalendarManagerImpl,
  MultiModalInterfaceControllerImpl
} from './implementations';

import { DesktopTypes } from './index';

describe('AI Chatbot Desktop Device Module', () => {
  describe('Module Structure', () => {
    test('should have proper module structure', () => {
      // Test that the module exports are available
      expect(AIChatbotEngineImpl).toBeDefined();
      expect(FlashingInterfaceManagerImpl).toBeDefined();
      expect(HealthMonitorIntegrationImpl).toBeDefined();
      expect(CalendarManagerImpl).toBeDefined();
      expect(MultiModalInterfaceControllerImpl).toBeDefined();
    });
  });

  describe('Implementations', () => {
    test('should export AIChatbotEngineImpl class', () => {
      expect(typeof AIChatbotEngineImpl).toBe('function');
      expect(new AIChatbotEngineImpl()).toBeInstanceOf(AIChatbotEngineImpl);
    });

    test('should export FlashingInterfaceManagerImpl class', () => {
      expect(typeof FlashingInterfaceManagerImpl).toBe('function');
      expect(new FlashingInterfaceManagerImpl()).toBeInstanceOf(FlashingInterfaceManagerImpl);
    });

    test('should export HealthMonitorIntegrationImpl class', () => {
      expect(typeof HealthMonitorIntegrationImpl).toBe('function');
      expect(new HealthMonitorIntegrationImpl()).toBeInstanceOf(HealthMonitorIntegrationImpl);
    });

    test('should export CalendarManagerImpl class', () => {
      expect(typeof CalendarManagerImpl).toBe('function');
      expect(new CalendarManagerImpl()).toBeInstanceOf(CalendarManagerImpl);
    });

    test('should export MultiModalInterfaceControllerImpl class', () => {
      expect(typeof MultiModalInterfaceControllerImpl).toBe('function');
      expect(new MultiModalInterfaceControllerImpl()).toBeInstanceOf(MultiModalInterfaceControllerImpl);
    });
  });

  describe('Types', () => {
    test('should export DesktopTypes namespace', () => {
      expect(typeof DesktopTypes).toBe('object');
    });

    test('should have AudioBuffer type available', () => {
      const audioBuffer: DesktopTypes.AudioBuffer = {
        data: new Float32Array([1, 2, 3]),
        sampleRate: 44100,
        duration: 1000
      };
      expect(audioBuffer.data).toBeInstanceOf(Float32Array);
      expect(audioBuffer.sampleRate).toBe(44100);
      expect(audioBuffer.duration).toBe(1000);
    });

    test('should have ConversationContext type available', () => {
      const context: DesktopTypes.ConversationContext = {
        conversationId: 'test-123',
        userId: 'user-456',
        sessionStart: new Date(),
        messageHistory: [],
        currentTopic: 'test',
        userPreferences: {
          language: 'en',
          voiceSettings: {
            preferredVoice: 'default',
            speechRate: 1.0,
            volume: 0.8,
            wakeWordEnabled: true
          },
          visualSettings: {
            brightness: 80,
            colorScheme: 'auto',
            animationSpeed: 'normal',
            reducedMotion: false
          },
          healthSettings: {
            movementReminderInterval: 60,
            hydrationReminderInterval: 120,
            preferredExercises: ['walking'],
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
      expect(context.conversationId).toBe('test-123');
      expect(context.userId).toBe('user-456');
    });

    test('should have LightPattern type available', () => {
      const pattern: DesktopTypes.LightPattern = {
        type: 'pulse',
        colors: [{ red: 255, green: 0, blue: 0 }],
        duration: 1000,
        intensity: 80,
        repeat: true
      };
      expect(pattern.type).toBe('pulse');
      expect(pattern.colors).toHaveLength(1);
      expect(pattern.duration).toBe(1000);
    });
  });

  describe('Implementation Instantiation', () => {
    test('should be able to create instances of all implementations', () => {
      const aiEngine = new AIChatbotEngineImpl();
      const flashingInterface = new FlashingInterfaceManagerImpl();
      const healthMonitor = new HealthMonitorIntegrationImpl();
      const calendarManager = new CalendarManagerImpl();
      const multiModalController = new MultiModalInterfaceControllerImpl();

      expect(aiEngine).toBeDefined();
      expect(flashingInterface).toBeDefined();
      expect(healthMonitor).toBeDefined();
      expect(calendarManager).toBeDefined();
      expect(multiModalController).toBeDefined();
    });

    test('should have isReady method on AIChatbotEngineImpl', () => {
      const aiEngine = new AIChatbotEngineImpl();
      expect(typeof aiEngine.isReady).toBe('function');
      expect(aiEngine.isReady()).toBe(false); // Should be false before initialization
    });
  });
});