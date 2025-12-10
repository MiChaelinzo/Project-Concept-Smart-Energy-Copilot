import { CarbonDashboard } from '../interfaces/CarbonDashboard';
import { DashboardData } from '../../mobile/types';
import { EnergyMonitor } from '../../edge/interfaces/EnergyMonitor';

/**
 * CarbonDashboardImpl implementation
 * Provides carbon footprint and energy savings analytics
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class CarbonDashboardImpl implements CarbonDashboard {
  // Standard carbon conversion factor: 0.92 lbs CO2 per kWh
  private readonly CARBON_CONVERSION_FACTOR = 0.92;
  
  // Convert lbs to kg
  private readonly LBS_TO_KG = 0.453592;
  
  // Minimum monthly savings threshold for projection (in kWh)
  private readonly MIN_SAVINGS_THRESHOLD = 10;

  // Baseline energy consumption tracking (device -> baseline consumption in kWh/day)
  private baselineConsumption: Map<string, number> = new Map();
  
  constructor(private energyMonitor: EnergyMonitor) {}

  /**
   * Get dashboard data for a specific time period
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async getDashboardData(startDate: Date, endDate: Date): Promise<DashboardData> {
    // Validate inputs
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    // Get total energy consumption for the period
    const totalEnergyKwh = await this.energyMonitor.getTotalConsumption({
      start: startDate,
      end: endDate
    });

    // Get energy saved compared to baseline
    const energySavedKwh = await this.getEnergySaved(startDate, endDate);

    // Calculate carbon footprint in kg
    const carbonFootprintKg = this.calculateCarbonEmissions(totalEnergyKwh);

    // Calculate percentage change (comparing current period to previous period)
    const periodDurationMs = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDurationMs);
    const previousEndDate = startDate;

    const previousEnergyKwh = await this.energyMonitor.getTotalConsumption({
      start: previousStartDate,
      end: previousEndDate
    });

    const percentageChange = this.calculatePercentageChange(totalEnergyKwh, previousEnergyKwh);

    // Calculate projected annual savings if applicable
    let projectedAnnualSavings: number | undefined;
    
    // Check if this is approximately a monthly period (25-35 days)
    const periodDurationDays = periodDurationMs / (1000 * 60 * 60 * 24);
    if (periodDurationDays >= 25 && periodDurationDays <= 35) {
      projectedAnnualSavings = this.calculateProjectedAnnualSavings(energySavedKwh);
    }

    return {
      totalEnergyKwh,
      energySavedKwh,
      carbonFootprintKg,
      percentageChange,
      projectedAnnualSavings,
      period: {
        start: startDate,
        end: endDate
      }
    };
  }

  /**
   * Calculate carbon emissions from energy consumption
   * Requirements: 5.1
   */
  calculateCarbonEmissions(energyKwh: number): number {
    if (energyKwh < 0) {
      throw new Error('Energy consumption cannot be negative');
    }

    // Convert kWh to lbs CO2, then to kg
    const carbonLbs = energyKwh * this.CARBON_CONVERSION_FACTOR;
    const carbonKg = carbonLbs * this.LBS_TO_KG;
    
    return carbonKg;
  }

  /**
   * Calculate percentage change between two time periods
   * Requirements: 5.3
   */
  calculatePercentageChange(currentValue: number, previousValue: number): number {
    if (currentValue < 0 || previousValue < 0) {
      throw new Error('Values cannot be negative');
    }

    // Handle division by zero
    if (previousValue === 0) {
      // If previous was 0 and current is 0, no change
      if (currentValue === 0) {
        return 0;
      }
      // If previous was 0 but current is not, return 100% increase
      return 100;
    }

    // Calculate percentage change: ((current - previous) / previous) * 100
    const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
    
    return percentageChange;
  }

  /**
   * Calculate projected annual savings
   * Requirements: 5.4
   */
  calculateProjectedAnnualSavings(monthlySavingsKwh: number): number | undefined {
    if (monthlySavingsKwh < 0) {
      throw new Error('Monthly savings cannot be negative');
    }

    // Only project if monthly savings exceed threshold
    if (monthlySavingsKwh < this.MIN_SAVINGS_THRESHOLD) {
      return undefined;
    }

    // Project annual savings (12 months)
    return monthlySavingsKwh * 12;
  }

  /**
   * Get energy saved compared to baseline
   * Requirements: 5.2
   */
  async getEnergySaved(startDate: Date, endDate: Date): Promise<number> {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    // Calculate period duration in days
    const periodDurationMs = endDate.getTime() - startDate.getTime();
    const periodDurationDays = periodDurationMs / (1000 * 60 * 60 * 24);

    // Calculate expected baseline consumption for the period
    let expectedBaselineKwh = 0;
    for (const [deviceId, dailyBaselineKwh] of this.baselineConsumption.entries()) {
      expectedBaselineKwh += dailyBaselineKwh * periodDurationDays;
    }

    // Get actual consumption for the period
    const actualConsumptionKwh = await this.energyMonitor.getTotalConsumption({
      start: startDate,
      end: endDate
    });

    // Energy saved is the difference (can be negative if consumption increased)
    const energySaved = expectedBaselineKwh - actualConsumptionKwh;

    // Return 0 if no savings (don't return negative values)
    return Math.max(0, energySaved);
  }

  /**
   * Set baseline consumption for a device (for testing and initialization)
   */
  setBaselineConsumption(deviceId: string, dailyKwh: number): void {
    if (!deviceId || deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    if (dailyKwh < 0) {
      throw new Error('Baseline consumption cannot be negative');
    }

    this.baselineConsumption.set(deviceId, dailyKwh);
  }

  /**
   * Get baseline consumption for a device (for testing)
   */
  getBaselineConsumption(deviceId: string): number | undefined {
    return this.baselineConsumption.get(deviceId);
  }

  /**
   * Clear all baseline data (for testing)
   */
  clearBaselineData(): void {
    this.baselineConsumption.clear();
  }
}
