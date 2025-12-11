/**
 * Property-based tests for VoiceAssistantImpl
 * Feature: smart-energy-copilot, Property 6: Voice query response completeness
 * Feature: smart-energy-copilot, Property 7: Voice command execution
 * Feature: smart-energy-copilot, Property 8: Voice error handling
 * Validates: Requirements 3.2, 3.3, 3.4
 */

import * as fc from 'fast-check';
import { VoiceAssistantImpl } from './VoiceAssistantImpl';
import { DeviceManager } from '../interfaces/DeviceManager';
import { EnergyMonitor } from '../interfaces/EnergyMonitor';
import { Device, DeviceStatus, DeviceCommand, DeviceType, TelemetryCallback } from '../types';
import { EnergyData, TimeRange } from '../interfaces/EnergyMonitor';

// Mock DeviceManager for testing
class MockDeviceManager implements DeviceManager {
  private devices: Map<string, Device> = new Map();
  private commandHistory: Array<{ deviceId: string; command: DeviceCommand }> = [];

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
    // Mock implementation - just verify device exists
    if (!this.devices.has(deviceId)) {
      throw new Error(`Device ${deviceId} not found`);
    }
    // Record the command for verification
    this.commandHistory.push({ deviceId, command });
  }

  subscribeToTelemetry(deviceId: string, callback: TelemetryCallback): void {
    // Mock implementation
  }

  // Helper methods for testing
  getCommandHistory(): Array<{ deviceId: string; command: DeviceCommand }> {
    return this.commandHistory;
  }

  clearCommandHistory(): void {
    this.commandHistory = [];
  }
}

// Mock EnergyMonitor for testing
class MockEnergyMonitor implements EnergyMonitor {
  private consumption: Map<string, number> = new Map();
  private totalConsumption: number = 0;

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
    return this.totalConsumption;
  }

  calculateCarbonFootprint(energyKwh: number): number {
    return energyKwh * 0.92;
  }

  // Helper method for testing
  setTotalConsumption(value: number): void {
    this.totalConsumption = value;
  }
}

// Generators for malformed/ambiguous commands
const malformedCommandGenerator = fc.oneof(
  // Empty or whitespace-only strings
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n'),
  
  // Ambiguous phrases
  fc.constant('um'),
  fc.constant('uh'),
  fc.constant('hmm'),
  fc.constant('maybe turn something on'),
  fc.constant('perhaps do something'),
  
  // Incomplete questions
  fc.constant('what'),
  fc.constant('which'),
  fc.constant('who'),
  
  // Commands without device specification
  fc.constant('turn on'),
  fc.constant('turn off'),
  fc.constant('switch it on'),
  
  // Commands without value specification
  fc.constant('set device abc to'),
  fc.constant('adjust the temperature'),
  
  // Multiple question marks
  fc.constant('what is that??'),
  fc.constant('huh???'),
  
  // Nonsensical input
  fc.constant('asdfghjkl'),
  fc.constant('123456789'),
  fc.constant('!@#$%^&*()'),
  
  // Mixed ambiguous patterns
  fc.constant('um maybe turn on uh something'),
  fc.constant('possibly adjust the thing to perhaps 50')
);

// Generators for valid voice queries
const validQueryGenerator = fc.oneof(
  // Current consumption queries for specific devices
  fc.tuple(fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz')).map(([deviceId]) => 
    `what is the current consumption for device ${deviceId}`
  ),
  fc.tuple(fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz')).map(([deviceId]) => 
    `how much energy is device ${deviceId} using now`
  ),
  fc.tuple(fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz')).map(([deviceId]) => 
    `tell me the current usage for device ${deviceId}`
  ),
  
  // Total current consumption queries
  fc.constant('what is the total current consumption'),
  fc.constant('how much energy am I using right now'),
  fc.constant('show me current energy usage'),
  fc.constant('tell me the current consumption'),
  
  // Today's consumption queries
  fc.constant('what is today\'s energy consumption'),
  fc.constant('how much energy have I used today'),
  fc.constant('show me today\'s total consumption'),
  fc.constant('tell me today\'s energy usage')
);

