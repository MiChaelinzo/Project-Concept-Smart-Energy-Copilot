import { 
  FlashingInterfaceManager, 
  FlashingInterfaceConfig, 
  PatternStatus, 
  SystemState 
} from '../interfaces/FlashingInterfaceManager';
import { LightPattern, ErrorType, Color } from '../types';
import { PerformanceOptimizer } from './PerformanceOptimizer';

/**
 * Flashing Interface Manager Implementation
 * 
 * Manages visual feedback patterns and animations to indicate system states
 * and AI processing status through LED patterns, screen animations, or display effects.
 */
export class FlashingInterfaceManagerImpl implements FlashingInterfaceManager {
  private config?: FlashingInterfaceConfig;
  private initialized = false;
  private currentPattern: LightPattern | null = null;
  private currentState: SystemState = 'idle';
  private patternStartTime: Date = new Date();
  private brightness = 100;
  private animationsEnabled = true;
  private activeTimeout?: NodeJS.Timeout;
  private audioSyncTimeout?: NodeJS.Timeout;
  private performanceOptimizer = new PerformanceOptimizer();
  private animationFrameId?: number;
  private lastFrameTime = 0;
  private targetFPS = 60;

  // Predefined patterns for different states
  private readonly defaultPatterns = {
    listening: {
      type: 'pulse' as const,
      colors: [{ red: 0, green: 150, blue: 255 }], // Gentle blue
      duration: 2000,
      intensity: 70,
      repeat: true,
      fadeIn: 300,
      fadeOut: 300
    },
    processing: {
      type: 'rotate' as const,
      colors: [
        { red: 255, green: 100, blue: 0 },   // Orange
        { red: 255, green: 200, blue: 0 },   // Yellow
        { red: 100, green: 255, blue: 100 }  // Green
      ],
      duration: 1500,
      intensity: 80,
      repeat: true
    },
    speaking: {
      type: 'wave' as const,
      colors: [{ red: 0, green: 255, blue: 100 }], // Green
      duration: 1000,
      intensity: 75,
      repeat: true,
      fadeIn: 200,
      fadeOut: 200
    },
    error: {
      type: 'flash' as const,
      colors: [{ red: 255, green: 0, blue: 0 }], // Red
      duration: 500,
      intensity: 90,
      repeat: false
    },
    idle: {
      type: 'breathe' as const,
      colors: [{ red: 50, green: 50, blue: 100 }], // Dim blue
      duration: 4000,
      intensity: 30,
      repeat: true,
      fadeIn: 2000,
      fadeOut: 2000
    }
  };

  async initialize(config: FlashingInterfaceConfig): Promise<void> {
    this.config = config;
    this.brightness = config.defaultBrightness;
    this.animationsEnabled = !config.reducedMotion;
    
    // Initialize performance optimizer for pattern optimization
    await this.performanceOptimizer.initialize({
      patternOptimizationEnabled: true,
      aggressiveOptimization: config.reducedMotion || false
    });
    
    // Initialize hardware interface based on display type
    await this.initializeHardware(config);
    
    this.initialized = true;
    
    // Start with idle pattern
    this.showIdlePattern();
  }

  private async initializeHardware(config: FlashingInterfaceConfig): Promise<void> {
    // Hardware initialization would happen here
    // For now, we simulate the initialization
    console.log(`Initializing ${config.displayType} with ${config.ledCount || 'default'} LEDs`);
    
    // Simulate hardware setup delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  showListeningPattern(): void {
    this.setPattern('listening', this.getPatternForState('listening'));
  }

  showProcessingPattern(): void {
    this.setPattern('processing', this.getPatternForState('processing'));
  }

