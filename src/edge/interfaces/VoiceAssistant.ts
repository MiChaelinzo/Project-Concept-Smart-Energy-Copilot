/**
 * VoiceAssistant interface
 * Responsibility: Processes voice commands and generates spoken responses
 */
export interface VoiceAssistant {
  /**
   * Process a voice command from audio data
   */
  processVoiceCommand(audioData: Buffer): Promise<VoiceResponse>;

  /**
   * Synthesize speech from text
   */
  synthesizeSpeech(text: string): Promise<Buffer>;

  /**
   * Extract intent from a transcript
   */
  extractIntent(transcript: string): Intent;
}

export interface VoiceResponse {
  intent: Intent;
  spokenResponse: string;
  audioResponse: Buffer;
  actionTaken?: string;
}

export interface Intent {
  type: 'query' | 'command' | 'clarification_needed';
  action?: string;
  entities: Record<string, any>;
  confidence: number;
}
