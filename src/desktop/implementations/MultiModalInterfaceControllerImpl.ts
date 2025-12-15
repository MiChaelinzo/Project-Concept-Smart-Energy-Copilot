import { 
  MultiModalInterfaceController, 
  MultiModalConfig, 
  ModalityStatus, 
  MultiModalIntent, 
  ModalityTestResult, 
  EmergencyInputType, 
  EnvironmentalConditions, 
  InteractionMode, 
  InteractionCapability 
} from '../interfaces/MultiModalInterfaceController';
import { 
  UserInput, 
  SystemResponse, 
  InputModality, 
  InputHandler, 
  AccessibilityMode, 
  HapticFeedback,
  AudioBuffer,
  TouchData,
  GestureData
} from '../types';
import { VoiceProcessor } from '../interfaces/VoiceProcessor';
import { VoiceProcessorImpl } from './VoiceProcessorImpl';

/**
 * Multi-Modal Interface Controller Implementation
 * 
 * Coordinates input and output across touch, voice, visual, and gesture modalities,
 * providing seamless interaction and accessibility support.
 */
export class MultiModalInterfaceControllerImpl implements MultiModalInterfaceController {
  private config?: MultiModalConfig;
  private initialized = false;
  private inputHandlers = new Map<string, InputHandler>();
  private modalityStatuses = new Map<string, ModalityStatus>();
  private voiceProcessor?: VoiceProcessor;
  private currentInteractionMode: InteractionMode = 'voice_primary';
  private accessibilityMode?: AccessibilityMode;
  private emergencyHandlers = new Map<EmergencyInputType, () => Promise<void>>();

  async initialize(config: MultiModalConfig): Promise<void> {
    this.config = config;
    
    // Initialize voice processor if voice modality is enabled
    if (config.enabledModalities.includes('voice')) {
      this.voiceProcessor = new VoiceProcessorImpl();
      await this.voiceProcessor.initialize(config.voiceConfig);
    }

    // Initialize modality statuses
    for (const modalityType of config.enabledModalities) {
      this.modalityStatuses.set(modalityType, {
        type: modalityType,
        enabled: true,
        active: false,
        quality: 100,
        errorCount: 0,
        calibrationNeeded: false
      });
    }

    // Set default interaction mode
    this.currentInteractionMode = config.defaultInteractionMode;

    this.initialized = true;
  }

  registerInputHandler(modality: InputModality, handler: InputHandler): void {
    if (!this.initialized) {
      throw new Error('Controller not initialized');
    }

    this.inputHandlers.set(modality.type, handler);
    
    // Update modality status
    const status = this.modalityStatuses.get(modality.type);
    if (status) {
      status.enabled = modality.enabled;
    }
  }

  async routeInput(input: UserInput): Promise<void> {
    if (!this.initialized) {
      throw new Error('Controller not initialized');
    }

    // Update modality status
    const status = this.modalityStatuses.get(input.type);
    if (status) {
      status.active = true;
      status.lastInput = new Date();
    }

    // Handle input based on type and current interaction mode
    try {
      switch (input.type) {
        case 'voice':
          await this.handleVoiceInput(input);
          break;
        case 'touch':
          await this.handleTouchInput(input);
          break;
        case 'gesture':
          await this.handleGestureInput(input);
          break;
        case 'text':
        case 'keyboard':
          await this.handleTextInput(input);
          break;
        default:
          throw new Error(`Unsupported input type: ${input.type}`);
      }
    } catch (error) {
      // Update error count
      if (status) {
        status.errorCount++;
      }
      throw error;
    }
  }

