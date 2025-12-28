/**
 * AR/VR Interface Controller
 * 
 * Main interface for controlling AR/VR immersive experiences in the Smart Energy Copilot system.
 * Supports multiple platforms including Meta Quest, HoloLens, Apple Vision Pro, and WebXR.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export enum ARVRPlatform {
  META_QUEST = 'meta_quest',
  HOLOLENS = 'hololens',
  APPLE_VISION_PRO = 'apple_vision_pro',
  WEBXR = 'webxr',
  UNKNOWN = 'unknown'
}

export enum GestureType {
  POINT = 'point',
  GRAB = 'grab',
  PINCH = 'pinch',
  SWIPE = 'swipe',
  TAP = 'tap',
  WAVE = 'wave',
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down'
}

export enum HapticIntensity {
  LIGHT = 0.3,
  MEDIUM = 0.6,
  STRONG = 1.0
}

export interface HandTracking {
  leftHand: {
    position: Vector3;
    rotation: Quaternion;
    fingers: {
      thumb: Transform;
      index: Transform;
      middle: Transform;
      ring: Transform;
      pinky: Transform;
    };
    isTracked: boolean;
    confidence: number;
  };
  rightHand: {
    position: Vector3;
    rotation: Quaternion;
    fingers: {
      thumb: Transform;
      index: Transform;
      middle: Transform;
      ring: Transform;
      pinky: Transform;
    };
    isTracked: boolean;
    confidence: number;
  };
}

export interface EyeTracking {
  leftEye: {
    position: Vector3;
    direction: Vector3;
    isOpen: boolean;
  };
  rightEye: {
    position: Vector3;
    direction: Vector3;
    isOpen: boolean;
  };
  combinedGaze: Vector3;
  isTracked: boolean;
  confidence: number;
}

export interface ARVRSession {
  sessionId: string;
  platform: ARVRPlatform;
  startTime: Date;
  isActive: boolean;
  headset: {
    position: Vector3;
    rotation: Quaternion;
    batteryLevel?: number;
    temperature?: number;
  };
  handTracking: HandTracking;
  eyeTracking?: EyeTracking;
  performance: {
    fps: number;
    frameTime: number;
    cpuUsage: number;
    gpuUsage: number;
    memoryUsage: number;
  };
}

export interface EnergyVisualization {
  deviceId: string;
  deviceType: string;
  position: Vector3;
  energyFlow: {
    direction: Vector3;
    intensity: number;
    color: string;
    animated: boolean;
  };
  consumption: {
    current: number;
    average: number;
    peak: number;
    unit: string;
  };
  status: 'normal' | 'warning' | 'critical' | 'offline';
  alerts: string[];
}

export interface ImmersiveCommand {
  commandId: string;
  type: 'device_control' | 'scene_activation' | 'energy_optimization' | 'system_query';
  deviceId?: string;
  sceneId?: string;
  parameters: Record<string, any>;
  gesture?: GestureType;
  voiceCommand?: string;
  confidence: number;
  timestamp: Date;
}

export interface ARVRInterface {
  /**
   * Initialize AR/VR session for the specified platform
   */
  initializeSession(platform: ARVRPlatform): Promise<ARVRSession>;

  /**
   * Terminate the current AR/VR session
   */
  terminateSession(sessionId: string): Promise<void>;

  /**
   * Get current session information
   */
  getCurrentSession(): ARVRSession | null;

  /**
   * Update session performance metrics
   */
  updatePerformanceMetrics(sessionId: string): Promise<void>;

  /**
   * Render 3D energy visualization overlay
   */
  renderEnergyVisualization(devices: EnergyVisualization[]): Promise<void>;

  /**
   * Process gesture input and translate to commands
   */
  processGesture(gesture: GestureType, handTracking: HandTracking): Promise<ImmersiveCommand | null>;

  /**
   * Provide haptic feedback to the user
   */
  triggerHapticFeedback(intensity: HapticIntensity, duration: number, pattern?: number[]): Promise<void>;

  /**
   * Highlight energy anomalies in AR/VR space
   */
  highlightAnomalies(anomalies: EnergyVisualization[]): Promise<void>;

  /**
   * Update device overlay information
   */
  updateDeviceOverlay(deviceId: string, data: Partial<EnergyVisualization>): Promise<void>;

  /**
   * Handle voice commands in AR/VR context
   */
  processVoiceCommand(command: string, confidence: number): Promise<ImmersiveCommand | null>;

  /**
   * Get platform-specific capabilities
   */
  getPlatformCapabilities(): Promise<{
    handTracking: boolean;
    eyeTracking: boolean;
    hapticFeedback: boolean;
    voiceRecognition: boolean;
    spatialMapping: boolean;
    passthrough: boolean;
  }>;

  /**
   * Calibrate AR/VR system for user
   */
  calibrateSystem(): Promise<boolean>;

  /**
   * Get real-time performance metrics
   */
  getPerformanceMetrics(): Promise<{
    fps: number;
    frameTime: number;
    latency: number;
    cpuUsage: number;
    gpuUsage: number;
    memoryUsage: number;
    batteryLevel?: number;
  }>;

  /**
   * Set rendering quality level for performance optimization
   */
  setRenderingQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): Promise<void>;

  /**
   * Enable or disable specific AR/VR features
   */
  toggleFeature(feature: string, enabled: boolean): Promise<void>;

  /**
   * Get spatial mapping data for room-scale experiences
   */
  getSpatialMapping(): Promise<{
    meshes: Array<{
      vertices: Vector3[];
      triangles: number[];
      bounds: {
        min: Vector3;
        max: Vector3;
      };
    }>;
    planes: Array<{
      center: Vector3;
      normal: Vector3;
      size: Vector3;
      type: 'floor' | 'wall' | 'ceiling' | 'table' | 'unknown';
    }>;
  }>;

  /**
   * Register event listeners for AR/VR events
   */
  addEventListener(event: string, callback: (data: any) => void): void;

  /**
   * Remove event listeners
   */
  removeEventListener(event: string, callback: (data: any) => void): void;
}