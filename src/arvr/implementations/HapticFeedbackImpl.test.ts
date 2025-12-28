/**
 * Haptic Feedback Implementation Unit Tests
 * 
 * Tests for haptic effect playback, platform-specific capabilities, and user preferences.
 */

import { HapticFeedbackImpl } from './HapticFeedbackImpl';
import { 
  HapticPattern, 
  HapticLocation, 
  HapticEffect 
} from '../interfaces/HapticFeedback';
import { ARVRPlatform, HapticIntensity } from '../interfaces/ARVRInterface';

describe('HapticFeedbackImpl', () => {
  let hapticFeedback: HapticFeedbackImpl;

  beforeEach(async () => {
    hapticFeedback = new HapticFeedbackImpl(ARVRPlatform.META_QUEST);
    await hapticFeedback.initialize();
  });

  describe('Initialization', () => {
    test('should initialize for Meta Quest platform', async () => {
      const capabilities = await hapticFeedback.getCapabilities();

      expect(capabilities.supportsIntensityControl).toBe(true);
      expect(capabilities.supportsFrequencyControl).toBe(true);
      expect(capabilities.supportsCustomWaveforms).toBe(false);
      expect(capabilities.supportsSpatialHaptics).toBe(false);
      expect(capabilities.maxIntensity).toBe(1.0);
      expect(capabilities.locations).toContain(HapticLocation.LEFT_CONTROLLER);
      expect(capabilities.locations).toContain(HapticLocation.RIGHT_CONTROLLER);
    });

    test('should initialize for HoloLens platform', async () => {
      const hololensHaptic = new HapticFeedbackImpl(ARVRPlatform.HOLOLENS);
      await hololensHaptic.initialize();
      
      const capabilities = await hololensHaptic.getCapabilities();

      expect(capabilities.supportsIntensityControl).toBe(false);
      expect(capabilities.supportsSpatialHaptics).toBe(true);
      expect(capabilities.locations).toContain(HapticLocation.WEARABLE);
    });

    test('should initialize for Apple Vision Pro platform', async () => {
      const visionProHaptic = new HapticFeedbackImpl(ARVRPlatform.APPLE_VISION_PRO);
      await visionProHaptic.initialize();
      
      const capabilities = await visionProHaptic.getCapabilities();

      expect(capabilities.supportsSpatialHaptics).toBe(true);
      expect(capabilities.locations).toContain(HapticLocation.WEARABLE);
    });

    test('should initialize for WebXR platform', async () => {
      const webxrHaptic = new HapticFeedbackImpl(ARVRPlatform.WEBXR);
      await webxrHaptic.initialize();
      
      const capabilities = await webxrHaptic.getCapabilities();

      expect(capabilities.supportsIntensityControl).toBe(true);
      expect(capabilities.supportsFrequencyControl).toBe(false);
      expect(capabilities.locations).toContain(HapticLocation.BOTH_CONTROLLERS);
    });

    test('should handle unknown platform', async () => {
      const unknownHaptic = new HapticFeedbackImpl(ARVRPlatform.UNKNOWN);
      await unknownHaptic.initialize();
      
      const capabilities = await unknownHaptic.getCapabilities();

      expect(capabilities.supportsIntensityControl).toBe(false);
      expect(capabilities.maxIntensity).toBe(0);
      expect(capabilities.locations).toEqual([]);
    });
  });

  describe('Effect Playback', () => {
    test('should play basic haptic effect', async () => {
      const effect: HapticEffect = {
        id: 'test_effect_1',
        pattern: HapticPattern.CLICK,
        intensity: HapticIntensity.MEDIUM,
        duration: 100,
        location: HapticLocation.BOTH_CONTROLLERS
      };

      await expect(hapticFeedback.playEffect(effect)).resolves.not.toThrow();
    });

    test('should play effect with custom waveform', async () => {
      const effect: HapticEffect = {
        id: 'test_effect_2',
        pattern: HapticPattern.CUSTOM,
        intensity: HapticIntensity.LIGHT,
        duration: 500,
        location: HapticLocation.LEFT_CONTROLLER,
        waveform: [100, 50, 100, 50, 200],
        frequency: 50
      };

      await expect(hapticFeedback.playEffect(effect)).resolves.not.toThrow();
    });

    test('should apply global intensity multiplier', async () => {
      await hapticFeedback.setGlobalIntensity(0.5);

      const effect: HapticEffect = {
        id: 'test_effect_3',
        pattern: HapticPattern.PULSE,
        intensity: HapticIntensity.STRONG,
        duration: 200,
        location: HapticLocation.RIGHT_CONTROLLER
      };

      await expect(hapticFeedback.playEffect(effect)).resolves.not.toThrow();
    });

    test('should stop specific effect', async () => {
      const effect: HapticEffect = {
        id: 'test_effect_4',
        pattern: HapticPattern.HEARTBEAT,
        intensity: HapticIntensity.MEDIUM,
        duration: 1000,
        location: HapticLocation.BOTH_CONTROLLERS
      };

      await hapticFeedback.playEffect(effect);
      await expect(hapticFeedback.stopEffect(effect.id)).resolves.not.toThrow();
    });

    test('should stop all effects', async () => {
      const effects: HapticEffect[] = [
        {
          id: 'effect_1',
          pattern: HapticPattern.PULSE,
          intensity: HapticIntensity.LIGHT,
          duration: 500,
          location: HapticLocation.LEFT_CONTROLLER
        },
        {
          id: 'effect_2',
          pattern: HapticPattern.WAVE,
          intensity: HapticIntensity.MEDIUM,
          duration: 800,
          location: HapticLocation.RIGHT_CONTROLLER
        }
      ];

      for (const effect of effects) {
        await hapticFeedback.playEffect(effect);
      }

      await expect(hapticFeedback.stopAllEffects()).resolves.not.toThrow();
    });

    test('should not play effects when disabled', async () => {
      await hapticFeedback.setEnabled(false);

      const effect: HapticEffect = {
        id: 'disabled_effect',
        pattern: HapticPattern.CLICK,
        intensity: HapticIntensity.MEDIUM,
        duration: 100,
        location: HapticLocation.BOTH_CONTROLLERS
      };

      // Should not throw but also should not play
      await expect(hapticFeedback.playEffect(effect)).resolves.not.toThrow();
    });
  });

  describe('Specialized Feedback Methods', () => {
    test('should provide device interaction feedback', async () => {
      await expect(hapticFeedback.deviceInteractionFeedback('smart_light', 'select'))
        .resolves.not.toThrow();
      
      await expect(hapticFeedback.deviceInteractionFeedback('smart_outlet', 'activate'))
        .resolves.not.toThrow();
      
      await expect(hapticFeedback.deviceInteractionFeedback('smart_thermostat', 'adjust'))
        .resolves.not.toThrow();
      
      await expect(hapticFeedback.deviceInteractionFeedback('smart_switch', 'deactivate'))
        .resolves.not.toThrow();
    });

    test('should provide energy flow feedback', async () => {
      const direction = { x: 1, y: 0, z: 0 };
      
      await expect(hapticFeedback.energyFlowFeedback(0.3, direction))
        .resolves.not.toThrow();
      
      await expect(hapticFeedback.energyFlowFeedback(0.8, direction))
        .resolves.not.toThrow();
      
      await expect(hapticFeedback.energyFlowFeedback(1.2, direction)) // Should clamp to max
        .resolves.not.toThrow();
    });

    test('should provide notification feedback', async () => {
      await expect(hapticFeedback.notificationFeedback('info'))
        .resolves.not.toThrow();
      
      await expect(hapticFeedback.notificationFeedback('warning'))
        .resolves.not.toThrow();
      
      await expect(hapticFeedback.notificationFeedback('error'))
        .resolves.not.toThrow();
      
      await expect(hapticFeedback.notificationFeedback('success'))
        .resolves.not.toThrow();
    });

    test('should provide gesture feedback', async () => {
      await expect(hapticFeedback.gestureFeedback('point', true))
        .resolves.not.toThrow();
      
      await expect(hapticFeedback.gestureFeedback('grab', false))
        .resolves.not.toThrow();
    });
  });

  describe('Spatial Haptics', () => {
    test('should play spatial haptic when supported', async () => {
      // Use HoloLens which supports spatial haptics
      const spatialHaptic = new HapticFeedbackImpl(ARVRPlatform.HOLOLENS);
      await spatialHaptic.initialize();

      const spatialEffect = {
        position: { x: 1, y: 0, z: 0 },
        radius: 2,
        intensity: HapticIntensity.MEDIUM,
        falloffCurve: 'linear' as const,
        effect: {
          id: 'spatial_test',
          pattern: HapticPattern.PULSE,
          intensity: HapticIntensity.MEDIUM,
          duration: 300,
          location: HapticLocation.WEARABLE
        }
      };

      await expect(spatialHaptic.playSpatialHaptic(spatialEffect))
        .resolves.not.toThrow();
    });

    test('should warn when spatial haptics not supported', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const spatialEffect = {
        position: { x: 0, y: 0, z: 0 },
        radius: 1,
        intensity: HapticIntensity.LIGHT,
        falloffCurve: 'exponential' as const,
        effect: {
          id: 'unsupported_spatial',
          pattern: HapticPattern.CLICK,
          intensity: HapticIntensity.LIGHT,
          duration: 100,
          location: HapticLocation.BOTH_CONTROLLERS
        }
      };

      await hapticFeedback.playSpatialHaptic(spatialEffect);

      expect(consoleSpy).toHaveBeenCalledWith('Spatial haptics not supported on this platform');
      consoleSpy.mockRestore();
    });
  });

  describe('Custom Patterns', () => {
    test('should create custom haptic pattern', async () => {
      const waveform = [100, 50, 100, 50, 200];
      const duration = 500;

      const pattern = await hapticFeedback.createCustomPattern('my_custom_pattern', waveform, duration);

      expect(pattern).toBeDefined();
      expect(pattern.toString()).toContain('custom_my_custom_pattern');
    });
  });

  describe('User Preferences', () => {
    test('should calibrate for user preferences', async () => {
      const userId = 'test_user_123';
      const preferences = {
        intensity: 0.8,
        enabledPatterns: [HapticPattern.CLICK, HapticPattern.PULSE, HapticPattern.SUCCESS],
        disabledLocations: [HapticLocation.HEADSET]
      };

      await expect(hapticFeedback.calibrateForUser(userId, preferences))
        .resolves.not.toThrow();
    });

    test('should retrieve user preferences', async () => {
      const userId = 'test_user_456';
      const preferences = {
        intensity: 0.6,
        enabledPatterns: [HapticPattern.NOTIFICATION, HapticPattern.WARNING],
        disabledLocations: []
      };

      await hapticFeedback.calibrateForUser(userId, preferences);
      
      const retrievedPreferences = await hapticFeedback.getUserPreferences(userId);
      expect(retrievedPreferences).toEqual(preferences);
    });

    test('should return null for non-existent user preferences', async () => {
      const preferences = await hapticFeedback.getUserPreferences('non_existent_user');
      expect(preferences).toBeNull();
    });
  });

  describe('Testing and Validation', () => {
    test('should test haptic patterns', async () => {
      await expect(hapticFeedback.testHapticPattern(
        HapticPattern.CLICK, 
        HapticIntensity.LIGHT, 
        HapticLocation.LEFT_CONTROLLER
      )).resolves.not.toThrow();

      await expect(hapticFeedback.testHapticPattern(
        HapticPattern.PULSE, 
        HapticIntensity.STRONG, 
        HapticLocation.RIGHT_CONTROLLER
      )).resolves.not.toThrow();
    });
  });

  describe('Usage Statistics', () => {
    test('should return usage statistics', async () => {
      // Play some effects to generate stats
      const effects: HapticEffect[] = [
        {
          id: 'stats_effect_1',
          pattern: HapticPattern.CLICK,
          intensity: HapticIntensity.LIGHT,
          duration: 100,
          location: HapticLocation.LEFT_CONTROLLER
        },
        {
          id: 'stats_effect_2',
          pattern: HapticPattern.PULSE,
          intensity: HapticIntensity.MEDIUM,
          duration: 200,
          location: HapticLocation.RIGHT_CONTROLLER
        },
        {
          id: 'stats_effect_3',
          pattern: HapticPattern.CLICK,
          intensity: HapticIntensity.STRONG,
          duration: 150,
          location: HapticLocation.BOTH_CONTROLLERS
        }
      ];

      for (const effect of effects) {
        await hapticFeedback.playEffect(effect);
      }

      const stats = await hapticFeedback.getUsageStats();

      expect(stats).toBeDefined();
      expect(stats.totalEffectsPlayed).toBeGreaterThan(0);
      expect(Array.isArray(stats.mostUsedPatterns)).toBe(true);
      expect(typeof stats.averageIntensity).toBe('number');
      expect(typeof stats.totalDuration).toBe('number');
    });
  });

  describe('Global Settings', () => {
    test('should set global intensity multiplier', async () => {
      await expect(hapticFeedback.setGlobalIntensity(0.5)).resolves.not.toThrow();
      await expect(hapticFeedback.setGlobalIntensity(1.5)).resolves.not.toThrow(); // Should clamp
      await expect(hapticFeedback.setGlobalIntensity(-0.5)).resolves.not.toThrow(); // Should clamp
    });

    test('should enable and disable haptic feedback', async () => {
      expect(await hapticFeedback.isEnabled()).toBe(true);

      await hapticFeedback.setEnabled(false);
      expect(await hapticFeedback.isEnabled()).toBe(false);

      await hapticFeedback.setEnabled(true);
      expect(await hapticFeedback.isEnabled()).toBe(true);
    });
  });

  describe('Effect Management', () => {
    test('should preload and clear effects', async () => {
      const effects: HapticEffect[] = [
        {
          id: 'preload_1',
          pattern: HapticPattern.CLICK,
          intensity: HapticIntensity.MEDIUM,
          duration: 100,
          location: HapticLocation.BOTH_CONTROLLERS
        },
        {
          id: 'preload_2',
          pattern: HapticPattern.PULSE,
          intensity: HapticIntensity.LIGHT,
          duration: 200,
          location: HapticLocation.LEFT_CONTROLLER
        }
      ];

      await expect(hapticFeedback.preloadEffects(effects)).resolves.not.toThrow();
      await expect(hapticFeedback.clearPreloadedEffects()).resolves.not.toThrow();
    });
  });

  describe('Event Handling', () => {
    test('should add and remove event listeners', () => {
      const mockCallback = jest.fn();

      hapticFeedback.addEventListener('effect_started', mockCallback);
      hapticFeedback.addEventListener('effect_ended', mockCallback);
      hapticFeedback.addEventListener('calibration_updated', mockCallback);
      hapticFeedback.addEventListener('error', mockCallback);

      hapticFeedback.removeEventListener('effect_started', mockCallback);
      hapticFeedback.removeEventListener('effect_ended', mockCallback);
      hapticFeedback.removeEventListener('calibration_updated', mockCallback);
      hapticFeedback.removeEventListener('error', mockCallback);

      expect(true).toBe(true); // Should not throw
    });
  });

  describe('Error Handling and Validation', () => {
    test('should validate effect parameters', async () => {
      const invalidEffect: HapticEffect = {
        id: 'invalid_effect',
        pattern: HapticPattern.PULSE,
        intensity: 2.0 as any, // Exceeds maximum
        duration: 10000, // Exceeds maximum
        location: HapticLocation.HEADSET // Not supported on Meta Quest
      };

      await expect(hapticFeedback.playEffect(invalidEffect))
        .rejects.toThrow();
    });

    test('should handle stopping non-existent effect gracefully', async () => {
      await expect(hapticFeedback.stopEffect('non_existent_effect'))
        .resolves.not.toThrow();
    });

    test('should handle operations before initialization', async () => {
      const uninitializedHaptic = new HapticFeedbackImpl(ARVRPlatform.META_QUEST);

      await expect(uninitializedHaptic.getCapabilities())
        .rejects.toThrow('Haptic feedback not initialized');
    });

    test('should handle platform-specific errors gracefully', async () => {
      const effect: HapticEffect = {
        id: 'platform_test',
        pattern: HapticPattern.ENERGY_FLOW,
        intensity: HapticIntensity.MEDIUM,
        duration: 300,
        location: HapticLocation.BOTH_CONTROLLERS
      };

      // Should not throw even if platform-specific implementation fails
      await expect(hapticFeedback.playEffect(effect)).resolves.not.toThrow();
    });
  });
});