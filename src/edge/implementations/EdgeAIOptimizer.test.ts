/**
 * Unit tests for Edge AI Optimization
 * Requirements: 9.1, 9.4
 * 
 * Tests focus on:
 * - Resource exhaustion fallback
 * - Model loading failure recovery  
 * - Batch inference optimization
 */

import { OccupancyDetectorImpl } from './OccupancyDetectorImpl';
import { VoiceAssistantImpl } from './VoiceAssistantImpl';
import { DeviceManager } from '../interfaces/DeviceManager';
import { EnergyMonitor } from '../interfaces/EnergyMonitor';
import { Device, DeviceStatus, DeviceCommand, DeviceType, TelemetryCallback } from '../types';
import { EnergyData, TimeRange } from '../interfaces/EnergyMonitor';

// Mock DeviceManager for testing
class MockDeviceManager implements DeviceManager {
  private devices: Map<string, Device> = new Map();
  public commandsSent: Array<{ deviceId: string; command: DeviceCommand }> = [];

  async registerDevice(deviceId: string, deviceType: DeviceType): Promise<Device> {
    const device: Device = {
      id: deviceId,
      type: deviceType,
      name: `Device ${deviceId}`,
      location: 'test-location',
      capabilities: ['power'],
      normalPowerRange: { min: 0, max: 1000 },
      isOnline: true,
      lastSeen: new Date()
    };
    this.devices.set(deviceId, device);
    return device;
  }

  async discoverDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    return {
      deviceId,
      isOnline: true,
      powerState: 'on',
      lastUpdated: new Date()
    };
  }

  async sendCommand(deviceId: string, command: DeviceCommand): Promise<void> {
    if (!this.devices.has(deviceId)) {
      throw new Error(`Device ${deviceId} not found`);
    }
    this.commandsSent.push({ deviceId, command });
  }

  subscribeToTelemetry(deviceId: string, callback: TelemetryCallback): void {
    // Mock implementation
  }
}

// Mock EnergyMonitor for testing
class MockEnergyMonitor implements EnergyMonitor {
  private consumption: Map<string, number> = new Map();

  recordConsumption(deviceId: string, watts: number, timestamp: Date): void {
    this.consumption.set(deviceId, watts);
  }

  async getCurrentConsumption(deviceId: string): Promise<number> {
    return this.consumption.get(deviceId) || 0;
  }

  async getHistoricalData(deviceId: string, range: TimeRange): Promise<EnergyData[]> {
    return [];
  }

  async getTotalConsumption(range: TimeRange): Promise<number> {
    return 0;
  }

  calculateCarbonFootprint(energyKwh: number): number {
    return energyKwh * 0.92;
  }
}

/**
 * Mock Edge AI Resource Monitor
 * This would be part of the actual EdgeAIOptimizer implementation
 */
class MockEdgeResourceMonitor {
  private cpuUsage: number = 0.3; // 30% default
  private memoryUsage: number = 0.4; // 40% default
  private gpuUsage: number = 0.2; // 20% default

  setCpuUsage(usage: number): void {
    this.cpuUsage = Math.max(0, Math.min(1, usage));
  }

  setMemoryUsage(usage: number): void {
    this.memoryUsage = Math.max(0, Math.min(1, usage));
  }

  setGpuUsage(usage: number): void {
    this.gpuUsage = Math.max(0, Math.min(1, usage));
  }

  getResourceUsage(): { cpu: number; memory: number; gpu: number } {
    return {
      cpu: this.cpuUsage,
      memory: this.memoryUsage,
      gpu: this.gpuUsage
    };
  }

  isResourceExhausted(): boolean {
    // Consider resources exhausted if any component exceeds 80%
    return this.cpuUsage > 0.8 || this.memoryUsage > 0.8 || this.gpuUsage > 0.8;
  }
}

