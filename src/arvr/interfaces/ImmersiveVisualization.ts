/**
 * Immersive Visualization Interface
 * 
 * 3D energy flow visualization and device overlay system for AR/VR interfaces.
 * Provides real-time visual representation of energy consumption and flows.
 */

import { Vector3, Transform, EnergyVisualization } from './ARVRInterface';

export enum VisualizationMode {
  ENERGY_FLOW = 'energy_flow',
  CONSUMPTION_HEATMAP = 'consumption_heatmap',
  DEVICE_STATUS = 'device_status',
  CARBON_FOOTPRINT = 'carbon_footprint',
  COST_ANALYSIS = 'cost_analysis',
  EFFICIENCY_METRICS = 'efficiency_metrics',
  PREDICTIVE_ANALYTICS = 'predictive_analytics'
}

export enum RenderingQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

export interface EnergyFlowParticle {
  id: string;
  position: Vector3;
  velocity: Vector3;
  color: string;
  size: number;
  lifetime: number;
  intensity: number;
  sourceDeviceId: string;
  targetDeviceId?: string;
}

export interface DeviceVisualization3D {
  deviceId: string;
  transform: Transform;
  model: {
    meshUrl?: string;
    primitiveType?: 'cube' | 'sphere' | 'cylinder' | 'plane';
    scale: Vector3;
    color: string;
    opacity: number;
    wireframe: boolean;
  };
  energyData: EnergyVisualization;
  animations: Array<{
    property: string;
    keyframes: Array<{
      time: number;
      value: any;
    }>;
    loop: boolean;
    duration: number;
  }>;
  interactionZone: {
    shape: 'sphere' | 'box' | 'cylinder';
    size: Vector3;
    offset: Vector3;
  };
}

export interface EnergyFlowVisualization {
  flowId: string;
  sourceDevice: string;
  targetDevice: string;
  energyAmount: number;
  flowRate: number;
  efficiency: number;
  path: Vector3[];
  particles: EnergyFlowParticle[];
  color: string;
  animated: boolean;
  bidirectional: boolean;
}

export interface VisualizationLayer {
  id: string;
  name: string;
  mode: VisualizationMode;
  visible: boolean;
  opacity: number;
  renderOrder: number;
  devices: DeviceVisualization3D[];
  energyFlows: EnergyFlowVisualization[];
  annotations: Array<{
    id: string;
    position: Vector3;
    text: string;
    fontSize: number;
    color: string;
    backgroundColor?: string;
    alwaysFaceUser: boolean;
  }>;
}

export interface VisualizationScene {
  sceneId: string;
  name: string;
  layers: VisualizationLayer[];
  lighting: {
    ambientColor: string;
    ambientIntensity: number;
    directionalLights: Array<{
      direction: Vector3;
      color: string;
      intensity: number;
      castShadows: boolean;
    }>;
  };
  environment: {
    skybox?: string;
    fog?: {
      color: string;
      near: number;
      far: number;
    };
  };
  camera: {
    position: Vector3;
    target: Vector3;
    fieldOfView: number;
  };
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  vertices: number;
  textureMemory: number;
  geometryMemory: number;
  cpuUsage: number;
  gpuUsage: number;
  batteryDrain: number;
}

export interface ImmersiveVisualization {
  /**
   * Initialize the visualization system
   */
  initialize(renderingQuality: RenderingQuality): Promise<void>;

  /**
   * Create a new visualization scene
   */
  createScene(sceneConfig: Partial<VisualizationScene>): Promise<VisualizationScene>;

  /**
   * Load and activate a visualization scene
   */
  loadScene(sceneId: string): Promise<void>;

  /**
   * Update device visualizations with real-time data
   */
  updateDeviceVisualizations(devices: EnergyVisualization[]): Promise<void>;

  /**
   * Render energy flow between devices
   */
  renderEnergyFlows(flows: EnergyFlowVisualization[]): Promise<void>;

  /**
   * Add or update a device in 3D space
   */
  addDevice(device: DeviceVisualization3D): Promise<void>;

  /**
   * Remove a device from visualization
   */
  removeDevice(deviceId: string): Promise<void>;

  /**
   * Update device position and orientation
   */
  updateDeviceTransform(deviceId: string, transform: Transform): Promise<void>;

  /**
   * Highlight devices with anomalies or alerts
   */
  highlightDevices(deviceIds: string[], highlightType: 'warning' | 'error' | 'info'): Promise<void>;

  /**
   * Clear all highlights
   */
  clearHighlights(): Promise<void>;

  /**
   * Set visualization mode
   */
  setVisualizationMode(mode: VisualizationMode): Promise<void>;

  /**
   * Toggle visualization layer visibility
   */
  toggleLayer(layerId: string, visible: boolean): Promise<void>;

  /**
   * Add text annotation to 3D space
   */
  addAnnotation(annotation: {
    id: string;
    position: Vector3;
    text: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    alwaysFaceUser?: boolean;
  }): Promise<void>;

  /**
   * Remove text annotation
   */
  removeAnnotation(annotationId: string): Promise<void>;

  /**
   * Set rendering quality level
   */
  setRenderingQuality(quality: RenderingQuality): Promise<void>;

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): Promise<PerformanceMetrics>;

  /**
   * Optimize rendering for better performance
   */
  optimizeRendering(): Promise<void>;

  /**
   * Take screenshot of current visualization
   */
  takeScreenshot(width: number, height: number): Promise<string>;

  /**
   * Start recording visualization session
   */
  startRecording(): Promise<void>;

  /**
   * Stop recording and get video data
   */
  stopRecording(): Promise<Blob>;

  /**
   * Enable or disable particle effects
   */
  setParticleEffects(enabled: boolean): Promise<void>;

  /**
   * Set particle system quality
   */
  setParticleQuality(quality: 'low' | 'medium' | 'high'): Promise<void>;

  /**
   * Update lighting conditions
   */
  updateLighting(lighting: VisualizationScene['lighting']): Promise<void>;

  /**
   * Set environment settings
   */
  setEnvironment(environment: VisualizationScene['environment']): Promise<void>;

  /**
   * Animate camera to specific position
   */
  animateCamera(target: Vector3, position: Vector3, duration: number): Promise<void>;

  /**
   * Reset camera to default position
   */
  resetCamera(): Promise<void>;

  /**
   * Register interaction callback for device selection
   */
  onDeviceInteraction(callback: (deviceId: string, interactionType: 'select' | 'hover' | 'activate') => void): void;

  /**
   * Register event listener for visualization events
   */
  addEventListener(event: 'scene_loaded' | 'device_added' | 'device_removed' | 'performance_warning' | 'render_error', 
                   callback: (data: any) => void): void;

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: (data: any) => void): void;

  /**
   * Dispose of visualization resources
   */
  dispose(): Promise<void>;
}