/**
 * Smart Scenes Manager Interface
 * Advanced scene management with AI-powered automation
 */

export interface SmartScene {
  id: string;
  name: string;
  description: string;
  category: 'comfort' | 'energy_saving' | 'security' | 'entertainment' | 'work' | 'sleep' | 'custom';
  icon: string;
  color: string;
  isActive: boolean;
  isAutomatic: boolean;
  priority: number; // 1-10, higher = more important
  createdAt: Date;
  lastModified: Date;
  lastActivated?: Date;
  activationCount: number;
  devices: SceneDevice[];
  triggers: SceneTrigger[];
  conditions: SceneCondition[];
  actions: SceneAction[];
  metadata: SceneMetadata;
}

export interface SceneDevice {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  actions: DeviceAction[];
  priority: number;
  delay?: number; // Milliseconds
  retryCount?: number;
}

export interface DeviceAction {
  property: string;
  value: any;
  transition?: {
    duration: number; // Milliseconds
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
  condition?: string; // JavaScript expression
}

export interface SceneTrigger {
  id: string;
  type: 'manual' | 'time' | 'device_state' | 'location' | 'weather' | 'energy_price' | 'occupancy' | 'voice_command';
  enabled: boolean;
  parameters: Record<string, any>;
  conditions?: string[]; // Additional conditions that must be met
}

export interface SceneCondition {
  id: string;
  type: 'time_range' | 'day_of_week' | 'weather' | 'occupancy' | 'device_state' | 'energy_price' | 'custom';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'custom';
  value: any;
  enabled: boolean;
}

export interface SceneAction {
  id: string;
  type: 'device_control' | 'scene_activation' | 'notification' | 'delay' | 'conditional' | 'loop' | 'custom';
  parameters: Record<string, any>;
  order: number;
  enabled: boolean;
  onSuccess?: SceneAction[];
  onFailure?: SceneAction[];
}

export interface SceneMetadata {
  tags: string[];
  energyImpact: 'positive' | 'neutral' | 'negative';
  estimatedSavings?: number; // kWh per activation
  comfortRating: number; // 1-5
  automationLevel: 'basic' | 'intermediate' | 'advanced';
  learningEnabled: boolean;
  adaptiveSettings: AdaptiveSettings;
  usage: SceneUsageStats;
}

export interface AdaptiveSettings {
  enabled: boolean;
  learningPeriod: number; // Days
  adaptationRate: number; // 0-1
  parameters: {
    temperature: boolean;
    lighting: boolean;
    timing: boolean;
    conditions: boolean;
  };
  confidence: number; // 0-100
}

export interface SceneUsageStats {
  totalActivations: number;
  successRate: number; // 0-100
  averageDuration: number; // Minutes
  energyImpact: {
    totalSavings: number;
    averagePerActivation: number;
  };
  userSatisfaction: number; // 1-5
  lastWeekActivations: number;
  popularTimes: {
    hour: number;
    activations: number;
  }[];
}

export interface SceneRecommendation {
  id: string;
  type: 'new_scene' | 'scene_modification' | 'scene_optimization' | 'scene_deletion';
  confidence: number; // 0-100
  title: string;
  description: string;
  reasoning: string[];
  benefits: {
    energySavings?: number;
    costSavings?: number;
    comfortImprovement?: number;
    convenienceGain?: number;
  };
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeRequired: number; // Minutes
    steps: string[];
  };
  suggestedScene?: Partial<SmartScene>;
  modifications?: SceneModification[];
}

export interface SceneModification {
  target: 'device' | 'trigger' | 'condition' | 'action' | 'metadata';
  operation: 'add' | 'remove' | 'modify';
  path: string;
  value?: any;
  reason: string;
}

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popularity: number; // 0-100
  template: Omit<SmartScene, 'id' | 'createdAt' | 'lastModified' | 'activationCount' | 'lastActivated'>;
  customization: {
    required: string[]; // Required parameters to customize
    optional: string[]; // Optional parameters
    validation: Record<string, any>; // Validation rules
  };
  preview: {
    images: string[];
    description: string;
    benefits: string[];
  };
}