  async coordinateOutput(response: SystemResponse): Promise<void> {
    if (!this.initialized) {
      throw new Error('Controller not initialized');
    }

    // Coordinate output across multiple modalities based on current mode
    const outputPromises: Promise<void>[] = [];

    // Enhanced text for screen reader mode
    let enhancedText = response.text || '';
    
    // Add descriptions for visual elements in screen reader mode
    if (this.accessibilityMode?.screenReader) {
      if (response.visual) {
        enhancedText += ` Visual indicator: ${response.visual.type} pattern with ${response.visual.colors?.length || 0} colors.`;
      }
      
      if (response.actions) {
        for (const action of response.actions) {
          if (action.type === 'notification' && action.parameters?.label) {
            enhancedText += ` Interactive element: ${action.parameters.label} button available.`;
          } else {
            enhancedText += ` Action available: ${action.command}.`;
          }
        }
      }
      
      if (response.haptic) {
        enhancedText += ` Haptic feedback: ${response.haptic.type} pattern.`;
      }
    }

    // Audio output
    if (response.audio && this.voiceProcessor) {
      outputPromises.push(this.handleAudioOutput(response.audio));
    }

    // Text-to-speech for text responses (use enhanced text for screen reader)
    if ((enhancedText || response.text) && this.shouldSynthesizeSpeech()) {
      outputPromises.push(this.synthesizeTextResponse(enhancedText || response.text!));
    }

    // Visual output (handled by FlashingInterfaceManager)
    if (response.visual && !this.accessibilityMode?.voiceOnly) {
      outputPromises.push(this.handleVisualOutput(response.visual));
    }

    // Haptic feedback
    if (response.haptic) {
      outputPromises.push(this.handleHapticOutput(response.haptic));
    }

    // Execute actions
    if (response.actions) {
      outputPromises.push(this.executeActions(response.actions));
    }

    await Promise.all(outputPromises);
  }

  setAccessibilityMode(mode: AccessibilityMode): void {
    this.accessibilityMode = mode;
    
    // Adjust interface based on accessibility needs
    if (mode.voiceOnly) {
      this.switchInteractionMode('hands_free');
    }
    
    if (mode.highContrast || mode.largeText) {
      // Adjust visual settings (would integrate with visual components)
    }
    
    if (mode.screenReader) {
      // Enable screen reader support
    }
  }

  toggleModality(modality: InputModality['type'], enabled: boolean): void {
    const status = this.modalityStatuses.get(modality);
    if (status) {
      status.enabled = enabled;
      
      // If disabling the primary modality, switch to another
      if (!enabled && this.isPrimaryModality(modality)) {
        this.switchToAlternativeMode();
      }
    }
  }

  getModalityStatus(): ModalityStatus[] {
    return Array.from(this.modalityStatuses.values());
  }

  async processConcurrentInput(inputs: UserInput[]): Promise<MultiModalIntent> {
    if (!this.config?.concurrentInputEnabled) {
      throw new Error('Concurrent input not enabled');
    }

    // Determine primary modality based on confidence and timing
    let primaryInput = inputs[0];
    let maxConfidence = 0;

    for (const input of inputs) {
      const confidence = await this.calculateInputConfidence(input);
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        primaryInput = input;
      }
    }

    // Generate unified intent
    const intent: MultiModalIntent = {
      primaryModality: primaryInput.type as InputModality['type'],
      confidence: maxConfidence,
      intent: await this.extractIntent(primaryInput),
      parameters: await this.extractParameters(primaryInput),
      supportingInputs: inputs.filter(input => input !== primaryInput),
      ambiguities: await this.identifyAmbiguities(inputs)
    };

