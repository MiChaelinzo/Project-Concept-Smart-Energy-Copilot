/**
 * Haptic Feedback Interface
 * 
 * Advanced haptic feedback system for AR/VR interfaces.
 * Provides tactile responses for device interactions and system feedback.
 */

import { Vector3, HapticIntensity } from './ARVRInterface';

export enum HapticPattern {
  CLICK = 'click',
  DOUBLE_CLICK = 'double_click',
  LONG_PRESS = 'long_press',
  PULSE = 'pulse',
  WAVE = 'wave',
  HEARTBEAT = 'heartbeat',
  NOTIFICATION = 'notification',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
  ENERGY_FLOW = 'energy_flow',
  DEVICE_ACTIVATION = 'device_activation',
  CUSTOM = 'custom'
}

export enum HapticLocation {
  LEFT_CONTROLLER = 'left_controller',
  RIGHT_CONTROLLER = 'right_controller',
  BOTH_CONTROLLERS = 'both_controllers',
  HEADSET = 'headset',
  WEARABLE = 'wearable'
}

export interface HapticEffect {
  id: string;
  pattern: HapticPattern;
  intensity: HapticIntensity;
  duration: number;
  location: HapticLocation;
  frequency?: number;
  waveform?: number[];
  fadeIn?: number;
  fadeOut?: number;
  repeat?: number;
  delay?: number;
}

export interface SpatialHaptic {
  position: Vector3;
  radius: number;
  intensity: HapticIntensity;
  falloffCurve: 'linear' | 'exponential' | 'logarithmic';
  effect: HapticEffect;
}

export interface HapticCapabilities {
  supportsIntensityControl: boolean;
  supportsFrequencyControl: boolean;
  supportsCustomWaveforms: boolean;
  supportsSpatialHaptics: boolean;
  maxIntensity: number;
  minIntensity: number;
  maxFrequency: number;
  minFrequency: number;
  maxDuration: number;
  locations: HapticLocation[];
}

export interface HapticFeedback {
  /**
   * Initialize haptic feedback system
   */
  initialize(): Promise<void>;

  /**
   * Get haptic capabilities for current platform
   */
  getCapabilities(): Promise<HapticCapabilities>;

  /**
   * Play a haptic effect
   */
  playEffect(effect: HapticEffect): Promise<void>;

  /**
   * Stop a currently playing haptic effect
   */
  stopEffect(effectId: string): Promise<void>;

  /**
   * Stop all haptic effects
   */
  stopAllEffects(): Promise<void>;

  /**
   * Create a custom haptic pattern
   */
  createCustomPattern(name: string, waveform: number[], duration: number): Promise<HapticPattern>;

  /**
   * Play spatial haptic feedback based on 3D position
   */
  playSpatialHaptic(spatialHaptic: SpatialHaptic): Promise<void>;

  /**
   * Provide haptic feedback for device interaction
   */
  deviceInteractionFeedback(deviceType: string, interactionType: 'select' | 'activate' | 'deactivate' | 'adjust'): Promise<void>;

  /**
   * Provide haptic feedback for energy flow visualization
   */
  energyFlowFeedback(intensity: number, direction: Vector3): Promise<void>;

  /**
   * Provide haptic feedback for system notifications
   */
  notificationFeedback(type: 'info' | 'warning' | 'error' | 'success'): Promise<void>;

  /**
   * Provide haptic feedback for gesture recognition
   */
  gestureFeedback(gestureType: string, success: boolean): Promise<void>;

  /**
   * Set global haptic intensity multiplier
   */
  setGlobalIntensity(multiplier: number): Promise<void>;

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): Promise<void>;

  /**
   * Check if haptic feedback is enabled
   */
  isEnabled(): Promise<boolean>;

  /**
   * Calibrate haptic feedback for user preferences
   */
  calibrateForUser(userId: string, preferences: {
    intensity: number;
    enabledPatterns: HapticPattern[];
    disabledLocations: HapticLocation[];
  }): Promise<void>;

  /**
   * Get user haptic preferences
   */
  getUserPreferences(userId: string): Promise<{
    intensity: number;
    enabledPatterns: HapticPattern[];
    disabledLocations: HapticLocation[];
  } | null>;

  /**
   * Test haptic feedback with different patterns
   */
  testHapticPattern(pattern: HapticPattern, intensity: HapticIntensity, location: HapticLocation): Promise<void>;

  /**
   * Get haptic feedback statistics
   */
  getUsageStats(): Promise<{
    totalEffectsPlayed: number;
    mostUsedPatterns: Array<{
      pattern: HapticPattern;
      count: number;
    }>;
    averageIntensity: number;
    totalDuration: number;
  }>;

  /**
   * Register event listener for haptic events
   */
  addEventListener(event: 'effect_started' | 'effect_ended' | 'calibration_updated' | 'error', 
                   callback: (data: any) => void): void;

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: (data: any) => void): void;

  /**
   * Preload haptic effects for better performance
   */
  preloadEffects(effects: HapticEffect[]): Promise<void>;

  /**
   * Clear preloaded effects from memory
   */
  clearPreloadedEffects(): Promise<void>;
}