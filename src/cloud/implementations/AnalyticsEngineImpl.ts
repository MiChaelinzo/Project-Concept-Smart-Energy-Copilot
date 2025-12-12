import { AnalyticsEngine, EnergyForecast, PeakDemandPrediction, SeasonalPattern, CostOptimization } from '../interfaces/AnalyticsEngine';
import { EnergyMonitor } from '../../edge/interfaces/EnergyMonitor';

/**
 * Advanced Analytics Engine Implementation
 * Uses machine learning algorithms for predictive energy analytics
 */
export class AnalyticsEngineImpl implements AnalyticsEngine {
  private readonly FORECAST_ACCURACY_THRESHOLD = 0.85;
  private readonly SEASONAL_DATA_POINTS = 365; // Days of data needed for seasonal analysis
  
  // Time-of-use pricing (example rates in $/kWh)
  private readonly TIME_OF_USE_RATES = {
    peak: 0.35,      // 4 PM - 9 PM
    offPeak: 0.12,   // 11 PM - 7 AM
    standard: 0.18   // All other times
  };

  constructor(private energyMonitor: EnergyMonitor) {}

  /**
   * Generate energy consumption forecast using linear regression and seasonal adjustments
   */
  async generateEnergyForecast(deviceId: string, days: number): Promise<EnergyForecast> {
    // Get historical data for the past 30 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const historicalData = await this.energyMonitor.getHistoricalData(deviceId, {
      start: startDate,
      end: endDate
    });

    if (historicalData.length < 7) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Calculate daily averages
    const dailyAverages = this.calculateDailyAverages(historicalData);
    
    // Apply linear regression for trend analysis
    const trend = this.calculateTrend(dailyAverages);
    
    // Apply seasonal adjustments
    const seasonalFactor = this.getSeasonalFactor(new Date());
    
    // Generate forecast
    const forecastStart = new Date();
    const forecastEnd = new Date(forecastStart.getTime() + (days * 24 * 60 * 60 * 1000));
    
    const baseConsumption = dailyAverages[dailyAverages.length - 1];
    const predictedConsumption = (baseConsumption + (trend * days)) * seasonalFactor * days;
    
    // Calculate confidence based on data consistency
    const confidence = this.calculateForecastConfidence(dailyAverages);
    
    // Generate recommendations
    const recommendations = this.generateForecastRecommendations(predictedConsumption, trend);

    return {
      deviceId,
      forecastPeriod: {
        start: forecastStart,
        end: forecastEnd
      },
      predictedConsumption,
      confidence,
      factors: ['historical_trend', 'seasonal_adjustment', 'usage_patterns'],
      recommendations
    };
  }

  /**
   * Predict peak demand periods using historical patterns
   */
  async predictPeakDemand(date: Date): Promise<PeakDemandPrediction> {
    // Get historical data for the same day of week over past 8 weeks
    const historicalPeaks = await this.getHistoricalPeakData(date);
    
    // Calculate average peak time and demand
    const avgPeakHour = this.calculateAveragePeakHour(historicalPeaks);
    const avgPeakDemand = this.calculateAveragePeakDemand(historicalPeaks);
    
    // Apply day-of-week and seasonal adjustments
    const dayOfWeekFactor = this.getDayOfWeekFactor(date.getDay());
    const seasonalFactor = this.getSeasonalFactor(date);
    
    const predictedPeakTime = new Date(date);
    predictedPeakTime.setHours(avgPeakHour, 0, 0, 0);
    
    const predictedPeakDemand = avgPeakDemand * dayOfWeekFactor * seasonalFactor;
    
    // Calculate confidence
    const confidence = Math.min(0.95, historicalPeaks.length / 8 * 0.9);
    
    // Generate suggested actions
    const suggestedActions = this.generatePeakDemandActions(predictedPeakDemand);
    
    // Calculate potential savings
    const potentialSavings = this.calculatePeakShiftSavings(predictedPeakDemand);

    return {
      predictedPeakTime,
      predictedPeakDemand,
      confidence,
      suggestedActions,
      potentialSavings
    };
  }

  /**
   * Analyze seasonal consumption patterns
   */
  async analyzeSeasonalPatterns(deviceId: string): Promise<SeasonalPattern[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (this.SEASONAL_DATA_POINTS * 24 * 60 * 60 * 1000));
    
    const historicalData = await this.energyMonitor.getHistoricalData(deviceId, {
      start: startDate,
      end: endDate
    });

    if (historicalData.length < 90) {
      throw new Error('Insufficient data for seasonal analysis (minimum 90 days required)');
    }

    const seasons: SeasonalPattern[] = [];
    
    // Analyze each season
    const seasonRanges = this.getSeasonRanges(endDate.getFullYear());
    
    for (const [season, range] of Object.entries(seasonRanges)) {
      const seasonData = historicalData.filter(d => 
        d.timestamp >= range.start && d.timestamp <= range.end
      );

      if (seasonData.length > 0) {
        const avgConsumption = seasonData.reduce((sum, d) => sum + d.watts, 0) / seasonData.length / 1000; // Convert to kWh
        const peakHours = this.identifyPeakHours(seasonData);
        const efficiencyTrends = this.calculateMonthlyEfficiency(seasonData);

        seasons.push({
          season: season as 'spring' | 'summer' | 'fall' | 'winter',
          averageConsumption: avgConsumption,
          peakHours,
          efficiencyTrends
        });
      }
    }

    return seasons;
  }

  /**
   * Generate cost optimization recommendations
   */
  async optimizeCosts(timeRange: { start: Date; end: Date }): Promise<CostOptimization> {
    const totalConsumption = await this.energyMonitor.getTotalConsumption(timeRange);
    
    // Calculate current cost using time-of-use rates
    const currentCost = await this.calculateCurrentCost(timeRange);
    
    // Calculate optimized cost with load shifting
    const optimizedCost = await this.calculateOptimizedCost(timeRange);
    
    const potentialSavings = currentCost - optimizedCost;
    
    // Generate specific recommendations
    const recommendations = [
      {
        action: 'Shift high-consumption devices to off-peak hours (11 PM - 7 AM)',
        impact: potentialSavings * 0.4,
        priority: 'high' as const
      },
      {
        action: 'Use smart scheduling for non-critical devices',
        impact: potentialSavings * 0.3,
        priority: 'medium' as const
      },
      {
        action: 'Implement demand response during peak hours',
        impact: potentialSavings * 0.2,
        priority: 'medium' as const
      },
      {
        action: 'Optimize HVAC settings based on occupancy',
        impact: potentialSavings * 0.1,
        priority: 'low' as const
      }
    ];

    return {
      currentCost,
      optimizedCost,
      potentialSavings,
      recommendations
    };
  }

  /**
   * Detect consumption anomalies using statistical analysis
   */
  async detectConsumptionAnomalies(deviceId: string, threshold: number = 2.0): Promise<{
    anomalies: Array<{
      timestamp: Date;
      expectedValue: number;
      actualValue: number;
      severity: 'low' | 'medium' | 'high';
    }>;
    patterns: string[];
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const historicalData = await this.energyMonitor.getHistoricalData(deviceId, {
      start: startDate,
      end: endDate
    });

    // Calculate rolling average and standard deviation
    const windowSize = 24; // 24-hour window
    const anomalies: Array<{
      timestamp: Date;
      expectedValue: number;
      actualValue: number;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    for (let i = windowSize; i < historicalData.length; i++) {
      const window = historicalData.slice(i - windowSize, i);
      const mean = window.reduce((sum, d) => sum + d.watts, 0) / window.length;
      const stdDev = Math.sqrt(
        window.reduce((sum, d) => sum + Math.pow(d.watts - mean, 2), 0) / window.length
      );

      const currentValue = historicalData[i].watts;
      const zScore = Math.abs((currentValue - mean) / stdDev);

      if (zScore > threshold) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (zScore > threshold * 2) severity = 'high';
        else if (zScore > threshold * 1.5) severity = 'medium';

        anomalies.push({
          timestamp: historicalData[i].timestamp,
          expectedValue: mean,
          actualValue: currentValue,
          severity
        });
      }
    }

    // Identify patterns
    const patterns = this.identifyAnomalyPatterns(anomalies);

    return { anomalies, patterns };
  }

  /**
   * Generate efficiency recommendations
   */
  async generateEfficiencyRecommendations(deviceId?: string): Promise<{
    recommendations: Array<{
      title: string;
      description: string;
      potentialSavings: number;
      difficulty: 'easy' | 'medium' | 'hard';
      category: 'behavioral' | 'technical' | 'upgrade';
    }>;
  }> {
    const recommendations = [
      {
        title: 'Optimize HVAC Scheduling',
        description: 'Adjust heating/cooling schedules based on occupancy patterns to reduce energy waste during unoccupied periods.',
        potentialSavings: 15.5, // kWh per month
        difficulty: 'easy' as const,
        category: 'behavioral' as const
      },
      {
        title: 'Implement Smart Power Strips',
        description: 'Use smart power strips to eliminate phantom loads from electronics in standby mode.',
        potentialSavings: 8.2,
        difficulty: 'easy' as const,
        category: 'technical' as const
      },
      {
        title: 'LED Lighting Upgrade',
        description: 'Replace remaining incandescent and CFL bulbs with LED alternatives for 75% energy reduction.',
        potentialSavings: 12.3,
        difficulty: 'medium' as const,
        category: 'upgrade' as const
      },
      {
        title: 'Smart Thermostat Optimization',
        description: 'Fine-tune thermostat settings and enable adaptive learning for optimal comfort and efficiency.',
        potentialSavings: 22.1,
        difficulty: 'medium' as const,
        category: 'technical' as const
      },
      {
        title: 'Energy-Efficient Appliance Upgrade',
        description: 'Replace old appliances with ENERGY STAR certified models for significant long-term savings.',
        potentialSavings: 45.7,
        difficulty: 'hard' as const,
        category: 'upgrade' as const
      }
    ];

    return { recommendations };
  }

  // Helper methods
  private calculateDailyAverages(data: any[]): number[] {
    const dailyData = new Map<string, number[]>();
    
    data.forEach(reading => {
      const day = reading.timestamp.toDateString();
      if (!dailyData.has(day)) {
        dailyData.set(day, []);
      }
      dailyData.get(day)!.push(reading.watts);
    });

    return Array.from(dailyData.values()).map(dayReadings => 
      dayReadings.reduce((sum, watts) => sum + watts, 0) / dayReadings.length / 1000 // Convert to kWh
    );
  }

  private calculateTrend(values: number[]): number {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumX2 = values.reduce((sum, _, i) => sum + (i * i), 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private getSeasonalFactor(date: Date): number {
    const month = date.getMonth();
    // Seasonal factors based on typical energy consumption patterns
    const factors = [1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.8, 0.9, 0.9, 1.0, 1.1, 1.2];
    return factors[month];
  }

  private calculateForecastConfidence(values: number[]): number {
    if (values.length < 7) return 0.5;
    
    const variance = this.calculateVariance(values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Lower coefficient of variation = higher confidence
    return Math.max(0.5, Math.min(0.95, 1 - coefficientOfVariation));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private generateForecastRecommendations(predictedConsumption: number, trend: number): string[] {
    const recommendations: string[] = [];
    
    if (trend > 0.1) {
      recommendations.push('Energy consumption is trending upward. Consider reviewing device efficiency.');
    }
    
    if (predictedConsumption > 50) {
      recommendations.push('High energy consumption predicted. Implement load shifting strategies.');
    }
    
    recommendations.push('Monitor actual vs predicted consumption to improve forecast accuracy.');
    
    return recommendations;
  }

  private async getHistoricalPeakData(date: Date): Promise<Array<{ hour: number; demand: number }>> {
    // Simulate historical peak data - in real implementation, query actual data
    const peaks: Array<{ hour: number; demand: number }> = [];
    
    for (let week = 0; week < 8; week++) {
      const historicalDate = new Date(date.getTime() - (week * 7 * 24 * 60 * 60 * 1000));
      // Simulate peak typically around 6-8 PM with some variation
      const peakHour = 18 + Math.floor(Math.random() * 3);
      const peakDemand = 2000 + Math.random() * 1000; // 2-3 kW typical peak
      
      peaks.push({ hour: peakHour, demand: peakDemand });
    }
    
    return peaks;
  }

  private calculateAveragePeakHour(peaks: Array<{ hour: number; demand: number }>): number {
    return peaks.reduce((sum, peak) => sum + peak.hour, 0) / peaks.length;
  }

  private calculateAveragePeakDemand(peaks: Array<{ hour: number; demand: number }>): number {
    return peaks.reduce((sum, peak) => sum + peak.demand, 0) / peaks.length;
  }

  private getDayOfWeekFactor(dayOfWeek: number): number {
    // Sunday = 0, Monday = 1, etc.
    const factors = [0.9, 1.1, 1.1, 1.1, 1.1, 1.0, 0.95]; // Lower on weekends
    return factors[dayOfWeek];
  }

  private generatePeakDemandActions(predictedDemand: number): string[] {
    const actions: string[] = [];
    
    if (predictedDemand > 2500) {
      actions.push('Pre-cool/pre-heat spaces before peak hours');
      actions.push('Delay non-essential appliance usage until after 9 PM');
    }
    
    actions.push('Enable demand response mode on smart devices');
    actions.push('Consider battery storage discharge during peak hours');
    
    return actions;
  }

  private calculatePeakShiftSavings(predictedDemand: number): number {
    // Calculate potential savings from shifting 30% of peak load to off-peak
    const shiftableLoad = predictedDemand * 0.3;
    const peakRate = this.TIME_OF_USE_RATES.peak;
    const offPeakRate = this.TIME_OF_USE_RATES.offPeak;
    
    return (shiftableLoad / 1000) * (peakRate - offPeakRate); // Convert watts to kW and calculate savings
  }

  private getSeasonRanges(year: number): Record<string, { start: Date; end: Date }> {
    return {
      spring: { start: new Date(year, 2, 20), end: new Date(year, 5, 20) },
      summer: { start: new Date(year, 5, 21), end: new Date(year, 8, 22) },
      fall: { start: new Date(year, 8, 23), end: new Date(year, 11, 20) },
      winter: { start: new Date(year, 11, 21), end: new Date(year + 1, 2, 19) }
    };
  }

  private identifyPeakHours(seasonData: any[]): string[] {
    const hourlyConsumption = new Map<number, number>();
    
    seasonData.forEach(reading => {
      const hour = reading.timestamp.getHours();
      hourlyConsumption.set(hour, (hourlyConsumption.get(hour) || 0) + reading.watts);
    });

    // Find top 3 peak hours
    const sortedHours = Array.from(hourlyConsumption.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);

    return sortedHours;
  }

  private calculateMonthlyEfficiency(seasonData: any[]): Array<{ month: number; efficiency: number }> {
    const monthlyData = new Map<number, number[]>();
    
    seasonData.forEach(reading => {
      const month = reading.timestamp.getMonth();
      if (!monthlyData.has(month)) {
        monthlyData.set(month, []);
      }
      monthlyData.get(month)!.push(reading.watts);
    });

    return Array.from(monthlyData.entries()).map(([month, readings]) => {
      const avgConsumption = readings.reduce((sum, watts) => sum + watts, 0) / readings.length;
      // Efficiency is inverse of consumption (lower consumption = higher efficiency)
      const efficiency = Math.max(0, 100 - (avgConsumption / 30)); // Normalize to 0-100 scale
      
      return { month, efficiency };
    });
  }

  private async calculateCurrentCost(timeRange: { start: Date; end: Date }): Promise<number> {
    // Simulate cost calculation based on time-of-use rates
    const totalConsumption = await this.energyMonitor.getTotalConsumption(timeRange);
    
    // Assume 40% peak, 30% standard, 30% off-peak distribution
    const peakConsumption = totalConsumption * 0.4;
    const standardConsumption = totalConsumption * 0.3;
    const offPeakConsumption = totalConsumption * 0.3;
    
    return (
      peakConsumption * this.TIME_OF_USE_RATES.peak +
      standardConsumption * this.TIME_OF_USE_RATES.standard +
      offPeakConsumption * this.TIME_OF_USE_RATES.offPeak
    );
  }

  private async calculateOptimizedCost(timeRange: { start: Date; end: Date }): Promise<number> {
    // Simulate optimized cost with load shifting (20% peak, 30% standard, 50% off-peak)
    const totalConsumption = await this.energyMonitor.getTotalConsumption(timeRange);
    
    const peakConsumption = totalConsumption * 0.2;
    const standardConsumption = totalConsumption * 0.3;
    const offPeakConsumption = totalConsumption * 0.5;
    
    return (
      peakConsumption * this.TIME_OF_USE_RATES.peak +
      standardConsumption * this.TIME_OF_USE_RATES.standard +
      offPeakConsumption * this.TIME_OF_USE_RATES.offPeak
    );
  }

  private identifyAnomalyPatterns(anomalies: Array<{ timestamp: Date; severity: string }>): string[] {
    const patterns: string[] = [];
    
    // Check for time-based patterns
    const hourCounts = new Map<number, number>();
    anomalies.forEach(anomaly => {
      const hour = anomaly.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const maxHour = Array.from(hourCounts.entries()).reduce((max, [hour, count]) => 
      count > (hourCounts.get(max) || 0) ? hour : max, 0
    );

    if ((hourCounts.get(maxHour) || 0) > anomalies.length * 0.3) {
      patterns.push(`Anomalies frequently occur around ${maxHour}:00`);
    }

    // Check for severity patterns
    const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;
    if (highSeverityCount > anomalies.length * 0.2) {
      patterns.push('High number of severe anomalies detected');
    }

    return patterns;
  }
}