import { HealthInsight, HealthMetrics, HealthStatus, HealthPreferences, ActivityData, HealthGoal } from '../types';

/**
 * Health Monitor Integration Interface
 * 
 * Extends existing health monitoring capabilities with AI-driven insights,
 * proactive wellness recommendations, and personalized health reminders.
 */
export interface HealthMonitorIntegration {
  /**
   * Track user activity data from various sensors
   * @param sensorData Activity data from movement, posture, or biometric sensors
   */
  trackActivity(sensorData: ActivityData): void;

  /**
   * Generate AI-powered health insights based on collected data
   * @returns Array of personalized health insights and recommendations
   */
  generateHealthInsights(): Promise<HealthInsight[]>;

  /**
   * Schedule health reminders based on user preferences and patterns
   * @param preferences User's health reminder preferences
   */
  scheduleReminders(preferences: HealthPreferences): void;

  /**
   * Get current health status and metrics
   * @returns Comprehensive health status report
   */
  getHealthStatus(): Promise<HealthStatus>;

  /**
   * Initialize health monitoring with user profile and preferences
   * @param config Health monitoring configuration
   */
  initialize(config: HealthMonitorConfig): Promise<void>;

  /**
   * Detect sedentary behavior and trigger movement reminders
   * @param thresholdMinutes Minutes of inactivity before triggering reminder
   * @returns True if reminder was triggered
   */
  detectSedentaryBehavior(thresholdMinutes: number): boolean;

  /**
   * Monitor hydration levels and provide water intake reminders
   * @returns Hydration reminder with personalized suggestions
   */
  monitorHydration(): Promise<HealthInsight | null>;

  /**
   * Analyze posture data and provide ergonomic recommendations
   * @param postureData Recent posture sensor readings
   * @returns Posture analysis and improvement suggestions
   */
  analyzePosture(postureData: PostureData[]): Promise<HealthInsight[]>;

  /**
   * Set health goals and track progress
   * @param goals Array of health goals to monitor
   */
  setHealthGoals(goals: HealthGoal[]): void;

  /**
   * Get progress report for current health goals
   * @returns Progress summary for all active goals
   */
  getGoalProgress(): Promise<GoalProgress[]>;

  /**
   * Process health-related voice commands and queries
   * @param query Natural language health query
   * @returns Health information response
   */
  processHealthQuery(query: string): Promise<HealthQueryResponse>;

  /**
   * Enable or disable specific health monitoring features
   * @param feature Feature to toggle
   * @param enabled Whether feature should be active
   */
  toggleFeature(feature: HealthFeature, enabled: boolean): void;

  /**
   * Get health data for specified time range
   * @param startDate Start of time range
   * @param endDate End of time range
   * @returns Historical health data
   */
  getHealthHistory(startDate: Date, endDate: Date): Promise<HealthHistoryData>;

  /**
   * Export health data for external analysis or backup
   * @param format Export format (json, csv, etc.)
   * @returns Exported health data
   */
  exportHealthData(format: 'json' | 'csv' | 'xml'): Promise<string>;

  /**
   * Check for health emergencies or critical alerts
   * @returns Emergency alert if detected, null otherwise
   */
  checkForEmergencies(): Promise<HealthEmergency | null>;

  /**
   * Shutdown health monitoring and cleanup resources
   */
  shutdown(): Promise<void>;
}

/**
 * Configuration interface for Health Monitor Integration
 */
export interface HealthMonitorConfig {
  // User profile
  userId: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  height: number; // cm
  weight: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

  // Monitoring preferences
  enableMovementTracking: boolean;
  enablePostureMonitoring: boolean;
  enableHydrationTracking: boolean;
  enableHeartRateMonitoring: boolean;
  enableStressMonitoring: boolean;

  // Reminder settings
  movementReminderInterval: number; // minutes
  hydrationReminderInterval: number; // minutes
  postureCheckInterval: number; // minutes
  quietHours: { start: string; end: string };