export interface SceneExecution {
  sceneId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: {
    type: string;
    source: string;
    parameters: Record<string, any>;
  };
  progress: {
    totalSteps: number;
    completedSteps: number;
    currentStep?: string;
  };
  results: SceneExecutionResult[];
  errors: SceneExecutionError[];
  performance: {
    totalDuration: number;
    deviceResponseTimes: Record<string, number>;
    energyImpact: number;
  };
}

export interface SceneExecutionResult {
  deviceId: string;
  action: string;
  success: boolean;
  responseTime: number;
  previousState: any;
  newState: any;
  energyDelta?: number;
}

export interface SceneExecutionError {
  deviceId?: string;
  action?: string;
  error: string;
  code: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  recoverable: boolean;
}

export interface SceneConflict {
  id: string;
  type: 'device_conflict' | 'timing_conflict' | 'condition_conflict' | 'resource_conflict';
  severity: 'low' | 'medium' | 'high';
  scenes: string[]; // Scene IDs involved in conflict
  description: string;
  impact: string;
  resolutions: ConflictResolution[];
  autoResolvable: boolean;
}

export interface ConflictResolution {
  id: string;
  description: string;
  type: 'priority_based' | 'time_based' | 'condition_based' | 'user_choice' | 'merge';
  implementation: {
    automatic: boolean;
    steps: string[];
    impact: string;
  };
  confidence: number; // 0-100
}

export interface SmartScenesManager {
  /**
   * Create a new smart scene
   */
  createScene(scene: Omit<SmartScene, 'id' | 'createdAt' | 'lastModified' | 'activationCount'>): Promise<SmartScene>;

  /**
   * Update an existing scene
   */
  updateScene(sceneId: string, updates: Partial<SmartScene>): Promise<SmartScene>;

  /**
   * Delete a scene
   */
  deleteScene(sceneId: string): Promise<void>;

  /**
   * Get scene by ID
   */
  getScene(sceneId: string): Promise<SmartScene | null>;

  /**
   * Get all scenes for a user
   */
  getUserScenes(userId: string, category?: string): Promise<SmartScene[]>;

  /**
   * Activate a scene manually
   */
  activateScene(sceneId: string, source?: string): Promise<SceneExecution>;

  /**
   * Deactivate a scene
   */
  deactivateScene(sceneId: string): Promise<void>;

  /**
   * Get scene execution status
   */
  getExecutionStatus(executionId: string): Promise<SceneExecution>;

  /**
   * Get scene execution history
   */
  getExecutionHistory(sceneId: string, limit?: number): Promise<SceneExecution[]>;

  /**
   * Test a scene without actually executing it
   */
  testScene(sceneId: string): Promise<SceneTestResult>;

  /**
   * Duplicate a scene
   */
  duplicateScene(sceneId: string, newName: string): Promise<SmartScene>;

  /**
   * Import scene from template
   */
  importFromTemplate(templateId: string, customization: Record<string, any>): Promise<SmartScene>;

  /**
   * Export scene as template
   */
  exportAsTemplate(sceneId: string, templateInfo: Partial<SceneTemplate>): Promise<SceneTemplate>;

  /**
   * Get available scene templates
   */
  getSceneTemplates(category?: string): Promise<SceneTemplate[]>;

  /**
   * Get scene recommendations based on usage patterns
   */
  getSceneRecommendations(userId: string): Promise<SceneRecommendation[]>;

  /**
   * Apply scene recommendation
   */
  applyRecommendation(recommendationId: string): Promise<SmartScene>;

  /**
   * Detect and resolve scene conflicts
   */
  detectConflicts(sceneIds?: string[]): Promise<SceneConflict[]>;

  /**
   * Resolve scene conflict
   */
  resolveConflict(conflictId: string, resolutionId: string): Promise<void>;

  /**
   * Learn from user behavior and adapt scenes
   */
  learnAndAdapt(sceneId: string, userFeedback?: SceneFeedback): Promise<void>;

  /**
   * Get scene analytics and insights
   */
  getSceneAnalytics(sceneId: string, timeRange?: { start: Date; end: Date }): Promise<SceneAnalytics>;

