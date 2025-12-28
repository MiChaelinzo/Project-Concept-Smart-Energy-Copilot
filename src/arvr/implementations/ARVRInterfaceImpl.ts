/**
 * AR/VR Interface Implementation
 * 
 * Multi-platform AR/VR interface controller supporting Meta Quest, HoloLens, Apple Vision Pro, and WebXR.
 * Provides immersive energy system control with 90+ FPS performance optimization.
 */

import { 
  ARVRInterface, 
  ARVRPlatform, 
  ARVRSession, 
  EnergyVisualization, 
  GestureType, 
  HandTracking, 
  HapticIntensity, 
  ImmersiveCommand,
  Vector3,
  Quaternion
} from '../interfaces/ARVRInterface';
import { GestureRecognition } from '../interfaces/GestureRecognition';
import { HapticFeedback } from '../interfaces/HapticFeedback';
import { ImmersiveVisualization, RenderingQuality } from '../interfaces/ImmersiveVisualization';

export class ARVRInterfaceImpl implements ARVRInterface {
  private currentSession: ARVRSession | null = null;
  private gestureRecognition: GestureRecognition;
  private hapticFeedback: HapticFeedback;
  private immersiveVisualization: ImmersiveVisualization;
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  private performanceMonitor: NodeJS.Timeout | null = null;
  private renderingQuality: RenderingQuality = RenderingQuality.HIGH;
  private isInitialized = false;

  constructor(
    gestureRecognition: GestureRecognition,
    hapticFeedback: HapticFeedback,
    immersiveVisualization: ImmersiveVisualization
  ) {
    this.gestureRecognition = gestureRecognition;
    this.hapticFeedback = hapticFeedback;
    this.immersiveVisualization = immersiveVisualization;
  }

  async initializeSession(platform: ARVRPlatform): Promise<ARVRSession> {
    try {
      // Validate platform support
      if (!this.isPlatformSupported(platform)) {
        throw new Error(`Platform ${platform} is not supported`);
      }

      // Initialize subsystems if not already done
      if (!this.isInitialized) {
        await this.initializeSubsystems();
        this.isInitialized = true;
      }

      // Create new session
      const sessionId = this.generateSessionId();
      const session: ARVRSession = {
        sessionId,
        platform,
        startTime: new Date(),
        isActive: true,
        headset: {
          position: { x: 0, y: 1.7, z: 0 }, // Average head height
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          batteryLevel: await this.getBatteryLevel(platform),
          temperature: await this.getDeviceTemperature(platform)
        },
        handTracking: this.initializeHandTracking(),
        eyeTracking: await this.initializeEyeTracking(platform),
        performance: {
          fps: 90,
          frameTime: 11.1, // 1000ms / 90fps
          cpuUsage: 0,
          gpuUsage: 0,
          memoryUsage: 0
        }
      };

      this.currentSession = session;

      // Start performance monitoring
      this.startPerformanceMonitoring();

      // Initialize platform-specific features
      await this.initializePlatformFeatures(platform);

      // Emit session started event
      this.emitEvent('session_started', { session });

      return session;
    } catch (error: any) {
      throw new Error(`Failed to initialize AR/VR session: ${error?.message || 'Unknown error'}`);
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
      throw new Error('Invalid session ID or no active session');
    }

    try {
      // Stop performance monitoring
      if (this.performanceMonitor) {
        clearInterval(this.performanceMonitor);
        this.performanceMonitor = null;
      }

      // Clean up platform-specific resources
      await this.cleanupPlatformResources(this.currentSession.platform);

      // Stop subsystems
      await this.gestureRecognition.stopContinuousRecognition();
      await this.hapticFeedback.stopAllEffects();
      await this.immersiveVisualization.dispose();

      // Mark session as inactive
      this.currentSession.isActive = false;

      // Emit session ended event
      this.emitEvent('session_ended', { sessionId });

      this.currentSession = null;
    } catch (error: any) {
      throw new Error(`Failed to terminate AR/VR session: ${error.message}`);
    }
  }

  getCurrentSession(): ARVRSession | null {
    return this.currentSession;
  }

  async updatePerformanceMetrics(sessionId: string): Promise<void> {
    if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
      return;
    }

