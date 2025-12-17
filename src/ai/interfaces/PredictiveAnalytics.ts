/**
 * Predictive Analytics Interface
 * Advanced ML-powered forecasting and optimization
 */

export interface PredictionModel {
  id: string;
  name: string;
  type: 'energy_consumption' | 'device_failure' | 'cost_optimization' | 'demand_response' | 'weather_impact';
  algorithm: 'linear_regression' | 'random_forest' | 'neural_network' | 'lstm' | 'arima' | 'prophet';
  accuracy: number; // 0-100
  lastTrained: Date;
  trainingDataSize: number;
  features: string[];
  hyperparameters: Record<string, any>;
  version: string;
}

export interface TrainingData {
  timestamp: Date;
  features: Record<string, number>;
  target: number;
  metadata?: Record<string, any>;
}

export interface Prediction {
  id: string;
  modelId: string;
  timestamp: Date;
  predictedValue: number;
  confidence: number; // 0-100
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  features: Record<string, number>;
  horizon: number; // Hours into the future
  explanation?: PredictionExplanation;
}

export interface PredictionExplanation {
  topFeatures: {
    feature: string;
    importance: number;
    contribution: number;
  }[];
  reasoning: string;
  recommendations: string[];
}

export interface EnergyForecast {
  predictions: Prediction[];
  totalConsumption: number;
  peakDemand: {
    value: number;
    timestamp: Date;
    confidence: number;
  };
  costForecast: {
    total: number;
    breakdown: {
      baseRate: number;
      peakCharges: number;
      demandCharges: number;
    };
  };
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface OptimizationOpportunity {
  type: 'load_shifting' | 'peak_shaving' | 'demand_response' | 'efficiency_improvement';
  description: string;
  potentialSavings: number; // Dollar amount
  energySavings: number; // kWh
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeframe: string;
    requirements: string[];
  };
  devices: string[];
  schedule?: OptimizationSchedule;
}

export interface OptimizationSchedule {
  actions: {
    timestamp: Date;
    deviceId: string;
    action: string;
    parameters: Record<string, any>;
    expectedSavings: number;
  }[];
  totalSavings: number;
  duration: number; // Hours
}

export interface AnomalyDetection {
  anomalies: Anomaly[];
  threshold: number;
  sensitivity: 'low' | 'medium' | 'high';
  lastAnalysis: Date;
  modelPerformance: {
    falsePositiveRate: number;
    falseNegativeRate: number;
    accuracy: number;
  };
}

export interface Anomaly {
  id: string;
  timestamp: Date;
  deviceId?: string;
  type: 'consumption_spike' | 'unusual_pattern' | 'device_malfunction' | 'efficiency_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  actualValue: number;
  expectedValue: number;
  deviation: number;
  confidence: number;
  possibleCauses: string[];
  recommendations: string[];
  resolved: boolean;
  resolvedAt?: Date;
}

export interface DeviceHealthPrediction {
  deviceId: string;
  healthScore: number; // 0-100
  remainingLifespan: {
    estimate: number; // Days
    confidence: number;
    range: {
      min: number;
      max: number;
    };
  };
  failureProbability: {
    next30Days: number;
    next90Days: number;
    nextYear: number;
  };
  maintenanceRecommendations: MaintenanceRecommendation[];
  riskFactors: RiskFactor[];
}

export interface MaintenanceRecommendation {
  type: 'preventive' | 'corrective' | 'replacement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  estimatedCost: number;
  timeframe: string;
  consequences: string;
  benefits: string[];
}

export interface RiskFactor {
  factor: string;
  impact: number; // 0-100
  description: string;
  mitigation: string;
}

export interface DemandResponsePrediction {
  events: DemandResponseEvent[];
  participationRecommendations: ParticipationRecommendation[];
  potentialEarnings: number;
  impactAssessment: {
    comfortImpact: 'none' | 'minimal' | 'moderate' | 'significant';
    energySavings: number;
    costSavings: number;
  };
}

export interface DemandResponseEvent {
  id: string;
  startTime: Date;
  endTime: Date;
  type: 'peak_shaving' | 'load_shifting' | 'emergency_response';
  incentive: number; // $/kWh
  targetReduction: number; // kWh
  probability: number; // 0-100
  weatherDependent: boolean;
}

export interface ParticipationRecommendation {
  eventId: string;
  participate: boolean;
  confidence: number;
  reasoning: string;
  proposedActions: {
    deviceId: string;
    action: string;
    impact: number;
  }[];
  estimatedEarnings: number;
}

export interface PredictiveAnalytics {
  /**
   * Train a prediction model with historical data
   */
  trainModel(modelConfig: Omit<PredictionModel, 'id' | 'lastTrained' | 'accuracy'>, trainingData: TrainingData[]): Promise<PredictionModel>;

  /**
   * Update existing model with new data
   */
  updateModel(modelId: string, newData: TrainingData[]): Promise<PredictionModel>;

  /**
   * Make predictions using a trained model
   */
  predict(modelId: string, features: Record<string, number>, horizon?: number): Promise<Prediction>;

  /**
   * Make batch predictions
   */
  batchPredict(modelId: string, featureSets: Record<string, number>[], horizon?: number): Promise<Prediction[]>;

  /**
   * Generate energy consumption forecast
   */
  generateEnergyForecast(timeRange: { start: Date; end: Date }, includeOptimization?: boolean): Promise<EnergyForecast>;

