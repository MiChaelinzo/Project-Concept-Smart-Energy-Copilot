import { 
  UserInput, 
  SystemResponse, 
  InputModality, 
  InputHandler, 
  AccessibilityMode,
  HapticFeedback,
  AudioBuffer 
} from '../types';

/**
 * Multi-Modal Interface Controller Interface
 * 
 * Coordinates input and output across touch, voice, visual, and gesture modalities,
 * providing seamless interaction and accessibility support.
 */
export interface MultiModalInterfaceController {
  /**
   * Register an input handler for a specific modality
   * @param modality Input modality configuration
   * @param handler Handler function for processing input
   */
  registerInputHandler(modality: InputModality, handler: InputHandler): void;

  /**
   * Route user input to appropriate handlers and generate response
   * @param input User input from any modality
   * @returns Promise resolving when input is processed
   */
  routeInput(input: UserInput): Promise<void>;

  /**
   * Coordinate output across multiple modalities
   * @param response System response with multi-modal content
   */
  coordinateOutput(response: SystemResponse): Promise<void>;

  /**
   * Set accessibility mode and adapt interface accordingly
   * @param mode Accessibility configuration
   */
  setAccessibilityMode(mode: AccessibilityMode): void;

  /**
   * Initialize the multi-modal interface controller
   * @param config Controller configuration
   */
  initialize(config: MultiModalConfig): Promise<void>;

  /**
   * Enable or disable specific input modalities
   * @param modality Modality type to toggle
   * @param enabled Whether modality should be active
   */
  toggleModality(modality: InputModality['type'], enabled: boolean): void;

  /**
   * Get current status of all input modalities
   * @returns Status information for each modality
   */
  getModalityStatus(): ModalityStatus[];

  /**
   * Process simultaneous input from multiple modalities
   * @param inputs Array of concurrent inputs
   * @returns Unified interpretation of multi-modal input
   */
  processConcurrentInput(inputs: UserInput[]): Promise<MultiModalIntent>;

  /**
   * Calibrate input sensitivity for each modality
   * @param modality Modality to calibrate
   * @param sensitivity New sensitivity level (0-100)
   */
  calibrateModality(modality: InputModality['type'], sensitivity: number): void;

  /**
   * Handle input conflicts when multiple modalities are active
   * @param conflictingInputs Inputs that conflict with each other
   * @returns Resolved input or request for clarification
   */
  resolveInputConflict(conflictingInputs: UserInput[]): Promise<UserInput | null>;

  /**
   * Provide haptic feedback for touch interactions
   * @param feedback Haptic feedback configuration
   */
  provideHapticFeedback(feedback: HapticFeedback): void;

  /**
   * Switch between different interaction modes
   * @param mode New interaction mode
   */
  switchInteractionMode(mode: InteractionMode): void;

  /**
   * Get available interaction capabilities
   * @returns Array of supported interaction types
   */
  getCapabilities(): InteractionCapability[];

  /**
   * Test all input modalities for functionality
   * @returns Test results for each modality
   */
  testModalities(): Promise<ModalityTestResult[]>;

  /**
   * Handle emergency input patterns (panic gestures, voice commands)
   * @param emergencyType Type of emergency detected
   */
  handleEmergencyInput(emergencyType: EmergencyInputType): Promise<void>;

  /**
   * Adapt interface based on environmental conditions
   * @param conditions Current environmental conditions
   */
  adaptToEnvironment(conditions: EnvironmentalConditions): void;

  /**
   * Shutdown the controller and cleanup resources
   */
  shutdown(): Promise<void>;
}

/**
 * Configuration interface for Multi-Modal Interface Controller
 */
export interface MultiModalConfig {
  // Supported modalities
  enabledModalities: InputModality['type'][];
  
  // Voice configuration
  voiceConfig: VoiceConfig;
  
  // Touch configuration
  touchConfig: TouchConfig;
  
  // Gesture configuration
  gestureConfig: GestureConfig;
  
  // Visual output configuration
  visualConfig: VisualConfig;
  
  // Audio output configuration
  audioConfig: AudioConfig;
  
  // Accessibility settings
  accessibilityConfig: AccessibilityConfig;
  
  // Interaction preferences
  defaultInteractionMode: InteractionMode;
  modalitySwitchingEnabled: boolean;
  concurrentInputEnabled: boolean;
  
  // Performance settings
  inputTimeoutMs: number;
  responseTimeoutMs: number;
  maxConcurrentInputs: number;
}

/**
 * Voice input/output configuration
 */
export interface VoiceConfig {
  // Speech recognition
  enableSpeechRecognition: boolean;
  recognitionLanguage: string;
  recognitionModel?: string;
  noiseReduction: boolean;
  confidenceThreshold: number;
  echoCancellation: boolean;
  automaticGainControl: boolean;
  noiseSuppression: boolean;
  
  // Speech synthesis
  enableSpeechSynthesis: boolean;
  voiceId: string;
  defaultVoice?: string;
  speechRate: number;
  volume: number;
  pitch: number;
  
  // Wake word detection
  wakeWordEnabled: boolean;
  wakeWords: string[];
  wakeWordSensitivity: number;
  
