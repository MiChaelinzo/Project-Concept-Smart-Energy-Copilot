/**
 * Haptic Feedback Implementation
 * 
 * Platform-specific haptic feedback system supporting multiple AR/VR devices.
 * Provides tactile responses with customizable patterns and spatial feedback.
 */

// Browser environment type declarations
declare global {
  interface Window {}
  
  interface Navigator {
    getGamepads(): (Gamepad | null)[];
  }
  
  interface Gamepad {
    hapticActuators?: GamepadHapticActuator[];
  }
  
  interface GamepadHapticActuator {
    pulse(value: number, duration: number): Promise<boolean>;
  }
}

import { 
  HapticFeedback, 
  HapticEffect, 
  SpatialHaptic, 
  HapticCapabilities, 
  HapticPattern, 
  HapticLocation 
} from '../interfaces/HapticFeedback';
import { Vector3, HapticIntensity, ARVRPlatform } from '../interfaces/ARVRInterface';

export class HapticFeedbackImpl implements HapticFeedback {
  private isInitialized = false;
  private enabled = true;
  private globalIntensityMultiplier = 1.0;
  private platform: ARVRPlatform = ARVRPlatform.UNKNOWN;
  private capabilities: HapticCapabilities | null = null;
  private activeEffects: Map<string, HapticEffect> = new Map();
  private customPatterns: Map<string, HapticPattern> = new Map();
  private userPreferences: Map<string, any> = new Map();
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  private usageStats = {
    totalEffectsPlayed: 0,
    mostUsedPatterns: new Map<HapticPattern, number>(),
    averageIntensity: 0,
    totalDuration: 0
  };