// Generators for valid voice commands (device control)
const validCommandGenerator = fc.oneof(
  // Turn on commands
  fc.tuple(fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz', 'hvac-main')).map(([deviceId]) => ({
    command: `turn on device ${deviceId}`,
    deviceId,
    expectedAction: 'turn_on'
  })),
  fc.tuple(fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz', 'hvac-main')).map(([deviceId]) => ({
    command: `switch on device ${deviceId}`,
    deviceId,
    expectedAction: 'turn_on'
  })),
  fc.tuple(fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz', 'hvac-main')).map(([deviceId]) => ({
    command: `enable device ${deviceId}`,
    deviceId,
    expectedAction: 'turn_on'
  })),
  
  // Turn off commands
  fc.tuple(fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz', 'hvac-main')).map(([deviceId]) => ({
    command: `turn off device ${deviceId}`,
    deviceId,
    expectedAction: 'turn_off'
  })),
  fc.tuple(fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz', 'hvac-main')).map(([deviceId]) => ({
    command: `switch off device ${deviceId}`,
    deviceId,
    expectedAction: 'turn_off'
  })),
  fc.tuple(fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz', 'hvac-main')).map(([deviceId]) => ({
    command: `disable device ${deviceId}`,
    deviceId,
    expectedAction: 'turn_off'
  })),
  
  // Set value commands
  fc.tuple(
    fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz', 'hvac-main'),
    fc.integer({ min: 0, max: 100 })
  ).map(([deviceId, value]) => ({
    command: `set device ${deviceId} to ${value}`,
    deviceId,
    expectedAction: 'set_value',
    expectedValue: value
  })),
  fc.tuple(
    fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz', 'hvac-main'),
    fc.integer({ min: 0, max: 100 })
  ).map(([deviceId, value]) => ({
    command: `adjust device ${deviceId} to ${value}`,
    deviceId,
    expectedAction: 'set_value',
    expectedValue: value
  })),
  fc.tuple(
    fc.constantFrom('device-1', 'device-2', 'plug-abc', 'light-xyz', 'hvac-main'),
    fc.integer({ min: 0, max: 100 })
  ).map(([deviceId, value]) => ({
    command: `change device ${deviceId} to ${value}`,
    deviceId,
    expectedAction: 'set_value',
    expectedValue: value
  }))
);

