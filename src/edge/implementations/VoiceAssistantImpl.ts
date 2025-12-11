import { VoiceAssistant, VoiceResponse, Intent } from '../interfaces/VoiceAssistant';
import { DeviceManager } from '../interfaces/DeviceManager';
import { EnergyMonitor } from '../interfaces/EnergyMonitor';
import { DeviceCommand } from '../types';

/**
 * VoiceAssistantImpl implementation
 * Processes voice commands and generates spoken responses using edge AI
 * 
 * Note: This is a simplified implementation. In production, this would integrate
 * with Whisper-tiny for speech recognition and a TTS engine for speech synthesis.
 */
export class VoiceAssistantImpl implements VoiceAssistant {
  private deviceManager: DeviceManager;
  private energyMonitor: EnergyMonitor;

  constructor(deviceManager: DeviceManager, energyMonitor: EnergyMonitor) {
    this.deviceManager = deviceManager;
    this.energyMonitor = energyMonitor;
  }

  /**
   * Process voice command from audio data
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async processVoiceCommand(audioData: Buffer): Promise<VoiceResponse> {
    if (!audioData || audioData.length === 0) {
      // Empty audio input - request clarification
      const intent: Intent = {
        type: 'clarification_needed',
        entities: {},
        confidence: 1.0
      };

      const spokenResponse = 'I did not hear anything. Could you please repeat your command?';
      const audioResponse = await this.synthesizeSpeech(spokenResponse);

      return {
        intent,
        spokenResponse,
        audioResponse
      };
    }

    // Simulate speech-to-text transcription
    // In production, this would use Whisper-tiny model
    const transcript = this.simulateTranscription(audioData);

    // Extract intent from transcript
    const intent = this.extractIntent(transcript);

    // Handle based on intent type
    let spokenResponse: string;
    let actionTaken: string | undefined;

    if (intent.type === 'clarification_needed') {
      spokenResponse = this.generateClarificationRequest(intent);
    } else if (intent.type === 'query') {
      spokenResponse = await this.handleQuery(intent);
    } else if (intent.type === 'command') {
      const result = await this.handleCommand(intent);
      spokenResponse = result.response;
      actionTaken = result.action;
    } else {
      spokenResponse = 'I did not understand that. Could you please rephrase?';
    }

    // Synthesize speech response
    const audioResponse = await this.synthesizeSpeech(spokenResponse);

    return {
      intent,
      spokenResponse,
      audioResponse,
      actionTaken
    };
  }

  /**
   * Synthesize speech from text
   * Requirements: 3.2, 3.3
   */
  async synthesizeSpeech(text: string): Promise<Buffer> {
    if (!text || text.trim() === '') {
      throw new Error('Text cannot be empty');
    }

    // Simulate TTS synthesis
    // In production, this would use a TTS engine
    // For now, return a buffer with the text encoded
    return Buffer.from(text, 'utf-8');
  }