  /**
   * Optimize scene for energy efficiency
   */
  optimizeForEnergy(sceneId: string): Promise<SceneOptimization>;

  /**
   * Optimize scene for comfort
   */
  optimizeForComfort(sceneId: string): Promise<SceneOptimization>;

  /**
   * Schedule scene activation
   */
  scheduleScene(sceneId: string, schedule: SceneSchedule): Promise<string>;

  /**
   * Cancel scheduled scene
   */
  cancelScheduledScene(scheduleId: string): Promise<void>;

  /**
   * Get scheduled scenes
   */
  getScheduledScenes(userId: string): Promise<ScheduledScene[]>;

  /**
   * Backup scenes
   */
  backupScenes(userId: string): Promise<SceneBackup>;

  /**
   * Restore scenes from backup
   */
  restoreScenes(backup: SceneBackup): Promise<SmartScene[]>;

  /**
   * Share scene with other users
   */
  shareScene(sceneId: string, shareOptions: SceneShareOptions): Promise<string>;

  /**
   * Import shared scene
   */
  importSharedScene(shareCode: string): Promise<SmartScene>;
}

export interface SceneTestResult {
  sceneId: string;
  testId: string;
  timestamp: Date;
  success: boolean;
  simulatedResults: {
    deviceId: string;
    action: string;
    wouldSucceed: boolean;
    estimatedResponseTime: number;
    potentialIssues: string[];
  }[];
  estimatedDuration: number;
  estimatedEnergyImpact: number;
  warnings: string[];
  recommendations: string[];
}

export interface SceneFeedback {
  sceneId: string;
  executionId: string;
  userId: string;
  rating: number; // 1-5
  comfort: number; // 1-5
  efficiency: number; // 1-5
  convenience: number; // 1-5
  comments?: string;
  suggestions?: string[];
  timestamp: Date;
}

export interface SceneAnalytics {
  sceneId: string;
  timeRange: { start: Date; end: Date };
  metrics: {
    totalActivations: number;
    successRate: number;
    averageExecutionTime: number;
    energyImpact: {
      totalSavings: number;
      averagePerActivation: number;
      trend: 'improving' | 'stable' | 'declining';
    };
    userSatisfaction: {
      averageRating: number;
      totalFeedback: number;
      satisfactionTrend: 'improving' | 'stable' | 'declining';
    };
    devicePerformance: {
      deviceId: string;
      successRate: number;
      averageResponseTime: number;
      reliability: number;
    }[];
  };
  patterns: {
    popularActivationTimes: { hour: number; count: number }[];
    seasonalUsage: { season: string; activations: number }[];
    triggerDistribution: { trigger: string; percentage: number }[];
  };
  insights: string[];
  recommendations: string[];
}

export interface SceneOptimization {
  sceneId: string;
  optimizationType: 'energy' | 'comfort' | 'balanced';
  originalScene: SmartScene;
  optimizedScene: SmartScene;
  improvements: {
    energySavings: number;
    comfortImprovement: number;
    efficiencyGain: number;
    costSavings: number;
  };
  changes: SceneModification[];
  confidence: number; // 0-100
  testResults?: SceneTestResult;
}

export interface SceneSchedule {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  startTime: Date;
  endTime?: Date;
  recurrence?: {
    interval: number;
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    daysOfMonth?: number[]; // 1-31
  };
  conditions?: SceneCondition[];
  enabled: boolean;
}

export interface ScheduledScene {
  id: string;
  sceneId: string;
  schedule: SceneSchedule;
  nextExecution: Date;
  lastExecution?: Date;
  executionCount: number;
  status: 'active' | 'paused' | 'expired';
}

export interface SceneBackup {
  id: string;
  userId: string;
  timestamp: Date;
  version: string;
  scenes: SmartScene[];
  templates: SceneTemplate[];
  schedules: ScheduledScene[];
  metadata: {
    totalScenes: number;
    backupSize: number;
    checksum: string;
  };
}

export interface SceneShareOptions {
  shareType: 'public' | 'private' | 'friends';
  includePersonalData: boolean;
  expiresAt?: Date;
  allowModifications: boolean;
  description?: string;
  tags?: string[];
}