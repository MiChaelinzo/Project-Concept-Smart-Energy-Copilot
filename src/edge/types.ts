/**
 * Core type definitions for the Smart Energy Copilot edge components
 */

export type DeviceType = 'smart_plug' | 'energy_sensor' | 'camera' | 'hvac' | 'light';

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  location: string;
  capabilities: string[];
  normalPowerRange: { min: number; max: number };
  isOnline: boolean;
  lastSeen: Date;
}

export interface DeviceStatus {
  deviceId: string;
  isOnline: boolean;
  powerState: 'on' | 'off';
  currentWatts?: number;
  lastUpdated: Date;
}

export interface DeviceCommand {
  action: 'turn_on' | 'turn_off' | 'set_value';
  parameters?: Record<string, any>;
}

export type TelemetryCallback = (data: TelemetryData) => void;

export interface TelemetryData {
  deviceId: string;
  timestamp: Date;
  watts: number;
  voltage?: number;
  current?: number;
}