  showSpeakingPattern(duration: number): void {
    const pattern = this.getPatternForState('speaking');
    // Adjust pattern duration to match audio duration
    const adjustedPattern = {
      ...pattern,
      duration: pattern.duration, // Keep original pattern duration
      repeat: duration > pattern.duration // Repeat if audio is longer than pattern
    };
    
    this.setPattern('speaking', adjustedPattern);
    
    // Auto-return to idle after speaking completes
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
    }
    this.activeTimeout = setTimeout(() => {
      this.showIdlePattern();
    }, duration);
  }

  showErrorPattern(errorType: ErrorType): void {
    const basePattern = this.getPatternForState('error');
    
    // Customize error pattern based on severity
    const errorPattern: LightPattern = {
      ...basePattern,
      intensity: errorType.severity === 'critical' ? 100 : 
                errorType.severity === 'high' ? 90 :
                errorType.severity === 'medium' ? 70 : 50,
      duration: errorType.severity === 'critical' ? 200 : 500,
      repeat: errorType.severity === 'critical'
    };

    this.setPattern('error', errorPattern);
    
    // Auto-return to idle after error display
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
    }
    const displayDuration = errorPattern.repeat ? 3000 : errorPattern.duration;
    this.activeTimeout = setTimeout(() => {
      this.showIdlePattern();
    }, displayDuration);
  }

  showIdlePattern(): void {
    this.setPattern('idle', this.getPatternForState('idle'));
  }

  customPattern(pattern: LightPattern): void {
    // If we're currently in speaking state, maintain that state for custom patterns
    const state = this.currentState === 'speaking' ? 'speaking' : 'idle';
    this.setPattern(state, pattern);
  }

  private setPattern(state: SystemState, pattern: LightPattern): void {
    if (!this.initialized) {
      throw new Error('FlashingInterfaceManager not initialized');
    }

    // Clear any existing timeouts and animations
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
    }
    if (this.audioSyncTimeout) {
      clearTimeout(this.audioSyncTimeout);
    }
    if (this.animationFrameId && typeof globalThis !== 'undefined' && 'cancelAnimationFrame' in globalThis) {
      (globalThis as any).cancelAnimationFrame(this.animationFrameId);
    }

    this.currentState = state;
    this.currentPattern = pattern;
    this.patternStartTime = new Date();

    // Optimize pattern for performance while preserving critical properties
    const optimizedPattern = this.performanceOptimizer.optimizePattern(pattern);
    
    // Preserve the original repeat behavior if it was explicitly set
    if (pattern.repeat !== optimizedPattern.repeat) {
      optimizedPattern.repeat = pattern.repeat;
    }
    
    // Apply brightness and animation settings
    const adjustedPattern = this.applySettings(optimizedPattern);
    
    // Execute the pattern with smooth animation
    this.executePatternSmooth(adjustedPattern);
  }

  private applySettings(pattern: LightPattern): LightPattern {
    const adjustedPattern = {
      ...pattern,
      intensity: Math.round(pattern.intensity * (this.brightness / 100)),
      duration: this.animationsEnabled ? pattern.duration : 0,
      repeat: this.animationsEnabled ? pattern.repeat : false
    };
    
    // Update the current pattern to reflect the applied settings
    this.currentPattern = adjustedPattern;
    
    return adjustedPattern;
  }

  private executePattern(pattern: LightPattern): void {
    // This would interface with actual hardware
    // For now, we log the pattern execution
    console.log(`Executing ${pattern.type} pattern:`, {
      colors: pattern.colors,
      duration: pattern.duration,
      intensity: pattern.intensity,
      repeat: pattern.repeat
    });
  }

  private executePatternSmooth(pattern: LightPattern): void {
    const hasAnimationFrame = typeof globalThis !== 'undefined' && 'requestAnimationFrame' in globalThis;
    
    if (!this.animationsEnabled || !hasAnimationFrame) {
      this.executePattern(pattern);
      return;
    }

    // Use requestAnimationFrame for smooth 60fps animations
    const startTime = Date.now();
    const frameTime = 1000 / this.targetFPS;
    
    const animate = (currentTime: number) => {
      // Throttle to target FPS
      if (currentTime - this.lastFrameTime >= frameTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / pattern.duration, 1);
        
        // Calculate current frame of animation
        const frame = this.calculateAnimationFrame(pattern, progress);
        
        // Render the frame
        this.renderFrame(frame);
        
        this.lastFrameTime = currentTime;
        
        // Continue animation if not complete and should repeat
        if (progress < 1 || (pattern.repeat && this.currentPattern === pattern)) {
          if (hasAnimationFrame) {
            this.animationFrameId = (globalThis as any).requestAnimationFrame(animate);
          }
        }
      } else {
        if (hasAnimationFrame) {
          this.animationFrameId = (globalThis as any).requestAnimationFrame(animate);
        }
      }
    };
    
    // Start animation
    if (hasAnimationFrame) {
      this.animationFrameId = (globalThis as any).requestAnimationFrame(animate);
    }
  }

  private calculateAnimationFrame(pattern: LightPattern, progress: number): any {
    switch (pattern.type) {
      case 'pulse':
        return this.calculatePulseFrame(pattern, progress);
      case 'wave':
        return this.calculateWaveFrame(pattern, progress);
      case 'rotate':
        return this.calculateRotateFrame(pattern, progress);
      case 'flash':
        return this.calculateFlashFrame(pattern, progress);
      case 'breathe':
        return this.calculateBreatheFrame(pattern, progress);
      default:
        return { colors: pattern.colors, intensity: pattern.intensity };
    }
  }

  private calculatePulseFrame(pattern: LightPattern, progress: number): any {
    // Smooth sine wave pulse
    const intensity = pattern.intensity * (0.5 + 0.5 * Math.sin(progress * Math.PI * 2));
    return {
      colors: pattern.colors,
      intensity: Math.round(intensity)
    };
  }

  private calculateWaveFrame(pattern: LightPattern, progress: number): any {
    // Wave effect across colors
    const wavePosition = progress * pattern.colors.length;
    const activeColorIndex = Math.floor(wavePosition) % pattern.colors.length;
    const nextColorIndex = (activeColorIndex + 1) % pattern.colors.length;
    const blend = wavePosition - Math.floor(wavePosition);
    
    // Blend between current and next color
    const currentColor = pattern.colors[activeColorIndex];
    const nextColor = pattern.colors[nextColorIndex];
    
    const blendedColor = {
      red: Math.round(currentColor.red * (1 - blend) + nextColor.red * blend),
      green: Math.round(currentColor.green * (1 - blend) + nextColor.green * blend),
      blue: Math.round(currentColor.blue * (1 - blend) + nextColor.blue * blend)
    };
    
    return {
      colors: [blendedColor],
      intensity: pattern.intensity
    };
  }

  private calculateRotateFrame(pattern: LightPattern, progress: number): any {
    // Rotate through colors
    const rotationSpeed = 2; // rotations per cycle
    const colorIndex = Math.floor((progress * rotationSpeed * pattern.colors.length)) % pattern.colors.length;
    return {
      colors: [pattern.colors[colorIndex]],
      intensity: pattern.intensity
    };
  }

  private calculateFlashFrame(pattern: LightPattern, progress: number): any {
    // Quick flash effect
    const flashCount = 3;
    const flashProgress = (progress * flashCount) % 1;
    const intensity = flashProgress < 0.5 ? pattern.intensity : 0;
    
    return {
      colors: pattern.colors,
      intensity
    };
  }

  private calculateBreatheFrame(pattern: LightPattern, progress: number): any {
    // Smooth breathing effect
    const breatheIntensity = pattern.intensity * (0.3 + 0.7 * Math.sin(progress * Math.PI));
    return {
      colors: pattern.colors,
      intensity: Math.round(breatheIntensity)
    };
  }

  private renderFrame(frame: any): void {
    // This would render to actual hardware
    // For now, we can use this for performance monitoring
    if (this.config?.debugMode) {
      console.log('Rendering frame:', frame);
    }
  }

  private getPatternForState(state: SystemState): LightPattern {
    if (this.config) {
      switch (state) {
        case 'listening':
          return this.config.listeningPattern || this.defaultPatterns.listening;
        case 'processing':
          return this.config.processingPattern || this.defaultPatterns.processing;
        case 'speaking':
          return this.config.speakingPattern || this.defaultPatterns.speaking;
        case 'error':
          return this.config.errorPattern || this.defaultPatterns.error;
        case 'idle':
        default:
          return this.config.idlePattern || this.defaultPatterns.idle;
      }
    }
    
    return this.defaultPatterns[state as keyof typeof this.defaultPatterns] || this.defaultPatterns.idle;
  }

  clearPattern(): void {
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
    }
    if (this.audioSyncTimeout) {
      clearTimeout(this.audioSyncTimeout);
    }
    
    this.currentPattern = null;
    this.currentState = 'idle';
    
    // Clear hardware display
    console.log('Clearing all patterns');
  }

  setBrightness(brightness: number): void {
    this.brightness = Math.max(0, Math.min(100, brightness));
    
    // If a pattern is currently active, update it with new brightness
    if (this.currentPattern) {
      const adjustedPattern = this.applySettings(this.currentPattern);
      this.executePattern(adjustedPattern);
    }
  }

  setAnimationsEnabled(enabled: boolean): void {
    this.animationsEnabled = enabled;
    
    // If a pattern is currently active, update it with new animation setting
    if (this.currentPattern) {
      const adjustedPattern = this.applySettings(this.currentPattern);
      this.executePattern(adjustedPattern);
    }
  }

  synchronizeWithAudio(audioStartTime: Date, audioDuration: number, pattern: LightPattern): void {
    const now = new Date();
    const delayMs = audioStartTime.getTime() - now.getTime();
    const syncDelay = this.config?.audioSyncDelayMs || 0;
    
    if (this.audioSyncTimeout) {
      clearTimeout(this.audioSyncTimeout);
    }
    
    // Schedule pattern to start with audio
    this.audioSyncTimeout = setTimeout(() => {
      const syncedPattern: LightPattern = {
        ...pattern,
        duration: audioDuration,
        repeat: false
      };
      
      this.setPattern('speaking', syncedPattern);
      
      // Auto-return to idle after audio completes
      setTimeout(() => {
        this.showIdlePattern();
      }, audioDuration);
      
    }, Math.max(0, delayMs + syncDelay));
  }

  getCurrentPattern(): PatternStatus {
    const estimatedEndTime = this.currentPattern && !this.currentPattern.repeat
      ? new Date(this.patternStartTime.getTime() + this.currentPattern.duration)
      : undefined;

    return {
      isActive: this.currentPattern !== null,
      currentPattern: this.currentPattern,
      state: this.currentState,
      startTime: this.patternStartTime,
      estimatedEndTime,
      brightness: this.brightness,
      animationsEnabled: this.animationsEnabled
    };
  }

  async testPatterns(): Promise<void> {
    if (!this.initialized) {
      throw new Error('FlashingInterfaceManager not initialized');
    }

    const testSequence = [
      { state: 'listening' as SystemState, duration: 2000 },
      { state: 'processing' as SystemState, duration: 2000 },
      { state: 'speaking' as SystemState, duration: 2000 },
      { state: 'error' as SystemState, duration: 1000 },
      { state: 'idle' as SystemState, duration: 2000 }
    ];

    for (const test of testSequence) {
      this.updateForState(test.state);
      await new Promise(resolve => setTimeout(resolve, test.duration));
    }
  }

  updateForState(state: SystemState, metadata?: Record<string, any>): void {
    switch (state) {
      case 'listening':
        this.showListeningPattern();
        break;
      case 'processing':
        this.showProcessingPattern();
        break;
      case 'speaking':
        const duration = metadata?.audioDuration || 2000;
        this.showSpeakingPattern(duration);
        break;
      case 'error':
        const errorType: ErrorType = metadata?.errorType || {
          category: 'software',
          severity: 'medium',
          code: 'UNKNOWN',
          message: 'Unknown error',
          recoverable: true
        };
        this.showErrorPattern(errorType);
        break;
      case 'idle':
      default:
        this.showIdlePattern();
        break;
    }
  }

  async shutdown(): Promise<void> {
    this.clearPattern();
    
    // Cancel any active animations
    if (this.animationFrameId && typeof globalThis !== 'undefined' && 'cancelAnimationFrame' in globalThis) {
      (globalThis as any).cancelAnimationFrame(this.animationFrameId);
    }
    
    // Shutdown performance optimizer
    await this.performanceOptimizer.shutdown();
    
    this.initialized = false;
    
    // Cleanup hardware resources
    console.log('Shutting down FlashingInterfaceManager');
    
    // Simulate hardware cleanup delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}