/**
 * Advanced Analytics Engine Interface
 * Provides predictive insights and energy forecasting capabilities
 */

export interface EnergyForecast {
  deviceId: string;
  forecastPeriod: {
    start: Date;
    end: Date;
  };
  predictedConsumption: number; // kWh
  confidence: number; // 0-1
  factors: string[]; // Contributing factors
  recommendations: string[];
}

export interface PeakDemandPrediction {
  predictedPeakTime: Date;
  predictedPeakDemand: number; // watts
  confidence: number;
  suggestedActions: string[];
  potentialSavings: number; // kWh
}

export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  averageConsumption: number;
  peakHours: string[];
  efficiencyTrends: {
    month: number;
    efficiency: number;
  }[];
}

export interface CostOptimization {
  currentCost: number;
  optimizedCost: number;
  potentialSavings: number;
  recommendations: {
    action: string;
    impact: number;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface AnalyticsEngine {
  /**
   * Generate energy consumption forecast for a device
   */
  generateEnergyForecast(deviceId: string, days: number): Promise<EnergyForecast>;

  /**
   * Predict peak demand periods
   */
  predictPeakDemand(date: Date): Promise<PeakDemandPrediction>;

  /**
   * Analyze seasonal consumption patterns
   */
  analyzeSeasonalPatterns(deviceId: string): Promise<SeasonalPattern[]>;

  /**
   * Generate cost optimization recommendations
   */
  optimizeCosts(timeRange: { start: Date; end: Date }): Promise<CostOptimization>;

  /**
   * Detect consumption anomalies using ML
   */
  detectConsumptionAnomalies(deviceId: string, threshold: number): Promise<{
    anomalies: Array<{
      timestamp: Date;
      expectedValue: number;
      actualValue: number;
      severity: 'low' | 'medium' | 'high';
    }>;
    patterns: string[];
  }>;

  /**
   * Generate efficiency recommendations
   */
  generateEfficiencyRecommendations(deviceId?: string): Promise<{
    recommendations: Array<{
      title: string;
      description: string;
      potentialSavings: number;
      difficulty: 'easy' | 'medium' | 'hard';
      category: 'behavioral' | 'technical' | 'upgrade';
    }>;
  }>;
}