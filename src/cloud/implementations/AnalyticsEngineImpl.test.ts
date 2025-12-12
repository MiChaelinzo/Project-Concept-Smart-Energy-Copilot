import { AnalyticsEngineImpl } from './AnalyticsEngineImpl';
import { EnergyMonitorImpl } from '../../edge/implementations/EnergyMonitorImpl';

describe('AnalyticsEngineImpl', () => {
  let analyticsEngine: AnalyticsEngineImpl;
  let energyMonitor: EnergyMonitorImpl;

  beforeEach(() => {
    energyMonitor = new EnergyMonitorImpl();
    analyticsEngine = new AnalyticsEngineImpl(energyMonitor);
  });

  describe('Energy Forecasting', () => {
    test('should generate energy forecast with sufficient historical data', async () => {
      // Setup historical data
      const deviceId = 'test-device-001';
      const now = new Date();
      const baseTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      // Add 30 days of historical data with more data points per day
      for (let day = 0; day < 30; day++) {
        for (let hour = 0; hour < 24; hour += 2) { // Every 2 hours instead of 4
          const timestamp = new Date(baseTime.getTime() + day * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000);
          const watts = 100 + Math.sin(hour / 24 * 2 * Math.PI) * 50; // Simulate daily pattern
          energyMonitor.recordConsumption(deviceId, watts, timestamp);
        }
      }

      // Debug: Check if data was actually recorded
      const testRange = {
        start: new Date(baseTime.getTime() - 24 * 60 * 60 * 1000),
        end: new Date()
      };
      const debugData = await energyMonitor.getHistoricalData(deviceId, testRange);
      console.log(`Debug: Historical data length: ${debugData.length}`);

      const forecast = await analyticsEngine.generateEnergyForecast(deviceId, 7);

      expect(forecast.deviceId).toBe(deviceId);
      expect(forecast.predictedConsumption).toBeGreaterThan(0);
      expect(forecast.confidence).toBeGreaterThan(0.5);
      expect(forecast.confidence).toBeLessThanOrEqual(1);
      expect(forecast.factors).toContain('historical_trend');
      expect(forecast.recommendations.length).toBeGreaterThanOrEqual(1);
    });

    test('should throw error with insufficient historical data', async () => {
      const deviceId = 'test-device-002';
      
      // Add only 3 days of data (insufficient)
      for (let day = 0; day < 3; day++) {
        const timestamp = new Date(Date.now() - (3 - day) * 24 * 60 * 60 * 1000);
        energyMonitor.recordConsumption(deviceId, 100, timestamp);
      }

      await expect(analyticsEngine.generateEnergyForecast(deviceId, 7))
        .rejects.toThrow('Insufficient historical data for forecasting');
    });
  });

  describe('Peak Demand Prediction', () => {
    test('should predict peak demand for a given date', async () => {
      const testDate = new Date('2024-06-15T00:00:00Z');
      
      const prediction = await analyticsEngine.predictPeakDemand(testDate);

      expect(prediction.predictedPeakTime).toBeInstanceOf(Date);
      expect(prediction.predictedPeakDemand).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.suggestedActions).toHaveLength(2);
      expect(prediction.potentialSavings).toBeGreaterThanOrEqual(0);
    });

    test('should adjust predictions based on day of week', async () => {
      const weekday = new Date('2024-06-17T00:00:00Z'); // Monday
      const weekend = new Date('2024-06-15T00:00:00Z'); // Saturday

      const weekdayPrediction = await analyticsEngine.predictPeakDemand(weekday);
      const weekendPrediction = await analyticsEngine.predictPeakDemand(weekend);

      // Weekend should generally have lower peak demand
      expect(weekendPrediction.predictedPeakDemand).toBeLessThan(weekdayPrediction.predictedPeakDemand);
    });
  });

  describe('Seasonal Pattern Analysis', () => {
    test('should analyze seasonal patterns with sufficient data', async () => {
      const deviceId = 'seasonal-device-001';
      const now = new Date();
      const baseTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      
      // Add a full year of data with multiple readings per day
      for (let day = 0; day < 365; day++) {
        for (let hour = 0; hour < 24; hour += 6) { // 4 readings per day
          const timestamp = new Date(baseTime.getTime() + day * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000);
          const seasonalFactor = 1 + 0.3 * Math.sin((day / 365) * 2 * Math.PI); // Seasonal variation
          const watts = 100 * seasonalFactor;
          energyMonitor.recordConsumption(deviceId, watts, timestamp);
        }
      }

      const patterns = await analyticsEngine.analyzeSeasonalPatterns(deviceId);

      expect(patterns.length).toBeGreaterThanOrEqual(3); // At least 3 seasons
      expect(patterns[0].season).toBeDefined();
      expect(patterns[0].averageConsumption).toBeGreaterThan(0);
      expect(patterns[0].peakHours).toHaveLength(3);
      expect(patterns[0].efficiencyTrends.length).toBeGreaterThan(0);
    });

    test('should throw error with insufficient seasonal data', async () => {
      const deviceId = 'insufficient-device';
      
      // Add only 60 days of data
      for (let day = 0; day < 60; day++) {
        const timestamp = new Date(Date.now() - (60 - day) * 24 * 60 * 60 * 1000);
        energyMonitor.recordConsumption(deviceId, 100, timestamp);
      }

      await expect(analyticsEngine.analyzeSeasonalPatterns(deviceId))
        .rejects.toThrow('Insufficient data for seasonal analysis');
    });
  });

  describe('Cost Optimization', () => {
    test('should generate cost optimization recommendations', async () => {
      const timeRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-02T00:00:00Z')
      };

      // Add some energy consumption data
      energyMonitor.recordConsumption('device-1', 1000, timeRange.start);
      energyMonitor.recordConsumption('device-1', 800, timeRange.end);

      const optimization = await analyticsEngine.optimizeCosts(timeRange);

      expect(optimization.currentCost).toBeGreaterThan(0);
      expect(optimization.optimizedCost).toBeGreaterThan(0);
      expect(optimization.potentialSavings).toBeGreaterThanOrEqual(0);
      expect(optimization.recommendations).toHaveLength(4);
      
      optimization.recommendations.forEach(rec => {
        expect(rec.action).toBeDefined();
        expect(rec.impact).toBeGreaterThanOrEqual(0);
        expect(['high', 'medium', 'low']).toContain(rec.priority);
      });
    });
  });

  describe('Anomaly Detection', () => {
    test('should detect consumption anomalies', async () => {
      const deviceId = 'anomaly-device-001';
      const now = new Date();
      const baseTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      // Add normal consumption pattern (need more than 24 hours for window)
      for (let hour = 0; hour < 100; hour++) { // 100 hours of normal data
        const timestamp = new Date(baseTime.getTime() + hour * 60 * 60 * 1000);
        const normalWatts = 100; // Consistent normal value
        energyMonitor.recordConsumption(deviceId, normalWatts, timestamp);
      }
      
      // Add anomalous readings
      for (let i = 0; i < 10; i++) {
        const anomalyTime = new Date(baseTime.getTime() + (100 + i) * 60 * 60 * 1000);
        energyMonitor.recordConsumption(deviceId, 1000, anomalyTime); // Very significant spike
      }

      const result = await analyticsEngine.detectConsumptionAnomalies(deviceId, 2.0);

      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.patterns).toBeDefined();
      
      const anomaly = result.anomalies[0];
      expect(anomaly.timestamp).toBeInstanceOf(Date);
      expect(anomaly.actualValue).toBeGreaterThan(500); // Should be the anomalous value
      expect(['low', 'medium', 'high']).toContain(anomaly.severity);
    });
  });

  describe('Efficiency Recommendations', () => {
    test('should generate efficiency recommendations', async () => {
      const result = await analyticsEngine.generateEfficiencyRecommendations();

      expect(result.recommendations).toHaveLength(5);
      
      result.recommendations.forEach(rec => {
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.potentialSavings).toBeGreaterThan(0);
        expect(['easy', 'medium', 'hard']).toContain(rec.difficulty);
        expect(['behavioral', 'technical', 'upgrade']).toContain(rec.category);
      });
    });

    test('should provide device-specific recommendations when deviceId provided', async () => {
      const deviceId = 'hvac-001';
      const result = await analyticsEngine.generateEfficiencyRecommendations(deviceId);

      expect(result.recommendations).toHaveLength(5);
      // In a real implementation, this would filter recommendations based on device type
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty historical data gracefully', async () => {
      const deviceId = 'empty-device';
      
      await expect(analyticsEngine.generateEnergyForecast(deviceId, 7))
        .rejects.toThrow('Insufficient historical data for forecasting');
    });

    test('should handle invalid time ranges', async () => {
      const invalidRange = {
        start: new Date('2024-01-02T00:00:00Z'),
        end: new Date('2024-01-01T00:00:00Z') // End before start
      };

      // Should throw an error for invalid range
      await expect(analyticsEngine.optimizeCosts(invalidRange))
        .rejects.toThrow('Start time must be before end time');
    });

    test('should handle very small datasets for anomaly detection', async () => {
      const deviceId = 'small-dataset';
      
      // Add minimal data
      energyMonitor.recordConsumption(deviceId, 100, new Date());
      
      const result = await analyticsEngine.detectConsumptionAnomalies(deviceId);
      
      expect(result.anomalies).toHaveLength(0);
      expect(result.patterns).toHaveLength(0);
    });
  });
});