  // Audio processing
  sampleRate: number;
  bitDepth: number;
  channels: number;
  bufferSize: number;
  maxRecognitionTime: number;
  maxSynthesisTime: number;
  enableLocalProcessing: boolean;
  enableCloudProcessing: boolean;
}

/**
 * Touch input configuration
 */
export interface TouchConfig {
  // Touch sensitivity
  touchSensitivity: number;
  multiTouchEnabled: boolean;
  gestureRecognitionEnabled: boolean;
  
  // Touch feedback
  hapticFeedbackEnabled: boolean;
  hapticIntensity: number;
  
  // Touch areas
  touchZones: TouchZone[];
  
  // Gesture settings
  swipeThreshold: number;
  tapTimeout: number;
  longPressTimeout: number;
}

/**
 * Gesture recognition configuration
 */
export interface GestureConfig {
  // Camera settings
  cameraEnabled: boolean;
  cameraResolution: { width: number; height: number };
  frameRate: number;
  
  // Recognition settings
  gestureLibrary: string[];
  recognitionConfidence: number;
  trackingSmoothing: number;
  
  // Hand tracking
  handTrackingEnabled: boolean;
  maxHands: number;
  
  // Face tracking
  faceTrackingEnabled: boolean;
  eyeTrackingEnabled: boolean;
}

/**
 * Visual output configuration
 */
export interface VisualConfig {
  // Display settings
  displayBrightness: number;
  colorProfile: string;
  animationSpeed: number;
  
  // Text settings
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  
  // Visual effects
  transitionsEnabled: boolean;
  particleEffectsEnabled: boolean;
  reducedMotion: boolean;
}

/**
 * Audio output configuration
 */
export interface AudioConfig {
  // Volume settings
  masterVolume: number;
  voiceVolume: number;
  effectsVolume: number;
  
  // Audio quality
  sampleRate: number;
  bitDepth: number;
  
  // Spatial audio
  spatialAudioEnabled: boolean;
  surroundSound: boolean;
  
  // Audio effects
  equalizerEnabled: boolean;
  bassBoost: number;
  trebleBoost: number;
}

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
  // Visual accessibility
  highContrast: boolean;
  largeText: boolean;
  colorBlindSupport: boolean;
  
  // Motor accessibility
  stickyKeys: boolean;
  slowKeys: boolean;
  bounceKeys: boolean;
  
  // Cognitive accessibility
  simplifiedInterface: boolean;
  extendedTimeouts: boolean;
  confirmationPrompts: boolean;
  
  // Screen reader support
  screenReaderEnabled: boolean;
  screenReaderVoice: string;
  verbosityLevel: 'minimal' | 'standard' | 'verbose';
}

/**
 * Touch zone definition for interface areas
 */
export interface TouchZone {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  action: string;
  hapticFeedback?: HapticFeedback;
  visualFeedback?: boolean;
}

/**
 * Interaction modes for different use cases
 */
export type InteractionMode = 
  | 'voice_primary'
  | 'touch_primary'
  | 'gesture_primary'
  | 'hands_free'
  | 'silent'
  | 'accessibility'
  | 'presentation'
  | 'sleep';

/**
 * Available interaction capabilities
 */
export interface InteractionCapability {
  type: InputModality['type'];
  available: boolean;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  features: string[];
  limitations: string[];
}

/**
 * Status of individual input modalities
 */
export interface ModalityStatus {
  type: InputModality['type'];
  enabled: boolean;
  active: boolean;
  quality: number; // 0-100
  lastInput?: Date;
  errorCount: number;
  calibrationNeeded: boolean;
}

/**
 * Unified interpretation of multi-modal input
 */
export interface MultiModalIntent {
  primaryModality: InputModality['type'];
  confidence: number;
  intent: string;
  parameters: Record<string, any>;
  supportingInputs: UserInput[];
  ambiguities: string[];
}

/**
 * Test results for modality functionality
 */
export interface ModalityTestResult {
  modality: InputModality['type'];
  passed: boolean;
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  testDuration: number;
}

/**
 * Emergency input types for safety
 */
export type EmergencyInputType = 
  | 'panic_gesture'
  | 'emergency_voice_command'
  | 'fall_detected'
  | 'health_emergency'
  | 'security_breach'
  | 'system_failure';

/**
 * Environmental conditions affecting interface
 */
export interface EnvironmentalConditions {
  lightLevel: number; // 0-100
  noiseLevel: number; // 0-100
  temperature: number; // Celsius
  humidity: number; // 0-100
  motionDetected: boolean;
  proximityDistance?: number; // cm
  ambientColor?: string;
}

/**
 * Context information for input processing
 */
export interface InputContext {
  timestamp: Date;
  sessionId: string;
  userId: string;
  deviceState: string;
  environmentalConditions: EnvironmentalConditions;
  previousInputs: UserInput[];
  activeApplications: string[];
}

/**
 * Feedback configuration for different interaction types
 */
export interface FeedbackConfig {
  visual: {
    enabled: boolean;
    highlightColor: string;
    animationDuration: number;
  };
  audio: {
    enabled: boolean;
    confirmationSound: string;
    errorSound: string;
    volume: number;
  };
  haptic: {
    enabled: boolean;
    confirmationPattern: number[];
    errorPattern: number[];
    intensity: number;
  };
}