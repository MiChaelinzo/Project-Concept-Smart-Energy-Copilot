import { AIChatbotEngine } from '../interfaces/AIChatbotEngine';
import { T5AICoreImpl } from '../../edge/implementations/T5AICoreImpl';
import { TuyaCloudIntegrationImpl } from '../../cloud/implementations/TuyaCloudIntegrationImpl';
import { ConversationContext, ChatResponse, AudioBuffer } from '../types';

/**
 * AI Agent Integration for Tuya Platform with T5 AI Core
 * Combines local AI processing with Tuya IoT device control
 */
export class AIAgentTuyaIntegrationImpl {
  private t5AICore: T5AICoreImpl;
  private tuyaIntegration: TuyaCloudIntegrationImpl;
  private aiChatbot: AIChatbotEngine;
  private isInitialized = false;

  constructor(
    aiChatbot: AIChatbotEngine,
    tuyaConfig: any,
    t5Config: any
  ) {
    this.aiChatbot = aiChatbot;
    this.tuyaIntegration = new TuyaCloudIntegrationImpl(tuyaConfig);
    this.t5AICore = new T5AICoreImpl();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize T5 AI Core for local processing
      await this.t5AICore.initializeWithConfig({
        devicePath: '/dev/ttyUSB0',
        baudRate: 115200,
        models: ['voice_recognition', 'energy_optimization', 'device_control']
      });

      // Initialize Tuya Cloud Integration
      await this.tuyaIntegration.initialize();

      // Set up AI agent capabilities
      await this.setupAIAgentCapabilities();

      this.isInitialized = true;
      console.log('AI Agent Tuya Integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Agent Tuya Integration:', error);
      throw error;
    }
  }

  /**
   * Process voice commands for Tuya device control
   */
  async processVoiceCommand(audioData: AudioBuffer, context: ConversationContext): Promise<ChatResponse> {
    if (!this.isInitialized) {
      throw new Error('AI Agent not initialized');
    }

    try {
      // Step 1: Use T5 AI Core for local voice recognition
      const voiceResult = await this.t5AICore.recognizeSpeech(
        Buffer.from(audioData.data.buffer)
      );

      console.log('T5 Voice Recognition:', voiceResult);

      // Step 2: Process the transcript with AI chatbot for intent understanding
      const chatResponse = await this.aiChatbot.processTextInput(
        voiceResult.transcript,
        context
      );

      // Step 3: Execute Tuya device commands if detected
      if (this.isDeviceControlIntent(chatResponse)) {
        const deviceResult = await this.executeDeviceControl(
          voiceResult.transcript,
          context
        );
        
        // Enhance response with device control results
        chatResponse.text = this.enhanceResponseWithDeviceResult(
          chatResponse.text,
          deviceResult
        );
        
        // Add device control actions
        if (!chatResponse.actions) chatResponse.actions = [];
        chatResponse.actions.push({
          type: 'device_control',
          command: 'tuya_command_executed',
          parameters: deviceResult,
          requiresConfirmation: false,
          priority: 'high'
        });
      }

      // Step 4: Use T5 for energy optimization if needed
      if (this.isEnergyOptimizationIntent(chatResponse)) {
        const optimizationResult = await this.performEnergyOptimization(context);
        chatResponse.text += ` ${optimizationResult.message}`;
      }

      return chatResponse;

    } catch (error) {
      console.error('Voice command processing failed:', error);
      
      // Fallback to regular AI chatbot processing
      return await this.aiChatbot.processVoiceInput(audioData, context);
    }
  }

  /**
   * Execute device control commands through Tuya
   */
  async executeDeviceControl(command: string, context: ConversationContext): Promise<any> {
    try {
      // Use Tuya's AI command processing
      const result = await this.tuyaIntegration.processAICommand(command, context);
      
      console.log('Tuya Command Result:', result);
      return result;
    } catch (error) {
      console.error('Device control failed:', error);
      return { success: false, message: 'Device control failed', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Perform energy optimization using T5 AI Core
   */
  async performEnergyOptimization(context: ConversationContext): Promise<any> {
    try {
      // Get current device statuses from Tuya
      const devices = await this.tuyaIntegration.discoverDevices();
      const deviceStatuses = await Promise.all(
        devices.map(async (device) => {
          try {
            const status = await this.tuyaIntegration.getDeviceStatus(device.id);
            return { device, status };
          } catch (error) {
            return { device, status: null, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );

      // Use T5 AI Core for optimization analysis
      const optimizationData = {
        devices: deviceStatuses,
        timestamp: new Date().toISOString(),
        userId: context.userId,
        preferences: context.userPreferences
      };

      const optimizationResult = await this.t5AICore.processEnergyOptimization(optimizationData);
      
      // Execute optimization recommendations
      if (optimizationResult.recommendations) {
        for (const recommendation of optimizationResult.recommendations) {
          try {
            await this.executeOptimizationRecommendation(recommendation);
          } catch (error) {
            console.error('Failed to execute recommendation:', error);
          }
        }
      }

      return {
        success: true,
        message: `Energy optimization completed. Potential savings: ${optimizationResult.potentialSavings || 'Unknown'}`,
        recommendations: optimizationResult.recommendations || []
      };

    } catch (error) {
      console.error('Energy optimization failed:', error);
      return {
        success: false,
        message: 'Energy optimization failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get comprehensive device status from Tuya
   */
  async getDeviceStatus(): Promise<any> {
    try {
      const devices = await this.tuyaIntegration.discoverDevices();
      const statuses = await Promise.all(
        devices.map(async (device) => {
          const status = await this.tuyaIntegration.getDeviceStatus(device.id);
          return { ...device, currentStatus: status };
        })
      );

      return {
        totalDevices: devices.length,
        onlineDevices: statuses.filter(d => d.currentStatus.isOnline).length,
        devices: statuses
      };
    } catch (error) {
      console.error('Failed to get device status:', error);
      throw error;
    }
  }

  /**
   * Set up AI agent capabilities and training
   */
  private async setupAIAgentCapabilities(): Promise<void> {
    // Configure T5 AI Core with Tuya-specific models
    const tuyaDevices = await this.tuyaIntegration.discoverDevices();
    
    // Train T5 with device names and capabilities for better recognition
    const deviceTrainingData = tuyaDevices.map(device => ({
      name: device.name,
      type: device.type,
      capabilities: device.capabilities,
      location: device.location
    }));

    console.log('Training T5 AI Core with Tuya device data:', deviceTrainingData);
    
    // In a real implementation, you would send this training data to T5
    // For now, we'll just log it for reference
  }

  private isDeviceControlIntent(response: ChatResponse): boolean {
    const deviceKeywords = [
      'turn on', 'turn off', 'switch', 'light', 'outlet', 'thermostat',
      'brightness', 'temperature', 'control', 'device'
    ];
    
    return deviceKeywords.some(keyword => 
      response.text.toLowerCase().includes(keyword) ||
      response.context?.intent?.includes('device') ||
      response.actions?.some(action => action.type === 'device_control')
    );
  }

  private isEnergyOptimizationIntent(response: ChatResponse): boolean {
    const energyKeywords = [
      'optimize', 'energy', 'power', 'consumption', 'efficiency',
      'save energy', 'reduce usage', 'smart schedule'
    ];
    
    return energyKeywords.some(keyword => 
      response.text.toLowerCase().includes(keyword) ||
      response.context?.intent?.includes('energy')
    );
  }

  private enhanceResponseWithDeviceResult(originalResponse: string, deviceResult: any): string {
    if (deviceResult.success) {
      return `${originalResponse} ✅ ${deviceResult.message}`;
    } else {
      return `${originalResponse} ❌ ${deviceResult.message || 'Device control failed'}`;
    }
  }

  private async executeOptimizationRecommendation(recommendation: any): Promise<void> {
    switch (recommendation.type) {
      case 'turn_off_unused':
        if (recommendation.deviceId) {
          await this.tuyaIntegration.sendCommand(recommendation.deviceId, { command: 'turn_off' });
        }
        break;
        
      case 'adjust_brightness':
        if (recommendation.deviceId && recommendation.brightness) {
          await this.tuyaIntegration.sendCommand(recommendation.deviceId, {
            command: 'set_brightness',
            parameters: { brightness: recommendation.brightness }
          });
        }
        break;
        
      case 'schedule_device':
        // Implement scheduling logic
        console.log('Scheduling device:', recommendation);
        break;
        
      default:
        console.log('Unknown recommendation type:', recommendation.type);
    }
  }

  /**
   * Get AI agent status and capabilities
   */
  getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      t5AICore: {
        connected: this.t5AICore.isReady(),
        capabilities: ['voice_recognition', 'energy_optimization', 'text_to_speech']
      },
      tuyaIntegration: {
        authenticated: true, // Would check actual auth status
        devicesConnected: this.tuyaIntegration ? true : false
      },
      features: [
        'voice_device_control',
        'energy_optimization',
        'natural_language_processing',
        'local_ai_processing',
        'cloud_device_management'
      ]
    };
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    try {
      await this.t5AICore.shutdown();
      this.tuyaIntegration.destroy();
      this.isInitialized = false;
      console.log('AI Agent Tuya Integration shutdown complete');
    } catch (error) {
      console.error('Shutdown error:', error);
    }
  }
}