describe('VoiceAssistantImpl Property Tests', () => {
  let deviceManager: MockDeviceManager;
  let energyMonitor: MockEnergyMonitor;
  let voiceAssistant: VoiceAssistantImpl;

  beforeEach(() => {
    deviceManager = new MockDeviceManager();
    energyMonitor = new MockEnergyMonitor();
    voiceAssistant = new VoiceAssistantImpl(deviceManager, energyMonitor);
  });

  /**
   * Feature: smart-energy-copilot, Property 6: Voice query response completeness
   * Validates: Requirements 3.2
   * 
   * Property: For any valid voice query requesting energy statistics, the system's
   * response should contain the requested consumption information.
   */
  test('Property 6: voice query responses should contain requested consumption information', async () => {
    await fc.assert(
      fc.asyncProperty(
        validQueryGenerator,
        fc.float({ min: 0, max: 5000 }), // Random consumption value
        async (query, consumptionValue) => {
          // Setup: Register devices and set consumption values
          await deviceManager.registerDevice('device-1', 'smart_plug');
          await deviceManager.registerDevice('device-2', 'smart_plug');
          await deviceManager.registerDevice('plug-abc', 'smart_plug');
          await deviceManager.registerDevice('light-xyz', 'light');
          
          energyMonitor.recordConsumption('device-1', consumptionValue, new Date());
          energyMonitor.recordConsumption('device-2', consumptionValue * 0.5, new Date());
          energyMonitor.recordConsumption('plug-abc', consumptionValue * 0.3, new Date());
          energyMonitor.recordConsumption('light-xyz', consumptionValue * 0.2, new Date());
          energyMonitor.setTotalConsumption(consumptionValue * 2);

          // Convert query to audio buffer
          const audioData = Buffer.from(query, 'utf-8');

          // Process the query
          const response = await voiceAssistant.processVoiceCommand(audioData);

          // Verify that the intent is a query
          expect(response.intent.type).toBe('query');

          // Verify that the response contains consumption information
          const lowerResponse = response.spokenResponse.toLowerCase();
          
          // Response should contain energy-related keywords
          const hasEnergyKeywords = 
            lowerResponse.includes('consumption') ||
            lowerResponse.includes('energy') ||
            lowerResponse.includes('usage') ||
            lowerResponse.includes('watt') ||
            lowerResponse.includes('kilowatt');

          expect(hasEnergyKeywords).toBe(true);

          // Response should contain numerical information
          const hasNumbers = /\d+(\.\d+)?/.test(lowerResponse);
          expect(hasNumbers).toBe(true);

          // If query is for a specific device, response should mention that device
          const deviceMatch = query.match(/device\s+([\w-]+)/i);
          if (deviceMatch) {
            const deviceId = deviceMatch[1];
            expect(lowerResponse).toContain(deviceId.toLowerCase());
          }

          // If query is for "today", response should mention "today"
          if (query.toLowerCase().includes('today')) {
            expect(lowerResponse).toContain('today');
          }

          // If query is for "current", response should mention "current" or "now"
          if (query.toLowerCase().includes('current') || query.toLowerCase().includes('now')) {
            expect(
              lowerResponse.includes('current') || 
              lowerResponse.includes('now') ||
              lowerResponse.includes('consuming')
            ).toBe(true);
          }

          // Verify that no action was taken (queries don't execute actions)
          expect(response.actionTaken).toBeUndefined();

          // Verify confidence is reasonable for valid queries
          expect(response.intent.confidence).toBeGreaterThan(0.5);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 7: Voice command execution
   * Validates: Requirements 3.3
   * 
   * Property: For any valid voice command requesting device control, the system should
   * execute the command on the target device and provide verbal confirmation.
   */
  test('Property 7: voice commands should execute on target device and provide confirmation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validCommandGenerator,
        async (commandData) => {
          // Setup: Register the target device
          await deviceManager.registerDevice(commandData.deviceId, 'smart_plug');
          deviceManager.clearCommandHistory();

          // Convert command to audio buffer
          const audioData = Buffer.from(commandData.command, 'utf-8');

          // Process the command
          const response = await voiceAssistant.processVoiceCommand(audioData);

          // Verify that the intent is a command
          expect(response.intent.type).toBe('command');

          // Verify that the command was executed on the target device
          const commandHistory = deviceManager.getCommandHistory();
          expect(commandHistory.length).toBe(1);
          expect(commandHistory[0].deviceId).toBe(commandData.deviceId);
          expect(commandHistory[0].command.action).toBe(commandData.expectedAction);

          // If it's a set_value command, verify the value parameter
          if (commandData.expectedAction === 'set_value' && 'expectedValue' in commandData) {
            expect(commandHistory[0].command.parameters?.value).toBe(commandData.expectedValue);
          }

          // Verify that an action was taken
          expect(response.actionTaken).toBeDefined();
          expect(response.actionTaken).toContain(commandData.deviceId);

          // Verify that verbal confirmation was provided
          expect(response.spokenResponse).toBeDefined();
          expect(response.spokenResponse.length).toBeGreaterThan(0);

          // Response should contain confirmation keywords
          const lowerResponse = response.spokenResponse.toLowerCase();
          const hasConfirmationKeywords = 
            lowerResponse.includes('turned on') ||
            lowerResponse.includes('turned off') ||
            lowerResponse.includes('turn on') ||
            lowerResponse.includes('turn off') ||
            lowerResponse.includes('set') ||
            lowerResponse.includes('executed') ||
            lowerResponse.includes('done') ||
            lowerResponse.includes('command');

          expect(hasConfirmationKeywords).toBe(true);

          // Response should mention the device
          expect(lowerResponse).toContain(commandData.deviceId.toLowerCase());

          // If it's a set_value command, response should mention the value
          if (commandData.expectedAction === 'set_value' && 'expectedValue' in commandData) {
            expect(lowerResponse).toContain(commandData.expectedValue.toString());
          }

          // Verify confidence is high for valid commands
          expect(response.intent.confidence).toBeGreaterThan(0.7);

          // Verify audio response is generated
          expect(response.audioResponse).toBeDefined();
          expect(response.audioResponse.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 8: Voice error handling
   * Validates: Requirements 3.4
   * 
   * Property: For any malformed or ambiguous voice command, the system should
   * request clarification rather than executing an incorrect action.
   */
  test('Property 8: malformed commands should request clarification', async () => {
    await fc.assert(
      fc.asyncProperty(malformedCommandGenerator, async (malformedCommand) => {
        // Convert command to audio buffer
        const audioData = Buffer.from(malformedCommand, 'utf-8');

        // Process the malformed command
        const response = await voiceAssistant.processVoiceCommand(audioData);

        // Verify that the system requests clarification
        // The intent type should be 'clarification_needed'
        expect(response.intent.type).toBe('clarification_needed');

        // Verify that no action was taken
        expect(response.actionTaken).toBeUndefined();

        // Verify that the response contains a clarification request
        const lowerResponse = response.spokenResponse.toLowerCase();
        const hasClarificationKeywords = 
          lowerResponse.includes('clarif') ||
          lowerResponse.includes('repeat') ||
          lowerResponse.includes('rephrase') ||
          lowerResponse.includes('understand') ||
          lowerResponse.includes('which') ||
          lowerResponse.includes('what') ||
          lowerResponse.includes('could you') ||
          lowerResponse.includes('please');

        expect(hasClarificationKeywords).toBe(true);

        // Verify confidence is low for ambiguous commands
        if (malformedCommand.trim() !== '') {
          expect(response.intent.confidence).toBeLessThanOrEqual(0.5);
        }
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property: Empty audio should be handled gracefully
   */
  test('Property 8 (edge case): empty audio should request clarification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(Buffer.alloc(0)),
        async (emptyBuffer) => {
          const response = await voiceAssistant.processVoiceCommand(emptyBuffer);

          // Should request clarification
          expect(response.intent.type).toBe('clarification_needed');
          expect(response.actionTaken).toBeUndefined();

          // Should have a helpful message
          expect(response.spokenResponse.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Additional property: Commands without device specification should request clarification
   */
  test('Property 8 (specific case): commands without device should request clarification', async () => {
    const commandsWithoutDevice = fc.oneof(
      fc.constant('turn on'),
      fc.constant('turn off'),
      fc.constant('switch on'),
      fc.constant('switch off'),
      fc.constant('enable'),
      fc.constant('disable')
    );

    await fc.assert(
      fc.asyncProperty(commandsWithoutDevice, async (command) => {
        const audioData = Buffer.from(command, 'utf-8');
        const response = await voiceAssistant.processVoiceCommand(audioData);

        // Should request clarification about which device
        expect(response.intent.type).toBe('clarification_needed');
        expect(response.actionTaken).toBeUndefined();

        // Response should ask about the device
        const lowerResponse = response.spokenResponse.toLowerCase();
        expect(
          lowerResponse.includes('device') ||
          lowerResponse.includes('which') ||
          lowerResponse.includes('what')
        ).toBe(true);
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Additional property: Set commands without value should request clarification
   */
  test('Property 8 (specific case): set commands without value should request clarification', async () => {
    const setCommandsWithoutValue = fc.oneof(
      fc.constant('set device abc'),
      fc.constant('set device xyz to'),
      fc.constant('adjust device test'),
      fc.constant('change device foo to')
    );

    await fc.assert(
      fc.asyncProperty(setCommandsWithoutValue, async (command) => {
        const audioData = Buffer.from(command, 'utf-8');
        const response = await voiceAssistant.processVoiceCommand(audioData);

        // Should request clarification about the value
        expect(response.intent.type).toBe('clarification_needed');
        expect(response.actionTaken).toBeUndefined();

        // Response should ask about the value
        const lowerResponse = response.spokenResponse.toLowerCase();
        expect(
          lowerResponse.includes('value') ||
          lowerResponse.includes('what') ||
          lowerResponse.includes('rephrase')
        ).toBe(true);
      }),
      { numRuns: 10 }
    );
  });
});
