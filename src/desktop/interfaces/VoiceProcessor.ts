import { AudioBuffer, UserInput, SystemResponse } from '../types';

/**
 * Voice Processor Interface
 * 
 * Handles speech recognition and synthesis capabilities for the AI Chatbot Desktop Device.
 * Provides voice input processing and audio output generation.
 */
export interface VoiceProcessor {
  /**
   * Initialize the voice processor with configuration
   * @param config Voice processor configuration
   */
  initialize(config: VoiceProcessorConfig): Promise<void>;

  /**
   * Process speech input and convert to text
   * @param audioData Raw audio buffer from microphone
   * @returns Recognized text with confidence score
   */
  recognizeSpeech(audioData: AudioBuffer): Promise<SpeechRecognitionResult>;

  /**
   * Synthesize text to speech audio
   * @param text Text to convert to speech
   * @param voiceSettings Voice synthesis settings
   * @returns Audio buffer containing synthesized speech
   */
  synthesizeSpeech(text: string, voiceSettings?: VoiceSynthesisSettings): Promise<AudioBuffer>;

  /**
   * Start continuous speech recognition (for wake word detection)
   * @param callback Function called when speech is detected
   */
  startContinuousRecognition(callback: (result: SpeechRecognitionResult) => void): Promise<void>;

  /**
   * Stop continuous speech recognition
   */
  stopContinuousRecognition(): Promise<void>;

  /**
   * Check if wake word was detected in audio
   * @param audioData Audio buffer to analyze
   * @returns True if wake word detected
   */
  detectWakeWord(audioData: AudioBuffer): Promise<boolean>;

  /**
   * Get available voices for speech synthesis
   * @returns List of available voice options
   */
  getAvailableVoices(): Promise<VoiceOption[]>;

  /**
   * Test microphone and speaker functionality
   * @returns Test results for audio hardware
   */
  testAudioHardware(): Promise<AudioHardwareTestResult>;

  /**
   * Adjust audio processing settings for environment
   * @param settings Environmental audio settings
   */
  adjustForEnvironment(settings: EnvironmentalAudioSettings): void;

  /**
   * Get current audio levels (input/output)
   * @returns Current audio level information
   */
  getAudioLevels(): AudioLevelInfo;

  /**
   * Enable or disable noise cancellation
   * @param enabled Whether noise cancellation should be active
   */
  setNoiseCancellation(enabled: boolean): void;

  /**
   * Shutdown the voice processor and cleanup resources
   */
  shutdown(): Promise<void>;
}

/**
 * Configuration for Voice Processor
 */
export interface VoiceProcessorConfig {
  // Speech Recognition Settings
  enableSpeechRecognition: boolean;
  recognitionLanguage: string;
  recognitionModel?: string;
  confidenceThreshold: number;
  noiseReduction: boolean;
  echoCancellation: boolean;
  automaticGainControl: boolean;
  noiseSuppression: boolean;

  // Speech Synthesis Settings
  enableSpeechSynthesis: boolean;
  voiceId: string;
  defaultVoice?: string;
  speechRate: number;
  volume: number;
  pitch: number;

  // Wake Word Settings
  wakeWordEnabled: boolean;
  wakeWords: string[];
  wakeWordSensitivity: number;

  // Audio Processing
  sampleRate: number;
  bitDepth: number;
  channels: number;
  bufferSize: number;

  // Performance Settings
  maxRecognitionTime: number;
  maxSynthesisTime: number;
  enableLocalProcessing: boolean;
  enableCloudProcessing: boolean;
}

/**
 * Result of speech recognition
 */
export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  alternatives?: SpeechAlternative[];
  processingTime: number;
  isWakeWord: boolean;
  audioQuality: number; // 0-100
}

/**
 * Alternative recognition results
 */
export interface SpeechAlternative {
  text: string;
  confidence: number;
}

/**
 * Voice synthesis settings
 */
export interface VoiceSynthesisSettings {
  voiceId: string;
  rate: number; // 0.1 - 3.0
  pitch: number; // 0.0 - 2.0
  volume: number; // 0.0 - 1.0
  emphasis?: 'strong' | 'moderate' | 'reduced';
  prosody?: {
    rate?: string;
    pitch?: string;
    volume?: string;
  };
}

/**
 * Available voice option
 */
export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  quality: 'standard' | 'premium' | 'neural';
  isLocal: boolean;
  sampleRate: number;
}

/**
 * Audio hardware test results
 */
export interface AudioHardwareTestResult {
  microphone: {
    available: boolean;
    quality: number; // 0-100
    latency: number; // milliseconds
    noiseLevel: number; // 0-100
  };
  speaker: {
    available: boolean;
    quality: number; // 0-100
    latency: number; // milliseconds
    maxVolume: number; // 0-100
  };
  overall: {
    passed: boolean;
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Environmental audio settings
 */
export interface EnvironmentalAudioSettings {
  ambientNoiseLevel: number; // 0-100
  roomSize: 'small' | 'medium' | 'large';
  acoustics: 'dead' | 'normal' | 'reverberant';
  backgroundNoise: 'quiet' | 'moderate' | 'noisy';
  microphoneDistance: 'close' | 'medium' | 'far';
}

/**
 * Current audio level information
 */
export interface AudioLevelInfo {
  inputLevel: number; // 0-100
  outputLevel: number; // 0-100
  inputPeak: number; // 0-100
  outputPeak: number; // 0-100
  inputClipping: boolean;
  outputClipping: boolean;
  signalToNoise: number; // dB
}

/**
 * Voice processing error types
 */
export interface VoiceProcessingError extends Error {
  type: 'recognition' | 'synthesis' | 'hardware' | 'network' | 'timeout';
  code: string;
  recoverable: boolean;
  audioData?: AudioBuffer;
}