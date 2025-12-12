/**
 * Advanced Automation Rules Engine Interface
 * Enables complex conditional logic and intelligent automation
 */

export interface AutomationCondition {
  type: 'time' | 'occupancy' | 'energy' | 'weather' | 'price' | 'device_state' | 'custom';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'not_equals';
  value: any;
  deviceId?: string;
  metadata?: Record<string, any>;
}

export interface AutomationAction {
  type: 'device_control' | 'notification' | 'schedule_change' | 'mode_change' | 'custom';
  deviceId?: string;
  command?: any;
  parameters?: Record<string, any>;
  delay?: number; // Delay in seconds before executing
}

export interface AutomationRule {
  ruleId: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // Higher number = higher priority
  conditions: AutomationCondition[];
  conditionLogic: 'AND' | 'OR' | 'CUSTOM'; // How to combine conditions
  customLogic?: string; // For complex logic expressions
  actions: AutomationAction[];
  triggers: {
    schedule?: string; // Cron expression
    events?: string[]; // Event names to listen for
    continuous?: boolean; // Evaluate continuously
  };
  constraints: {
    maxExecutionsPerDay?: number;
    cooldownMinutes?: number;
    activeTimeWindows?: Array<{
      start: string; // HH:MM
      end: string; // HH:MM
      days: number[]; // 0-6 (Sunday-Saturday)
    }>;
  };
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  metadata?: Record<string, any>;
}

export interface WeatherCondition {
  temperature: number; // Celsius
  humidity: number; // Percentage
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
  windSpeed: number; // km/h
  uvIndex: number;
  airQuality: number; // AQI
}

export interface AutomationContext {
  currentTime: Date;
  occupancy: Record<string, boolean>; // location -> occupied
  deviceStates: Record<string, any>; // deviceId -> state
  energyUsage: Record<string, number>; // deviceId -> current watts
  weather?: WeatherCondition;
  gridPricing?: number; // Current price per kWh
  userPreferences?: Record<string, any>;
}

export interface RuleExecutionResult {
  ruleId: string;
  executed: boolean;
  conditionsMet: boolean;
  actionsExecuted: number;
  errors?: string[];
  executionTime: number; // milliseconds
  nextEvaluation?: Date;
}

export interface AutomationRulesEngine {
  /**
   * Create a new automation rule
   */
  createRule(rule: Omit<AutomationRule, 'ruleId' | 'createdAt' | 'executionCount'>): Promise<string>;

  /**
   * Update an existing automation rule
   */
  updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<void>;

  /**
   * Delete an automation rule
   */
  deleteRule(ruleId: string): Promise<void>;

  /**
   * Get all automation rules
   */
  getAllRules(): Promise<AutomationRule[]>;

  /**
   * Get a specific automation rule
   */
  getRule(ruleId: string): Promise<AutomationRule | null>;

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): Promise<void>;

  /**
   * Evaluate all rules against current context
   */
  evaluateRules(context: AutomationContext): Promise<RuleExecutionResult[]>;

  /**
   * Evaluate a specific rule
   */
  evaluateRule(ruleId: string, context: AutomationContext): Promise<RuleExecutionResult>;

  /**
   * Test a rule without executing actions
   */
  testRule(rule: AutomationRule, context: AutomationContext): Promise<{
    conditionsMet: boolean;
    conditionResults: Array<{
      condition: AutomationCondition;
      result: boolean;
      actualValue?: any;
    }>;
    wouldExecute: boolean;
    reasoning: string[];
  }>;

  /**
   * Get rule execution history
   */
  getRuleExecutionHistory(ruleId: string, days: number): Promise<Array<{
    timestamp: Date;
    result: RuleExecutionResult;
    context: Partial<AutomationContext>;
  }>>;

  /**
   * Create rule from natural language description
   */
  createRuleFromNaturalLanguage(description: string): Promise<{
    suggestedRule: Partial<AutomationRule>;
    confidence: number;
    clarificationNeeded?: string[];
  }>;

  /**
   * Get rule suggestions based on usage patterns
   */
  suggestRules(deviceId?: string): Promise<Array<{
    rule: Partial<AutomationRule>;
    reasoning: string;
    potentialSavings?: number;
    confidence: number;
  }>>;

  /**
   * Optimize rule execution order
   */
  optimizeRuleExecution(): Promise<{
    optimizedOrder: string[]; // Rule IDs in optimal execution order
    reasoning: string[];
    performanceImprovement: number; // Percentage
  }>;

  /**
   * Get weather data for automation conditions
   */
  getWeatherData(location?: string): Promise<WeatherCondition>;

  /**
   * Subscribe to rule execution events
   */
  onRuleExecuted(callback: (result: RuleExecutionResult) => void): void;

  /**
   * Subscribe to rule condition changes
   */
  onConditionChanged(callback: (ruleId: string, condition: AutomationCondition, newValue: any) => void): void;
}