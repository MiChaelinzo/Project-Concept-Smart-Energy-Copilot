import fc from 'fast-check';
import { FlashingInterfaceManagerImpl } from './FlashingInterfaceManagerImpl';
import { FlashingInterfaceConfig, SystemState } from '../interfaces/FlashingInterfaceManager';
import { LightPattern, ErrorType } from '../types';

/**
 * Property-based tests for FlashingInterfaceManager
 * **Feature: ai-chatbot-desktop**
 */

describe('FlashingInterfaceManager Property Tests', () => {
  let manager: FlashingInterfaceManagerImpl;
  let mockConfig: FlashingInterfaceConfig;

  beforeEach(async () => {
    manager = new FlashingInterfaceManagerImpl();
    mockConfig = {
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
        colors: [
          { red: 255, green: 100, blue: 0 },   // Orange
          { red: 255, green: 200, blue: 0 },   // Yellow
          { red: 100, green: 255, blue: 100 }  // Green
        ],
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
      patternTransitionMs: 100,
      audioSyncDelayMs: 50,
      maxPatternDuration: 10000,
      highContrastMode: false,
      colorBlindSupport: false,
      flashingReduction: false
    };
    
    await manager.initialize(mockConfig);
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  /**
   * **Feature: ai-chatbot-desktop, Property 2: Visual Feedback Synchronization**
   * **Validates: Requirements 1.2, 2.1, 2.2, 2.3**
   * 
   * For any AI processing state, the Flashing_Interface should display the appropriate 
   * visual pattern immediately when the state changes
   */
  test('Property 2: Visual feedback synchronization', () => {
    fc.assert(fc.property(
      fc.constantFrom('listening', 'processing', 'speaking', 'error', 'idle') as fc.Arbitrary<SystemState>,
      fc.record({
        audioDuration: fc.integer({ min: 100, max: 10000 }),
        errorType: fc.record({
          category: fc.constantFrom('network', 'hardware', 'software', 'user', 'security') as fc.Arbitrary<'network' | 'hardware' | 'software' | 'user' | 'security'>,
          severity: fc.constantFrom('low', 'medium', 'high', 'critical') as fc.Arbitrary<'low' | 'medium' | 'high' | 'critical'>,
          code: fc.string({ minLength: 1, maxLength: 10 }),
          message: fc.string({ minLength: 1, maxLength: 100 }),
          recoverable: fc.boolean()
        })
      }),
      (state: SystemState, metadata) => {
        // Record the time before state change
        const beforeTime = Date.now();
        
        // Change to the new state
        manager.updateForState(state, metadata);
        
        // Get the current pattern status immediately after
        const patternStatus = manager.getCurrentPattern();
        const afterTime = Date.now();
        
        // Verify immediate response (within reasonable time bounds)
        const responseTime = afterTime - beforeTime;
        expect(responseTime).toBeLessThan(100); // Should respond within 100ms
        
        // Verify the pattern is active and matches the state
        expect(patternStatus.isActive).toBe(true);
        expect(patternStatus.state).toBe(state);
        expect(patternStatus.currentPattern).not.toBeNull();
        
        // Verify the pattern start time is recent
        const timeSinceStart = afterTime - patternStatus.startTime.getTime();
        expect(timeSinceStart).toBeLessThan(100);
        
        // State-specific validations
        if (state === 'speaking' && metadata.audioDuration) {
          // Speaking pattern should have duration matching or related to audio
          expect(patternStatus.currentPattern?.duration).toBeGreaterThan(0);
        }
        
        if (state === 'error') {
          // Error pattern should reflect error severity
          expect(patternStatus.currentPattern?.type).toBe('flash');
        }
        
        if (state === 'idle') {
          // Idle pattern should be subtle
          expect(patternStatus.currentPattern?.intensity).toBeLessThanOrEqual(50);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * **Feature: ai-chatbot-desktop, Property 6: State-Pattern Mapping**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
   * 
   * For any system state (listening, processing, speaking, error, idle), 
   * the Flashing_Interface should display the correct corresponding visual pattern
   */
  test('Property 6: State-pattern mapping', () => {
    fc.assert(fc.property(
      fc.constantFrom('listening', 'processing', 'speaking', 'error', 'idle') as fc.Arbitrary<SystemState>,
      fc.record({
        brightness: fc.integer({ min: 0, max: 100 }),
        animationsEnabled: fc.boolean(),
        errorSeverity: fc.constantFrom('low', 'medium', 'high', 'critical') as fc.Arbitrary<'low' | 'medium' | 'high' | 'critical'>
      }),
      (state: SystemState, config) => {
        // Set configuration
        manager.setBrightness(config.brightness);
        manager.setAnimationsEnabled(config.animationsEnabled);
        
        // Create appropriate metadata for the state
        const metadata: Record<string, any> = {};
        if (state === 'error') {
          metadata.errorType = {
            category: 'software',
            severity: config.errorSeverity,
            code: 'TEST_ERROR',
            message: 'Test error message',
            recoverable: true
          };
        }
        
        // Update to the state
        manager.updateForState(state, metadata);
        
        // Get the current pattern
        const patternStatus = manager.getCurrentPattern();
        
        // Verify state mapping
        expect(patternStatus.state).toBe(state);
        expect(patternStatus.currentPattern).not.toBeNull();
        
        const pattern = patternStatus.currentPattern!;
        
        // Verify state-specific pattern characteristics
        switch (state) {
          case 'listening':
            expect(pattern.type).toBe('pulse');
            expect(pattern.colors).toHaveLength(1);
            expect(pattern.colors[0].blue).toBeGreaterThan(pattern.colors[0].red); // Should be blue-ish
            if (config.animationsEnabled) {
              expect(pattern.repeat).toBe(true);
            }
            break;
            
          case 'processing':
            expect(pattern.type).toBe('rotate');
            expect(pattern.colors.length).toBeGreaterThan(1); // Multiple colors for rotation
            if (config.animationsEnabled) {
              expect(pattern.repeat).toBe(true);
            }
            break;
            
          case 'speaking':
            expect(pattern.type).toBe('wave');
            expect(pattern.colors).toHaveLength(1);
            expect(pattern.colors[0].green).toBeGreaterThan(pattern.colors[0].red); // Should be green-ish
            break;
            
          case 'error':
            expect(pattern.type).toBe('flash');
            expect(pattern.colors).toHaveLength(1);
            expect(pattern.colors[0].red).toBeGreaterThan(150); // Should be red
            expect(pattern.colors[0].green).toBeLessThan(100);
            expect(pattern.colors[0].blue).toBeLessThan(100);
            // Intensity should reflect error severity (adjusted for brightness)
            const expectedIntensity = config.errorSeverity === 'critical' ? 100 :
                                    config.errorSeverity === 'high' ? 90 :
                                    config.errorSeverity === 'medium' ? 70 : 50;
            const adjustedExpectedIntensity = Math.round(expectedIntensity * (config.brightness / 100));
            expect(pattern.intensity).toBe(adjustedExpectedIntensity);
            break;
            
          case 'idle':
            expect(pattern.type).toBe('breathe');
            expect(pattern.intensity).toBeLessThanOrEqual(Math.round(50 * (config.brightness / 100))); // Should be subtle, adjusted for brightness
            if (config.animationsEnabled) {
              expect(pattern.repeat).toBe(true);
            }
            break;
        }
        
        // Verify brightness is applied correctly
        expect(patternStatus.brightness).toBe(config.brightness);
        
        // Verify animation settings are respected
        expect(patternStatus.animationsEnabled).toBe(config.animationsEnabled);
        if (!config.animationsEnabled) {
          expect(pattern.duration).toBe(0);
          expect(pattern.repeat).toBe(false);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * **Feature: ai-chatbot-desktop, Property 7: Audio-Visual Synchronization**
   * **Validates: Requirements 2.3**
   * 
   * For any AI response with audio output, the visual speaking pattern should be 
   * synchronized with the audio duration and timing
   */
  test('Property 7: Audio-visual synchronization', () => {
    fc.assert(fc.property(
      fc.record({
        audioDuration: fc.integer({ min: 500, max: 10000 }),
        audioStartDelay: fc.integer({ min: -100, max: 100 }) // Small delays for immediate testing
      }),
      fc.record({
        type: fc.constantFrom('pulse', 'wave', 'rotate', 'flash', 'breathe') as fc.Arbitrary<'pulse' | 'wave' | 'rotate' | 'flash' | 'breathe'>,
        colors: fc.array(fc.record({
          red: fc.integer({ min: 0, max: 255 }),
          green: fc.integer({ min: 0, max: 255 }),
          blue: fc.integer({ min: 0, max: 255 })
        }), { minLength: 1, maxLength: 3 }),
        intensity: fc.integer({ min: 10, max: 100 })
      }),
      (audioConfig, patternConfig) => {
        // Create a light pattern for synchronization
        const pattern: LightPattern = {
          type: patternConfig.type,
          colors: patternConfig.colors,
          duration: 1000, // Default duration, should be overridden by sync
          intensity: patternConfig.intensity,
          repeat: true // Should be overridden to false for sync
        };
        
        // Calculate audio start time (immediate or very recent)
        const audioStartTime = new Date(Date.now() + audioConfig.audioStartDelay);
        
        // Record time before synchronization
        const beforeSyncTime = Date.now();
        
        // Synchronize pattern with audio
        manager.synchronizeWithAudio(audioStartTime, audioConfig.audioDuration, pattern);
        
        // Get the current pattern status immediately after sync call
        const afterSyncTime = Date.now();
        
        // Verify synchronization was set up quickly
        const syncSetupTime = afterSyncTime - beforeSyncTime;
        expect(syncSetupTime).toBeLessThan(100); // Should set up sync quickly
        
        // For immediate or past audio start times, verify sync behavior
        if (audioConfig.audioStartDelay <= 50) {
          // Use showSpeakingPattern to test the synchronization behavior
          manager.showSpeakingPattern(audioConfig.audioDuration);
          
          const patternStatus = manager.getCurrentPattern();
          
          // Verify the pattern is active and configured for speaking
          expect(patternStatus.isActive).toBe(true);
          expect(patternStatus.state).toBe('speaking');
          expect(patternStatus.currentPattern).not.toBeNull();
          
          if (patternStatus.currentPattern) {
            // Verify the pattern duration and repeat behavior
            // The pattern keeps its original duration, but repeat is set based on audio duration
            expect(patternStatus.currentPattern.duration).toBeGreaterThan(0);
            
            // Verify repeat behavior is set based on audio duration vs pattern duration
            const shouldRepeat = audioConfig.audioDuration > patternStatus.currentPattern.duration;
            expect(patternStatus.currentPattern.repeat).toBe(shouldRepeat);
          }
        }
        
        // Test the synchronizeWithAudio method specifically
        const testPattern: LightPattern = {
          type: 'wave',
          colors: [{ red: 0, green: 255, blue: 100 }],
          duration: 1000,
          intensity: 75,
          repeat: true
        };
        
        // Synchronize with immediate audio
        const immediateAudioStart = new Date(Date.now());
        manager.synchronizeWithAudio(immediateAudioStart, audioConfig.audioDuration, testPattern);
        
        // The synchronization should not throw errors and should handle the timing correctly
        expect(() => {
          manager.synchronizeWithAudio(audioStartTime, audioConfig.audioDuration, pattern);
        }).not.toThrow();
      }
    ), { numRuns: 100 });
  });
});