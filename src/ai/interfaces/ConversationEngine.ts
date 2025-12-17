/**
 * Advanced AI Conversation Engine Interface
 * Provides multi-turn conversations with context awareness and memory
 */

export interface ConversationContext {
  sessionId: string;
  userId: string;
  conversationHistory: ConversationTurn[];
  userPreferences: UserPreferences;
  deviceContext: DeviceContext;
  environmentContext: EnvironmentContext;
  timestamp: Date;
}

export interface ConversationTurn {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  intent?: string;
  entities?: Entity[];
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface UserPreferences {
  preferredTemperature: number;
  energySavingMode: boolean;
  voiceResponseStyle: 'concise' | 'detailed' | 'friendly';
  language: string;
  timezone: string;
  customCommands: CustomCommand[];
}

export interface CustomCommand {
  trigger: string;
  action: string;
  parameters: Record<string, any>;
  description: string;
}

export interface DeviceContext {
  activeDevices: string[];
  recentlyControlled: string[];
  deviceStates: Record<string, any>;
  energyConsumption: number;
  roomOccupancy: Record<string, boolean>;
}

export interface EnvironmentContext {
  weather: WeatherData;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  energyPricing: EnergyPricing;
  gridStatus: GridStatus;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  conditions: string;
  forecast: WeatherForecast[];
  uvIndex: number;
  windSpeed: number;
}

export interface WeatherForecast {
  date: Date;
  highTemp: number;
  lowTemp: number;
  conditions: string;
  precipitationChance: number;
}

export interface EnergyPricing {
  currentRate: number;
  peakHours: TimeRange[];
  offPeakRate: number;
  currency: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface GridStatus {
  load: number;
  renewablePercentage: number;
  carbonIntensity: number;
  demandResponseActive: boolean;
}

export interface ConversationResponse {
  text: string;
  actions: ConversationAction[];
  suggestions: string[];
  context: ConversationContext;
  confidence: number;
  requiresFollowup: boolean;
}

export interface ConversationAction {
  type: 'device_control' | 'scene_activation' | 'information_query' | 'schedule_creation' | 'preference_update';
  target: string;
  parameters: Record<string, any>;
  confirmation?: boolean;
}

export interface ConversationEngine {
  /**
   * Process a user input and generate an intelligent response
   */
  processInput(input: string, context: ConversationContext): Promise<ConversationResponse>;

  /**
   * Initialize a new conversation session
   */
  startConversation(userId: string): Promise<ConversationContext>;

  /**
   * Continue an existing conversation
   */
  continueConversation(sessionId: string, input: string): Promise<ConversationResponse>;

  /**
   * Get conversation history
   */
  getConversationHistory(sessionId: string): Promise<ConversationTurn[]>;

  /**
   * Update user preferences based on conversation
   */
  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void>;

  /**
   * Learn from user interactions to improve responses
   */
  learnFromInteraction(sessionId: string, feedback: InteractionFeedback): Promise<void>;

  /**
   * Generate proactive suggestions based on context
   */
  generateProactiveSuggestions(context: ConversationContext): Promise<string[]>;

  /**
   * Handle multi-step commands and confirmations
   */
  handleMultiStepCommand(sessionId: string, step: CommandStep): Promise<ConversationResponse>;
}

export interface InteractionFeedback {
  turnId: string;
  rating: number; // 1-5 scale
  wasHelpful: boolean;
  correctedIntent?: string;
  userComment?: string;
}

export interface CommandStep {
  stepNumber: number;
  totalSteps: number;
  data: Record<string, any>;
  confirmation?: boolean;
}