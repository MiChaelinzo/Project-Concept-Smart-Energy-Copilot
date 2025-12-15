import { AudioBuffer, ConversationContext, ChatResponse, UserInput, SystemAction } from '../types';

/**
 * AI Chatbot Engine Interface
 * 
 * Core conversational AI component responsible for natural language understanding,
 * context management, and intelligent response generation.
 */
export interface AIChatbotEngine {
  /**
   * Process voice input and generate intelligent response
   * @param audioData Raw audio data from microphone
   * @param context Current conversation context
   * @returns Promise resolving to chat response with text, audio, and actions
   */
  processVoiceInput(audioData: AudioBuffer, context: ConversationContext): Promise<ChatResponse>;

  /**
   * Process text input and generate intelligent response
   * @param text User's text input
   * @param context Current conversation context
   * @returns Promise resolving to chat response
   */
  processTextInput(text: string, context: ConversationContext): Promise<ChatResponse>;

  /**
   * Maintain conversation context across multiple turns
   * @param conversationId Unique identifier for the conversation
   * @param context Updated conversation context
   */
  maintainContext(conversationId: string, context: ConversationContext): void;

  /**
   * Get available AI capabilities and supported domains
   * @returns Array of capability strings
   */
  getCapabilities(): string[];

  /**
   * Initialize the AI engine with configuration
   * @param config Engine configuration parameters
   */
  initialize(config: AIChatbotConfig): Promise<void>;

  /**
   * Process multi-modal input (voice, text, gesture combined)
   * @param input Combined user input from multiple modalities
   * @param context Current conversation context
   * @returns Promise resolving to chat response
   */
  processMultiModalInput(input: UserInput[], context: ConversationContext): Promise<ChatResponse>;

  /**
   * Generate clarification request when input is ambiguous
   * @param originalInput The unclear input
   * @param context Current conversation context
   * @returns Clarification response with suggested options
   */
  requestClarification(originalInput: string, context: ConversationContext): Promise<ChatResponse>;

  /**
   * Check if the engine is ready to process requests
   * @returns True if engine is initialized and ready
   */
  isReady(): boolean;

  /**
   * Get current processing status and performance metrics
   * @returns Engine status information
   */
  getStatus(): EngineStatus;

  /**
   * Shutdown the engine and cleanup resources
   */
  shutdown(): Promise<void>;

  /**
   * Perform automatic performance tuning based on current metrics
   */
  performAutoTuning?(): Promise<void>;

  /**
   * Get detailed performance monitoring data
   */
  getPerformanceMetrics?(): any;
}

/**
 * Configuration interface for AI Chatbot Engine
 */
export interface AIChatbotConfig {
  // Model configuration
  modelName: string;
  modelVersion: string;
  maxTokens: number;
  temperature: number;

  // Performance settings
  responseTimeoutMs: number;
  maxConcurrentRequests: number;
  enableLocalProcessing: boolean;
  optimizeForPerformance?: boolean;
  cacheEnabled?: boolean;

  // Domain-specific settings
  enableHealthDomain: boolean;
  enableCalendarDomain: boolean;
  enableEnergyDomain: boolean;

  // Privacy settings
  enableCloudProcessing: boolean;
  dataRetentionDays: number;
  anonymizeRequests: boolean;

  // Language settings
  primaryLanguage: string;
  supportedLanguages: string[];

  // Integration settings
  energyCopilotApiUrl?: string;
  calendarServiceUrls?: Record<string, string>;
  healthServiceUrl?: string;
}

/**
 * Engine status and performance metrics
 */
export interface EngineStatus {
  isInitialized: boolean;
  isProcessing: boolean;
  averageResponseTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastError?: string;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
  cacheHitRate?: number;
  optimizationsSaved?: number;
}