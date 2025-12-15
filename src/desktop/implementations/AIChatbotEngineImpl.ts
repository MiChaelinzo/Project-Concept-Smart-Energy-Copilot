import { 
  AIChatbotEngine, 
  AIChatbotConfig, 
  EngineStatus 
} from '../interfaces/AIChatbotEngine';
import { 
  AudioBuffer, 
  ConversationContext, 
  ChatResponse, 
  UserInput,
  SystemAction,
  LightPattern,
  EnergyQuery
} from '../types';
import { SmartEnergyCopilotIntegration } from '../interfaces/SmartEnergyCopilotIntegration';
import { PerformanceOptimizer } from './PerformanceOptimizer';

/**
 * AI Chatbot Engine Implementation
 * 
 * Core implementation of the conversational AI component with natural language processing,
 * context management, and domain-specific response generation.
 */
export class AIChatbotEngineImpl implements AIChatbotEngine {
  private config?: AIChatbotConfig;
  private initialized = false;
  private conversationContexts = new Map<string, ConversationContext>();
  private processingStartTime = 0;
  private testMode = false;
  private energyIntegration?: SmartEnergyCopilotIntegration;
  private performanceOptimizer = new PerformanceOptimizer();
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    lastError: undefined as string | undefined
  };

  async processVoiceInput(audioData: AudioBuffer, context: ConversationContext): Promise<ChatResponse> {
    this.processingStartTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Simulate speech-to-text conversion
      const transcribedText = await this.speechToText(audioData);
      
      // Process the transcribed text
      const response = await this.processTextInput(transcribedText, context);
      
      this.stats.successfulRequests++;
      return response;
    } catch (error) {
      this.stats.failedRequests++;
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async processTextInput(text: string, context: ConversationContext): Promise<ChatResponse> {
    this.processingStartTime = Date.now();
    this.stats.totalRequests++;

    try {
      if (!this.initialized) {
        throw new Error('AI Chatbot Engine not initialized');
      }

      // Generate input hash for caching
      const inputHash = this.generateInputHash(text, context);

      // Use performance optimizer for response generation
      return await this.performanceOptimizer.optimizeResponse(
        inputHash,
        () => this.generateResponse(text, context),
        context
      );
    } catch (error) {
      this.stats.failedRequests++;
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async generateResponse(text: string, context: ConversationContext): Promise<ChatResponse> {
    // Optimize conversation context
    const optimizedContext = this.performanceOptimizer.optimizeConversationContext(context);
    
    // Update conversation context
    this.maintainContext(optimizedContext.conversationId, optimizedContext);

      // Analyze input for domain and intent
      const intent = this.analyzeIntent(text, optimizedContext);
      
      // Check if input is unclear and needs clarification
      if (this.isUnclearInput(text)) {
        return await this.requestClarification(text, optimizedContext);
      }
      
      // Generate response based on domain and context
      let responseText: string;
      let actions: SystemAction[] = [];
      let visualPattern: LightPattern | undefined;

      // Check domains in priority order - calendar first to ensure proper detection
      if (this.isCalendarRelated(text)) {
        responseText = await this.generateCalendarResponse(text, optimizedContext);
        actions = this.generateCalendarActions(text);
      } else if (this.isHealthRelated(text)) {
        responseText = await this.generateHealthResponse(text, optimizedContext);
        actions = this.generateHealthActions(text);
      } else if (this.isEnergyRelated(text)) {
        responseText = await this.generateEnergyResponse(text, optimizedContext);
        actions = this.generateEnergyActions(text);
      } else if (this.isWorkRelated(text, optimizedContext)) {
        responseText = await this.generateWorkRelatedResponse(text, optimizedContext);
        visualPattern = this.performanceOptimizer.optimizePattern(this.createProcessingPattern());
      } else {
        responseText = await this.generateGeneralResponse(text, optimizedContext);
      }

      const processingTime = Date.now() - this.processingStartTime;
      this.stats.totalResponseTime += processingTime;
      this.stats.successfulRequests++;

      // Calculate confidence after response generation for better accuracy
      let confidence = this.calculateConfidence(text, optimizedContext);
      
      // Further reduce confidence for empty inputs that get generic responses
      if (text.length === 0) {
        confidence = 0.3; // Force low confidence for empty inputs
      }

      const response: ChatResponse = {
        text: responseText,
        confidence,
        processingTime,
        actions,
        visualPattern,
        requiresFollowUp: this.requiresFollowUp(text, responseText),
        context: { intent, domain: this.getDomain(text) }
      };

      // Add message to conversation history (optimized context will handle trimming)
      optimizedContext.messageHistory.push({
        id: `msg_${Date.now()}`,
        type: 'user',
        content: text,
        timestamp: new Date()
      });
      optimizedContext.messageHistory.push({
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        content: responseText,
        timestamp: new Date()
      });

      // Update context variables in both optimized and original context
      const updatedContextVariables = {
        ...context.contextVariables, // Preserve original context variables
        ...optimizedContext.contextVariables,
        lastUpdated: new Date(),
        messageCount: optimizedContext.messageHistory.length
      };
      
      optimizedContext.contextVariables = updatedContextVariables;
      
      // Also update the original context object that was passed in
      context.messageHistory = [...optimizedContext.messageHistory];
      context.contextVariables = updatedContextVariables;

      // Maintain context for future use
      this.maintainContext(optimizedContext.conversationId, optimizedContext);

      return response;
  }

  maintainContext(conversationId: string, context: ConversationContext): void {
    // Store or update conversation context (optimization handled by PerformanceOptimizer)
    this.conversationContexts.set(conversationId, {
      ...context,
      contextVariables: {
        ...context.contextVariables,
        lastUpdated: new Date(),
        messageCount: context.messageHistory.length
      }
    });
  }

  getCapabilities(): string[] {
    return [
      'natural_language_processing',
      'voice_input_processing',
      'text_input_processing',
      'multi_turn_conversation',
      'context_management',
      'work_domain_expertise',
      'health_monitoring_integration',
      'calendar_management',
      'energy_system_integration',
      'clarification_requests',
      'multi_modal_input'
    ];
  }

  async initialize(config: AIChatbotConfig): Promise<void> {
    this.config = config;
    
    // Check if we're in test mode (Jest environment)
    this.testMode = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    
    // Validate configuration
    if (!config.modelName || !config.primaryLanguage) {
      throw new Error('Invalid configuration: modelName and primaryLanguage are required');
    }

    // Initialize AI model (simulated)
    await this.initializeModel(config);
    
    // Initialize domain-specific modules
    if (config.enableHealthDomain) {
      await this.initializeHealthDomain();
    }
    if (config.enableCalendarDomain) {
      await this.initializeCalendarDomain();
    }
    if (config.enableEnergyDomain) {
      await this.initializeEnergyDomain();
    }

    // Initialize performance optimizer
    await this.performanceOptimizer.initialize({
      responseTimeTarget: config.responseTimeoutMs || 2000,
      aggressiveOptimization: config.optimizeForPerformance || false
    });

    this.initialized = true;
  }

  async processMultiModalInput(input: UserInput[], context: ConversationContext): Promise<ChatResponse> {
    this.processingStartTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Combine inputs from different modalities
      let combinedText = '';
      let audioData: AudioBuffer | undefined;

      for (const userInput of input) {
        if (userInput.type === 'text') {
          combinedText += userInput.content as string + ' ';
        } else if (userInput.type === 'voice' && userInput.content instanceof Object) {
          audioData = userInput.content as AudioBuffer;
        } else if (userInput.type === 'touch' || userInput.type === 'gesture') {
          combinedText += this.interpretGesture(userInput) + ' ';
        }
      }

      // Process voice input if available
      if (audioData) {
        const voiceText = await this.speechToText(audioData);
        combinedText += voiceText + ' ';
      }

      // Process combined input
      return await this.processTextInput(combinedText.trim(), context);
    } catch (error) {
      this.stats.failedRequests++;
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async requestClarification(originalInput: string, context: ConversationContext): Promise<ChatResponse> {
    const processingTime = Date.now() - this.processingStartTime;
    
    const clarificationText = this.generateClarificationRequest(originalInput, context);
    
    // Lower confidence for empty or very unclear inputs
    const confidence = originalInput.length === 0 ? 0.3 : 0.8;
    
    return {
      text: clarificationText,
      confidence,
      processingTime,
      requiresFollowUp: true,
      visualPattern: this.createQuestionPattern(),
      context: { 
        needsClarification: true, 
        originalInput,
        clarificationOptions: this.generateClarificationOptions(originalInput)
      }
    };
  }

  isReady(): boolean {
    return this.initialized && this.config !== undefined;
  }

  getStatus(): EngineStatus {
    const averageResponseTime = this.stats.successfulRequests > 0 
      ? this.stats.totalResponseTime / this.stats.successfulRequests 
      : 0;

    // Get performance monitoring data
    const resourceMonitoring = this.performanceOptimizer.getResourceMonitoring();

    return {
      isInitialized: this.initialized,
      isProcessing: this.processingStartTime > 0 && (Date.now() - this.processingStartTime) < (this.config?.responseTimeoutMs || 5000),
      averageResponseTime,
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      lastError: this.stats.lastError,
      memoryUsage: resourceMonitoring.memory.used,
      cpuUsage: resourceMonitoring.cpu.usage,
      uptime: process.uptime(),
      cacheHitRate: resourceMonitoring.cache.hitRate,
      optimizationsSaved: resourceMonitoring.performance.optimizationsSaved
    };
  }

  async shutdown(): Promise<void> {
    await this.performanceOptimizer.shutdown();
    this.initialized = false;
    this.conversationContexts.clear();
    this.config = undefined;
    this.energyIntegration = undefined;
  }

  /**
   * Set the Smart Energy Copilot integration
   * @param integration The energy integration instance
   */
  setEnergyIntegration(integration: SmartEnergyCopilotIntegration): void {
    this.energyIntegration = integration;
  }

  // Private helper methods

  private async speechToText(audioData: AudioBuffer): Promise<string> {
    // Simulate speech-to-text processing
    await this.simulateProcessingDelay(200, 800);
    
    // Check for unclear audio (low amplitude or poor quality)
    const amplitude = this.calculateRMS(audioData.data);
    const duration = audioData.duration;
    
    // If audio is unclear (low amplitude and short duration), return unclear text
    if (amplitude < 0.08 && duration < 2) {
      return "um";
    }
    
    // Return simulated transcription based on audio characteristics
    if (duration < 1) {
      return "Hi";
    } else if (duration < 3) {
      return "How are you today?";
    } else {
      return "Can you help me with my work schedule and energy usage?";
    }
  }

  private calculateRMS(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  private analyzeIntent(text: string, context: ConversationContext): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('schedule') || lowerText.includes('meeting') || lowerText.includes('appointment')) {
      return 'calendar_management';
    } else if (lowerText.includes('health') || lowerText.includes('exercise') || lowerText.includes('water')) {
      return 'health_monitoring';
    } else if (lowerText.includes('energy') || lowerText.includes('device') || lowerText.includes('power')) {
      return 'energy_management';
    } else if (lowerText.includes('work') || lowerText.includes('project') || lowerText.includes('task')) {
      return 'work_assistance';
    } else {
      return 'general_conversation';
    }
  }

  private isWorkRelated(text: string, context: ConversationContext): boolean {
    const workKeywords = ['work', 'project', 'task', 'deadline', 'meeting', 'colleague', 'office', 'productivity'];
    const lowerText = text.toLowerCase();
    return workKeywords.some(keyword => lowerText.includes(keyword)) || 
           context.currentTopic === 'work' ||
           (context.contextVariables && context.contextVariables.domain === 'work');
  }

  private isHealthRelated(text: string): boolean {
    const healthKeywords = ['health', 'exercise', 'water', 'hydration', 'movement', 'posture', 'wellness', 'fitness', 'steps', 'walking', 'sedentary', 'break'];
    return healthKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isCalendarRelated(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Strong calendar indicators
    const strongCalendarKeywords = ['schedule', 'appointment', 'meeting', 'meetings', 'calendar', 'remind', 'event'];
    if (strongCalendarKeywords.some(keyword => lowerText.includes(keyword))) {
      return true;
    }
    
    // Time-based keywords only if not health-related
    const timeKeywords = ['today', 'tomorrow', 'week', 'time', 'date'];
    const healthKeywords = ['health', 'exercise', 'water', 'hydration', 'movement', 'posture', 'wellness', 'fitness', 'steps', 'walking', 'sedentary', 'break'];
    
    const hasTimeKeyword = timeKeywords.some(keyword => lowerText.includes(keyword));
    const hasHealthKeyword = healthKeywords.some(keyword => lowerText.includes(keyword));
    
    // Only consider time keywords as calendar-related if no health keywords are present
    return hasTimeKeyword && !hasHealthKeyword;
  }

  private isEnergyRelated(text: string): boolean {
    const energyKeywords = ['energy', 'power', 'device', 'electricity', 'consumption', 'smart home', 'lights', 'thermostat', 'control', 'turn on', 'turn off', 'usage', 'turn', 'switch', 'set', 'temperature', 'brightness'];
    return energyKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private getDomain(text: string): string {
    if (this.isWorkRelated(text, {} as ConversationContext)) return 'work';
    if (this.isHealthRelated(text)) return 'health';
    if (this.isCalendarRelated(text)) return 'calendar';
    if (this.isEnergyRelated(text)) return 'energy';
    return 'general';
  }

  private async generateWorkRelatedResponse(text: string, context: ConversationContext): Promise<string> {
    await this.simulateProcessingDelay(300, 1200);
    
    const responses = [
      "I can help you manage your work tasks more efficiently. Would you like me to check your calendar or suggest productivity tips?",
      "Based on your work patterns, I recommend taking a short break every hour to maintain focus and productivity.",
      "I notice you've been working for a while. Consider organizing your tasks by priority to maximize efficiency.",
      "For better work-life balance, I can help you schedule breaks and remind you of important deadlines."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private async generateHealthResponse(text: string, context: ConversationContext): Promise<string> {
    await this.simulateProcessingDelay(200, 800);
    
    const lowerText = text.toLowerCase();
    
    // Generate specific responses based on health query type
    if (lowerText.includes('steps') || lowerText.includes('walking')) {
      return "You've taken 3,500 steps today. Great progress! Your goal is 8,000 steps, so you're about halfway there.";
    } else if (lowerText.includes('posture') || lowerText.includes('sitting')) {
      return "Your posture score is 65% today. You've been sitting for 45 minutes - consider some light stretching.";
    } else if (lowerText.includes('water') || lowerText.includes('hydration')) {
      return "You've had 4 glasses of water today. I recommend having another glass now to stay properly hydrated.";
    } else if (lowerText.includes('break') || lowerText.includes('movement') || lowerText.includes('sedentary')) {
      return "You've been sedentary for 65 minutes. Time for a movement break! Try some light stretching or a short walk.";
    } else if (lowerText.includes('exercise')) {
      return "Regular movement is crucial for your health. I can remind you to take movement breaks every hour. Shall I set that up?";
    } else {
      return "I'm here to help with your wellness goals. I can track your activity, remind you to stay hydrated, and suggest healthy habits.";
    }
  }

  private async generateCalendarResponse(text: string, context: ConversationContext): Promise<string> {
    await this.simulateProcessingDelay(400, 1000);
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('meeting') || lowerText.includes('meetings') || lowerText.includes('appointment')) {
      return "You have 3 meetings scheduled for today: Team standup at 9 AM, Client call at 2 PM, and Project review at 4 PM. Would you like details on any of these?";
    } else if (lowerText.includes('schedule') || lowerText.includes('calendar')) {
      return "Your calendar shows 5 appointments this week. Today you have 3 meetings, tomorrow 1 meeting, and Friday 1 appointment. Shall I show you the details?";
    } else if (lowerText.includes('today')) {
      return "Today's schedule: 9 AM Team standup, 2 PM Client call, 4 PM Project review. You have 2 hours free between 10 AM and 12 PM.";
    } else {
      return "I can help you manage your schedule. Would you like me to check your upcoming appointments, schedule a new meeting, or set up reminders?";
    }
  }

  private async generateEnergyResponse(text: string, context: ConversationContext): Promise<string> {
    await this.simulateProcessingDelay(500, 1200);
    
    // Use Smart Energy Copilot integration if available
    if (this.energyIntegration && this.energyIntegration.isReady()) {
      try {
        const energyResponse = await this.energyIntegration.processEnergyQuery(text, context.userId);
        
        // Format the response for natural conversation
        if (energyResponse.data) {
          if (energyResponse.data.totalConsumption !== undefined) {
            return `Your current energy consumption is ${energyResponse.data.totalConsumption.toFixed(2)} kWh. ${energyResponse.data.summary || 'Would you like more details or optimization suggestions?'}`;
          } else if (energyResponse.data.devices) {
            const deviceCount = energyResponse.data.devices.length;
            return `I found ${deviceCount} devices. ${deviceCount > 0 ? 'Would you like to control any of them or see their energy usage?' : 'No devices are currently available.'}`;
          } else if (energyResponse.data.suggestions) {
            const suggestionCount = energyResponse.data.suggestions.length;
            return `I have ${suggestionCount} optimization suggestions for you. ${suggestionCount > 0 ? 'Would you like to hear them?' : 'Your energy usage looks efficient!'}`;
          }
        }
        
        return "I've retrieved your energy information. Would you like me to provide more specific details or help with device control?";
      } catch (error) {
        console.warn('Energy integration failed:', error);
        // Fall back to default response
      }
    }
    
    return "I can help you optimize your energy usage and control smart devices. Would you like to see your current energy consumption or adjust device settings?";
  }

  private async generateGeneralResponse(text: string, context: ConversationContext): Promise<string> {
    await this.simulateProcessingDelay(200, 600);
    
    const responses = [
      "I'm here to help! I can assist with work tasks, health monitoring, calendar management, and energy optimization.",
      "How can I assist you today? I specialize in productivity, wellness, scheduling, and smart home management.",
      "I'm your AI assistant ready to help with various tasks. What would you like to work on?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateHealthActions(text: string): SystemAction[] {
    const actions: SystemAction[] = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('water') || lowerText.includes('hydration')) {
      actions.push({
        type: 'health',
        command: 'setup_hydration_reminder',
        parameters: { interval: 60 },
        requiresConfirmation: true,
        priority: 'medium'
      });
    }
    
    if (lowerText.includes('exercise') || lowerText.includes('movement') || lowerText.includes('sedentary') || lowerText.includes('break')) {
      actions.push({
        type: 'health',
        command: 'setup_movement_reminder',
        parameters: { interval: 60 },
        requiresConfirmation: true,
        priority: 'medium'
      });
    }
    
    if (lowerText.includes('steps') || lowerText.includes('posture') || lowerText.includes('health')) {
      actions.push({
        type: 'health',
        command: 'get_health_status',
        parameters: {},
        requiresConfirmation: false,
        priority: 'medium'
      });
    }
    
    return actions;
  }

  private generateCalendarActions(text: string): SystemAction[] {
    const actions: SystemAction[] = [];
    const lowerText = text.toLowerCase();
    
    // Always generate calendar actions for calendar-related queries
    if (lowerText.includes('schedule') || lowerText.includes('meeting') || lowerText.includes('appointment') || 
        lowerText.includes('calendar') || lowerText.includes('today') || lowerText.includes('tomorrow') || 
        lowerText.includes('week') || lowerText.includes('event')) {
      
      actions.push({
        type: 'calendar',
        command: 'open_calendar',
        parameters: {},
        requiresConfirmation: false,
        priority: 'medium'
      });
    }
    
    if (lowerText.includes('today') || lowerText.includes('tomorrow') || lowerText.includes('week')) {
      actions.push({
        type: 'calendar',
        command: 'get_schedule',
        parameters: { timeframe: lowerText.includes('today') ? 'today' : lowerText.includes('tomorrow') ? 'tomorrow' : 'week' },
        requiresConfirmation: false,
        priority: 'medium'
      });
    }
    
    return actions;
  }

  private generateEnergyActions(text: string): SystemAction[] {
    const actions: SystemAction[] = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('device') || lowerText.includes('lights')) {
      actions.push({
        type: 'energy',
        command: 'show_device_status',
        parameters: {},
        requiresConfirmation: false,
        priority: 'medium'
      });
    }
    
    if (lowerText.includes('consumption') || lowerText.includes('usage')) {
      actions.push({
        type: 'energy',
        command: 'show_energy_data',
        parameters: { type: 'consumption' },
        requiresConfirmation: false,
        priority: 'medium'
      });
    }
    
    if (lowerText.includes('optimize') || lowerText.includes('save')) {
      actions.push({
        type: 'energy',
        command: 'get_optimization_suggestions',
        parameters: {},
        requiresConfirmation: false,
        priority: 'high'
      });
    }
    
    // Enhanced device control detection
    if (lowerText.includes('control') || lowerText.includes('turn') || 
        lowerText.includes('switch') || lowerText.includes('set') ||
        lowerText.includes('adjust') || lowerText.includes('dim') ||
        lowerText.includes('temperature') || lowerText.includes('brightness')) {
      
      // Extract device control intent - look for specific device names or types
      let deviceId = 'unknown';
      
      // Look for specific device patterns
      const devicePatterns = [
        /(?:living\s*room\s*)?light/i,
        /(?:bedroom\s*)?hvac/i,
        /(?:kitchen\s*)?plug/i,
        /thermostat/i,
        /outlet/i
      ];
      
      for (const pattern of devicePatterns) {
        const match = text.match(pattern);
        if (match) {
          deviceId = match[0].toLowerCase().replace(/\s+/g, '-');
          break;
        }
      }
      
      actions.push({
        type: 'device_control',
        command: 'execute_device_command',
        parameters: { deviceId, command: text },
        requiresConfirmation: true,
        priority: 'high'
      });
    }
    
    return actions;
  }

  private calculateConfidence(text: string, context: ConversationContext): number {
    let confidence = 0.7; // Base confidence
    
    // Very low confidence for empty inputs
    if (text.length === 0) {
      return 0.2;
    }
    
    // Increase confidence for domain-specific queries
    if (this.isWorkRelated(text, context) || this.isHealthRelated(text) || 
        this.isCalendarRelated(text) || this.isEnergyRelated(text)) {
      confidence += 0.2;
    }
    
    // Increase confidence for longer, more specific queries
    if (text.length > 20) {
      confidence += 0.1;
    }
    
    // Decrease confidence for very short or unclear queries
    if (text.length < 5) {
      confidence -= 0.5;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private requiresFollowUp(input: string, response: string): boolean {
    return response.includes('?') || response.includes('Would you like') || response.includes('Shall I');
  }

  private createProcessingPattern(): LightPattern {
    return {
      type: 'pulse',
      colors: [{ red: 0, green: 100, blue: 255 }],
      duration: 2000,
      intensity: 70,
      repeat: false
    };
  }

  private createQuestionPattern(): LightPattern {
    return {
      type: 'wave',
      colors: [{ red: 255, green: 165, blue: 0 }],
      duration: 1500,
      intensity: 80,
      repeat: true
    };
  }

  private generateClarificationRequest(originalInput: string, context: ConversationContext): string {
    const clarifications = [
      `I'm not sure I understood "${originalInput}" correctly. Could you please clarify what you need?`,
      `Could you provide more details about "${originalInput}"? I want to understand your request better.`,
      `I need to better understand "${originalInput}". Could you rephrase that for me?`
    ];
    
    return clarifications[Math.floor(Math.random() * clarifications.length)];
  }

  private generateClarificationOptions(originalInput: string): string[] {
    return [
      'Work-related assistance',
      'Health and wellness',
      'Calendar management',
      'Energy optimization',
      'General information'
    ];
  }

  private isUnclearInput(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    
    // Empty input is unclear
    if (lowerText.length === 0) return true;
    
    // Check for very short inputs
    if (lowerText.length < 3) return true;
    
    // Check for unclear phrases - but be more selective to avoid false positives
    const unclearPhrases = [
      'huh', 'um', 'uh', 'hmm', 'err', 'uhh',
      'i dont know', "i don't know", 'not sure',
      'whatever', 'something random'
    ];
    
    // Only consider it unclear if it's ONLY unclear phrases or very vague
    return unclearPhrases.some(phrase => lowerText === phrase || lowerText.startsWith(phrase + ' '));
  }

  private interpretGesture(input: UserInput): string {
    // Simple gesture interpretation
    if (input.type === 'touch') {
      return 'touch interaction';
    } else if (input.type === 'gesture') {
      return 'gesture command';
    }
    return '';
  }

  private async initializeModel(config: AIChatbotConfig): Promise<void> {
    // Simulate model initialization
    await this.simulateProcessingDelay(1000, 2000);
  }

  private async initializeHealthDomain(): Promise<void> {
    await this.simulateProcessingDelay(200, 500);
  }

  private async initializeCalendarDomain(): Promise<void> {
    await this.simulateProcessingDelay(200, 500);
  }

  private async initializeEnergyDomain(): Promise<void> {
    await this.simulateProcessingDelay(200, 500);
  }

  private async simulateProcessingDelay(minMs: number, maxMs: number): Promise<void> {
    // In test mode, use much shorter delays to prevent timeouts
    if (this.testMode) {
      const delay = Math.random() * 20 + 5; // 5-25ms delay in test mode
      return new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private generateInputHash(text: string, context: ConversationContext): string {
    // Generate a hash for caching based on input and relevant context
    const contextKey = `${context.userId}_${context.currentTopic}_${this.getDomain(text)}`;
    const normalizedText = text.toLowerCase().trim();
    
    // Simple hash function (in production, use a proper hash function)
    let hash = 0;
    const input = `${normalizedText}_${contextKey}`;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Perform automatic performance tuning
   */
  async performAutoTuning(): Promise<void> {
    await this.performanceOptimizer.autoTune();
  }

  /**
   * Get performance monitoring data
   */
  getPerformanceMetrics(): any {
    return this.performanceOptimizer.getResourceMonitoring();
  }
}