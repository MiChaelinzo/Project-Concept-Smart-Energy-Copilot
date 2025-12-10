import { CarbonDashboardImpl } from './CarbonDashboardImpl';
import { EnergyMonitorImpl } from '../../edge/implementations/EnergyMonitorImpl';

/**
 * Unit tests for Carbon Dashboard
 * Requirements: 5.2, 5.3, 5.4
 */
describe('CarbonDashboard Unit Tests', () => {
  let energyMonitor: EnergyMonitorImpl;
  let carbonDashboard: CarbonDashboardImpl;

  beforeEach(() => {
    energyMonitor = new EnergyMonitorImpl();
    carbonDashboard = new CarbonDashboardImpl(energyMonitor);
  });

  /**
   * Test empty time period handling
   * Requirements: 5.2
   */
  describe('Empty time period handling', () => {
    test('should return zero values for empty time period with no data', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T00:00:00Z'); // Same as start (empty period)

      const dashboardData = await carbonDashboard.getDashboardData(startDate, endDate);

      expect(dashboardData.totalEnergyKwh).toBe(0);
      expect(dashboardData.energySavedKwh).toBe(0);
      expect(dashboardData.carbonFootprintKg).toBe(0);
      expect(dashboardData.period.start).toEqual(startDate);
      expect(dashboardData.period.end).toEqual(endDate);
    });

    test('should handle time period with no recorded consumption', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-02T00:00:00Z');

      // Don't record any consumption data

      const dashboardData = await carbonDashboard.getDashboardData(startDate, endDate);

      expect(dashboardData.totalEnergyKwh).toBe(0);
      expect(dashboardData.carbonFootprintKg).toBe(0);
    });

    test('should throw error for invalid date range (start after end)', async () => {
      const startDate = new Date('2024-01-02T00:00:00Z');
      const endDate = new Date('2024-01-01T00:00:00Z'); // End before start

      await expect(
        carbonDashboard.getDashboardData(startDate, endDate)
      ).rejects.toThrow('Start date must be before end date');
    });
  });

  /**
   * Test savings below 10 kWh threshold
   * Requirements: 5.4
   */
  describe('Savings below 10 kWh threshold', () => {
    test('should return undefined for projected annual savings when monthly savings is 9 kWh', () => {
      const monthlySavings = 9; // Below 10 kWh threshold

      const projectedSavings = carbonDashboard.calculateProjectedAnnualSavings(monthlySavings);

      expect(projectedSavings).toBeUndefined();
    });

    test('should return undefined for projected annual savings when monthly savings is 0 kWh', () => {
      const monthlySavings = 0;

      const projectedSavings = carbonDashboard.calculateProjectedAnnualSavings(monthlySavings);

      expect(projectedSavings).toBeUndefined();
    });

    test('should return undefined for projected annual savings when monthly savings is 5 kWh', () => {
      const monthlySavings = 5;

      const projectedSavings = carbonDashboard.calculateProjectedAnnualSavings(monthlySavings);

      expect(projectedSavings).toBeUndefined();
    });

    test('should return projected savings when monthly savings is exactly 10 kWh', () => {
      const monthlySavings = 10; // Exactly at threshold

      const projectedSavings = carbonDashboard.calculateProjectedAnnualSavings(monthlySavings);

      expect(projectedSavings).toBe(120); // 10 * 12 months
    });

    test('should return projected savings when monthly savings exceeds 10 kWh', () => {
      const monthlySavings = 15;

      const projectedSavings = carbonDashboard.calculateProjectedAnnualSavings(monthlySavings);

      expect(projectedSavings).toBe(180); // 15 * 12 months
    });
  });

  /**
   * Test division by zero in percentage calculations
   * Requirements: 5.3
   */
  describe('Division by zero in percentage calculations', () => {
    test('should return 0% when both current and previous values are 0', () => {
      const currentValue = 0;
      const previousValue = 0;

      const percentageChange = carbonDashboard.calculatePercentageChange(currentValue, previousValue);

      expect(percentageChange).toBe(0);
    });

    test('should return 100% when previous value is 0 and current value is positive', () => {
      const currentValue = 50;
      const previousValue = 0;

      const percentageChange = carbonDashboard.calculatePercentageChange(currentValue, previousValue);

      expect(percentageChange).toBe(100);
    });

    test('should return 100% when previous value is 0 and current value is 1', () => {
      const currentValue = 1;
      const previousValue = 0;

      const percentageChange = carbonDashboard.calculatePercentageChange(currentValue, previousValue);

      expect(percentageChange).toBe(100);
    });

    test('should calculate normal percentage when previous value is non-zero', () => {
      const currentValue = 150;
      const previousValue = 100;

      const percentageChange = carbonDashboard.calculatePercentageChange(currentValue, previousValue);

      expect(percentageChange).toBe(50); // ((150 - 100) / 100) * 100 = 50%
    });

    test('should handle negative percentage change correctly', () => {
      const currentValue = 75;
      const previousValue = 100;

      const percentageChange = carbonDashboard.calculatePercentageChange(currentValue, previousValue);

      expect(percentageChange).toBe(-25); // ((75 - 100) / 100) * 100 = -25%
    });
  });
});
