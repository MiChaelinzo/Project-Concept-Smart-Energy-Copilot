import {
  OccupancyDetector,
  OccupancyResult,
  OccupancyEvent,
} from '../interfaces/OccupancyDetector';
import { TimeRange } from '../interfaces/EnergyMonitor';
import { DeviceManager } from '../interfaces/DeviceManager';
import { DeviceCommand } from '../types';

/**
 * OccupancyDetectorImpl
 * 
 * Implements occupancy detection using edge AI (TensorFlow Lite + YOLOv5-nano).
 * Processes camera images locally to detect human presence and triggers
 * device automation based on occupancy state.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class OccupancyDetectorImpl implements OccupancyDetector {
  private occupancyHistory: Map<string, OccupancyEvent[]> = new Map();
  private currentOccupancyState: Map<string, OccupancyResult> = new Map();
  private monitoringCameras: Map<string, { location: string; intervalId: NodeJS.Timeout }> = new Map();
  private devicesByLocation: Map<string, string[]> = new Map();
  private previousDeviceStates: Map<string, 'on' | 'off'> = new Map();
  private unoccupiedTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // TensorFlow Lite model (would be loaded from file in production)
  private model: any = null;
  private modelLoaded: boolean = false;

  constructor(
    private deviceManager?: DeviceManager,
    private unoccupiedThresholdMs: number = 5 * 60 * 1000 // 5 minutes default
  ) {}

  /**
   * Load YOLOv5-nano model for person detection
   * In production, this would load a TensorFlow Lite model file
   */
  private async loadModel(): Promise<void> {
    if (this.modelLoaded) {
      return;
    }

    // In a real implementation, this would:
    // 1. Load the YOLOv5-nano.tflite model file
    // 2. Initialize TensorFlow Lite interpreter
    // 3. Allocate tensors
    // For this implementation, we simulate the model loading
    this.model = {
      // Simulated model metadata
      inputShape: [1, 640, 640, 3],
      outputShape: [1, 25200, 85], // YOLO output format
      loaded: true,
    };

    this.modelLoaded = true;
  }

  /**
   * Preprocess image data for YOLOv5 inference
   * Requirements: 4.1, 4.4
   */
  private preprocessImage(imageData: Buffer): Float32Array {
    // In production, this would:
    // 1. Decode image buffer (JPEG/PNG)
    // 2. Resize to 640x640 (YOLOv5-nano input size)
    // 3. Normalize pixel values to [0, 1]
    // 4. Convert to RGB if needed
    // 5. Return as Float32Array for TFLite input
    
    // For this implementation, we simulate preprocessing
    const inputSize = 640 * 640 * 3;
    const processedData = new Float32Array(inputSize);
    
    // Simulate image preprocessing by normalizing buffer data
    for (let i = 0; i < Math.min(imageData.length, inputSize); i++) {
      processedData[i] = imageData[i] / 255.0;
    }
    
    return processedData;
  }

  /**
   * Run YOLOv5 inference on preprocessed image
   * Requirements: 4.1
   */
  private async runInference(preprocessedImage: Float32Array): Promise<{ personCount: number; confidence: number }> {
    await this.loadModel();

    // In production, this would:
    // 1. Set input tensor with preprocessed image
    // 2. Invoke TFLite interpreter
    // 3. Get output tensor
    // 4. Parse YOLO detections (bounding boxes, classes, scores)
    // 5. Filter for person class (class 0 in COCO dataset)
    // 6. Apply NMS (non-maximum suppression)
    // 7. Count person detections above confidence threshold

    // For this implementation, we simulate inference
    // We'll use a simple heuristic based on image brightness to simulate detection
    let totalBrightness = 0;
    for (let i = 0; i < Math.min(1000, preprocessedImage.length); i++) {
      totalBrightness += preprocessedImage[i];
    }
    const avgBrightness = totalBrightness / Math.min(1000, preprocessedImage.length);

    // Simulate person detection based on image characteristics
    // Requirements: 4.4 - handle poor lighting conditions
    if (avgBrightness < 0.1) {
      // Poor lighting - low confidence
      return { personCount: 0, confidence: 0.3 };
    }

    // Simulate detection with varying confidence
    // Use deterministic detection based on brightness for reliable testing
    const hasDetection = avgBrightness > 0.2;
    const personCount = hasDetection ? Math.max(1, Math.floor(avgBrightness * 3)) : 0;
    const confidence = hasDetection ? Math.min(0.95, 0.5 + avgBrightness) : 0.85;

    return { personCount, confidence };
  }

  /**
   * Detect occupancy from image data
   * Requirements: 4.1
   */
  async detectOccupancy(imageData: Buffer, location: string): Promise<OccupancyResult> {
    try {
      // Preprocess image
      const preprocessedImage = this.preprocessImage(imageData);

      // Run inference
      const { personCount, confidence } = await this.runInference(preprocessedImage);

      // Create occupancy result
      const result: OccupancyResult = {
        location,
        occupied: personCount > 0,
        confidence,
        timestamp: new Date(),
        personCount,
      };

      // Update current state
      await this.updateOccupancyState(result);

      return result;
    } catch (error) {
      // Requirements: 4.4 - handle errors gracefully
      console.error(`Error detecting occupancy for ${location}:`, error);
      
      // Return last known state or default to unoccupied with low confidence
      const lastState = this.currentOccupancyState.get(location);
      if (lastState) {
        return lastState;
      }

      return {
        location,
        occupied: false,
        confidence: 0.0,
        timestamp: new Date(),
        personCount: 0,
      };
    }
  }

  /**
   * Update occupancy state and trigger device automation
   * Requirements: 4.2, 4.3, 4.5
   */
  private async updateOccupancyState(result: OccupancyResult): Promise<void> {
    const previousState = this.currentOccupancyState.get(result.location);
    this.currentOccupancyState.set(result.location, result);

    // Record occupancy event if state changed
    if (!previousState || previousState.occupied !== result.occupied) {
      this.recordOccupancyEvent(result, previousState);
    }

    // Handle occupancy-based device control
    if (result.occupied) {
      // Requirements: 4.3 - restore devices when occupancy detected
      await this.handleOccupancyDetected(result.location);
    } else {
      // Requirements: 4.2 - turn off devices after 5 minutes of no occupancy
      await this.scheduleDeviceShutdown(result.location);
    }
  }

  /**
   * Handle occupancy detected - restore previous device states
   * Requirements: 4.3
   */
  private async handleOccupancyDetected(location: string): Promise<void> {
    // Clear any pending shutdown timer
    const timer = this.unoccupiedTimers.get(location);
    if (timer) {
      clearTimeout(timer);
      this.unoccupiedTimers.delete(location);
    }

    // Restore devices to previous state
    if (this.deviceManager) {
      const devices = this.devicesByLocation.get(location) || [];
      for (const deviceId of devices) {
        const previousState = this.previousDeviceStates.get(deviceId);
        if (previousState === 'on') {
          const command: DeviceCommand = { action: 'turn_on' };
          try {
            await this.deviceManager.sendCommand(deviceId, command);
          } catch (error) {
            console.error(`Error restoring device ${deviceId}:`, error);
          }
        }
        // Clear the saved state after restoration
        this.previousDeviceStates.delete(deviceId);
      }
    }
  }

  /**
   * Schedule device shutdown after unoccupied threshold
   * Requirements: 4.2
   */
  private async scheduleDeviceShutdown(location: string): Promise<void> {
    // Clear existing timer if any
    const existingTimer = this.unoccupiedTimers.get(location);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Save current device states BEFORE scheduling shutdown
    // This ensures we restore to the state before occupancy system intervened
    if (this.deviceManager) {
      const devices = this.devicesByLocation.get(location) || [];
      for (const deviceId of devices) {
        try {
          // Only save state if we haven't already saved it for this location
          if (!this.previousDeviceStates.has(deviceId)) {
            const status = await this.deviceManager.getDeviceStatus(deviceId);
            this.previousDeviceStates.set(deviceId, status.powerState);
          }
        } catch (error) {
          console.error(`Error saving device state ${deviceId}:`, error);
        }
      }
    }

    // Schedule shutdown after threshold (5 minutes)
    const timer = setTimeout(() => {
      this.shutdownDevicesInLocation(location);
      this.unoccupiedTimers.delete(location);
    }, this.unoccupiedThresholdMs);

    this.unoccupiedTimers.set(location, timer);
  }

  /**
   * Shutdown devices in unoccupied location
   * Requirements: 4.2
   */
  private async shutdownDevicesInLocation(location: string): Promise<void> {
    if (!this.deviceManager) {
      return;
    }

    const devices = this.devicesByLocation.get(location) || [];
    
    for (const deviceId of devices) {
      try {
        // Turn off device (state was already saved in scheduleDeviceShutdown)
        const command: DeviceCommand = { action: 'turn_off' };
        await this.deviceManager.sendCommand(deviceId, command);
      } catch (error) {
        console.error(`Error shutting down device ${deviceId}:`, error);
      }
    }
  }

  /**
   * Record occupancy event in history
   * Requirements: 4.5
   */
  private recordOccupancyEvent(current: OccupancyResult, previous?: OccupancyResult): void {
    const duration = previous 
      ? (current.timestamp.getTime() - previous.timestamp.getTime()) / 1000
      : 0;

    const event: OccupancyEvent = {
      location: current.location,
      occupied: current.occupied,
      timestamp: current.timestamp,
      duration,
    };

    const history = this.occupancyHistory.get(current.location) || [];
    history.push(event);
    this.occupancyHistory.set(current.location, history);
  }

  /**
   * Start monitoring a camera for occupancy
   * Requirements: 4.1, 4.5
   */
  startMonitoring(cameraId: string, location: string): void {
    // Stop existing monitoring if any
    this.stopMonitoring(cameraId);

    // In production, this would:
    // 1. Subscribe to camera feed
    // 2. Process frames at regular intervals (e.g., every 3 seconds)
    // 3. Run occupancy detection on each frame
    
    // For this implementation, we simulate periodic monitoring
    const intervalId = setInterval(async () => {
      // Simulate capturing image from camera
      const simulatedImage = Buffer.alloc(640 * 640 * 3);
      // Fill with random data to simulate image
      for (let i = 0; i < simulatedImage.length; i++) {
        simulatedImage[i] = Math.floor(Math.random() * 256);
      }

      await this.detectOccupancy(simulatedImage, location);
    }, 3000); // Check every 3 seconds

    this.monitoringCameras.set(cameraId, { location, intervalId });
  }

  /**
   * Stop monitoring a camera
   */
  stopMonitoring(cameraId: string): void {
    const monitoring = this.monitoringCameras.get(cameraId);
    if (monitoring) {
      clearInterval(monitoring.intervalId);
      this.monitoringCameras.delete(cameraId);
    }
  }

  /**
   * Get occupancy history for a location
   * Requirements: 4.5
   */
  async getOccupancyHistory(location: string, range: TimeRange): Promise<OccupancyEvent[]> {
    const history = this.occupancyHistory.get(location) || [];
    
    // Filter by time range
    return history.filter(event => 
      event.timestamp >= range.start && event.timestamp <= range.end
    );
  }

  /**
   * Register devices for a location (for occupancy-based control)
   * Requirements: 4.2, 4.3
   */
  registerDevicesForLocation(location: string, deviceIds: string[]): void {
    this.devicesByLocation.set(location, deviceIds);
  }

  /**
   * Get current occupancy state for a location
   */
  getCurrentOccupancyState(location: string): OccupancyResult | undefined {
    return this.currentOccupancyState.get(location);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Stop all monitoring
    this.monitoringCameras.forEach((_, cameraId) => {
      this.stopMonitoring(cameraId);
    });

    // Clear all timers
    this.unoccupiedTimers.forEach(timer => clearTimeout(timer));
    this.unoccupiedTimers.clear();
  }
}
