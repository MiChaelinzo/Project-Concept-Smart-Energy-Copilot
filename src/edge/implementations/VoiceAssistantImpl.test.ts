/**
 * Unit tests for VoiceAssistantImpl
 * Requirements: 3.1, 3.4
 */

import { VoiceAssistantImpl } from './VoiceAssistantImpl';
import { DeviceManager } from '../interfaces/DeviceManager';
import { EnergyMonitor } from '../interfaces/EnergyMonitor';
import { Device, DeviceStatus, DeviceCommand, DeviceType, TelemetryCallback } from '../types';
import { EnergyData, TimeRange } from '../interfaces/EnergyMonitor';

// Mock DeviceManager for testing
class MockDeviceManager implements DeviceManager {
  private devices: Map<string, Device> = new Map();
  public commandsSent: Array<{ deviceId: string; command: DeviceCommand }> = [];

  async registerDevice(deviceId: string, deviceType: DeviceType): Promise<Device> {
    const device: Device = {
      id: deviceId,
      type: deviceType,
      name: `Device ${deviceId}`,
      location: 'test-location',
      capabilities: ['power'],
      normalPowerRange: { min: 0, max: 1000 },
      isOnline: true,
      lastSeen: new Date()
    };
    this.devices.set(deviceId, device);
    return device;
  }

  async discoverDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    return {
      deviceId,
      isOnline: true,
      powerState: 'on',
      lastUpdated: new Date()
    };
  }

  async sendCommand(deviceId: string, command: DeviceCommand): Promise<void> {
    if (!this.devices.has(deviceId)) {
      throw new Error(`Device ${deviceId} not found`);
    }
    this.commandsSent.push({ deviceId, command });
  }

  subscribeToTelemetry(deviceId: string, callback: TelemetryCallback): void {
    // Mock implementation
  }
}

// Mock EnergyMonitor for testing
class MockEnergyMonitor implements EnergyMonitor {
  private consumption: Map<string, number> = new Map();

  recordConsumption(deviceId: string, watts: number, timestamp: Date): void {
    this.consumption.set(deviceId, watts);
  }

  async getCurrentConsumption(deviceId: string): Promise<number> {
    return this.consumption.get(deviceId) || 0;
  }

  async getHistoricalData(deviceId: string, range: TimeRange): Promise<EnergyData[]> {
    return [];
  }

  async getTotalConsumption(range: TimeRange): Promise<number> {
    return 0;
  }

  calculateCarbonFootprint(energyKwh: number): number {
    return energyKwh * 0.92;
  }
}

