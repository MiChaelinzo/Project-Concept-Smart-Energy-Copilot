import * as fc from 'fast-check';
import { CarbonDashboardImpl } from './CarbonDashboardImpl';
import { EnergyMonitorImpl } from '../../edge/implementations/EnergyMonitorImpl';

describe('CarbonDashboard Property-Based Tests', () => {
  
  /**
   * Feature: smart-energy-copilot, Property 12: Dashboard data completeness
   * Validates: Requirements 5.2
   * 
   * For any time period selected in the carbon dashboard, the display should include 
   * total energy consumed, energy saved, and carbon footprint metrics.
   */
  test('Property 12: Dashboard data completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random start date
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        
        // Generate random duration in days (1-30 days)
        fc.integer({ min: 1, max: 30 }),
        
        // Generate array of device IDs
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ).map(arr => [...new Set(arr)]), // Ensure unique device IDs
        
        // Generate array of consumption readings (watts)
        fc.array(
          fc.nat({ max: 3000 }), // 0 to 3000 watts
          { minLength: 5, maxLength: 20 }
        ),
        
        async (startDate, durationDays, deviceIds, wattsReadings) => {
          const energyMonitor = new EnergyMonitorImpl();
          const carbonDashboard = new CarbonDashboardImpl(energyMonitor);
          
          // Calculate end date
          const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
          
          // Record consumption for each device
          for (let i = 0; i < deviceIds.length; i++) {
            const deviceId = deviceIds[i];
            
            // Set baseline consumption for energy saved calculation
            carbonDashboard.setBaselineConsumption(deviceId, 2.0); // 2 kWh/day baseline
            
            // Record multiple readings for this device
            for (let j = 0; j < wattsReadings.length; j++) {
              const watts = wattsReadings[j];
              const timestamp = new Date(
                startDate.getTime() + 
                (i * 1000 * 60 * 60) + 
                (j * 1000 * 60 * 30) // 30 minute intervals
              );
              
              if (timestamp <= endDate) {
                energyMonitor.recordConsumption(deviceId, watts, timestamp);
              }
            }
          }
          
          // Get dashboard data
          const dashboardData = await carbonDashboard.getDashboardData(startDate, endDate);
          
          // Verify all required fields are present and valid
          expect(dashboardData).toBeDefined();
          expect(dashboardData.totalEnergyKwh).toBeDefined();
          expect(dashboardData.energySavedKwh).toBeDefined();
          expect(dashboardData.carbonFootprintKg).toBeDefined();
          expect(dashboardData.percentageChange).toBeDefined();
          expect(dashboardData.period).toBeDefined();
          expect(dashboardData.period.start).toEqual(startDate);
          expect(dashboardData.period.end).toEqual(endDate);
          
          // Verify values are non-negative
          expect(dashboardData.totalEnergyKwh).toBeGreaterThanOrEqual(0);
          expect(dashboardData.energySavedKwh).toBeGreaterThanOrEqual(0);
          expect(dashboardData.carbonFootprintKg).toBeGreaterThanOrEqual(0);
          
          // Verify carbon footprint is calculated from energy consumption
          const expectedCarbon = carbonDashboard.calculateCarbonEmissions(dashboardData.totalEnergyKwh);
          expect(Math.abs(dashboardData.carbonFootprintKg - expectedCarbon)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 13: Percentage change calculation
   * Validates: Requirements 5.3
   * 
   * For any two time periods with recorded consumption data, the displayed percentage 
   * change should equal ((period2 - period1) / period1) * 100.
   */
  test('Property 13: Percentage change calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two non-negative consumption values
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        
        async (currentValue, previousValue) => {
          const energyMonitor = new EnergyMonitorImpl();
          const carbonDashboard = new CarbonDashboardImpl(energyMonitor);
          
          // Calculate percentage change using the implementation
          const actualPercentageChange = carbonDashboard.calculatePercentageChange(
            currentValue, 
            previousValue
          );
          
          // Calculate expected percentage change using the formula
          let expectedPercentageChange: number;
          
          if (previousValue === 0) {
            // Special case: if previous was 0
            if (currentValue === 0) {
              expectedPercentageChange = 0; // No change
            } else {
              expectedPercentageChange = 100; // 100% increase
            }
          } else {
            // Standard formula: ((current - previous) / previous) * 100
            expectedPercentageChange = ((currentValue - previousValue) / previousValue) * 100;
          }
          
          // Verify the calculation matches the formula
          // Use a small tolerance for floating-point comparison
          expect(Math.abs(actualPercentageChange - expectedPercentageChange)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });
});