    return intent;
  }

  calibrateModality(modality: InputModality['type'], sensitivity: number): void {
    const status = this.modalityStatuses.get(modality);
    if (status) {
      status.calibrationNeeded = false;
      // Apply sensitivity settings based on modality type
      switch (modality) {
        case 'touch':
          // Adjust touch sensitivity
          break;
        case 'voice':
          // Adjust voice recognition sensitivity
          break;
        case 'gesture':
          // Adjust gesture recognition sensitivity
          break;
      }
    }
  }

  async resolveInputConflict(conflictingInputs: UserInput[]): Promise<UserInput | null> {
    if (conflictingInputs.length === 0) return null;
    if (conflictingInputs.length === 1) return conflictingInputs[0];

    // Resolve conflicts based on current interaction mode and input quality
    const scores = await Promise.all(
      conflictingInputs.map(async input => ({
        input,
        score: await this.calculateInputScore(input)
      }))
    );

    // Sort by score and return the highest scoring input
    scores.sort((a, b) => b.score - a.score);
    return scores[0].input;
  }

  provideHapticFeedback(feedback: HapticFeedback): void {
    // Simulate haptic feedback
    try {
      if (typeof (globalThis as any).navigator !== 'undefined' && 'vibrate' in (globalThis as any).navigator) {
        switch (feedback.type) {
          case 'vibration':
            (globalThis as any).navigator.vibrate(feedback.duration);
            break;
          case 'pulse':
            (globalThis as any).navigator.vibrate([feedback.duration, 100, feedback.duration]);
            break;
          case 'tap':
            (globalThis as any).navigator.vibrate(50);
            break;
        }
      }
    } catch (error) {
      // Haptic feedback not available
    }
  }

  switchInteractionMode(mode: InteractionMode): void {
    this.currentInteractionMode = mode;
    
    // Adjust modality priorities based on mode
    switch (mode) {
      case 'voice_primary':
        this.prioritizeModality('voice');
        break;
      case 'touch_primary':
        this.prioritizeModality('touch');
        break;
      case 'hands_free':
        this.toggleModality('touch', false);
        this.prioritizeModality('voice');
        break;
      case 'silent':
        this.toggleModality('voice', false);
        this.prioritizeModality('touch');
        break;
    }
  }

  getCapabilities(): InteractionCapability[] {
    const capabilities: InteractionCapability[] = [];
    
    for (const [modalityType, status] of this.modalityStatuses) {
      capabilities.push({
        type: modalityType as InputModality['type'],
        available: status.enabled,
        quality: this.assessModalityQuality(status),
        features: this.getModalityFeatures(modalityType as InputModality['type']),
        limitations: this.getModalityLimitations(modalityType as InputModality['type'])
      });
    }
    
    return capabilities;
  }

  async testModalities(): Promise<ModalityTestResult[]> {
    const results: ModalityTestResult[] = [];
    
    for (const modalityType of this.config?.enabledModalities || []) {
      const startTime = Date.now();
      let passed = false;
      let score = 0;
      const issues: string[] = [];
      const recommendations: string[] = [];
      
      try {
        switch (modalityType) {
          case 'voice':
            if (this.voiceProcessor) {
              const testResult = await this.voiceProcessor.testAudioHardware();
              passed = testResult.overall.passed;
              score = testResult.overall.score;
              issues.push(...testResult.overall.issues);
              recommendations.push(...testResult.overall.recommendations);
            }
            break;
          case 'touch':
            passed = typeof (globalThis as any).window !== 'undefined' && 'ontouchstart' in (globalThis as any).window;
            score = passed ? 90 : 0;
            if (!passed) {
              issues.push('Touch not supported');
              recommendations.push('Use mouse input instead');
            }
            break;
          case 'gesture':
            passed = typeof (globalThis as any).navigator !== 'undefined' && 'mediaDevices' in (globalThis as any).navigator;
            score = passed ? 75 : 0;
            if (!passed) {
              issues.push('Camera not available');
              recommendations.push('Enable camera permissions');
            }
            break;
        }
      } catch (error) {
        issues.push(`Test failed: ${error}`);
      }
      
      results.push({
        modality: modalityType,
        passed,
        score,
        issues,
        recommendations,
        testDuration: Date.now() - startTime
      });
    }
    
    return results;
  }

  async handleEmergencyInput(emergencyType: EmergencyInputType): Promise<void> {
    const handler = this.emergencyHandlers.get(emergencyType);
    if (handler) {
      await handler();
    } else {
      // Default emergency handling
      console.error(`Emergency detected: ${emergencyType}`);
      
      // Switch to voice-only mode for emergencies
      this.switchInteractionMode('voice_primary');
      
      // Provide immediate feedback
      this.provideHapticFeedback({
        type: 'vibration',
        intensity: 100,
        duration: 1000
      });
    }
  }

  adaptToEnvironment(conditions: EnvironmentalConditions): void {
    // Adjust voice processing for noise
    if (this.voiceProcessor && conditions.noiseLevel > 70) {
      this.voiceProcessor.setNoiseCancellation(true);
    }
    
    // Adjust touch sensitivity for proximity
    if (conditions.proximityDistance && conditions.proximityDistance < 30) {
      // Increase touch sensitivity for close interaction
    }
    
    // Adjust visual feedback for lighting
    if (conditions.lightLevel < 30) {
      // Increase brightness for low light conditions
    }
  }

  async shutdown(): Promise<void> {
    if (this.voiceProcessor) {
      await this.voiceProcessor.shutdown();
    }
    
    this.inputHandlers.clear();
    this.modalityStatuses.clear();
    this.emergencyHandlers.clear();
    this.initialized = false;
  }

  // Private helper methods

  private async handleVoiceInput(input: UserInput): Promise<void> {
    const handler = this.inputHandlers.get('voice');
    if (handler) {
      // Handle both audio buffer and string content for voice inputs
      if (input.content instanceof Object && 'data' in input.content) {
        // Audio buffer input - process through voice processor
        if (this.voiceProcessor) {
          const audioBuffer = input.content as AudioBuffer;
          const recognition = await this.voiceProcessor.recognizeSpeech(audioBuffer);
          
          // Create text input from recognition
          const textInput: UserInput = {
            type: 'keyboard', // Route as keyboard input for text processing
            content: recognition.text,
            timestamp: input.timestamp,
            userId: input.userId
          };
          
          await this.handleTextInput(textInput);
        }
      } else if (typeof input.content === 'string') {
        // String content - process directly through voice handler
        await handler.process(input);
      }
    }
  }

  private async handleTouchInput(input: UserInput): Promise<void> {
    const handler = this.inputHandlers.get('touch');
    if (handler) {
      await handler.process(input);
    }
  }

  private async handleGestureInput(input: UserInput): Promise<void> {
    const handler = this.inputHandlers.get('gesture');
    if (handler) {
      await handler.process(input);
    }
  }

  private async handleTextInput(input: UserInput): Promise<void> {
    const handler = this.inputHandlers.get('keyboard') || this.inputHandlers.get('voice');
    if (handler) {
      await handler.process(input);
    }
  }

  private async handleAudioOutput(audio: AudioBuffer): Promise<void> {
    // Play audio through Web Audio API
    if (this.voiceProcessor) {
      // Audio playback would be handled here
    }
  }

  private async synthesizeTextResponse(text: string): Promise<void> {
    if (this.voiceProcessor && this.shouldSynthesizeSpeech()) {
      try {
        await this.voiceProcessor.synthesizeSpeech(text);
      } catch (error) {
        console.error('Speech synthesis failed:', error);
      }
    }
  }

  private async handleVisualOutput(visual: any): Promise<void> {
    // Visual output would be coordinated with FlashingInterfaceManager
  }

  private async handleHapticOutput(haptic: HapticFeedback): Promise<void> {
    this.provideHapticFeedback(haptic);
  }

  private async executeActions(actions: any[]): Promise<void> {
    // Execute system actions
    for (const action of actions) {
      // Action execution would be handled here
    }
  }

  private shouldSynthesizeSpeech(): boolean {
    return this.currentInteractionMode === 'voice_primary' || 
           this.currentInteractionMode === 'hands_free' ||
           (this.accessibilityMode?.voiceOnly ?? false) ||
           (this.accessibilityMode?.screenReader ?? false);
  }

  private isPrimaryModality(modality: string): boolean {
    switch (this.currentInteractionMode) {
      case 'voice_primary':
      case 'hands_free':
        return modality === 'voice';
      case 'touch_primary':
        return modality === 'touch';
      case 'gesture_primary':
        return modality === 'gesture';
      default:
        return false;
    }
  }

  private switchToAlternativeMode(): void {
    // Switch to an available alternative mode
    const availableModalities = Array.from(this.modalityStatuses.entries())
      .filter(([_, status]) => status.enabled)
      .map(([type, _]) => type);

    if (availableModalities.includes('voice')) {
      this.switchInteractionMode('voice_primary');
    } else if (availableModalities.includes('touch')) {
      this.switchInteractionMode('touch_primary');
    } else if (availableModalities.includes('gesture')) {
      this.switchInteractionMode('gesture_primary');
    }
  }

  private prioritizeModality(modality: string): void {
    // Adjust modality priorities (implementation would depend on specific requirements)
  }

  private async calculateInputConfidence(input: UserInput): Promise<number> {
    // Calculate confidence based on input type and quality
    switch (input.type) {
      case 'voice':
        return 0.8; // Voice typically has good confidence
      case 'touch':
        return 0.9; // Touch is very reliable
      case 'gesture':
        return 0.6; // Gestures can be ambiguous
      case 'text':
        return 0.95; // Text input is most reliable
      default:
        return 0.5;
    }
  }

  private async extractIntent(input: UserInput): Promise<string> {
    // Extract intent from input (simplified)
    if (typeof input.content === 'string') {
      return input.content.toLowerCase().includes('help') ? 'help_request' : 'general_query';
    }
    return 'unknown';
  }

  private async extractParameters(input: UserInput): Promise<Record<string, any>> {
    // Extract parameters from input
    return {
      inputType: input.type,
      timestamp: input.timestamp,
      userId: input.userId
    };
  }

  private async identifyAmbiguities(inputs: UserInput[]): Promise<string[]> {
    const ambiguities: string[] = [];
    
    if (inputs.length > 1) {
      ambiguities.push('Multiple concurrent inputs detected');
    }
    
    return ambiguities;
  }

  private async calculateInputScore(input: UserInput): Promise<number> {
    const confidence = await this.calculateInputConfidence(input);
    const modalityPriority = this.getModalityPriority(input.type);
    const timingScore = this.calculateTimingScore(input.timestamp);
    
    return (confidence * 0.5) + (modalityPriority * 0.3) + (timingScore * 0.2);
  }

  private getModalityPriority(modalityType: string): number {
    switch (this.currentInteractionMode) {
      case 'voice_primary':
        return modalityType === 'voice' ? 1.0 : 0.5;
      case 'touch_primary':
        return modalityType === 'touch' ? 1.0 : 0.5;
      case 'gesture_primary':
        return modalityType === 'gesture' ? 1.0 : 0.5;
      default:
        return 0.7;
    }
  }

  private calculateTimingScore(timestamp: Date): number {
    const now = new Date();
    const age = now.getTime() - timestamp.getTime();
    return Math.max(0, 1 - (age / 5000)); // Decay over 5 seconds
  }

  private assessModalityQuality(status: ModalityStatus): 'poor' | 'fair' | 'good' | 'excellent' {
    if (status.quality >= 90) return 'excellent';
    if (status.quality >= 75) return 'good';
    if (status.quality >= 60) return 'fair';
    return 'poor';
  }

  private getModalityFeatures(modalityType: InputModality['type']): string[] {
    switch (modalityType) {
      case 'voice':
        return ['speech_recognition', 'wake_word_detection', 'continuous_listening'];
      case 'touch':
        return ['multi_touch', 'gestures', 'haptic_feedback'];
      case 'gesture':
        return ['hand_tracking', 'face_tracking', 'body_gestures'];
      case 'keyboard':
        return ['text_input', 'shortcuts', 'accessibility'];
      case 'eye_tracking':
        return ['gaze_tracking', 'blink_detection', 'attention_monitoring'];
      default:
        return [];
    }
  }

  private getModalityLimitations(modalityType: InputModality['type']): string[] {
    switch (modalityType) {
      case 'voice':
        return ['noise_sensitivity', 'accent_variations', 'privacy_concerns'];
      case 'touch':
        return ['screen_size_dependent', 'accessibility_issues'];
      case 'gesture':
        return ['lighting_dependent', 'camera_required', 'processing_intensive'];
      case 'keyboard':
        return ['physical_keyboard_required', 'typing_speed_dependent'];
      case 'eye_tracking':
        return ['calibration_required', 'head_movement_sensitive', 'expensive_hardware'];
      default:
        return ['unknown_limitations'];
    }
  }
}