    try {
      const metrics = await this.collectPerformanceMetrics();
      this.currentSession.performance = metrics;

      // Auto-adjust quality if performance is poor
      if (metrics.fps < 60) {
        await this.autoAdjustQuality();
      }

      // Emit performance update event
      this.emitEvent('performance_updated', { sessionId, metrics });
    } catch (error) {
      console.error('Failed to update performance metrics:', error);
    }
  }

  async renderEnergyVisualization(devices: EnergyVisualization[]): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active AR/VR session');
    }

    try {
      await this.immersiveVisualization.updateDeviceVisualizations(devices);
      
      // Provide haptic feedback for energy flow changes
      const highEnergyDevices = devices.filter(d => d.consumption.current > d.consumption.average * 1.5);
      if (highEnergyDevices.length > 0) {
        await this.hapticFeedback.energyFlowFeedback(0.7, { x: 0, y: 0, z: 1 });
      }

      this.emitEvent('visualization_updated', { deviceCount: devices.length });
    } catch (error: any) {
      throw new Error(`Failed to render energy visualization: ${error?.message || 'Unknown error'}`);
    }
  }

  async processGesture(gesture: GestureType, handTracking: HandTracking): Promise<ImmersiveCommand | null> {
    if (!this.currentSession) {
      return null;
    }

    try {
      const recognitionResults = await this.gestureRecognition.processHandTracking(handTracking);
      
      if (recognitionResults.length === 0) {
        return null;
      }

      const bestResult = recognitionResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      if (bestResult.confidence < 0.7) {
        return null;
      }

      // Get command for gesture
      const gestureCommand = await this.gestureRecognition.getCommandForGesture(bestResult.gesture);
      
      if (!gestureCommand) {
        return null;
      }

      // Create immersive command
      const command: ImmersiveCommand = {
        commandId: this.generateCommandId(),
        type: gestureCommand.command as any,
        deviceId: gestureCommand.deviceId,
        sceneId: gestureCommand.sceneId,
        parameters: gestureCommand.parameters,
        gesture: bestResult.gesture,
        confidence: bestResult.confidence,
        timestamp: new Date()
      };

      // Provide haptic feedback for successful gesture recognition
      await this.hapticFeedback.gestureFeedback(bestResult.gesture, true);

      this.emitEvent('gesture_recognized', { command, result: bestResult });

      return command;
    } catch (error) {
      console.error('Failed to process gesture:', error);
      return null;
    }
  }

  async triggerHapticFeedback(intensity: HapticIntensity, duration: number, pattern?: number[]): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    try {
      const effect = {
        id: this.generateEffectId(),
        pattern: pattern ? 'custom' as any : 'pulse' as any,
        intensity,
        duration,
        location: 'both_controllers' as any,
        waveform: pattern
      };

      await this.hapticFeedback.playEffect(effect);
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
    }
  }

  async highlightAnomalies(anomalies: EnergyVisualization[]): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    try {
      const deviceIds = anomalies.map(a => a.deviceId);
      await this.immersiveVisualization.highlightDevices(deviceIds, 'warning');

      // Provide haptic feedback for anomalies
      if (anomalies.length > 0) {
        await this.hapticFeedback.notificationFeedback('warning');
      }

      this.emitEvent('anomalies_highlighted', { count: anomalies.length, deviceIds });
    } catch (error: any) {
      throw new Error(`Failed to highlight anomalies: ${error?.message || 'Unknown error'}`);
    }
  }

  async updateDeviceOverlay(deviceId: string, data: Partial<EnergyVisualization>): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    try {
      // Update visualization with new data
      const existingDevices = await this.getExistingDeviceVisualizations();
      const deviceIndex = existingDevices.findIndex(d => d.deviceId === deviceId);
      
      if (deviceIndex >= 0) {
        existingDevices[deviceIndex] = { ...existingDevices[deviceIndex], ...data };
        await this.immersiveVisualization.updateDeviceVisualizations(existingDevices);
      }

      this.emitEvent('device_overlay_updated', { deviceId, data });
    } catch (error) {
      console.error('Failed to update device overlay:', error);
    }
  }

  async processVoiceCommand(command: string, confidence: number): Promise<ImmersiveCommand | null> {
    if (!this.currentSession || confidence < 0.8) {
      return null;
    }

    try {
      // Parse voice command and create immersive command
      const parsedCommand = this.parseVoiceCommand(command);
      
      if (!parsedCommand) {
        return null;
      }

      const immersiveCommand: ImmersiveCommand = {
        commandId: this.generateCommandId(),
        type: parsedCommand.type,
        deviceId: parsedCommand.deviceId,
        sceneId: parsedCommand.sceneId,
        parameters: parsedCommand.parameters,
        voiceCommand: command,
        confidence,
        timestamp: new Date()
      };

      // Provide haptic feedback for voice command recognition
      await this.hapticFeedback.notificationFeedback('success');

      this.emitEvent('voice_command_processed', { command: immersiveCommand });

      return immersiveCommand;
    } catch (error) {
      console.error('Failed to process voice command:', error);
      return null;
    }
  }

  async getPlatformCapabilities(): Promise<{
    handTracking: boolean;
    eyeTracking: boolean;
    hapticFeedback: boolean;
    voiceRecognition: boolean;
    spatialMapping: boolean;
    passthrough: boolean;
  }> {
    if (!this.currentSession) {
      throw new Error('No active AR/VR session');
    }

    const platform = this.currentSession.platform;
    
    switch (platform) {
      case ARVRPlatform.META_QUEST:
        return {
          handTracking: true,
          eyeTracking: false, // Quest 2/3 don't have eye tracking
          hapticFeedback: true,
          voiceRecognition: true,
          spatialMapping: true,
          passthrough: true
        };
      
      case ARVRPlatform.HOLOLENS:
        return {
          handTracking: true,
          eyeTracking: true,
          hapticFeedback: false, // HoloLens doesn't have controllers
          voiceRecognition: true,
          spatialMapping: true,
          passthrough: true
        };
      
      case ARVRPlatform.APPLE_VISION_PRO:
        return {
          handTracking: true,
          eyeTracking: true,
          hapticFeedback: false, // No controllers
          voiceRecognition: true,
          spatialMapping: true,
          passthrough: true
        };
      
      case ARVRPlatform.WEBXR:
        return {
          handTracking: true,
          eyeTracking: false,
          hapticFeedback: true,
          voiceRecognition: true,
          spatialMapping: false,
          passthrough: false
        };
      
      default:
        return {
          handTracking: false,
          eyeTracking: false,
          hapticFeedback: false,
          voiceRecognition: false,
          spatialMapping: false,
          passthrough: false
        };
    }
  }

  async calibrateSystem(): Promise<boolean> {
    if (!this.currentSession) {
      throw new Error('No active AR/VR session');
    }

    try {
      // Calibrate gesture recognition
      await this.gestureRecognition.calibrateForUser('current_user');
      
      // Calibrate haptic feedback
      await this.hapticFeedback.calibrateForUser('current_user', {
        intensity: 0.7,
        enabledPatterns: ['click', 'pulse', 'notification'] as any,
        disabledLocations: []
      });

      // Test all systems
      await this.runSystemTests();

      this.emitEvent('system_calibrated', { sessionId: this.currentSession.sessionId });

      return true;
    } catch (error) {
      console.error('System calibration failed:', error);
      return false;
    }
  }

  async getPerformanceMetrics(): Promise<{
    fps: number;
    frameTime: number;
    latency: number;
    cpuUsage: number;
    gpuUsage: number;
    memoryUsage: number;
    batteryLevel?: number;
  }> {
    if (!this.currentSession) {
      throw new Error('No active AR/VR session');
    }

    const visualizationMetrics = await this.immersiveVisualization.getPerformanceMetrics();
    
    return {
      fps: visualizationMetrics.fps,
      frameTime: visualizationMetrics.frameTime,
      latency: this.calculateLatency(),
      cpuUsage: visualizationMetrics.cpuUsage,
      gpuUsage: visualizationMetrics.gpuUsage,
      memoryUsage: visualizationMetrics.geometryMemory + visualizationMetrics.textureMemory,
      batteryLevel: this.currentSession.headset.batteryLevel
    };
  }

  async setRenderingQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): Promise<void> {
    const qualityMap: Record<string, RenderingQuality> = {
      low: RenderingQuality.LOW,
      medium: RenderingQuality.MEDIUM,
      high: RenderingQuality.HIGH,
      ultra: RenderingQuality.ULTRA
    };

    this.renderingQuality = qualityMap[quality];
    await this.immersiveVisualization.setRenderingQuality(this.renderingQuality);

    this.emitEvent('rendering_quality_changed', { quality });
  }

  async toggleFeature(feature: string, enabled: boolean): Promise<void> {
    switch (feature) {
      case 'handTracking':
        if (enabled) {
          await this.gestureRecognition.startContinuousRecognition();
        } else {
          await this.gestureRecognition.stopContinuousRecognition();
        }
        break;
      
      case 'hapticFeedback':
        await this.hapticFeedback.setEnabled(enabled);
        break;
      
      case 'particleEffects':
        await this.immersiveVisualization.setParticleEffects(enabled);
        break;
      
      default:
        console.warn(`Unknown feature: ${feature}`);
    }

    this.emitEvent('feature_toggled', { feature, enabled });
  }

  async getSpatialMapping(): Promise<{
    meshes: Array<{
      vertices: Vector3[];
      triangles: number[];
      bounds: { min: Vector3; max: Vector3; };
    }>;
    planes: Array<{
      center: Vector3;
      normal: Vector3;
      size: Vector3;
      type: 'floor' | 'wall' | 'ceiling' | 'table' | 'unknown';
    }>;
  }> {
    if (!this.currentSession) {
      throw new Error('No active AR/VR session');
    }

    // Mock spatial mapping data - in real implementation, this would come from the AR/VR platform
    return {
      meshes: [
        {
          vertices: [
            { x: -5, y: 0, z: -5 },
            { x: 5, y: 0, z: -5 },
            { x: 5, y: 0, z: 5 },
            { x: -5, y: 0, z: 5 }
          ],
          triangles: [0, 1, 2, 0, 2, 3],
          bounds: {
            min: { x: -5, y: 0, z: -5 },
            max: { x: 5, y: 0, z: 5 }
          }
        }
      ],
      planes: [
        {
          center: { x: 0, y: 0, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
          size: { x: 10, y: 0, z: 10 },
          type: 'floor'
        }
      ]
    };
  }

  addEventListener(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private helper methods

  private isPlatformSupported(platform: ARVRPlatform): boolean {
    return Object.values(ARVRPlatform).includes(platform) && platform !== ARVRPlatform.UNKNOWN;
  }

  private async initializeSubsystems(): Promise<void> {
    await Promise.all([
      this.gestureRecognition.initialize(),
      this.hapticFeedback.initialize(),
      this.immersiveVisualization.initialize(this.renderingQuality)
    ]);
  }

  private generateSessionId(): string {
    return `arvr_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEffectId(): string {
    return `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getBatteryLevel(platform: ARVRPlatform): Promise<number | undefined> {
    // Mock battery level - in real implementation, this would query the device
    switch (platform) {
      case ARVRPlatform.META_QUEST:
      case ARVRPlatform.APPLE_VISION_PRO:
        return Math.random() * 100;
      default:
        return undefined;
    }
  }

  private async getDeviceTemperature(platform: ARVRPlatform): Promise<number | undefined> {
    // Mock temperature - in real implementation, this would query the device
    return 35 + Math.random() * 10; // 35-45°C
  }

  private initializeHandTracking(): HandTracking {
    return {
      leftHand: {
        position: { x: -0.3, y: 1.2, z: 0.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        fingers: {
          thumb: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          index: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          middle: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          ring: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          pinky: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }
        },
        isTracked: true,
        confidence: 0.95
      },
      rightHand: {
        position: { x: 0.3, y: 1.2, z: 0.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        fingers: {
          thumb: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          index: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          middle: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          ring: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          pinky: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }
        },
        isTracked: true,
        confidence: 0.95
      }
    };
  }

  private async initializeEyeTracking(platform: ARVRPlatform): Promise<any> {
    const capabilities = await this.getPlatformCapabilities();
    if (!capabilities.eyeTracking) {
      return undefined;
    }

    return {
      leftEye: {
        position: { x: -0.03, y: 1.7, z: 0 },
        direction: { x: 0, y: 0, z: 1 },
        isOpen: true
      },
      rightEye: {
        position: { x: 0.03, y: 1.7, z: 0 },
        direction: { x: 0, y: 0, z: 1 },
        isOpen: true
      },
      combinedGaze: { x: 0, y: 0, z: 1 },
      isTracked: true,
      confidence: 0.9
    };
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitor = setInterval(async () => {
      if (this.currentSession) {
        await this.updatePerformanceMetrics(this.currentSession.sessionId);
      }
    }, 1000); // Update every second
  }

  private async initializePlatformFeatures(platform: ARVRPlatform): Promise<void> {
    // Platform-specific initialization
    switch (platform) {
      case ARVRPlatform.META_QUEST:
        await this.initializeMetaQuestFeatures();
        break;
      case ARVRPlatform.HOLOLENS:
        await this.initializeHoloLensFeatures();
        break;
      case ARVRPlatform.APPLE_VISION_PRO:
        await this.initializeVisionProFeatures();
        break;
      case ARVRPlatform.WEBXR:
        await this.initializeWebXRFeatures();
        break;
    }
  }

  private async initializeMetaQuestFeatures(): Promise<void> {
    // Initialize Meta Quest specific features
    await this.gestureRecognition.startContinuousRecognition();
  }

  private async initializeHoloLensFeatures(): Promise<void> {
    // Initialize HoloLens specific features
    await this.gestureRecognition.startContinuousRecognition();
  }

  private async initializeVisionProFeatures(): Promise<void> {
    // Initialize Apple Vision Pro specific features
    await this.gestureRecognition.startContinuousRecognition();
  }

  private async initializeWebXRFeatures(): Promise<void> {
    // Initialize WebXR specific features
    await this.gestureRecognition.startContinuousRecognition();
  }

  private async cleanupPlatformResources(platform: ARVRPlatform): Promise<void> {
    // Platform-specific cleanup
    // Implementation would vary by platform
  }

  private async collectPerformanceMetrics(): Promise<any> {
    const visualizationMetrics = await this.immersiveVisualization.getPerformanceMetrics();
    
    return {
      fps: visualizationMetrics.fps,
      frameTime: visualizationMetrics.frameTime,
      cpuUsage: visualizationMetrics.cpuUsage,
      gpuUsage: visualizationMetrics.gpuUsage,
      memoryUsage: visualizationMetrics.geometryMemory + visualizationMetrics.textureMemory
    };
  }

  private async autoAdjustQuality(): Promise<void> {
    if (this.renderingQuality === RenderingQuality.LOW) {
      return; // Already at lowest quality
    }

    const newQuality = this.renderingQuality === RenderingQuality.ULTRA ? RenderingQuality.HIGH :
                      this.renderingQuality === RenderingQuality.HIGH ? RenderingQuality.MEDIUM :
                      RenderingQuality.LOW;

    await this.setRenderingQuality(newQuality as any);
    console.log(`Auto-adjusted rendering quality to ${newQuality} for better performance`);
  }

  private calculateLatency(): number {
    // Mock latency calculation - in real implementation, this would measure actual latency
    return 15 + Math.random() * 10; // 15-25ms
  }

  private async getExistingDeviceVisualizations(): Promise<EnergyVisualization[]> {
    // Mock method - in real implementation, this would retrieve current visualizations
    return [];
  }

  private parseVoiceCommand(command: string): any {
    // Simple voice command parsing - in real implementation, this would use NLP
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('turn on') || lowerCommand.includes('activate')) {
      return {
        type: 'device_control',
        parameters: { action: 'activate' }
      };
    } else if (lowerCommand.includes('turn off') || lowerCommand.includes('deactivate')) {
      return {
        type: 'device_control',
        parameters: { action: 'deactivate' }
      };
    } else if (lowerCommand.includes('show energy') || lowerCommand.includes('energy status')) {
      return {
        type: 'system_query',
        parameters: { query: 'energy_status' }
      };
    }
    
    return null;
  }

  private async runSystemTests(): Promise<void> {
    // Run basic system tests to ensure everything is working
    await Promise.all([
      this.testGestureRecognition(),
      this.testHapticFeedback(),
      this.testVisualization()
    ]);
  }

  private async testGestureRecognition(): Promise<void> {
    // Test gesture recognition system
    const mockHandTracking = this.initializeHandTracking();
    await this.gestureRecognition.processHandTracking(mockHandTracking);
  }

  private async testHapticFeedback(): Promise<void> {
    // Test haptic feedback system
    await this.hapticFeedback.testHapticPattern('click' as any, HapticIntensity.LIGHT, 'left_controller' as any);
  }

  private async testVisualization(): Promise<void> {
    // Test visualization system
    const mockDevices: EnergyVisualization[] = [{
      deviceId: 'test_device',
      deviceType: 'smart_light',
      position: { x: 0, y: 1, z: 2 },
      energyFlow: {
        direction: { x: 0, y: 0, z: 1 },
        intensity: 0.5,
        color: '#00ff00',
        animated: true
      },
      consumption: {
        current: 10,
        average: 8,
        peak: 15,
        unit: 'W'
      },
      status: 'normal',
      alerts: []
    }];
    
    await this.immersiveVisualization.updateDeviceVisualizations(mockDevices);
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}