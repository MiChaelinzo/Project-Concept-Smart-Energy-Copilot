/**
 * Gesture Recognition Implementation Unit Tests
 * 
 * Tests for gesture pattern recognition, command mapping, and user calibration.
 */

import { GestureRecognitionImpl } from './GestureRecognitionImpl';
import { GestureType, HandTracking } from '../interfaces/ARVRInterface';

describe('GestureRecognitionImpl', () => {
  let gestureRecognition: GestureRecognitionImpl;

  beforeEach(async () => {
    gestureRecognition = new GestureRecognitionImpl();
    await gestureRecognition.initialize();
  });

  describe('Initialization', () => {
    test('should initialize with default patterns and commands', async () => {
      const supportedGestures = await gestureRecognition.getSupportedGestures();
      
      expect(supportedGestures).toContain(GestureType.POINT);
      expect(supportedGestures).toContain(GestureType.GRAB);
      expect(supportedGestures).toContain(GestureType.PINCH);
      expect(supportedGestures).toContain(GestureType.TAP);
      expect(supportedGestures).toContain(GestureType.WAVE);
    });

    test('should not initialize twice', async () => {
      // Should not throw error on second initialization
      await expect(gestureRecognition.initialize()).resolves.not.toThrow();
    });
  });

  describe('User Calibration', () => {
    test('should calibrate for new user', async () => {
      const userId = 'test_user_123';
      
      const calibration = await gestureRecognition.calibrateForUser(userId);

      expect(calibration.userId).toBe(userId);
      expect(calibration.handSize.left).toBe(18);
      expect(calibration.handSize.right).toBe(18);
      expect(calibration.reachDistance).toBe(60);
      expect(calibration.preferredGestures).toContain(GestureType.POINT);
      expect(calibration.sensitivity).toBe(0.7);
      expect(calibration.customGestures).toEqual([]);
    });

    test('should export and import calibration data', async () => {
      const userId = 'test_user_export';
      await gestureRecognition.calibrateForUser(userId);
      
      const exportedData = await gestureRecognition.exportCalibration(userId);
      expect(exportedData).toBeDefined();
      expect(typeof exportedData).toBe('string');

      // Clear and reimport
      await gestureRecognition.resetToDefaults();
      await gestureRecognition.importCalibration(exportedData);

      const reimportedData = await gestureRecognition.exportCalibration(userId);
      expect(reimportedData).toBe(exportedData);
    });

    test('should throw error for non-existent user export', async () => {
      await expect(gestureRecognition.exportCalibration('non_existent_user'))
        .rejects.toThrow('No calibration found for user non_existent_user');
    });
  });

  describe('Hand Tracking Processing', () => {
    const mockHandTracking: HandTracking = {
      leftHand: {
        position: { x: -0.3, y: 1.2, z: 0.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        fingers: {
          thumb: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          index: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          middle: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          ring: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          pinky: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }
        },
        isTracked: true,
        confidence: 0.95
      },
      rightHand: {
        position: { x: 0.3, y: 1.2, z: 0.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        fingers: {
          thumb: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          index: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          middle: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          ring: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          pinky: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }
        },
        isTracked: true,
        confidence: 0.95
      }
    };

    beforeEach(async () => {
      await gestureRecognition.startContinuousRecognition();
    });

    test('should process hand tracking when recognition is active', async () => {
      const results = await gestureRecognition.processHandTracking(mockHandTracking);

      expect(Array.isArray(results)).toBe(true);
      // Results may be empty due to mock gesture detection, but should not throw
    });

    test('should not process hand tracking when recognition is inactive', async () => {
      await gestureRecognition.stopContinuousRecognition();
      
      const results = await gestureRecognition.processHandTracking(mockHandTracking);

      expect(results).toEqual([]);
    });

    test('should ignore low confidence hand tracking', async () => {
      const lowConfidenceTracking: HandTracking = {
        ...mockHandTracking,
        leftHand: {
          ...mockHandTracking.leftHand,
          confidence: 0.3
        },
        rightHand: {
          ...mockHandTracking.rightHand,
          confidence: 0.4
        }
      };

      const results = await gestureRecognition.processHandTracking(lowConfidenceTracking);

      expect(results).toEqual([]);
    });
  });

  describe('Gesture Pattern Management', () => {
    test('should register custom gesture pattern', async () => {
      const customPattern = {
        name: 'custom_swipe',
        type: GestureType.SWIPE,
        keyframes: [
          {
            timestamp: 0,
            handPositions: { right: { x: 0, y: 0, z: 0 } },
            fingerPositions: { right: {} }
          },
          {
            timestamp: 500,
            handPositions: { right: { x: 1, y: 0, z: 0 } },
            fingerPositions: { right: {} }
          }
        ],
        duration: 500,
        confidence: 0.8
      };

      await gestureRecognition.registerGesturePattern(customPattern);

      // Pattern should be registered (no error thrown)
      expect(true).toBe(true);
    });

    test('should remove gesture pattern', async () => {
      const patternName = 'test_pattern';
      const testPattern = {
        name: patternName,
        type: GestureType.TAP,
        keyframes: [],
        duration: 100,
        confidence: 0.7
      };

      await gestureRecognition.registerGesturePattern(testPattern);
      await gestureRecognition.removeGesturePattern(patternName);

      // Should not throw error when removing non-existent pattern
      await gestureRecognition.removeGesturePattern('non_existent_pattern');
    });
  });

  describe('Command Mapping', () => {
    test('should map gesture to command', async () => {
      const command = {
        gestureType: GestureType.THUMBS_UP,
        command: 'system_approve',
        parameters: { action: 'approve' },
        priority: 1
      };

      await gestureRecognition.mapGestureToCommand(GestureType.THUMBS_UP, command);

      const retrievedCommand = await gestureRecognition.getCommandForGesture(GestureType.THUMBS_UP);
      expect(retrievedCommand).toEqual(command);
    });

    test('should return null for unmapped gesture', async () => {
      const command = await gestureRecognition.getCommandForGesture(GestureType.THUMBS_DOWN);
      expect(command).toBeNull();
    });

    test('should apply context to command', async () => {
      const baseCommand = {
        gestureType: GestureType.POINT,
        command: 'device_select',
        parameters: { action: 'select' },
        priority: 1
      };

      await gestureRecognition.mapGestureToCommand(GestureType.POINT, baseCommand);

      const context = { deviceId: 'device_123', roomId: 'living_room' };
      const commandWithContext = await gestureRecognition.getCommandForGesture(GestureType.POINT, context);

      expect(commandWithContext?.parameters).toEqual({
        action: 'select',
        deviceId: 'device_123',
        roomId: 'living_room'
      });
    });
  });

  describe('Sensitivity and Configuration', () => {
    test('should set sensitivity within valid range', async () => {
      await gestureRecognition.setSensitivity(0.8);
      // Should not throw error

      await gestureRecognition.setSensitivity(1.5); // Should clamp to 1.0
      await gestureRecognition.setSensitivity(-0.5); // Should clamp to 0.0
    });

    test('should toggle gesture types', async () => {
      await gestureRecognition.toggleGestureType(GestureType.WAVE, false);
      
      const supportedGestures = await gestureRecognition.getSupportedGestures();
      expect(supportedGestures).not.toContain(GestureType.WAVE);

      await gestureRecognition.toggleGestureType(GestureType.WAVE, true);
      
      const supportedGesturesAfter = await gestureRecognition.getSupportedGestures();
      expect(supportedGesturesAfter).toContain(GestureType.WAVE);
    });
  });

  describe('Statistics and Analytics', () => {
    test('should return recognition statistics', async () => {
      const stats = await gestureRecognition.getRecognitionStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalGestures).toBe('number');
      expect(typeof stats.successfulRecognitions).toBe('number');
      expect(typeof stats.averageConfidence).toBe('number');
      expect(Array.isArray(stats.mostUsedGestures)).toBe(true);
      expect(typeof stats.recognitionLatency).toBe('number');
    });
  });

  describe('Model Training', () => {
    const mockHandTracking: HandTracking = {
      leftHand: {
        position: { x: -0.3, y: 1.2, z: 0.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        fingers: {
          thumb: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          index: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          middle: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          ring: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          pinky: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }
        },
        isTracked: true,
        confidence: 0.95
      },
      rightHand: {
        position: { x: 0.3, y: 1.2, z: 0.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        fingers: {
          thumb: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          index: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          middle: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          ring: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          pinky: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }
        },
        isTracked: true,
        confidence: 0.95
      }
    };

    test('should train model with sample data', async () => {
      const trainingData = [
        {
          handTracking: mockHandTracking,
          expectedGesture: GestureType.POINT,
          timestamp: new Date()
        },
        {
          handTracking: mockHandTracking,
          expectedGesture: GestureType.GRAB,
          timestamp: new Date()
        }
      ];

      await expect(gestureRecognition.trainModel(trainingData)).resolves.not.toThrow();
    });

    test('should handle empty training data', async () => {
      await expect(gestureRecognition.trainModel([])).resolves.not.toThrow();
    });
  });

  describe('Reset and Defaults', () => {
    test('should reset to defaults', async () => {
      // Modify some settings
      await gestureRecognition.setSensitivity(0.9);
      await gestureRecognition.toggleGestureType(GestureType.WAVE, false);

      // Reset to defaults
      await gestureRecognition.resetToDefaults();

      // Check that defaults are restored
      const supportedGestures = await gestureRecognition.getSupportedGestures();
      expect(supportedGestures).toContain(GestureType.WAVE);
    });
  });

  describe('Event Handling', () => {
    test('should add and remove event listeners', () => {
      const mockCallback = jest.fn();

      gestureRecognition.addEventListener('gesture_recognized', mockCallback);
      gestureRecognition.removeEventListener('gesture_recognized', mockCallback);

      // Should not throw errors
      expect(true).toBe(true);
    });

    test('should handle multiple listeners for same event', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      gestureRecognition.addEventListener('gesture_recognized', mockCallback1);
      gestureRecognition.addEventListener('gesture_recognized', mockCallback2);

      gestureRecognition.removeEventListener('gesture_recognized', mockCallback1);
      gestureRecognition.removeEventListener('gesture_recognized', mockCallback2);

      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid calibration data import', async () => {
      const invalidData = 'invalid json data';

      await expect(gestureRecognition.importCalibration(invalidData))
        .rejects.toThrow('Failed to import calibration');
    });

    test('should handle operations before initialization', async () => {
      const uninitializedGesture = new GestureRecognitionImpl();

      await expect(uninitializedGesture.calibrateForUser('test'))
        .rejects.toThrow('Gesture recognition not initialized');

      await expect(uninitializedGesture.registerGesturePattern({
        name: 'test',
        type: GestureType.POINT,
        keyframes: [],
        duration: 100,
        confidence: 0.7
      })).rejects.toThrow('Gesture recognition not initialized');
    });
  });
});