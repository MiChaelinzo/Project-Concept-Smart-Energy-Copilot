/**
 * Gesture Recognition Interface
 * 
 * Advanced hand and gesture recognition system for AR/VR interfaces.
 * Supports real-time gesture detection and command translation.
 */

import { Vector3, Quaternion, GestureType, HandTracking } from './ARVRInterface';

export interface GesturePattern {
  name: string;
  type: GestureType;
  keyframes: Array<{
    timestamp: number;
    handPositions: {
      left?: Vector3;
      right?: Vector3;
    };
    fingerPositions: {
      left?: Record<string, Vector3>;
      right?: Record<string, Vector3>;
    };
  }>;
  duration: number;
  confidence: number;
}

export interface GestureCommand {
  gestureType: GestureType;
  command: string;
  parameters: Record<string, any>;
  deviceId?: string;
  sceneId?: string;
  priority: number;
}

export interface GestureCalibration {
  userId: string;
  handSize: {
    left: number;
    right: number;
  };
  reachDistance: number;
  preferredGestures: GestureType[];
  sensitivity: number;
  customGestures: GesturePattern[];
}

export interface GestureRecognitionResult {
  gesture: GestureType;
  confidence: number;
  handUsed: 'left' | 'right' | 'both';
  position: Vector3;
  direction?: Vector3;
  velocity?: Vector3;
  timestamp: Date;
  duration: number;
}

export interface GestureRecognition {
  /**
   * Initialize gesture recognition system
   */
  initialize(): Promise<void>;

  /**
   * Calibrate gesture recognition for specific user
   */
  calibrateForUser(userId: string): Promise<GestureCalibration>;

  /**
   * Process hand tracking data and detect gestures
   */
  processHandTracking(handTracking: HandTracking): Promise<GestureRecognitionResult[]>;

  /**
   * Register a new gesture pattern
   */
  registerGesturePattern(pattern: GesturePattern): Promise<void>;

  /**
   * Remove a gesture pattern
   */
  removeGesturePattern(patternName: string): Promise<void>;

  /**
   * Map gesture to command
   */
  mapGestureToCommand(gesture: GestureType, command: GestureCommand): Promise<void>;

  /**
   * Get command for recognized gesture
   */
  getCommandForGesture(gesture: GestureType, context?: Record<string, any>): Promise<GestureCommand | null>;

  /**
   * Update gesture recognition sensitivity
   */
  setSensitivity(sensitivity: number): Promise<void>;

  /**
   * Enable or disable specific gesture types
   */
  toggleGestureType(gestureType: GestureType, enabled: boolean): Promise<void>;

  /**
   * Get gesture recognition statistics
   */
  getRecognitionStats(): Promise<{
    totalGestures: number;
    successfulRecognitions: number;
    averageConfidence: number;
    mostUsedGestures: Array<{
      gesture: GestureType;
      count: number;
      averageConfidence: number;
    }>;
    recognitionLatency: number;
  }>;

  /**
   * Train gesture recognition model with user data
   */
  trainModel(trainingData: Array<{
    handTracking: HandTracking;
    expectedGesture: GestureType;
    timestamp: Date;
  }>): Promise<void>;

  /**
   * Export gesture calibration data
   */
  exportCalibration(userId: string): Promise<string>;

  /**
   * Import gesture calibration data
   */
  importCalibration(calibrationData: string): Promise<void>;

  /**
   * Reset gesture recognition to defaults
   */
  resetToDefaults(): Promise<void>;

  /**
   * Get supported gesture types for current platform
   */
  getSupportedGestures(): Promise<GestureType[]>;

  /**
   * Start continuous gesture recognition
   */
  startContinuousRecognition(): Promise<void>;

  /**
   * Stop continuous gesture recognition
   */
  stopContinuousRecognition(): Promise<void>;

  /**
   * Register event listener for gesture events
   */
  addEventListener(event: 'gesture_recognized' | 'gesture_started' | 'gesture_ended' | 'calibration_updated', 
                   callback: (data: any) => void): void;

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: (data: any) => void): void;
}