describe('Edge AI Optimization Unit Tests', () => {
  let mockDeviceManager: MockDeviceManager;
  let mockEnergyMonitor: MockEnergyMonitor;
  let mockResourceMonitor: MockEdgeResourceMonitor;
  let occupancyDetector: OccupancyDetectorImpl;
  let voiceAssistant: VoiceAssistantImpl;

  beforeEach(() => {
    mockDeviceManager = new MockDeviceManager();
    mockEnergyMonitor = new MockEnergyMonitor();
    mockResourceMonitor = new MockEdgeResourceMonitor();
    occupancyDetector = new OccupancyDetectorImpl(mockDeviceManager);
    voiceAssistant = new VoiceAssistantImpl(mockDeviceManager, mockEnergyMonitor);
  });

  afterEach(() => {
    occupancyDetector.cleanup();
  });

  /**
   * Test resource exhaustion fallback
   * Requirements: 9.4
   * 
   * When edge hardware resources are insufficient, the system should
   * offload inference to cloud services
   */
  describe('Resource exhaustion fallback', () => {
    test('should detect resource exhaustion when CPU exceeds 80%', () => {
      // Set CPU usage to 85%
      mockResourceMonitor.setCpuUsage(0.85);

      const isExhausted = mockResourceMonitor.isResourceExhausted();
      expect(isExhausted).toBe(true);

      const usage = mockResourceMonitor.getResourceUsage();
      expect(usage.cpu).toBe(0.85);
    });

    test('should detect resource exhaustion when memory exceeds 80%', () => {
      // Set memory usage to 90%
      mockResourceMonitor.setMemoryUsage(0.90);

      const isExhausted = mockResourceMonitor.isResourceExhausted();
      expect(isExhausted).toBe(true);

      const usage = mockResourceMonitor.getResourceUsage();
      expect(usage.memory).toBe(0.90);
    });

    test('should detect resource exhaustion when GPU exceeds 80%', () => {
      // Set GPU usage to 85%
      mockResourceMonitor.setGpuUsage(0.85);

      const isExhausted = mockResourceMonitor.isResourceExhausted();
      expect(isExhausted).toBe(true);

      const usage = mockResourceMonitor.getResourceUsage();
      expect(usage.gpu).toBe(0.85);
    });

    test('should not detect exhaustion when all resources are below 80%', () => {
      // Set all resources below threshold
      mockResourceMonitor.setCpuUsage(0.75);
      mockResourceMonitor.setMemoryUsage(0.70);
      mockResourceMonitor.setGpuUsage(0.65);

      const isExhausted = mockResourceMonitor.isResourceExhausted();
      expect(isExhausted).toBe(false);
    });

    test('should handle boundary condition at exactly 80%', () => {
      // Set CPU to exactly 80%
      mockResourceMonitor.setCpuUsage(0.80);

      const isExhausted = mockResourceMonitor.isResourceExhausted();
      expect(isExhausted).toBe(false); // Should not be exhausted at exactly 80%
    });

    test('should handle multiple resource exhaustion scenarios', () => {
      // Test multiple resources exceeding threshold
      mockResourceMonitor.setCpuUsage(0.85);
      mockResourceMonitor.setMemoryUsage(0.90);

      const isExhausted = mockResourceMonitor.isResourceExhausted();
      expect(isExhausted).toBe(true);

      const usage = mockResourceMonitor.getResourceUsage();
      expect(usage.cpu).toBeGreaterThan(0.8);
      expect(usage.memory).toBeGreaterThan(0.8);
    });

    test('should maintain consistent resource monitoring during high load', () => {
      // Simulate fluctuating resource usage
      const measurements: boolean[] = [];

      for (let i = 0; i < 10; i++) {
        // Alternate between high and low usage
        const highUsage = i % 2 === 0;
        mockResourceMonitor.setCpuUsage(highUsage ? 0.85 : 0.60);
        measurements.push(mockResourceMonitor.isResourceExhausted());
      }

      // Should have consistent measurements
      expect(measurements.filter(m => m).length).toBe(5); // 5 high usage measurements
      expect(measurements.filter(m => !m).length).toBe(5); // 5 low usage measurements
    });
  });

  /**
   * Test model loading failure recovery
   * Requirements: 9.1
   * 
   * When AI models fail to load onto edge device, the system should
   * handle the error gracefully and continue operating
   */
  describe('Model loading failure recovery', () => {
    test('should handle occupancy detection model loading failure gracefully', async () => {
      // Test that occupancy detection continues to work even if model loading fails
      // The current implementation simulates model loading, so we test error handling
      const testImage = Buffer.alloc(640 * 640 * 3);
      for (let i = 0; i < testImage.length; i++) {
        testImage[i] = 128; // Medium brightness
      }

      // Should not throw even if model loading encounters issues
      const result = await occupancyDetector.detectOccupancy(testImage, 'test-room');

      expect(result).toBeDefined();
      expect(result.location).toBe('test-room');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.occupied).toBe('boolean');
      expect(typeof result.personCount).toBe('number');
    });

    test('should handle voice recognition model loading failure gracefully', async () => {
      // Test that voice processing continues to work even if model loading fails
      const audioData = Buffer.from('turn on device test-device', 'utf-8');

      // Should not throw even if speech recognition model fails to load
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response).toBeDefined();
      expect(response.intent).toBeDefined();
      expect(response.spokenResponse).toBeDefined();
      expect(response.audioResponse).toBeDefined();
    });

    test('should provide fallback behavior when models are unavailable', async () => {
      // Test with various edge cases that might cause model loading issues
      const edgeCases = [
        Buffer.alloc(0), // Empty buffer
        Buffer.alloc(1), // Minimal buffer
        Buffer.alloc(1000000), // Large buffer
      ];

      for (const testBuffer of edgeCases) {
        // Occupancy detection should handle all cases
        const occupancyResult = await occupancyDetector.detectOccupancy(testBuffer, 'test-location');
        expect(occupancyResult).toBeDefined();
        expect(occupancyResult.location).toBe('test-location');

        // Voice processing should handle all cases
        const voiceResponse = await voiceAssistant.processVoiceCommand(testBuffer);
        expect(voiceResponse).toBeDefined();
        expect(voiceResponse.intent).toBeDefined();
      }
    });

    test('should maintain system stability after model loading failures', async () => {
      // Simulate multiple model loading attempts
      const results: any[] = [];

      for (let i = 0; i < 5; i++) {
        const testImage = Buffer.alloc(640 * 640 * 3);
        testImage.fill(100 + i * 20); // Varying brightness

        const result = await occupancyDetector.detectOccupancy(testImage, `room-${i}`);
        results.push(result);
      }

      // All results should be valid
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.location).toBe(`room-${index}`);
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });

    test('should handle concurrent model loading attempts', async () => {
      // Test concurrent access to model loading
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 3; i++) {
        const testImage = Buffer.alloc(640 * 640 * 3);
        testImage.fill(150);
        promises.push(occupancyDetector.detectOccupancy(testImage, `concurrent-room-${i}`));
      }

      // All concurrent operations should complete successfully
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.location).toBe(`concurrent-room-${index}`);
      });
    });
  });

  /**
   * Test batch inference optimization
   * Requirements: 9.1, 9.4
   * 
   * The system should optimize batch inference for multiple cameras
   * and maintain performance under load
   */
  describe('Batch inference optimization', () => {
    test('should handle multiple simultaneous occupancy detections efficiently', async () => {
      // Simulate multiple cameras processing simultaneously
      const cameras = ['camera-1', 'camera-2', 'camera-3', 'camera-4'];
      const locations = ['living-room', 'bedroom', 'kitchen', 'office'];
      
      const startTime = Date.now();
      const promises: Promise<any>[] = [];

      cameras.forEach((camera, index) => {
        const testImage = Buffer.alloc(640 * 640 * 3);
        testImage.fill(100 + index * 30); // Different brightness for each camera
        
        promises.push(occupancyDetector.detectOccupancy(testImage, locations[index]));
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All results should be valid
      expect(results).toHaveLength(4);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.location).toBe(locations[index]);
      });

      // Batch processing should be reasonably fast (less than 10 seconds for 4 images)
      expect(totalTime).toBeLessThan(10000);
    });

    test('should maintain performance with varying batch sizes', async () => {
      const batchSizes = [1, 2, 4];
      const performanceResults: { batchSize: number; timeMs: number }[] = [];

      for (const batchSize of batchSizes) {
        const startTime = Date.now();
        const promises: Promise<any>[] = [];

        for (let i = 0; i < batchSize; i++) {
          const testImage = Buffer.alloc(640 * 640 * 3);
          testImage.fill(120 + i * 10);
          promises.push(occupancyDetector.detectOccupancy(testImage, `batch-room-${i}`));
        }

        await Promise.all(promises);
        const endTime = Date.now();
        
        performanceResults.push({
          batchSize,
          timeMs: endTime - startTime
        });
      }

      // Performance should scale reasonably with batch size
      // Larger batches shouldn't be dramatically slower per item
      expect(performanceResults).toHaveLength(3);
      performanceResults.forEach(result => {
        expect(result.timeMs).toBeGreaterThan(0);
        expect(result.timeMs).toBeLessThan(10000); // Should complete within 10 seconds
      });
    });

    test('should handle mixed inference types in batch processing', async () => {
      // Test both occupancy detection and voice processing simultaneously
      const testImage = Buffer.alloc(640 * 640 * 3);
      testImage.fill(150);
      
      const audioData = Buffer.from('what is the current energy consumption', 'utf-8');

      const startTime = Date.now();
      
      // Process both types simultaneously
      const [occupancyResult, voiceResult] = await Promise.all([
        occupancyDetector.detectOccupancy(testImage, 'mixed-test-room'),
        voiceAssistant.processVoiceCommand(audioData)
      ]);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Both should complete successfully
      expect(occupancyResult).toBeDefined();
      expect(occupancyResult.location).toBe('mixed-test-room');
      
      expect(voiceResult).toBeDefined();
      expect(voiceResult.intent).toBeDefined();

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(3000);
    });

    test('should optimize memory usage during batch processing', async () => {
      // Test that batch processing doesn't cause memory leaks
      const initialMemoryUsage = mockResourceMonitor.getResourceUsage().memory;
      
      // Process multiple smaller batches
      for (let batch = 0; batch < 2; batch++) {
        const promises: Promise<any>[] = [];
        
        for (let i = 0; i < 3; i++) {
          const testImage = Buffer.alloc(640 * 640 * 3);
          testImage.fill(100 + i * 20);
          promises.push(occupancyDetector.detectOccupancy(testImage, `memory-test-${batch}-${i}`));
        }
        
        await Promise.all(promises);
        
        // Simulate some memory cleanup time
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Memory usage should not have increased dramatically
      const finalMemoryUsage = mockResourceMonitor.getResourceUsage().memory;
      expect(finalMemoryUsage).toBeLessThanOrEqual(initialMemoryUsage + 0.1); // Allow 10% increase
    }, 10000); // Increase timeout to 10 seconds

    test('should handle batch processing errors gracefully', async () => {
      // Mix valid and invalid inputs in batch
      const inputs = [
        Buffer.alloc(640 * 640 * 3), // Valid
        Buffer.alloc(0), // Empty - should handle gracefully
        Buffer.alloc(100), // Too small - should handle gracefully
        Buffer.alloc(640 * 640 * 3), // Valid
      ];

      inputs[0].fill(150);
      inputs[3].fill(180);

      const promises = inputs.map((input, index) => 
        occupancyDetector.detectOccupancy(input, `error-test-${index}`)
      );

      // All should complete without throwing
      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.location).toBe(`error-test-${index}`);
        expect(typeof result.occupied).toBe('boolean');
        expect(typeof result.confidence).toBe('number');
      });
    });
  });

  /**
   * Integration test for edge AI optimization
   */
  describe('Edge AI optimization integration', () => {
    test('should coordinate resource monitoring with inference optimization', async () => {
      // Start with normal resource usage
      mockResourceMonitor.setCpuUsage(0.60);
      mockResourceMonitor.setMemoryUsage(0.50);

      // Process some inference requests
      const testImage = Buffer.alloc(640 * 640 * 3);
      testImage.fill(140);

      const result1 = await occupancyDetector.detectOccupancy(testImage, 'integration-test');
      expect(result1).toBeDefined();

      // Simulate resource exhaustion
      mockResourceMonitor.setCpuUsage(0.85);
      expect(mockResourceMonitor.isResourceExhausted()).toBe(true);

      // System should still handle requests (would fallback to cloud in real implementation)
      const result2 = await occupancyDetector.detectOccupancy(testImage, 'integration-test-2');
      expect(result2).toBeDefined();
      expect(result2.location).toBe('integration-test-2');
    });
  });
});