  /**
   * Extract intent from transcript
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  extractIntent(transcript: string): Intent {
    if (!transcript || transcript.trim() === '') {
      return {
        type: 'clarification_needed',
        entities: {},
        confidence: 1.0
      };
    }

    const normalizedTranscript = transcript.toLowerCase().trim();

    // Check for ambiguous or unclear commands
    if (this.isAmbiguous(normalizedTranscript)) {
      return {
        type: 'clarification_needed',
        entities: { transcript: normalizedTranscript },
        confidence: 0.3
      };
    }

    // Detect query intents (asking for information)
    if (this.isQuery(normalizedTranscript)) {
      return this.extractQueryIntent(normalizedTranscript);
    }

    // Detect command intents (device control)
    if (this.isCommand(normalizedTranscript)) {
      return this.extractCommandIntent(normalizedTranscript);
    }

    // Unknown intent - request clarification
    return {
      type: 'clarification_needed',
      entities: { transcript: normalizedTranscript },
      confidence: 0.2
    };
  }

  /**
   * Simulate transcription from audio data
   * In production, this would use Whisper-tiny model
   */
  private simulateTranscription(audioData: Buffer): string {
    // For testing purposes, we'll decode the buffer as text
    // In production, this would run actual speech recognition
    try {
      return audioData.toString('utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Check if transcript is ambiguous
   */
  private isAmbiguous(transcript: string): boolean {
    const ambiguousPatterns = [
      /^(um|uh|er|hmm)/,
      /\b(maybe|perhaps|possibly)\b/,
      /\?.*\?/, // Multiple question marks
      /^(what|which|who)\s*$/, // Incomplete questions
    ];

    return ambiguousPatterns.some(pattern => pattern.test(transcript));
  }

  /**
   * Check if transcript is a query
   */
  private isQuery(transcript: string): boolean {
    const queryPatterns = [
      /\b(how much|what is|show me|tell me|what's)\b/,
      /\b(energy|consumption|usage|power)\b.*\?/,
      /\b(current|total|today|yesterday)\b.*\b(energy|consumption|usage)\b/,
    ];

    return queryPatterns.some(pattern => pattern.test(transcript));
  }

  /**
   * Check if transcript is a command
   */
  private isCommand(transcript: string): boolean {
    const commandPatterns = [
      /\b(turn on|turn off|switch on|switch off|enable|disable)\b/,
      /\b(set|adjust|change)\b.*\b(to|at)\b/,
    ];

    return commandPatterns.some(pattern => pattern.test(transcript));
  }

  /**
   * Extract query intent details
   */
  private extractQueryIntent(transcript: string): Intent {
    const entities: Record<string, any> = {};
    let confidence = 0.8;

    // Extract device references (including hyphens and underscores)
    const deviceMatch = transcript.match(/\b(device|plug|light|hvac|sensor)\s+([\w-]+)/i);
    if (deviceMatch) {
      entities.deviceId = deviceMatch[2];
    }

    // Extract time references
    if (/\b(current|now|right now)\b/.test(transcript)) {
      entities.timeframe = 'current';
      confidence = 0.9;
    } else if (/\b(today)\b/.test(transcript)) {
      entities.timeframe = 'today';
      confidence = 0.9;
    } else if (/\b(yesterday)\b/.test(transcript)) {
      entities.timeframe = 'yesterday';
      confidence = 0.85;
    }

    // Extract metric type
    if (/\b(consumption|usage)\b/.test(transcript)) {
      entities.metric = 'consumption';
    } else if (/\b(energy)\b/.test(transcript)) {
      entities.metric = 'energy';
    }

    return {
      type: 'query',
      action: 'get_energy_stats',
      entities,
      confidence
    };
  }

  /**
   * Extract command intent details
   */
  private extractCommandIntent(transcript: string): Intent {
    const entities: Record<string, any> = {};
    let action = 'control_device';
    let confidence = 0.8;

    // Extract device references (including hyphens and underscores)
    const deviceMatch = transcript.match(/\b(?:device|plug|light|hvac|sensor)\s+([\w-]+)/i);
    if (deviceMatch) {
      entities.deviceId = deviceMatch[1];
      confidence = 0.9;
    } else {
      // No specific device mentioned - ambiguous
      return {
        type: 'clarification_needed',
        entities: { reason: 'no_device_specified', transcript },
        confidence: 0.3
      };
    }

    // Extract action
    if (/\bturn on\b|\bswitch on\b|\benable\b/.test(transcript)) {
      entities.action = 'turn_on';
    } else if (/\bturn off\b|\bswitch off\b|\bdisable\b/.test(transcript)) {
      entities.action = 'turn_off';
    } else if (/\bset\b|\badjust\b|\bchange\b/.test(transcript)) {
      entities.action = 'set_value';
      
      // Extract value
      const valueMatch = transcript.match(/\bto\s+(\d+)/);
      if (valueMatch) {
        entities.value = parseInt(valueMatch[1], 10);
      } else {
        // No value specified for set command
        return {
          type: 'clarification_needed',
          entities: { reason: 'no_value_specified', transcript },
          confidence: 0.4
        };
      }
    }

    return {
      type: 'command',
      action,
      entities,
      confidence
    };
  }

  /**
   * Generate clarification request message
   */
  private generateClarificationRequest(intent: Intent): string {
    const reason = intent.entities.reason;

    if (reason === 'no_device_specified') {
      return 'Which device would you like to control?';
    } else if (reason === 'no_value_specified') {
      return 'What value would you like to set?';
    } else {
      return 'I did not understand that. Could you please rephrase your request?';
    }
  }

  /**
   * Handle query intent
   * Requirements: 3.2
   */
  private async handleQuery(intent: Intent): Promise<string> {
    const { deviceId, timeframe, metric } = intent.entities;

    try {
      if (timeframe === 'current' && deviceId) {
        // Get current consumption for specific device
        const consumption = await this.energyMonitor.getCurrentConsumption(deviceId);
        if (isNaN(consumption)) {
          return `Device ${deviceId} consumption data is currently unavailable.`;
        }
        return `Device ${deviceId} is currently consuming ${consumption.toFixed(2)} watts.`;
      } else if (timeframe === 'current') {
        // Get total current consumption
        const devices = await this.deviceManager.discoverDevices();
        let total = 0;
        let validDevices = 0;
        for (const device of devices) {
          const consumption = await this.energyMonitor.getCurrentConsumption(device.id);
          if (!isNaN(consumption)) {
            total += consumption;
            validDevices++;
          }
        }
        if (validDevices === 0) {
          return `Current consumption data is unavailable for all devices.`;
        }
        return `Total current consumption is ${total.toFixed(2)} watts.`;
      } else if (timeframe === 'today') {
        // Get today's consumption
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const total = await this.energyMonitor.getTotalConsumption({
          start: startOfDay,
          end: now
        });
        if (isNaN(total)) {
          return `Today's energy consumption data is currently unavailable.`;
        }
        return `Today's total energy consumption is ${total.toFixed(2)} kilowatt-hours.`;
      } else {
        return 'I can provide current consumption or today\'s total. What would you like to know?';
      }
    } catch (error) {
      return 'I encountered an error retrieving energy data. Please try again.';
    }
  }

  /**
   * Handle command intent
   * Requirements: 3.3
   */
  private async handleCommand(intent: Intent): Promise<{ response: string; action: string }> {
    const { deviceId, action: commandAction, value } = intent.entities;

    try {
      const command: DeviceCommand = {
        action: commandAction,
        parameters: value !== undefined ? { value } : undefined
      };

      await this.deviceManager.sendCommand(deviceId, command);

      let response: string;
      if (commandAction === 'turn_on') {
        response = `I have turned on device ${deviceId}.`;
      } else if (commandAction === 'turn_off') {
        response = `I have turned off device ${deviceId}.`;
      } else if (commandAction === 'set_value') {
        response = `I have set device ${deviceId} to ${value}.`;
      } else {
        response = `Command executed for device ${deviceId}.`;
      }

      return {
        response,
        action: `${commandAction} on ${deviceId}`
      };
    } catch (error) {
      return {
        response: `I encountered an error controlling device ${deviceId}. Please try again.`,
        action: 'error'
      };
    }
  }
}
