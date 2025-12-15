// Base type definitions for AI Chatbot Desktop Device

// Re-export common types to avoid conflicts
export interface TimeRange {
  start: Date;
  end: Date;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
}

// Audio and Input Types
export interface AudioBuffer {
  data: Float32Array;
  sampleRate: number;
  duration: number;
}

export interface UserInput {
  type: 'voice' | 'text' | 'touch' | 'gesture' | 'keyboard' | 'eye_tracking';
  content: string | AudioBuffer | TouchData | GestureData;
  timestamp: Date;
  userId: string;
}

export interface TouchData {
  x: number;
  y: number;
  pressure?: number;
  timestamp: Date;
}

export interface GestureData {
  type: 'swipe' | 'tap' | 'pinch' | 'rotate';
  coordinates: { x: number; y: number };
  direction?: 'up' | 'down' | 'left' | 'right';
  intensity: number;
}

// Conversation Context Types
export interface ConversationContext {
  conversationId: string;
  userId: string;
  sessionStart: Date;
  messageHistory: Message[];
  currentTopic: string;
  userPreferences: DesktopUserPreferences;
  contextVariables: Record<string, any>;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DesktopUserPreferences {
  language: string;
  voiceSettings: VoiceSettings;
  visualSettings: VisualSettings;
  healthSettings: HealthPreferences;
  calendarSettings: CalendarPreferences;
  privacySettings: PrivacySettings;
}

export interface VoiceSettings {
  preferredVoice: string;
  speechRate: number;
  volume: number;
  wakeWordEnabled: boolean;
  wakeWord?: string;
}

export interface VisualSettings {
  brightness: number;
  colorScheme: 'light' | 'dark' | 'auto';
  animationSpeed: 'slow' | 'normal' | 'fast';
  reducedMotion: boolean;
}

// Chat Response Types
export interface ChatResponse {
  text: string;
  audioUrl?: string;
  visualPattern?: LightPattern;
  actions?: SystemAction[];
  confidence: number;
  processingTime: number;
  requiresFollowUp?: boolean;
  context?: Record<string, any>;
}

// Health Insights Types
export interface HealthInsight {
  type: 'reminder' | 'suggestion' | 'alert' | 'encouragement';
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionRequired: boolean;
  data: HealthMetrics;
  timestamp: Date;
  expiresAt?: Date;
}

export interface HealthMetrics {
  sedentaryTime: number; // minutes
  lastMovement: Date;
  hydrationLevel: number; // percentage
  lastHydration: Date;
  postureScore: number; // 0-100
  stressLevel?: number; // 0-100
  heartRate?: number;
  steps?: number;
}

export interface HealthPreferences {
  movementReminderInterval: number; // minutes
  hydrationReminderInterval: number; // minutes
  preferredExercises: string[];
  healthGoals: HealthGoal[];
  medicalConditions: string[];
  emergencyContacts: EmergencyContact[];
}

export interface HealthGoal {
  type: 'steps' | 'hydration' | 'movement' | 'posture';
  target: number;
  unit: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

// Light Pattern Types
export interface LightPattern {
  type: 'pulse' | 'wave' | 'rotate' | 'flash' | 'breathe' | 'static';
  colors: Color[];
  duration: number; // milliseconds
  intensity: number; // 0-100
  repeat: boolean;
  fadeIn?: number; // milliseconds
  fadeOut?: number; // milliseconds
}

export interface Color {
  red: number; // 0-255
  green: number; // 0-255
  blue: number; // 0-255
  alpha?: number; // 0-1
}

// System Action Types
export interface SystemAction {
  type: 'calendar' | 'health' | 'energy' | 'device_control' | 'notification';
  command: string;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  priority: 'low' | 'medium' | 'high';
  timeout?: number; // milliseconds
}

// Calendar Types
export interface Appointment {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  reminders: Reminder[];
  recurrence?: RecurrenceRule;
  priority: 'low' | 'medium' | 'high';
}

export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  type: 'appointment' | 'reminder' | 'task' | 'meeting';
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface Reminder {
  type: 'popup' | 'audio' | 'visual' | 'email';
  minutesBefore: number;
  message?: string;
}



export interface ScheduleIntent {
  action: 'create' | 'update' | 'delete' | 'query';
  appointment?: Partial<Appointment>;
  timeframe?: TimeRange;
  query?: string;
  confidence: number;
}



export interface Conflict {
  existingEvent: Event;
  conflictType: 'overlap' | 'adjacent' | 'resource';
  severity: 'minor' | 'major' | 'critical';
  suggestions: string[];
}

export interface CalendarPreferences {
  defaultReminderTime: number; // minutes before
  workingHours: { start: string; end: string };
  timeZone: string;
  calendarServices: CalendarService[];
  autoAcceptMeetings: boolean;
}

export interface CalendarService {
  type: 'google' | 'outlook' | 'apple' | 'exchange';
  accountId: string;
  enabled: boolean;
  syncInterval: number; // minutes
}

// Interface and Accessibility Types
export interface InputModality {
  type: 'voice' | 'touch' | 'gesture' | 'keyboard' | 'eye_tracking';
  enabled: boolean;
  sensitivity: number; // 0-100
  customSettings?: Record<string, any>;
}

export interface InputHandler {
  modality: InputModality;
  process: (input: UserInput) => Promise<void>;
  validate: (input: UserInput) => boolean;
}

export interface SystemResponse {
  text?: string;
  audio?: AudioBuffer;
  visual?: LightPattern;
  haptic?: HapticFeedback;
  actions?: SystemAction[];
}

export interface HapticFeedback {
  type: 'vibration' | 'pulse' | 'tap';
  intensity: number; // 0-100
  duration: number; // milliseconds
  pattern?: number[]; // array of on/off durations
}

export interface AccessibilityMode {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  voiceOnly: boolean;
  reducedMotion: boolean;
  colorBlindSupport: boolean;
}

// Error and Status Types
export interface ErrorType {
  category: 'network' | 'hardware' | 'software' | 'user' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  code: string;
  message: string;
  recoverable: boolean;
}

export interface HealthStatus {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: HealthMetrics;
  trends: HealthTrend[];
  recommendations: string[];
  lastUpdated: Date;
}

export interface HealthTrend {
  metric: keyof HealthMetrics;
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  timeframe: 'day' | 'week' | 'month';
}

export interface ActivityData {
  timestamp: Date;
  type: 'movement' | 'posture' | 'heartRate' | 'steps';
  value: number;
  unit: string;
  confidence: number;
}

// Privacy and Security Types
export interface PrivacySettings {
  dataRetentionDays: number;
  shareHealthData: boolean;
  shareCalendarData: boolean;
  allowCloudProcessing: boolean;
  encryptLocalData: boolean;
  anonymizeData: boolean;
}

// Integration Types (for Smart Energy Copilot)
export interface EnergyQuery {
  type: 'consumption' | 'devices' | 'optimization' | 'cost' | 'carbon';
  timeframe?: TimeRange;
  deviceIds?: string[];
  parameters?: Record<string, any>;
}

export interface EnergyResponse {
  data: any;
  timestamp: Date;
  source: string;
  confidence: number;
}