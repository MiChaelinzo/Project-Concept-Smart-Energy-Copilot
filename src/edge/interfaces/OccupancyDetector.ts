import { TimeRange } from './EnergyMonitor';

/**
 * OccupancyDetector interface
 * Responsibility: Processes camera images to detect human presence using computer vision
 */
export interface OccupancyDetector {
  /**
   * Detect occupancy from image data
   */
  detectOccupancy(imageData: Buffer, location: string): Promise<OccupancyResult>;

  /**
   * Start monitoring a camera for occupancy
   */
  startMonitoring(cameraId: string, location: string): void;

  /**
   * Stop monitoring a camera
   */
  stopMonitoring(cameraId: string): void;

  /**
   * Get occupancy history for a location
   */
  getOccupancyHistory(location: string, range: TimeRange): Promise<OccupancyEvent[]>;
}

export interface OccupancyResult {
  location: string;
  occupied: boolean;
  confidence: number;
  timestamp: Date;
  personCount: number;
}

export interface OccupancyEvent {
  location: string;
  occupied: boolean;
  timestamp: Date;
  duration: number; // seconds
}
