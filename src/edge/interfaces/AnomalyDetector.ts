/**
 * AnomalyDetector interface
 * Responsibility: Monitors device behavior for unusual patterns indicating safety issues
 */
export interface AnomalyDetector {
  /**
   * Check if current power consumption is anomalous
   */
  checkForAnomalies(deviceId: string, currentWatts: number): AnomalyResult;

  /**
   * Record an anomaly event
   */
  recordAnomaly(anomaly: AnomalyEvent): void;

  /**
   * Get anomaly history for a device
   */
  getAnomalyHistory(deviceId: string): Promise<AnomalyEvent[]>;

  /**
   * Determine if a device should be disabled due to repeated anomalies
   */
  shouldDisableDevice(deviceId: string): boolean;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  reason?: string;
  recommendedAction?: string;
}

export interface AnomalyEvent {
  deviceId: string;
  timestamp: Date;
  normalRange: { min: number; max: number };
  actualValue: number;
  actionTaken: string;
}
