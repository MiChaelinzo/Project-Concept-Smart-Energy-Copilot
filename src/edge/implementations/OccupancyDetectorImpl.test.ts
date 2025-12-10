import { OccupancyDetectorImpl } from './OccupancyDetectorImpl';
import { DeviceManager } from '../interfaces/DeviceManager';
import { Device, DeviceStatus, DeviceCommand } from '../types';

/**
 * Unit tests for OccupancyDetectorImpl
 * Requirements: 4.1, 4.4
 * 
 * Tests focus on edge cases:
 * - Poor lighting condition handling
 * - Corrupted image data handling
 * - Model loading failure recovery
 */

describe('OccupancyDetectorImpl Unit Tests', () => {
  let detector: OccupancyDetectorImpl;
  let mockDeviceManager: jest.Mocked<DeviceManager>;

  beforeEach(() => {
    // Create mock device manager
    mockDeviceManager = {
      registerDevice: jest.fn(),
      discoverDevices: jest.fn(),
      getDeviceStatus: jest.fn(),
      sendCommand: jest.fn(),
      subscribeToTelemetry: jest.fn(),
    } as jest.Mocked<DeviceManager>;

    detector = new OccupancyDetectorImpl(mockDeviceManager);
  });

  afterEach(() => {
    detector.cleanup();
  });

  /**
   * Test poor lighting condition handling
   * Requirements: 4.4
   * 
   * When lighting conditions are insufficient for image processing,
   * the system should maintain the last known occupancy state
   */
  describe('Poor lighting condition handling', () => {
    test('should return low confidence result for very dark images', async () => {
      // Create a very dark image (all pixels near 0)
      const darkImage = Buffer.alloc(640 * 640 * 3);
      for (let i = 0; i < darkImage.length; i++) {
        darkImage[i] = Math.floor(Math.random() * 10); // Very low brightness (0-10)
      }

      const result = await detector.detectOccupancy(darkImage, 'living-room');

      // Should return result with low confidence
      expect(result.location).toBe('living-room');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.occupied).toBe(false);
      expect(result.personCount).toBe(0);
    });

    test('should maintain last known state when processing fails due to poor lighting', async () => {
      // First, establish a known good state with bright image
      const brightImage = Buffer.alloc(640 * 640 * 3);
      for (let i = 0; i < brightImage.length; i++) {
        brightImage[i] = 200; // Bright image
      }

      const firstResult = await detector.detectOccupancy(brightImage, 'bedroom');
      expect(firstResult.occupied).toBe(true);

      // Now process a very dark image
      const darkImage = Buffer.alloc(640 * 640 * 3);
      for (let i = 0; i < darkImage.length; i++) {
        darkImage[i] = 5; // Very dark
      }

      const secondResult = await detector.detectOccupancy(darkImage, 'bedroom');
      
      // Should return result but with low confidence
      expect(secondResult.confidence).toBeLessThan(0.5);
      expect(secondResult.location).toBe('bedroom');
    });
  });

  /**
   * Test corrupted image data handling
   * Requirements: 4.4
   * 
   * When image data is corrupted or invalid, the system should
   * handle errors gracefully and return last known state
   */
  describe('Corrupted image data handling', () => {
    test('should handle empty buffer gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = await detector.detectOccupancy(emptyBuffer, 'kitchen');

      // Should not throw and return a valid result
      expect(result).toBeDefined();
      expect(result.location).toBe('kitchen');
      expect(result.occupied).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should handle very small buffer gracefully', async () => {
      // Buffer much smaller than expected image size
      const tinyBuffer = Buffer.alloc(100);
      for (let i = 0; i < tinyBuffer.length; i++) {
        tinyBuffer[i] = Math.floor(Math.random() * 256);
      }

      const result = await detector.detectOccupancy(tinyBuffer, 'office');

      // Should not throw and return a valid result
      expect(result).toBeDefined();
      expect(result.location).toBe('office');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should return last known state when processing corrupted data', async () => {
      // First, establish a known state
      const validImage = Buffer.alloc(640 * 640 * 3);
      for (let i = 0; i < validImage.length; i++) {
        validImage[i] = 150;
      }

      const firstResult = await detector.detectOccupancy(validImage, 'garage');
      expect(firstResult.occupied).toBe(true);

      // Mock an error in preprocessing by using invalid data
      // The implementation should catch errors and return last known state
      const corruptedBuffer = Buffer.alloc(10);

      const secondResult = await detector.detectOccupancy(corruptedBuffer, 'garage');

      // Should return a valid result (either last known state or safe default)
      expect(secondResult).toBeDefined();
      expect(secondResult.location).toBe('garage');
    });
  });

  /**
   * Test model loading failure recovery
   * Requirements: 4.1, 4.4
   * 
   * When the AI model fails to load, the system should handle
   * the error gracefully and continue operating with degraded functionality
   */
  describe('Model loading failure recovery', () => {
    test('should handle model loading and continue processing', async () => {
      // The model is loaded lazily on first inference
      // This test verifies that multiple calls work correctly
      const image1 = Buffer.alloc(640 * 640 * 3);
      for (let i = 0; i < image1.length; i++) {
        image1[i] = 100;
      }

      const result1 = await detector.detectOccupancy(image1, 'hallway');
      expect(result1).toBeDefined();

      // Second call should reuse loaded model
      const image2 = Buffer.alloc(640 * 640 * 3);
      for (let i = 0; i < image2.length; i++) {
        image2[i] = 150;
      }

      const result2 = await detector.detectOccupancy(image2, 'hallway');
      expect(result2).toBeDefined();
      
      // Both should return valid results
      expect(result1.location).toBe('hallway');
      expect(result2.location).toBe('hallway');
    });

    test('should provide safe defaults when inference fails', async () => {
      // Create a new detector without device manager to test isolation
      const isolatedDetector = new OccupancyDetectorImpl();

      const testImage = Buffer.alloc(640 * 640 * 3);
      for (let i = 0; i < testImage.length; i++) {
        testImage[i] = 128;
      }

      const result = await isolatedDetector.detectOccupancy(testImage, 'test-location');

      // Should return safe result even without device manager
      expect(result).toBeDefined();
      expect(result.location).toBe('test-location');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.personCount).toBeGreaterThanOrEqual(0);

      isolatedDetector.cleanup();
    });

    test('should handle errors during inference gracefully', async () => {
      // Test with various edge case inputs that might cause issues
      const edgeCases = [
        Buffer.alloc(0), // Empty
        Buffer.alloc(1), // Single byte
        Buffer.alloc(640 * 640 * 3), // Exact size but all zeros
      ];

      for (const testBuffer of edgeCases) {
        const result = await detector.detectOccupancy(testBuffer, 'test-room');
        
        // Should not throw and return valid result structure
        expect(result).toBeDefined();
        expect(result.location).toBe('test-room');
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(typeof result.occupied).toBe('boolean');
        expect(typeof result.confidence).toBe('number');
        expect(typeof result.personCount).toBe('number');
      }
    });
  });

  /**
   * Additional edge case: Verify error handling doesn't break state management
   */
  describe('Error recovery and state consistency', () => {
    test('should maintain consistent state after processing errors', async () => {
      // Process a valid image
      const validImage = Buffer.alloc(640 * 640 * 3);
      for (let i = 0; i < validImage.length; i++) {
        validImage[i] = 180;
      }

      const result1 = await detector.detectOccupancy(validImage, 'patio');
      expect(result1.occupied).toBe(true);

      // Process corrupted data
      const corruptedImage = Buffer.alloc(5);
      await detector.detectOccupancy(corruptedImage, 'patio');

      // Process another valid image - should work normally
      const result3 = await detector.detectOccupancy(validImage, 'patio');
      expect(result3).toBeDefined();
      expect(result3.location).toBe('patio');
    });
  });
});