  constructor(platform: ARVRPlatform = ARVRPlatform.UNKNOWN) {
    this.platform = platform;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize platform-specific haptic capabilities
      this.capabilities = await this.initializePlatformCapabilities();
      
      // Initialize default patterns
      await this.initializeDefaultPatterns();

      this.isInitialized = true;
      console.log(`Haptic feedback system initialized for platform: ${this.platform}`);
    } catch (error: any) {
      throw new Error(`Failed to initialize haptic feedback: ${error.message}`);
    }
  }

  async getCapabilities(): Promise<HapticCapabilities> {
    if (!this.capabilities) {
      throw new Error('Haptic feedback not initialized');
    }
    return this.capabilities;
  }

  async playEffect(effect: HapticEffect): Promise<void> {
    if (!this.isInitialized || !this.enabled) {
      return;
    }

    try {
      // Validate effect parameters
      this.validateEffect(effect);

      // Apply global intensity multiplier
      const adjustedEffect = {
        ...effect,
        intensity: Math.min(1.0, effect.intensity * this.globalIntensityMultiplier)
      };

      // Store active effect
      this.activeEffects.set(effect.id, adjustedEffect);

      // Play platform-specific haptic effect
      await this.playPlatformEffect(adjustedEffect);

      // Update usage statistics
      this.updateUsageStats(adjustedEffect);

      // Emit effect started event
      this.emitEvent('effect_started', { effect: adjustedEffect });

      // Schedule effect end
      setTimeout(async () => {
        await this.stopEffect(effect.id);
      }, adjustedEffect.duration);

    } catch (error: any) {
      this.emitEvent('error', { error: error.message, effect });
      throw new Error(`Failed to play haptic effect: ${error.message}`);
    }
  }

  async stopEffect(effectId: string): Promise<void> {
    const effect = this.activeEffects.get(effectId);
    if (!effect) {
      return;
    }

    try {
      // Stop platform-specific effect
      await this.stopPlatformEffect(effect);

      // Remove from active effects
      this.activeEffects.delete(effectId);

      // Emit effect ended event
      this.emitEvent('effect_ended', { effectId });

    } catch (error) {
      console.error(`Failed to stop haptic effect ${effectId}:`, error);
    }
  }

  async stopAllEffects(): Promise<void> {
    const effectIds = Array.from(this.activeEffects.keys());
    
    await Promise.all(effectIds.map(id => this.stopEffect(id)));
    
    console.log('All haptic effects stopped');
  }

  async createCustomPattern(name: string, waveform: number[], duration: number): Promise<HapticPattern> {
    const pattern = `custom_${name}` as HapticPattern;
    this.customPatterns.set(name, pattern);
    
    console.log(`Created custom haptic pattern: ${name}`);
    return pattern;
  }

  async playSpatialHaptic(spatialHaptic: SpatialHaptic): Promise<void> {
    if (!this.capabilities?.supportsSpatialHaptics) {
      console.warn('Spatial haptics not supported on this platform');
      return;
    }

    try {
      // Calculate intensity based on distance and falloff curve
      const adjustedIntensity = this.calculateSpatialIntensity(spatialHaptic);
      
      const spatialEffect: HapticEffect = {
        ...spatialHaptic.effect,
        intensity: adjustedIntensity
      };

      await this.playEffect(spatialEffect);
    } catch (error: any) {
      throw new Error(`Failed to play spatial haptic: ${error.message}`);
    }
  }

  async deviceInteractionFeedback(deviceType: string, interactionType: 'select' | 'activate' | 'deactivate' | 'adjust'): Promise<void> {
    const feedbackMap: Record<string, HapticEffect> = {
      select: {
        id: this.generateEffectId(),
        pattern: HapticPattern.CLICK,
        intensity: HapticIntensity.LIGHT,
        duration: 50,
        location: HapticLocation.BOTH_CONTROLLERS
      },
      activate: {
        id: this.generateEffectId(),
        pattern: HapticPattern.DEVICE_ACTIVATION,
        intensity: HapticIntensity.MEDIUM,
        duration: 200,
        location: HapticLocation.BOTH_CONTROLLERS
      },
      deactivate: {
        id: this.generateEffectId(),
        pattern: HapticPattern.CLICK,
        intensity: HapticIntensity.LIGHT,
        duration: 100,
        location: HapticLocation.BOTH_CONTROLLERS
      },
      adjust: {
        id: this.generateEffectId(),
        pattern: HapticPattern.PULSE,
        intensity: HapticIntensity.LIGHT,
        duration: 150,
        location: HapticLocation.BOTH_CONTROLLERS
      }
    };

    const effect = feedbackMap[interactionType];
    if (effect) {
      await this.playEffect(effect);
    }
  }

  async energyFlowFeedback(intensity: number, direction: Vector3): Promise<void> {
    const normalizedIntensity = Math.max(HapticIntensity.LIGHT, Math.min(HapticIntensity.STRONG, intensity));
    
    const effect: HapticEffect = {
      id: this.generateEffectId(),
      pattern: HapticPattern.ENERGY_FLOW,
      intensity: normalizedIntensity,
      duration: 500,
      location: HapticLocation.BOTH_CONTROLLERS,
      frequency: 20 + (intensity * 30) // Variable frequency based on intensity
    };

    await this.playEffect(effect);
  }

  async notificationFeedback(type: 'info' | 'warning' | 'error' | 'success'): Promise<void> {
    const feedbackMap: Record<string, HapticEffect> = {
      info: {
        id: this.generateEffectId(),
        pattern: HapticPattern.NOTIFICATION,
        intensity: HapticIntensity.LIGHT,
        duration: 200,
        location: HapticLocation.BOTH_CONTROLLERS
      },
      warning: {
        id: this.generateEffectId(),
        pattern: HapticPattern.WARNING,
        intensity: HapticIntensity.MEDIUM,
        duration: 300,
        location: HapticLocation.BOTH_CONTROLLERS,
        repeat: 2
      },
      error: {
        id: this.generateEffectId(),
        pattern: HapticPattern.ERROR,
        intensity: HapticIntensity.STRONG,
        duration: 400,
        location: HapticLocation.BOTH_CONTROLLERS,
        repeat: 3
      },
      success: {
        id: this.generateEffectId(),
        pattern: HapticPattern.SUCCESS,
        intensity: HapticIntensity.MEDIUM,
        duration: 250,
        location: HapticLocation.BOTH_CONTROLLERS
      }
    };

    const effect = feedbackMap[type];
    if (effect) {
      await this.playEffect(effect);
    }
  }

  async gestureFeedback(gestureType: string, success: boolean): Promise<void> {
    const effect: HapticEffect = {
      id: this.generateEffectId(),
      pattern: success ? HapticPattern.SUCCESS : HapticPattern.ERROR,
      intensity: success ? HapticIntensity.LIGHT : HapticIntensity.MEDIUM,
      duration: success ? 100 : 200,
      location: HapticLocation.BOTH_CONTROLLERS
    };

    await this.playEffect(effect);
  }

  async setGlobalIntensity(multiplier: number): Promise<void> {
    this.globalIntensityMultiplier = Math.max(0, Math.min(2, multiplier));
    console.log(`Global haptic intensity set to ${this.globalIntensityMultiplier}`);
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    
    if (!enabled) {
      await this.stopAllEffects();
    }
    
    console.log(`Haptic feedback ${enabled ? 'enabled' : 'disabled'}`);
  }

  async isEnabled(): Promise<boolean> {
    return this.enabled;
  }

  async calibrateForUser(userId: string, preferences: {
    intensity: number;
    enabledPatterns: HapticPattern[];
    disabledLocations: HapticLocation[];
  }): Promise<void> {
    this.userPreferences.set(userId, preferences);
    console.log(`Calibrated haptic feedback for user: ${userId}`);
    
    this.emitEvent('calibration_updated', { userId, preferences });
  }

  async getUserPreferences(userId: string): Promise<{
    intensity: number;
    enabledPatterns: HapticPattern[];
    disabledLocations: HapticLocation[];
  } | null> {
    return this.userPreferences.get(userId) || null;
  }

  async testHapticPattern(pattern: HapticPattern, intensity: HapticIntensity, location: HapticLocation): Promise<void> {
    const testEffect: HapticEffect = {
      id: this.generateEffectId(),
      pattern,
      intensity,
      duration: 500,
      location
    };

    await this.playEffect(testEffect);
  }

  async getUsageStats(): Promise<{
    totalEffectsPlayed: number;
    mostUsedPatterns: Array<{
      pattern: HapticPattern;
      count: number;
    }>;
    averageIntensity: number;
    totalDuration: number;
  }> {
    const mostUsedPatterns = Array.from(this.usageStats.mostUsedPatterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEffectsPlayed: this.usageStats.totalEffectsPlayed,
      mostUsedPatterns,
      averageIntensity: this.usageStats.averageIntensity,
      totalDuration: this.usageStats.totalDuration
    };
  }

  addEventListener(event: 'effect_started' | 'effect_ended' | 'calibration_updated' | 'error', 
                   callback: (data: any) => void): void {
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

  async preloadEffects(effects: HapticEffect[]): Promise<void> {
    console.log(`Preloading ${effects.length} haptic effects`);
    // In real implementation, this would preload effects into device memory
  }

  async clearPreloadedEffects(): Promise<void> {
    console.log('Cleared preloaded haptic effects');
    // In real implementation, this would clear preloaded effects from device memory
  }

  // Private helper methods

  private async initializePlatformCapabilities(): Promise<HapticCapabilities> {
    switch (this.platform) {
      case ARVRPlatform.META_QUEST:
        return {
          supportsIntensityControl: true,
          supportsFrequencyControl: true,
          supportsCustomWaveforms: false,
          supportsSpatialHaptics: false,
          maxIntensity: 1.0,
          minIntensity: 0.0,
          maxFrequency: 1000,
          minFrequency: 10,
          maxDuration: 5000,
          locations: [HapticLocation.LEFT_CONTROLLER, HapticLocation.RIGHT_CONTROLLER, HapticLocation.BOTH_CONTROLLERS]
        };

      case ARVRPlatform.HOLOLENS:
        return {
          supportsIntensityControl: false,
          supportsFrequencyControl: false,
          supportsCustomWaveforms: false,
          supportsSpatialHaptics: true,
          maxIntensity: 1.0,
          minIntensity: 0.0,
          maxFrequency: 0,
          minFrequency: 0,
          maxDuration: 1000,
          locations: [HapticLocation.WEARABLE]
        };

      case ARVRPlatform.APPLE_VISION_PRO:
        return {
          supportsIntensityControl: false,
          supportsFrequencyControl: false,
          supportsCustomWaveforms: false,
          supportsSpatialHaptics: true,
          maxIntensity: 1.0,
          minIntensity: 0.0,
          maxFrequency: 0,
          minFrequency: 0,
          maxDuration: 1000,
          locations: [HapticLocation.WEARABLE]
        };

      case ARVRPlatform.WEBXR:
        return {
          supportsIntensityControl: true,
          supportsFrequencyControl: false,
          supportsCustomWaveforms: false,
          supportsSpatialHaptics: false,
          maxIntensity: 1.0,
          minIntensity: 0.0,
          maxFrequency: 0,
          minFrequency: 0,
          maxDuration: 3000,
          locations: [HapticLocation.LEFT_CONTROLLER, HapticLocation.RIGHT_CONTROLLER, HapticLocation.BOTH_CONTROLLERS]
        };

      default:
        return {
          supportsIntensityControl: false,
          supportsFrequencyControl: false,
          supportsCustomWaveforms: false,
          supportsSpatialHaptics: false,
          maxIntensity: 0,
          minIntensity: 0,
          maxFrequency: 0,
          minFrequency: 0,
          maxDuration: 0,
          locations: []
        };
    }
  }

  private async initializeDefaultPatterns(): Promise<void> {
    // Default patterns are already defined in the enum
    console.log('Default haptic patterns initialized');
  }

  private validateEffect(effect: HapticEffect): void {
    if (!this.capabilities) {
      throw new Error('Haptic capabilities not initialized');
    }

    if (effect.intensity > this.capabilities.maxIntensity) {
      throw new Error(`Intensity ${effect.intensity} exceeds maximum ${this.capabilities.maxIntensity}`);
    }

    if (effect.duration > this.capabilities.maxDuration) {
      throw new Error(`Duration ${effect.duration}ms exceeds maximum ${this.capabilities.maxDuration}ms`);
    }

    if (!this.capabilities.locations.includes(effect.location)) {
      throw new Error(`Location ${effect.location} not supported on this platform`);
    }
  }

  private async playPlatformEffect(effect: HapticEffect): Promise<void> {
    // Platform-specific haptic effect implementation
    switch (this.platform) {
      case ARVRPlatform.META_QUEST:
        await this.playMetaQuestEffect(effect);
        break;
      case ARVRPlatform.HOLOLENS:
        await this.playHoloLensEffect(effect);
        break;
      case ARVRPlatform.APPLE_VISION_PRO:
        await this.playVisionProEffect(effect);
        break;
      case ARVRPlatform.WEBXR:
        await this.playWebXREffect(effect);
        break;
      default:
        console.log(`Mock haptic effect: ${effect.pattern} at ${effect.intensity} intensity for ${effect.duration}ms`);
    }
  }

  private async stopPlatformEffect(effect: HapticEffect): Promise<void> {
    // Platform-specific effect stopping
    console.log(`Stopping haptic effect: ${effect.id}`);
  }

  private async playMetaQuestEffect(effect: HapticEffect): Promise<void> {
    // Meta Quest specific haptic implementation
    console.log(`Playing Meta Quest haptic effect: ${effect.pattern}`);
  }

  private async playHoloLensEffect(effect: HapticEffect): Promise<void> {
    // HoloLens specific haptic implementation
    console.log(`Playing HoloLens haptic effect: ${effect.pattern}`);
  }

  private async playVisionProEffect(effect: HapticEffect): Promise<void> {
    // Apple Vision Pro specific haptic implementation
    console.log(`Playing Vision Pro haptic effect: ${effect.pattern}`);
  }

  private async playWebXREffect(effect: HapticEffect): Promise<void> {
    // WebXR specific haptic implementation
    // Check if running in browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }
    
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (gamepad && gamepad.hapticActuators) {
          for (const actuator of gamepad.hapticActuators) {
            try {
              await actuator.pulse(effect.intensity, effect.duration);
            } catch (error) {
              console.warn('WebXR haptic pulse failed:', error);
            }
          }
        }
      }
    }
  }

  private calculateSpatialIntensity(spatialHaptic: SpatialHaptic): HapticIntensity {
    // Calculate intensity based on distance and falloff curve
    const distance = 1.0; // Mock distance calculation
    const normalizedDistance = Math.min(1.0, distance / spatialHaptic.radius);
    
    let falloffMultiplier: number;
    switch (spatialHaptic.falloffCurve) {
      case 'linear':
        falloffMultiplier = 1.0 - normalizedDistance;
        break;
      case 'exponential':
        falloffMultiplier = Math.pow(1.0 - normalizedDistance, 2);
        break;
      case 'logarithmic':
        falloffMultiplier = Math.log(2.0 - normalizedDistance);
        break;
      default:
        falloffMultiplier = 1.0 - normalizedDistance;
    }

    return Math.max(0, spatialHaptic.intensity * falloffMultiplier) as HapticIntensity;
  }

  private updateUsageStats(effect: HapticEffect): void {
    this.usageStats.totalEffectsPlayed++;
    
    const patternCount = this.usageStats.mostUsedPatterns.get(effect.pattern) || 0;
    this.usageStats.mostUsedPatterns.set(effect.pattern, patternCount + 1);
    
    this.usageStats.averageIntensity = 
      (this.usageStats.averageIntensity + effect.intensity) / 2;
    
    this.usageStats.totalDuration += effect.duration;
  }

  private generateEffectId(): string {
    return `haptic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in haptic feedback event listener for ${event}:`, error);
        }
      });
    }
  }
}