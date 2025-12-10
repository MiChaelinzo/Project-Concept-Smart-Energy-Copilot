import { DashboardData } from '../../mobile/types';

/**
 * CarbonDashboard interface
 * Responsibility: Provides carbon footprint and energy savings analytics
 */
export interface CarbonDashboard {
  /**
   * Get dashboard data for a specific time period
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  getDashboardData(startDate: Date, endDate: Date): Promise<DashboardData>;

  /**
   * Calculate carbon emissions from energy consumption
   * Requirements: 5.1
   */
  calculateCarbonEmissions(energyKwh: number): number;

  /**
   * Calculate percentage change between two time periods
   * Requirements: 5.3
   */
  calculatePercentageChange(currentValue: number, previousValue: number): number;

  /**
   * Calculate projected annual savings
   * Requirements: 5.4
   */
  calculateProjectedAnnualSavings(monthlySavingsKwh: number): number | undefined;

  /**
   * Get energy saved compared to baseline
   * Requirements: 5.2
   */
  getEnergySaved(startDate: Date, endDate: Date): Promise<number>;
}