describe('VoiceAssistantImpl Unit Tests', () => {
  let deviceManager: MockDeviceManager;
  let energyMonitor: MockEnergyMonitor;
  let voiceAssistant: VoiceAssistantImpl;

  beforeEach(() => {
    deviceManager = new MockDeviceManager();
    energyMonitor = new MockEnergyMonitor();
    voiceAssistant = new VoiceAssistantImpl(deviceManager, energyMonitor);
  });

  describe('Empty audio input handling', () => {
    /**
     * Test empty audio input handling
     * Requirements: 3.1
     */
    test('should handle empty audio buffer gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const response = await voiceAssistant.processVoiceCommand(emptyBuffer);

      expect(response.intent.type).toBe('clarification_needed');
      expect(response.actionTaken).toBeUndefined();
      expect(response.spokenResponse).toContain('not hear');
    });

    test('should handle null-like audio data', async () => {
      const emptyBuffer = Buffer.from('', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(emptyBuffer);

      expect(response.intent.type).toBe('clarification_needed');
      expect(response.spokenResponse.length).toBeGreaterThan(0);
    });
  });

  describe('Ambiguous command clarification', () => {
    /**
     * Test ambiguous command clarification
     * Requirements: 3.4
     */
    test('should request clarification for "um" and similar hesitations', async () => {
      const audioData = Buffer.from('um', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response.intent.type).toBe('clarification_needed');
      expect(response.actionTaken).toBeUndefined();
    });

    test('should request clarification for incomplete questions', async () => {
      const audioData = Buffer.from('what', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response.intent.type).toBe('clarification_needed');
      expect(response.intent.confidence).toBeLessThanOrEqual(0.5);
    });

    test('should request clarification for commands without device specification', async () => {
      const audioData = Buffer.from('turn on', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response.intent.type).toBe('clarification_needed');
      expect(response.spokenResponse.toLowerCase()).toContain('device');
    });

    test('should request clarification for set commands without value', async () => {
      const audioData = Buffer.from('set device abc to', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response.intent.type).toBe('clarification_needed');
      expect(response.spokenResponse.toLowerCase()).toMatch(/value|what|rephrase/);
    });

    test('should request clarification for ambiguous phrases with "maybe"', async () => {
      const audioData = Buffer.from('maybe turn something on', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response.intent.type).toBe('clarification_needed');
    });
  });

  describe('Unsupported language handling', () => {
    /**
     * Test unsupported language handling
     * Requirements: 3.5
     * 
     * Note: The current implementation supports English only.
     * Non-English input should be treated as unclear/ambiguous.
     */
    test('should handle non-English text as unclear input', async () => {
      // Spanish command
      const audioData = Buffer.from('encender dispositivo uno', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      // Should not recognize the command and request clarification
      expect(response.intent.type).toBe('clarification_needed');
    });

    test('should handle mixed language input as unclear', async () => {
      const audioData = Buffer.from('turn on dispositivo uno', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      // May partially recognize but should handle gracefully
      expect(response).toBeDefined();
      expect(response.spokenResponse).toBeDefined();
    });

    test('should handle non-ASCII characters gracefully', async () => {
      const audioData = Buffer.from('打开设备', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response.intent.type).toBe('clarification_needed');
    });
  });

  describe('Speech synthesis', () => {
    test('should synthesize speech from text', async () => {
      const text = 'Hello, this is a test';
      const audioBuffer = await voiceAssistant.synthesizeSpeech(text);

      expect(audioBuffer).toBeInstanceOf(Buffer);
      expect(audioBuffer.length).toBeGreaterThan(0);
    });

    test('should throw error for empty text', async () => {
      await expect(voiceAssistant.synthesizeSpeech('')).rejects.toThrow('Text cannot be empty');
    });

    test('should throw error for whitespace-only text', async () => {
      await expect(voiceAssistant.synthesizeSpeech('   ')).rejects.toThrow('Text cannot be empty');
    });
  });

  describe('Intent extraction', () => {
    test('should extract query intent for energy questions', () => {
      const intent = voiceAssistant.extractIntent('what is the current energy consumption');

      expect(intent.type).toBe('query');
      expect(intent.action).toBe('get_energy_stats');
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    test('should extract command intent for device control', () => {
      const intent = voiceAssistant.extractIntent('turn on device abc');

      expect(intent.type).toBe('command');
      expect(intent.entities.deviceId).toBe('abc');
      expect(intent.entities.action).toBe('turn_on');
    });

    test('should return clarification_needed for empty transcript', () => {
      const intent = voiceAssistant.extractIntent('');

      expect(intent.type).toBe('clarification_needed');
      expect(intent.confidence).toBe(1.0);
    });

    test('should return clarification_needed for whitespace-only transcript', () => {
      const intent = voiceAssistant.extractIntent('   ');

      expect(intent.type).toBe('clarification_needed');
    });
  });

  describe('Integration with DeviceManager and EnergyMonitor', () => {
    test('should execute device commands through DeviceManager', async () => {
      // Register a device
      await deviceManager.registerDevice('test-device', 'smart_plug');

      // Send voice command
      const audioData = Buffer.from('turn on device test-device', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response.intent.type).toBe('command');
      expect(response.actionTaken).toContain('test-device');
      expect(deviceManager.commandsSent.length).toBe(1);
      expect(deviceManager.commandsSent[0].deviceId).toBe('test-device');
      expect(deviceManager.commandsSent[0].command.action).toBe('turn_on');
    });

    test('should query energy data through EnergyMonitor', async () => {
      // Set up energy data
      await deviceManager.registerDevice('test-device', 'smart_plug');
      energyMonitor.recordConsumption('test-device', 150, new Date());

      // Send voice query
      const audioData = Buffer.from('what is the current consumption for device test-device', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response.intent.type).toBe('query');
      expect(response.spokenResponse).toContain('150');
      expect(response.spokenResponse.toLowerCase()).toContain('watts');
    });

    test('should handle device not found errors gracefully', async () => {
      // Try to control non-existent device
      const audioData = Buffer.from('turn on device nonexistent', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(audioData);

      expect(response.intent.type).toBe('command');
      expect(response.spokenResponse.toLowerCase()).toContain('error');
      expect(response.actionTaken).toBe('error');
    });
  });
});
