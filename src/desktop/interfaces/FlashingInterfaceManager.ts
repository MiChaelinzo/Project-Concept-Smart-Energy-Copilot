import { LightPattern, Color, ErrorType } from '../types';

/**
 * Flashing Interface Manager Interface
 * 
 * Manages visual feedback patterns and animations to indicate system states
 * and AI processing status through LED patterns, screen animations, or display effects.
 */
export interface FlashingInterfaceManager {
  /**
   * Display listening pattern when AI is receiving input
   */
  showListeningPattern(): void;

  /**
   * Display processing pattern when AI is thinking/processing
   */
  showProcessingPattern(): void;

  /**
   * Display speaking pattern synchronized with audio output
   * @param duration Duration of the audio response in milliseconds
   */
  showSpeakingPattern(duration: number): void;

  /**
   * Display error pattern with specific error indication
   * @param errorType Type and severity of the error
   */
  showErrorPattern(errorType: ErrorType): void;

  /**
   * Display idle pattern when system is ready but not active
   */
  showIdlePattern(): void;

  /**
   * Display custom pattern for specific use cases
   * @param pattern Custom light pattern configuration
   */
  customPattern(pattern: LightPattern): void;

  /**
   * Initialize the interface manager with hardware configuration
   * @param config Interface configuration parameters
   */
  initialize(config: FlashingInterfaceConfig): Promise<void>;

  /**
   * Stop all current patterns and clear display
   */
  clearPattern(): void;

  /**
   * Set global brightness level
   * @param brightness Brightness level from 0-100
   */
  setBrightness(brightness: number): void;

  /**
   * Enable or disable animations based on user preferences
   * @param enabled Whether animations should be shown
   */
  setAnimationsEnabled(enabled: boolean): void;

  /**
   * Synchronize visual pattern with audio timing
   * @param audioStartTime When audio playback begins
   * @param audioDuration Total duration of audio
   * @param pattern Visual pattern to synchronize
   */
  synchronizeWithAudio(audioStartTime: Date, audioDuration: number, pattern: LightPattern): void;

  /**
   * Get current pattern status
   * @returns Information about currently active pattern
   */
  getCurrentPattern(): PatternStatus;

  /**
   * Test all available patterns for hardware validation
   * @returns Promise resolving when test sequence completes
   */
  testPatterns(): Promise<void>;

  /**
   * Update pattern based on system state change
   * @param state New system state
   * @param metadata Additional state information
   */
  updateForState(state: SystemState, metadata?: Record<string, any>): void;

  /**
   * Shutdown the interface manager and cleanup resources
   */
  shutdown(): Promise<void>;
}

/**
 * Configuration interface for Flashing Interface Manager
 */
export interface FlashingInterfaceConfig {
  // Hardware configuration
  displayType: 'led_strip' | 'led_matrix' | 'screen' | 'oled' | 'lcd';
  ledCount?: number;
  screenResolution?: { width: number; height: number };
  refreshRate: number;

  // Visual preferences
  defaultBrightness: number;
  colorProfile: 'standard' | 'vivid' | 'warm' | 'cool';
  animationSpeed: 'slow' | 'normal' | 'fast';
  reducedMotion: boolean;

  // Pattern configuration
  listeningPattern: LightPattern;
  processingPattern: LightPattern;
  speakingPattern: LightPattern;
  errorPattern: LightPattern;
  idlePattern: LightPattern;

  // Timing configuration
  patternTransitionMs: number;
  audioSyncDelayMs: number;
  maxPatternDuration: number;

  // Accessibility
  highContrastMode: boolean;
  colorBlindSupport: boolean;
  flashingReduction: boolean;

  // Performance optimization
  targetFPS?: number;
  enablePatternOptimization?: boolean;
  debugMode?: boolean;
}

/**
 * System states that trigger visual pattern changes
 */
export type SystemState = 
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error'
  | 'offline'
  | 'updating'
  | 'sleeping'
  | 'emergency';

/**
 * Current pattern status information
 */
export interface PatternStatus {
  isActive: boolean;
  currentPattern: LightPattern | null;
  state: SystemState;
  startTime: Date;
  estimatedEndTime?: Date;
  brightness: number;
  animationsEnabled: boolean;
}

/**
 * Predefined pattern templates for common use cases
 */
export interface PatternTemplates {
  // State patterns
  listening: LightPattern;
  processing: LightPattern;
  speaking: LightPattern;
  error: LightPattern;
  idle: LightPattern;

  // Notification patterns
  reminder: LightPattern;
  alert: LightPattern;
  success: LightPattern;
  warning: LightPattern;

  // Health patterns
  movementReminder: LightPattern;
  hydrationReminder: LightPattern;
  postureAlert: LightPattern;

  // Calendar patterns
  appointmentReminder: LightPattern;
  meetingStart: LightPattern;
  scheduleConflict: LightPattern;
}

/**
 * Animation easing functions for smooth transitions
 */
export type EasingFunction = 
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic';

/**
 * Advanced pattern configuration with animations
 */
export interface AnimatedPattern extends LightPattern {
  easing: EasingFunction;
  keyframes: PatternKeyframe[];
  loop: boolean;
  reverseOnComplete: boolean;
}

/**
 * Keyframe for complex animations
 */
export interface PatternKeyframe {
  time: number; // 0-1 representing position in animation
  colors: Color[];
  intensity: number;
  transform?: PatternTransform;
}

/**
 * Transformation effects for patterns
 */
export interface PatternTransform {
  rotation?: number; // degrees
  scale?: number; // multiplier
  offset?: { x: number; y: number };
  blur?: number;
}