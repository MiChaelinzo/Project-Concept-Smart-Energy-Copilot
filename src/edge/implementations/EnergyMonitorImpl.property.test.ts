import * as fc from 'fast-check';
import { EnergyMonitorImpl } from './EnergyMonitorImpl';
import { TimeRange } from '../interfaces/EnergyMonitor';

describe('EnergyMonitor Property-Based Tests', () => {
  
  /**
   * Feature: smart-energy-copilot, Property 2: Consumption data accuracy
   * Validates: Requirements 1.3, 1.4
   * 
   * For any registered device with recorded energy consumption, querying that device 
   * should return the correct consumption value in kilowatt-hours, and aggregating 
   * multiple devices should return the correct sum.
   */
  test('Property 2: Consumption data accuracy - individual queries and aggregation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of device IDs
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 10 }
        ).map(arr => [...new Set(arr)]), // Ensure unique device IDs
        
        // Generate array of consumption readings (watts)
        fc.array(
          fc.nat({ max: 5000 }), // 0 to 5000 watts
          { minLength: 1, maxLength: 20 }
        ),
        
        async (deviceIds, wattsReadings) => {
          const monitor = new EnergyMonitorImpl();
          const baseTime = new Date('2024-01-01T00:00:00Z');
          
          // Record consumption for each device
          const deviceConsumptions: Map<string, number> = new Map();
          
          for (let i = 0; i < deviceIds.length; i++) {
            const deviceId = deviceIds[i];
            let totalWatts = 0;
            
            // Record multiple readings for this device
            for (let j = 0; j < wattsReadings.length; j++) {
              const watts = wattsReadings[j];
              const timestamp = new Date(baseTime.getTime() + (i * 1000 * 60 * 60) + (j * 1000 * 60));
              monitor.recordConsumption(deviceId, watts, timestamp);
              totalWatts = watts; // Last reading is current consumption
            }
            
            deviceConsumptions.set(deviceId, totalWatts);
          }
          
          // Test 1: Individual device queries return correct current consumption
          for (const [deviceId, expectedWatts] of deviceConsumptions.entries()) {
            const actualWatts = await monitor.getCurrentConsumption(deviceId);
            expect(actualWatts).toBe(expectedWatts);
          }
          
          // Test 2: Aggregate total consumption across all devices
          const timeRange: TimeRange = {
            start: new Date(baseTime.getTime() - 1000),
            end: new Date(baseTime.getTime() + 1000 * 60 * 60 * 24)
          };
          
          const totalConsumption = await monitor.getTotalConsumption(timeRange);
          
          // Calculate expected total by summing individual device consumptions
          let expectedTotal = 0;
          for (const deviceId of deviceIds) {
            const historicalData = await monitor.getHistoricalData(deviceId, timeRange);
            if (historicalData.length > 0) {
              const lastReading = historicalData[historicalData.length - 1];
              expectedTotal += lastReading.cumulativeKwh;
            }
          }
          
          // Allow small floating point differences
          expect(Math.abs(totalConsumption - expectedTotal)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 11: Carbon calculation accuracy
   * Validates: Requirements 5.1
   * 
   * For any energy consumption value in kilowatt-hours, the calculated carbon emissions 
   * should equal the consumption multiplied by the standard conversion factor (0.92 lbs CO2/kWh).
   */
  test('Property 11: Carbon calculation accuracy', () => {
    fc.assert(
      fc.property(
        // Generate random energy consumption values in kWh
        fc.float({ min: 0, max: 10000, noNaN: true }),
        
        (energyKwh) => {
          const monitor = new EnergyMonitorImpl();
          const EXPECTED_CONVERSION_FACTOR = 0.92;
          
          const carbonFootprint = monitor.calculateCarbonFootprint(energyKwh);
          const expectedCarbon = energyKwh * EXPECTED_CONVERSION_FACTOR;
          
          // Allow small floating point differences
          expect(Math.abs(carbonFootprint - expectedCarbon)).toBeLessThan(0.0001);
        }
      ),
      { numRuns: 100 }
    );
  });
});
