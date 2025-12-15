import { EnergyQuery, EnergyResponse, SystemAction } from '../types';
import { DeviceManager } from '../../edge/interfaces/DeviceManager';
import { EnergyMonitor } from '../../edge/interfaces/EnergyMonitor';
import { BehaviorLearningEngine } from '../../edge/interfaces/BehaviorLearningEngine';
import { SmartGridIntegration } from '../../cloud/interfaces/SmartGridIntegration';

/**
 * Smart Energy Copilot Integration Interface
 * 
 * Provides integration layer between AI Chatbot Engine and existing Smart Energy Copilot APIs.
 * Enables energy-related query processing, device control, and automation rule management.
 */
export interface SmartEnergyCopilotIntegration {
  /**
   * Process energy-related queries through natural language
   * @param query Natural language query about energy usage, devices, or optimization
   * @param userId User identifier for personalized responses
   * @returns Promise resolving to energy response with data and actions
   */
  processEnergyQuery(query: string, userId: string): Promise<EnergyResponse>;

  /**
   * Execute device control commands through existing DeviceManager
   * @param deviceId Target device identifier
   * @param command Natural language command to execute
   * @param userId User identifier for authorization
   * @returns Promise resolving to execution result
   */
  executeDeviceControl(deviceId: string, command: string, userId: string): Promise<{
    success: boolean;
    message: string;
    newStatus?: any;
  }>;

  /**
   * Retrieve energy consumption data from EnergyMonitor
   * @param query Structured energy query with timeframe and device filters
   * @returns Promise resolving to energy consumption data
   */
  getEnergyData(query: EnergyQuery): Promise<EnergyResponse>;

  /**
   * Get automation rules and schedules from BehaviorLearningEngine
   * @param deviceId Optional device filter
   * @returns Promise resolving to current automation rules
   */
  getAutomationRules(deviceId?: string): Promise<{
    rules: any[];
    schedules: any[];
    predictions: any[];
  }>;

  /**
   * Update automation rules based on user preferences
   * @param deviceId Target device identifier
   * @param preferences User preferences for automation
   * @param userId User identifier for authorization
   * @returns Promise resolving to update result
   */
  updateAutomationRules(deviceId: string, preferences: any, userId: string): Promise<{
    success: boolean;
    updatedRules: any[];
  }>;

  /**
   * Communicate with cloud services for advanced energy features
   * @param serviceType Type of cloud service (grid, analytics, etc.)
   * @param request Service-specific request data
   * @returns Promise resolving to cloud service response
   */
  communicateWithCloudServices(serviceType: string, request: any): Promise<any>;

  /**
   * Initialize integration with existing Smart Energy Copilot components
   * @param config Integration configuration
   */
  initialize(config: SmartEnergyCopilotConfig): Promise<void>;

  /**
   * Check if integration is ready and all components are available
   * @returns True if integration is ready
   */
  isReady(): boolean;

  /**
   * Get status of all integrated components
   * @returns Status information for each component
   */
  getIntegrationStatus(): IntegrationStatus;

  /**
   * Shutdown integration and cleanup resources
   */
  shutdown(): Promise<void>;
}

/**
 * Configuration for Smart Energy Copilot Integration
 */
export interface SmartEnergyCopilotConfig {
  // Component references
  deviceManager: DeviceManager;
  energyMonitor: EnergyMonitor;
  behaviorLearningEngine: BehaviorLearningEngine;
  smartGridIntegration?: SmartGridIntegration;

  // API endpoints
  cloudServiceUrls: {
    analytics?: string;
    grid?: string;
    storage?: string;
  };

  // Authentication
  apiKeys: Record<string, string>;

  // Feature flags
  enableCloudServices: boolean;
  enableAutomation: boolean;
  enableGridIntegration: boolean;

  // Performance settings
  cacheTimeout: number; // milliseconds
  maxRetries: number;
  requestTimeout: number; // milliseconds
}

/**
 * Integration status information
 */
export interface IntegrationStatus {
  isInitialized: boolean;
  componentsReady: {
    deviceManager: boolean;
    energyMonitor: boolean;
    behaviorLearningEngine: boolean;
    smartGridIntegration: boolean;
  };
  cloudServicesAvailable: boolean;
  lastError?: string;
  uptime: number;
}