  // Health goals
  dailyStepsGoal: number;
  dailyWaterGoal: number; // ml
  maxSedentaryTime: number; // minutes
  targetSleepHours: number;

  // Integration settings
  syncWithFitnessApps: boolean;
  shareDataWithDoctor: boolean;
  emergencyContactsEnabled: boolean;

  // Privacy settings
  dataRetentionDays: number;
  anonymizeData: boolean;
  localProcessingOnly: boolean;
}

/**
 * Posture data from sensors
 */
export interface PostureData {
  timestamp: Date;
  spinalAlignment: number; // 0-100 score
  shoulderPosition: 'forward' | 'neutral' | 'back';
  headPosition: 'forward' | 'neutral' | 'back';
  sittingDuration: number; // minutes
  confidence: number; // 0-1
}

/**
 * Health goal progress tracking
 */
export interface GoalProgress {
  goal: HealthGoal;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
  streakDays: number;
  achievements: Achievement[];
}

/**
 * Achievement for reaching health milestones
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  earnedDate: Date;
  category: 'movement' | 'hydration' | 'posture' | 'consistency' | 'improvement';
  points: number;
}

/**
 * Response to health-related queries
 */
export interface HealthQueryResponse {
  answer: string;
  data?: HealthMetrics | HealthStatus;
  recommendations: string[];
  followUpQuestions: string[];
  confidence: number;
  sources: string[];
}

/**
 * Health monitoring features that can be toggled
 */
export type HealthFeature = 
  | 'movement_tracking'
  | 'posture_monitoring'
  | 'hydration_tracking'
  | 'heart_rate_monitoring'
  | 'stress_monitoring'
  | 'sleep_tracking'
  | 'reminder_notifications'
  | 'emergency_detection';

/**
 * Historical health data structure
 */
export interface HealthHistoryData {
  timeRange: { start: Date; end: Date };
  dailyMetrics: DailyHealthMetrics[];
  trends: HealthTrendAnalysis[];
  insights: HealthInsight[];
  goalProgress: GoalProgress[];
}

/**
 * Daily aggregated health metrics
 */
export interface DailyHealthMetrics {
  date: Date;
  steps: number;
  sedentaryMinutes: number;
  activeMinutes: number;
  waterIntake: number; // ml
  averagePostureScore: number;
  heartRateData?: HeartRateData;
  sleepData?: SleepData;
  stressLevel?: number;
}

/**
 * Heart rate monitoring data
 */
export interface HeartRateData {
  restingHeartRate: number;
  averageHeartRate: number;
  maxHeartRate: number;
  heartRateVariability: number;
  measurements: HeartRateMeasurement[];
}

/**
 * Individual heart rate measurement
 */
export interface HeartRateMeasurement {
  timestamp: Date;
  bpm: number;
  context: 'resting' | 'active' | 'exercise' | 'stress';
}

/**
 * Sleep tracking data
 */
export interface SleepData {
  bedtime: Date;
  wakeTime: Date;
  totalSleepMinutes: number;
  deepSleepMinutes: number;
  lightSleepMinutes: number;
  remSleepMinutes: number;
  sleepQualityScore: number; // 0-100
  disturbances: number;
}

/**
 * Health trend analysis
 */
export interface HealthTrendAnalysis {
  metric: keyof HealthMetrics;
  timeframe: 'week' | 'month' | 'quarter' | 'year';
  trend: 'improving' | 'stable' | 'declining';
  changePercent: number;
  significance: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Health emergency alert
 */
export interface HealthEmergency {
  type: 'heart_rate_abnormal' | 'fall_detected' | 'prolonged_inactivity' | 'stress_critical';
  severity: 'warning' | 'urgent' | 'critical';
  message: string;
  timestamp: Date;
  data: Record<string, any>;
  actionRequired: boolean;
  emergencyContactsNotified: boolean;
}