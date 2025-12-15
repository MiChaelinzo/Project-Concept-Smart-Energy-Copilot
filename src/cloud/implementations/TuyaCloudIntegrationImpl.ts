import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { DeviceManager } from '../../edge/interfaces/DeviceManager';
import { SmartGridIntegration } from '../interfaces/SmartGridIntegration';

/**
 * Tuya Cloud Platform Integration
 * Provides integration with Tuya IoT devices and cloud services
 */
export class TuyaCloudIntegrationImpl implements DeviceManager {
  private apiClient: AxiosInstance;
  private accessToken?: string;
  private tokenExpiry?: Date;
  private config: TuyaConfig;
  private devices = new Map<string, TuyaDevice>();

  constructor(config: TuyaConfig) {
    this.config = config;
    this.apiClient = axios.create({
      baseURL: config.endpoint || 'https://openapi.tuyaus.com',
      timeout: 10000
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.authenticate();
      await this.discoverDevices();
      console.log('Tuya Cloud Integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tuya integration:', error);
      throw error;
    }
  }

  async authenticate(): Promise<void> {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Create Tuya signature
    const stringToSign = `${this.config.clientId}${timestamp}${nonce}`;
    const signature = crypto
      .createHmac('sha256', this.config.clientSecret)
      .update(stringToSign)
      .digest('hex')
      .toUpperCase();

    try {
      const response = await this.apiClient.post('/v1.0/token', {
        grant_type: 1
      }, {
        headers: {
          'client_id': this.config.clientId,
          't': timestamp,
          'nonce': nonce,
          'sign': signature,
          'sign_method': 'HMAC-SHA256'
        }
      });

      if (response.data.success) {
        this.accessToken = response.data.result.access_token;
        this.tokenExpiry = new Date(Date.now() + response.data.result.expire_time * 1000);
        
        // Set default headers for authenticated requests
        this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      } else {
        throw new Error(`Tuya authentication failed: ${response.data.msg}`);
      }
    } catch (error) {
      throw new Error(`Tuya authentication error: ${error}`);
    }
  }

  async discoverDevices(): Promise<any[]> {
    await this.ensureAuthenticated();

    try {
      const response = await this.apiClient.get('/v1.0/devices');
      
      if (response.data.success) {
        const tuyaDevices = response.data.result;
        
        // Convert Tuya devices to our device format
        const devices = tuyaDevices.map((device: any) => this.convertTuyaDevice(device));
        
        // Cache devices
        devices.forEach((device: any) => {
          this.devices.set(device.id, device);
        });

        return devices;
      } else {
        throw new Error(`Failed to discover devices: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('Device discovery failed:', error);
      return [];
    }
  }

  async getDeviceStatus(deviceId: string): Promise<any> {
    await this.ensureAuthenticated();

    try {
      const response = await this.apiClient.get(`/v1.0/devices/${deviceId}/status`);
      
      if (response.data.success) {
        return {
          deviceId,
          isOnline: response.data.result.online,
          powerState: this.extractPowerState(response.data.result.status),
          lastUpdated: new Date(),
          properties: this.convertTuyaStatus(response.data.result.status)
        };
      } else {
        throw new Error(`Failed to get device status: ${response.data.msg}`);
      }
    } catch (error) {
      console.error(`Failed to get status for device ${deviceId}:`, error);
      throw error;
    }
  }

  async sendCommand(deviceId: string, command: any): Promise<void> {
    await this.ensureAuthenticated();

    try {
      const tuyaCommands = this.convertToTuyaCommands(command);
      
      const response = await this.apiClient.post(`/v1.0/devices/${deviceId}/commands`, {
        commands: tuyaCommands
      });

      if (!response.data.success) {
        throw new Error(`Command failed: ${response.data.msg}`);
      }
    } catch (error) {
      console.error(`Failed to send command to device ${deviceId}:`, error);
      throw error;
    }
  }

  async getDeviceCapabilities(): Promise<string[]> {
    const capabilities = new Set<string>();
    
    for (const device of this.devices.values()) {
      device.capabilities.forEach(cap => capabilities.add(cap));
    }
    
    return Array.from(capabilities);
  }

  async updateDeviceConfiguration(deviceId: string, config: any): Promise<{ success: boolean }> {
    try {
      await this.sendCommand(deviceId, { type: 'configure', config });
      return { success: true };
    } catch (error) {
      console.error(`Failed to update device configuration:`, error);
      return { success: false };
    }
  }

  async registerDevice(device: any): Promise<any> {
    // For Tuya, devices are typically registered through the Tuya app
    // This method would handle virtual device registration or device binding
    console.log('Registering device with Tuya:', device);
    
    return {
      id: device.id || `tuya_${Date.now()}`,
      type: device.type || 'unknown',
      name: device.name || 'Tuya Device',
      location: device.location || 'Unknown',
      capabilities: ['power_control'],
      status: 'registered',
      lastSeen: new Date(),
      properties: {},
      normalPowerRange: { min: 0, max: 100 },
      isOnline: false
    };
  }

  async subscribeToTelemetry(deviceId: string, callback: (data: any) => void): Promise<void> {
    // Set up real-time data subscription via Tuya's message service
    console.log(`Setting up telemetry subscription for device: ${deviceId}`);
    
    // In a real implementation, you would set up WebSocket or MQTT connection
    // For now, we'll simulate with periodic polling
    const interval = setInterval(async () => {
      try {
        const status = await this.getDeviceStatus(deviceId);
        callback({
          deviceId,
          timestamp: new Date(),
          data: status.properties
        });
      } catch (error) {
        console.error(`Telemetry error for device ${deviceId}:`, error);
      }
    }, 30000); // Poll every 30 seconds

    // Store interval for cleanup (in a real app, you'd want proper cleanup)
    (this as any)[`interval_${deviceId}`] = interval;
  }

  // Smart Grid Integration methods
  async getGridStatus(): Promise<any> {
    // Integrate with Tuya's energy management APIs
    await this.ensureAuthenticated();
    
    try {
      const response = await this.apiClient.get('/v1.0/energy/grid-status');
      return response.data.result || { status: 'unknown', load: 0 };
    } catch (error) {
      console.warn('Grid status not available:', error);
      return { status: 'offline', load: 0 };
    }
  }

  async reportEnergyUsage(data: any): Promise<void> {
    await this.ensureAuthenticated();
    
    try {
      await this.apiClient.post('/v1.0/energy/usage', {
        timestamp: new Date().toISOString(),
        ...data
      });
    } catch (error) {
      console.error('Failed to report energy usage:', error);
    }
  }

  async getEnergyPricing(): Promise<any> {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.apiClient.get('/v1.0/energy/pricing');
      return response.data.result || { rate: 0.12, currency: 'USD' };
    } catch (error) {
      console.warn('Energy pricing not available:', error);
      return { rate: 0.12, currency: 'USD' };
    }
  }

  // AI Agent Integration for Tuya
  async processAICommand(command: string, context: any): Promise<any> {
    // Process natural language commands for Tuya devices
    const intent = this.parseAICommand(command);
    
    switch (intent.action) {
      case 'turn_on':
        if (intent.deviceId) {
          await this.sendCommand(intent.deviceId, { command: 'turn_on' });
          return { success: true, message: `Turned on ${intent.deviceName}` };
        }
        break;
        
      case 'turn_off':
        if (intent.deviceId) {
          await this.sendCommand(intent.deviceId, { command: 'turn_off' });
          return { success: true, message: `Turned off ${intent.deviceName}` };
        }
        break;
        
      case 'set_brightness':
        if (intent.deviceId && intent.value) {
          await this.sendCommand(intent.deviceId, { 
            command: 'set_brightness', 
            parameters: { brightness: intent.value } 
          });
          return { success: true, message: `Set brightness to ${intent.value}%` };
        }
        break;
        
      case 'get_status':
        if (intent.deviceId) {
          const status = await this.getDeviceStatus(intent.deviceId);
          return { success: true, data: status };
        }
        break;
        
      default:
        return { success: false, message: 'Command not recognized' };
    }
    
    return { success: false, message: 'Failed to execute command' };
  }

  private parseAICommand(command: string): any {
    const lowerCommand = command.toLowerCase();
    
    // Simple intent parsing (in production, use NLP)
    let action = 'unknown';
    let deviceId = null;
    let deviceName = null;
    let value = null;
    
    if (lowerCommand.includes('turn on')) {
      action = 'turn_on';
    } else if (lowerCommand.includes('turn off')) {
      action = 'turn_off';
    } else if (lowerCommand.includes('brightness') || lowerCommand.includes('dim')) {
      action = 'set_brightness';
      const match = command.match(/(\d+)%?/);
      value = match ? parseInt(match[1]) : null;
    } else if (lowerCommand.includes('status') || lowerCommand.includes('check')) {
      action = 'get_status';
    }
    
    // Find device by name
    for (const [id, device] of this.devices) {
      if (lowerCommand.includes(device.name.toLowerCase())) {
        deviceId = id;
        deviceName = device.name;
        break;
      }
    }
    
    return { action, deviceId, deviceName, value };
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
      await this.authenticate();
    }
  }

  private convertTuyaDevice(tuyaDevice: any): TuyaDevice {
    return {
      id: tuyaDevice.id,
      name: tuyaDevice.name,
      type: this.mapTuyaCategory(tuyaDevice.category),
      status: tuyaDevice.online ? 'online' : 'offline',
      location: tuyaDevice.room_name || 'Unknown',
      capabilities: this.mapTuyaCapabilities(tuyaDevice.status),
      normalPowerRange: { min: 0, max: 100 },
      isOnline: tuyaDevice.online,
      lastSeen: new Date(),
      properties: tuyaDevice.status || {}
    };
  }

  private mapTuyaCategory(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'dj': 'light',
      'cz': 'outlet',
      'kg': 'switch',
      'wk': 'thermostat',
      'cl': 'curtain'
    };
    
    return categoryMap[category] || 'unknown';
  }

  private mapTuyaCapabilities(status: any[]): string[] {
    const capabilities = ['power_control'];
    
    if (status) {
      status.forEach(item => {
        switch (item.code) {
          case 'bright_value':
            capabilities.push('brightness_control');
            break;
          case 'temp_value':
            capabilities.push('temperature_control');
            break;
          case 'colour_data':
            capabilities.push('color_control');
            break;
        }
      });
    }
    
    return capabilities;
  }

  private extractPowerState(status: any[]): string {
    const powerStatus = status?.find(item => item.code === 'switch_1' || item.code === 'switch');
    return powerStatus?.value ? 'on' : 'off';
  }

  private convertTuyaStatus(status: any[]): any {
    const properties: any = {};
    
    status?.forEach(item => {
      properties[item.code] = item.value;
    });
    
    return properties;
  }

  private convertToTuyaCommands(command: any): any[] {
    const commands = [];
    
    switch (command.command) {
      case 'turn_on':
        commands.push({ code: 'switch_1', value: true });
        break;
      case 'turn_off':
        commands.push({ code: 'switch_1', value: false });
        break;
      case 'set_brightness':
        commands.push({ code: 'bright_value', value: command.parameters?.brightness || 100 });
        break;
      case 'set_temperature':
        commands.push({ code: 'temp_value', value: command.parameters?.temperature || 22 });
        break;
    }
    
    return commands;
  }

  destroy(): void {
    // Clean up intervals and connections
    for (const key in this) {
      if (key.startsWith('interval_')) {
        clearInterval((this as any)[key]);
      }
    }
  }
}

// Type definitions
interface TuyaConfig {
  clientId: string;
  clientSecret: string;
  endpoint?: string;
  region?: string;
}

interface TuyaDevice {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  capabilities: string[];
  normalPowerRange: { min: number; max: number };
  isOnline: boolean;
  lastSeen: Date;
  properties: any;
}