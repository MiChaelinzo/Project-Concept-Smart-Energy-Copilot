/**
 * Energy Analytics Implementation
 * Provides energy consumption analytics for the AI conversation engine
 */

import { EnergyPricing, GridStatus } from '../../ai/interfaces/ConversationEngine';

export interface EnergyUsageData {
  consumption: number;
  cost: number;
  comparison: number;
  period: string;
}

export class EnergyAnalyticsImpl {
  private readonly TIME_OF_USE_RATES = {
    peak: 0.35,      // 4 PM - 9 PM
    offPeak: 0.12,   // 11 PM - 7 AM
    standard: 0.18   // All other times
  };

  private deviceEnergyHistory: Map<string, number[]> = new Map();
  private totalEnergyHistory: number[] = [];

  /**
   * Get device-specific energy usage for a time period
   */
  async getDeviceEnergyUsage(deviceId: string, timePeriod: string): Promise<EnergyUsageData> {
    const multiplier = this.getTimePeriodMultiplier(timePeriod);
    const baseConsumption = this.getDeviceBaseConsumption(deviceId);
    const consumption = baseConsumption * multiplier;
    const cost = consumption * this.getCurrentRate();
    const comparison = this.calculateComparison(deviceId, consumption);

    return {
      consumption: Math.round(consumption * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      comparison,
      period: timePeriod
    };
  }

  /**
   * Get total energy usage across all devices for a time period
   */
  async getTotalEnergyUsage(timePeriod: string): Promise<EnergyUsageData> {
    const multiplier = this.getTimePeriodMultiplier(timePeriod);
    const baseConsumption = this.getTotalBaseConsumption();
    const consumption = baseConsumption * multiplier;
    const cost = consumption * this.getCurrentRate();
    const comparison = this.calculateTotalComparison(consumption);

    return {
      consumption: Math.round(consumption * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      comparison,
      period: timePeriod
    };
  }

  /**
   * Get current energy pricing information
   */
  async getCurrentEnergyPricing(): Promise<EnergyPricing> {
    const hour = new Date().getHours();
    const isPeakHours = (hour >= 16 && hour < 21);
    const isOffPeakHours = (hour >= 23 || hour < 7);

    return {
      currentRate: this.getCurrentRate(),
      peakHours: [
        { start: '16:00', end: '21:00' }
      ],
      offPeakRate: this.TIME_OF_USE_RATES.offPeak,
      currency: 'USD'
    };
  }

  /**
   * Get current smart grid status
   */
  async getGridStatus(): Promise<GridStatus> {
    const hour = new Date().getHours();
    const baseLoad = 0.5;
    const peakModifier = (hour >= 16 && hour < 21) ? 0.35 : 0;
    const morningModifier = (hour >= 7 && hour < 9) ? 0.15 : 0;

    return {
      load: baseLoad + peakModifier + morningModifier,
      renewablePercentage: this.calculateRenewablePercentage(),
      carbonIntensity: this.calculateCarbonIntensity(),
      demandResponseActive: this.isDemandResponseActive()
    };
  }

  /**
   * Get current total energy consumption in watts
   */
  async getCurrentConsumption(): Promise<number> {
    // Return current estimated consumption (simulated)
    const baseConsumption = 2500; // Base watts
    const timeModifier = this.getTimeBasedModifier();
    return Math.round(baseConsumption * timeModifier);
  }

  /**
   * Record energy consumption for a device
   */
  recordDeviceConsumption(deviceId: string, watts: number): void {
    if (!this.deviceEnergyHistory.has(deviceId)) {
      this.deviceEnergyHistory.set(deviceId, []);
    }
    const history = this.deviceEnergyHistory.get(deviceId)!;
    history.push(watts);
    if (history.length > 1000) {
      history.shift();
    }
    this.totalEnergyHistory.push(watts);
    if (this.totalEnergyHistory.length > 10000) {
      this.totalEnergyHistory.shift();
    }
  }

  /**
   * Get energy trend analysis
   */
  async getEnergyTrends(deviceId?: string): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
    recommendation: string;
  }> {
    const history = deviceId 
      ? this.deviceEnergyHistory.get(deviceId) || []
      : this.totalEnergyHistory;

    if (history.length < 10) {
      return {
        trend: 'stable',
        percentage: 0,
        recommendation: 'Not enough data to determine trend'
      };
    }

    const recentAvg = this.calculateAverage(history.slice(-5));
    const olderAvg = this.calculateAverage(history.slice(-10, -5));
    const percentageChange = ((recentAvg - olderAvg) / olderAvg) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable';
    let recommendation: string;

    if (percentageChange > 5) {
      trend = 'increasing';
      recommendation = 'Consider reviewing device usage patterns to reduce consumption';
    } else if (percentageChange < -5) {
      trend = 'decreasing';
      recommendation = 'Great job! Your energy usage is decreasing';
    } else {
      trend = 'stable';
      recommendation = 'Your energy usage is consistent';
    }

    return {
      trend,
      percentage: Math.round(percentageChange * 10) / 10,
      recommendation
    };
  }

  private getCurrentRate(): number {
    const hour = new Date().getHours();
    if (hour >= 16 && hour < 21) {
      return this.TIME_OF_USE_RATES.peak;
    } else if (hour >= 23 || hour < 7) {
      return this.TIME_OF_USE_RATES.offPeak;
    }
    return this.TIME_OF_USE_RATES.standard;
  }

  private getTimePeriodMultiplier(timePeriod: string): number {
    switch (timePeriod.toLowerCase()) {
      case 'today':
        return 24;
      case 'this week':
      case 'week':
        return 168;
      case 'this month':
      case 'month':
        return 720;
      case 'this year':
      case 'year':
        return 8760;
      case 'hour':
        return 1;
      default:
        return 24;
    }
  }

  private getDeviceBaseConsumption(deviceId: string): number {
    // Get average from history or use default based on device type
    const history = this.deviceEnergyHistory.get(deviceId);
    if (history && history.length > 0) {
      return this.calculateAverage(history) / 1000; // Convert to kWh
    }
    
    // Default consumption estimates in kWh/hour
    if (deviceId.includes('light')) return 0.01;
    if (deviceId.includes('hvac') || deviceId.includes('ac')) return 1.5;
    if (deviceId.includes('plug')) return 0.05;
    if (deviceId.includes('fridge') || deviceId.includes('refrigerator')) return 0.15;
    return 0.025; // Default
  }

  private getTotalBaseConsumption(): number {
    if (this.totalEnergyHistory.length > 0) {
      return this.calculateAverage(this.totalEnergyHistory) / 1000;
    }
    return 2.5; // Default 2.5 kWh/hour for a typical home
  }

  private calculateComparison(deviceId: string, currentConsumption: number): number {
    const history = this.deviceEnergyHistory.get(deviceId);
    if (!history || history.length < 5) return 0;
    
    const avgHistorical = this.calculateAverage(history.slice(-100)) / 1000 * 24;
    return Math.round(((currentConsumption - avgHistorical) / avgHistorical) * 100);
  }

  private calculateTotalComparison(currentConsumption: number): number {
    if (this.totalEnergyHistory.length < 5) return 0;
    
    const avgHistorical = this.calculateAverage(this.totalEnergyHistory.slice(-100)) / 1000 * 24;
    return Math.round(((currentConsumption - avgHistorical) / avgHistorical) * 100);
  }

  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private getTimeBasedModifier(): number {
    const hour = new Date().getHours();
    // Peak usage times: morning (7-9) and evening (17-22)
    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 22)) {
      return 1.3;
    }
    // Low usage times: late night (23-6)
    if (hour >= 23 || hour < 6) {
      return 0.6;
    }
    return 1.0;
  }

  private calculateRenewablePercentage(): number {
    const hour = new Date().getHours();
    // Solar generation peaks during midday
    const solarContribution = (hour >= 9 && hour < 17) ? 25 : 5;
    const baseRenewable = 15; // Base wind + hydro
    return baseRenewable + solarContribution;
  }

  private calculateCarbonIntensity(): number {
    const renewablePercentage = this.calculateRenewablePercentage();
    // Base carbon intensity in g CO2/kWh
    const baseIntensity = 400;
    return baseIntensity * (1 - renewablePercentage / 100);
  }

  private isDemandResponseActive(): boolean {
    const hour = new Date().getHours();
    // Demand response typically active during peak hours in summer months
    const month = new Date().getMonth();
    const isSummer = month >= 5 && month <= 8;
    const isPeakHours = hour >= 14 && hour < 19;
    return isSummer && isPeakHours;
  }
}