  /**
   * Detect anomalies in energy consumption
   */
  detectAnomalies(deviceId?: string, timeRange?: { start: Date; end: Date }): Promise<AnomalyDetection>;

  /**
   * Predict device health and maintenance needs
   */
  predictDeviceHealth(deviceId: string): Promise<DeviceHealthPrediction>;

  /**
   * Predict demand response opportunities
   */
  predictDemandResponse(timeRange: { start: Date; end: Date }): Promise<DemandResponsePrediction>;

  /**
   * Get model performance metrics
   */
  getModelPerformance(modelId: string): Promise<ModelPerformance>;

  /**
   * Get feature importance for a model
   */
  getFeatureImportance(modelId: string): Promise<FeatureImportance[]>;

  /**
   * Optimize energy usage based on predictions
   */
  optimizeEnergyUsage(constraints: OptimizationConstraints): Promise<OptimizationResult>;

  /**
   * Get prediction accuracy over time
   */
  getPredictionAccuracy(modelId: string, timeRange: { start: Date; end: Date }): Promise<AccuracyMetrics>;

  /**
   * Simulate different scenarios
   */
  simulateScenario(scenario: EnergyScenario): Promise<SimulationResult>;

  /**
   * Get personalized energy insights
   */
  getPersonalizedInsights(userId: string): Promise<PersonalizedInsight[]>;

  /**
   * Predict optimal device schedules
   */
  predictOptimalSchedules(devices: string[], constraints: SchedulingConstraints): Promise<OptimalSchedule[]>;

  /**
   * Analyze seasonal patterns
   */
  analyzeSeasonalPatterns(deviceId?: string): Promise<SeasonalAnalysis>;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  meanAbsoluteError: number;
  rootMeanSquareError: number;
  r2Score: number;
  trainingTime: number;
  predictionTime: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  description: string;
  category: 'weather' | 'time' | 'device' | 'user_behavior' | 'external';
}

export interface OptimizationConstraints {
  maxDiscomfort: number; // 0-100
  budgetLimit?: number;
  timeConstraints?: {
    start: Date;
    end: Date;
  };
  deviceConstraints?: {
    deviceId: string;
    minRuntime?: number;
    maxRuntime?: number;
    excludeHours?: number[];
  }[];
  priorityDevices?: string[];
}

export interface OptimizationResult {
  schedule: OptimizationSchedule;
  projectedSavings: {
    energy: number; // kWh
    cost: number; // $
    carbon: number; // kg CO2
  };
  comfortImpact: number; // 0-100
  feasibility: number; // 0-100
  alternatives: OptimizationSchedule[];
}

export interface AccuracyMetrics {
  overallAccuracy: number;
  timeSeriesAccuracy: {
    timestamp: Date;
    accuracy: number;
  }[];
  deviceAccuracy?: {
    deviceId: string;
    accuracy: number;
  }[];
  improvementTrend: 'improving' | 'stable' | 'declining';
}

export interface EnergyScenario {
  name: string;
  description: string;
  parameters: {
    weatherChanges?: {
      temperatureDelta: number;
      humidityDelta: number;
    };
    deviceChanges?: {
      deviceId: string;
      efficiencyChange: number;
      usageChange: number;
    }[];
    behaviorChanges?: {
      occupancyChange: number;
      scheduleShift: number; // Hours
    };
    externalFactors?: {
      energyPriceChange: number;
      gridCarbonIntensityChange: number;
    };
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface SimulationResult {
  scenario: EnergyScenario;
  results: {
    energyConsumption: number;
    cost: number;
    carbonEmissions: number;
    peakDemand: number;
    comfortScore: number;
  };
  comparison: {
    baselineConsumption: number;
    energyDifference: number;
    costDifference: number;
    carbonDifference: number;
  };
  recommendations: string[];
}

export interface PersonalizedInsight {
  type: 'energy_saving' | 'cost_optimization' | 'comfort_improvement' | 'environmental_impact';
  title: string;
  description: string;
  impact: {
    energy?: number;
    cost?: number;
    comfort?: number;
    carbon?: number;
  };
  actionRequired: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  category: 'immediate' | 'short_term' | 'long_term';
}

export interface OptimalSchedule {
  deviceId: string;
  schedule: {
    timestamp: Date;
    action: string;
    duration: number;
    parameters: Record<string, any>;
  }[];
  energySavings: number;
  costSavings: number;
  comfortImpact: number;
}

export interface SchedulingConstraints {
  timeRange: {
    start: Date;
    end: Date;
  };
  comfortPriority: number; // 0-100
  costPriority: number; // 0-100
  environmentalPriority: number; // 0-100
  occupancySchedule?: {
    start: Date;
    end: Date;
    occupancy: number; // 0-100
  }[];
}

export interface SeasonalAnalysis {
  patterns: {
    season: 'spring' | 'summer' | 'fall' | 'winter';
    averageConsumption: number;
    peakConsumption: number;
    typicalSchedule: {
      hour: number;
      averageUsage: number;
    }[];
    weatherCorrelation: number;
  }[];
  yearOverYearTrends: {
    year: number;
    totalConsumption: number;
    averageCost: number;
    efficiencyScore: number;
  }[];
  recommendations: {
    season: string;
    recommendations: string[];
    potentialSavings: number;
  }[];
}