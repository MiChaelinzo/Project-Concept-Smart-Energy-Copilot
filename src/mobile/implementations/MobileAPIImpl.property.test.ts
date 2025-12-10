import * as fc from 'fast-check';
import { MobileAPIImpl } from './MobileAPIImpl';
import { DeviceManager } from '../../edge/interfaces/DeviceManager';
import { EnergyMonitor, EnergyData } from '../../edge/interfaces/EnergyMonitor';
import { CarbonDashboard } from '../../cloud/interfaces/CarbonDashboard';
import { ScheduleExecutor } from '../../edge/interfaces/ScheduleExecutor';
import { Device, DeviceStatus, DeviceType } from '../../edge/types';
import { HistoricalDataRequest } from '../types';

describe('MobileAPI Property-Based Tests', () => {
  
  /**
   * Feature: smart-energy-copilot, Property 17: Device status display
   * Validates: Requirements 7.1
   * 
   * For any set of registered devices, opening the mobile application should display 
   * the current status of all devices in the set.
   */
  test('Property 17: Device status display completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of devices
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('smart_plug', 'energy_sensor', 'camera', 'hvac', 'light') as fc.Arbitrary<DeviceType>,
            name: fc.string({ minLength: 1, maxLength: 50 }),
            location: fc.string({ minLength: 1, maxLength: 30 }),
            capabilities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
            normalPowerRange: fc.record({
              min: fc.nat(100),
              max: fc.integer({ min: 101, max: 5000 })
            }),
            isOnline: fc.boolean(),
            lastSeen: fc.date()
          }),
          { minLength: 0, maxLength: 20 }
        ).map(devices => {
          // Ensure unique device IDs
          const uniqueDevices = devices.filter((device, index, arr) => 
            arr.findIndex(d => d.id === device.id) === index
          );
          return uniqueDevices;
        }),
        
        // Generate corresponding device statuses
        fc.array(
          fc.record({
            deviceId: fc.string({ minLength: 1, maxLength: 20 }),
            isOnline: fc.boolean(),
            powerState: fc.constantFrom('on', 'off') as fc.Arbitrary<'on' | 'off'>,
            currentWatts: fc.option(fc.nat(5000)),
            lastUpdated: fc.date()
          }),
          { minLength: 0, maxLength: 20 }
        ),
        
        async (devices, statuses) => {
          // Create mock implementations
          const mockDeviceManager: jest.Mocked<DeviceManager> = {
            registerDevice: jest.fn(),
            discoverDevices: jest.fn(),
            getDeviceStatus: jest.fn(),
            sendCommand: jest.fn(),
            subscribeToTelemetry: jest.fn(),
          } as any;

          const mockEnergyMonitor: jest.Mocked<EnergyMonitor> = {
            recordConsumption: jest.fn(),
            getCurrentConsumption: jest.fn(),
            getHistoricalData: jest.fn(),
            getTotalConsumption: jest.fn(),
            calculateCarbonFootprint: jest.fn(),
          } as any;

          const mockCarbonDashboard: jest.Mocked<CarbonDashboard> = {
            getDashboardData: jest.fn(),
            calculateCarbonEmissions: jest.fn(),
            calculatePercentageChange: jest.fn(),
            calculateProjectedAnnualSavings: jest.fn(),
            getEnergySaved: jest.fn(),
          } as any;

          const mockScheduleExecutor: jest.Mocked<ScheduleExecutor> = {
            executeSchedule: jest.fn(),
            handleOverride: jest.fn(),
            pauseSchedule: jest.fn(),
            resumeSchedule: jest.fn(),
          } as any;

          // Setup mock to return the generated devices
          mockDeviceManager.discoverDevices.mockResolvedValue(devices);
          
          // Setup mock to return corresponding status for each device
          const statusMap = new Map<string, DeviceStatus>();
          devices.forEach((device, index) => {
            const status = statuses[index] || {
              deviceId: device.id,
              isOnline: device.isOnline,
              powerState: 'off' as const,
              currentWatts: 0,
              lastUpdated: new Date()
            };
            // Ensure status deviceId matches the device id and fix type
            const fixedStatus: DeviceStatus = {
              deviceId: device.id,
              isOnline: status.isOnline,
              powerState: status.powerState,
              currentWatts: status.currentWatts || undefined,
              lastUpdated: status.lastUpdated
            };
            statusMap.set(device.id, fixedStatus);
          });
          
          mockDeviceManager.getDeviceStatus.mockImplementation(async (deviceId: string) => {
            const status = statusMap.get(deviceId);
            if (!status) {
              throw new Error(`Device ${deviceId} not found`);
            }
            return status;
          });

          const mobileAPI = new MobileAPIImpl(
            mockDeviceManager,
            mockEnergyMonitor,
            mockCarbonDashboard,
            mockScheduleExecutor
          );

          // Test: Get all devices (simulating opening the mobile app)
          const retrievedDevices = await mobileAPI.getDevices();
          
          // Property: All registered devices should be displayed
          expect(retrievedDevices).toHaveLength(devices.length);
          expect(retrievedDevices).toEqual(devices);
          
          // Property: Each device should have accessible status information
          for (const device of devices) {
            const deviceStatus = await mobileAPI.getDeviceStatus(device.id);
            expect(deviceStatus.deviceId).toBe(device.id);
            expect(deviceStatus).toHaveProperty('isOnline');
            expect(deviceStatus).toHaveProperty('powerState');
            expect(deviceStatus).toHaveProperty('lastUpdated');
            expect(['on', 'off']).toContain(deviceStatus.powerState);
            expect(typeof deviceStatus.isOnline).toBe('boolean');
            expect(deviceStatus.lastUpdated).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 18: Historical data retrieval
   * Validates: Requirements 7.3
   * 
   * For any valid time range, requesting historical data should return energy consumption 
   * records for all devices active during that period.
   */
  test('Property 18: Historical data retrieval completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate devices
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('smart_plug', 'energy_sensor', 'camera', 'hvac', 'light') as fc.Arbitrary<DeviceType>,
            name: fc.string({ minLength: 1, maxLength: 50 }),
            location: fc.string({ minLength: 1, maxLength: 30 }),
            capabilities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
            normalPowerRange: fc.record({
              min: fc.nat(100),
              max: fc.integer({ min: 101, max: 5000 })
            }),
            isOnline: fc.boolean(),
            lastSeen: fc.date()
          }),
          { minLength: 1, maxLength: 10 }
        ).map(devices => {
          // Ensure unique device IDs
          const uniqueDevices = devices.filter((device, index, arr) => 
            arr.findIndex(d => d.id === device.id) === index
          );
          return uniqueDevices.length > 0 ? uniqueDevices : [devices[0]]; // Ensure at least one device
        }),
        
        // Generate time range
        fc.record({
          startDate: fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }),
          endDate: fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }),
          granularity: fc.constantFrom('hourly', 'daily', 'weekly') as fc.Arbitrary<'hourly' | 'daily' | 'weekly'>
        }).filter(range => range.startDate <= range.endDate),
        
        // Generate historical data for each device
        fc.array(
          fc.array(
            fc.record({
              deviceId: fc.string({ minLength: 1, maxLength: 20 }),
              timestamp: fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }),
              watts: fc.nat(5000),
              cumulativeKwh: fc.float({ min: 0, max: 1000 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          { minLength: 1, maxLength: 10 }
        ),
        
        async (devices, timeRange, deviceHistoricalData) => {
          // Create mock implementations
          const mockDeviceManager: jest.Mocked<DeviceManager> = {
            registerDevice: jest.fn(),
            discoverDevices: jest.fn(),
            getDeviceStatus: jest.fn(),
            sendCommand: jest.fn(),
            subscribeToTelemetry: jest.fn(),
          } as any;

          const mockEnergyMonitor: jest.Mocked<EnergyMonitor> = {
            recordConsumption: jest.fn(),
            getCurrentConsumption: jest.fn(),
            getHistoricalData: jest.fn(),
            getTotalConsumption: jest.fn(),
            calculateCarbonFootprint: jest.fn(),
          } as any;

          const mockCarbonDashboard: jest.Mocked<CarbonDashboard> = {
            getDashboardData: jest.fn(),
            calculateCarbonEmissions: jest.fn(),
            calculatePercentageChange: jest.fn(),
            calculateProjectedAnnualSavings: jest.fn(),
            getEnergySaved: jest.fn(),
          } as any;

          const mockScheduleExecutor: jest.Mocked<ScheduleExecutor> = {
            executeSchedule: jest.fn(),
            handleOverride: jest.fn(),
            pauseSchedule: jest.fn(),
            resumeSchedule: jest.fn(),
          } as any;

          // Setup mock to return the generated devices
          mockDeviceManager.discoverDevices.mockResolvedValue(devices);
          
          // Setup historical data for each device
          const historicalDataMap = new Map<string, EnergyData[]>();
          devices.forEach((device, index) => {
            const deviceData = deviceHistoricalData[index] || [];
            // Filter data to be within the time range and set correct deviceId
            const filteredData = deviceData
              .filter(data => data.timestamp >= timeRange.startDate && data.timestamp <= timeRange.endDate)
              .map(data => ({
                ...data,
                deviceId: device.id // Ensure deviceId matches
              }));
            historicalDataMap.set(device.id, filteredData);
          });
          
          mockEnergyMonitor.getHistoricalData.mockImplementation(async (deviceId: string, range) => {
            const data = historicalDataMap.get(deviceId) || [];
            // Further filter by the exact range requested
            return data.filter(d => d.timestamp >= range.start && d.timestamp <= range.end);
          });

          const mobileAPI = new MobileAPIImpl(
            mockDeviceManager,
            mockEnergyMonitor,
            mockCarbonDashboard,
            mockScheduleExecutor
          );

          // Test 1: Request historical data for all devices (no deviceId specified)
          const allDevicesRequest: HistoricalDataRequest = {
            startDate: timeRange.startDate,
            endDate: timeRange.endDate,
            granularity: timeRange.granularity
          };
          
          const allDevicesData = await mobileAPI.getHistoricalData(allDevicesRequest);
          
          // Property: Should return data for all devices active during the period
          const expectedTotalRecords = devices.reduce((total, device) => {
            const deviceData = historicalDataMap.get(device.id) || [];
            return total + deviceData.length;
          }, 0);
          
          expect(allDevicesData).toHaveLength(expectedTotalRecords);
          
          // Property: All returned records should be within the requested time range
          for (const record of allDevicesData) {
            expect(record.timestamp).toBeInstanceOf(Date);
            expect(record.timestamp.getTime()).toBeGreaterThanOrEqual(timeRange.startDate.getTime());
            expect(record.timestamp.getTime()).toBeLessThanOrEqual(timeRange.endDate.getTime());
          }
          
          // Property: All returned records should belong to registered devices
          const deviceIds = new Set(devices.map(d => d.id));
          for (const record of allDevicesData) {
            expect(deviceIds.has(record.deviceId)).toBe(true);
          }
          
          // Test 2: Request historical data for specific device
          if (devices.length > 0) {
            const targetDevice = devices[0];
            const specificDeviceRequest: HistoricalDataRequest = {
              deviceId: targetDevice.id,
              startDate: timeRange.startDate,
              endDate: timeRange.endDate,
              granularity: timeRange.granularity
            };
            
            const specificDeviceData = await mobileAPI.getHistoricalData(specificDeviceRequest);
            const expectedDeviceData = historicalDataMap.get(targetDevice.id) || [];
            
            // Property: Should return only data for the specified device
            expect(specificDeviceData).toHaveLength(expectedDeviceData.length);
            for (const record of specificDeviceData) {
              expect(record.deviceId).toBe(targetDevice.id);
              expect(record.timestamp.getTime()).toBeGreaterThanOrEqual(timeRange.startDate.getTime());
              expect(record.timestamp.getTime()).toBeLessThanOrEqual(timeRange.endDate.getTime());
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 19: Schedule toggle responsiveness
   * Validates: Requirements 7.4
   * 
   * For any device with an adaptive schedule, enabling or disabling the schedule 
   * should immediately change whether scheduled actions are executed.
   */
  test('Property 19: Schedule toggle responsiveness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate device
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          type: fc.constantFrom('smart_plug', 'energy_sensor', 'camera', 'hvac', 'light') as fc.Arbitrary<DeviceType>,
          name: fc.string({ minLength: 1, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 30 }),
          capabilities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          normalPowerRange: fc.record({
            min: fc.nat(100),
            max: fc.integer({ min: 101, max: 5000 })
          }),
          isOnline: fc.boolean(),
          lastSeen: fc.date()
        }),
        
        // Generate initial schedule state (enabled/disabled)
        fc.boolean(),
        
        async (device, initialEnabled) => {
          // Create mock implementations
          const mockDeviceManager: jest.Mocked<DeviceManager> = {
            registerDevice: jest.fn(),
            discoverDevices: jest.fn(),
            getDeviceStatus: jest.fn(),
            sendCommand: jest.fn(),
            subscribeToTelemetry: jest.fn(),
          } as any;

          const mockEnergyMonitor: jest.Mocked<EnergyMonitor> = {
            recordConsumption: jest.fn(),
            getCurrentConsumption: jest.fn(),
            getHistoricalData: jest.fn(),
            getTotalConsumption: jest.fn(),
            calculateCarbonFootprint: jest.fn(),
          } as any;

          const mockCarbonDashboard: jest.Mocked<CarbonDashboard> = {
            getDashboardData: jest.fn(),
            calculateCarbonEmissions: jest.fn(),
            calculatePercentageChange: jest.fn(),
            calculateProjectedAnnualSavings: jest.fn(),
            getEnergySaved: jest.fn(),
          } as any;

          // Create a mock ScheduleExecutor that tracks pause/resume state
          let isPaused = !initialEnabled; // If initially enabled, it's not paused
          const mockScheduleExecutor: jest.Mocked<ScheduleExecutor> = {
            executeSchedule: jest.fn(),
            handleOverride: jest.fn(),
            pauseSchedule: jest.fn().mockImplementation((deviceId: string) => {
              isPaused = true;
            }),
            resumeSchedule: jest.fn().mockImplementation((deviceId: string) => {
              isPaused = false;
            }),
          } as any;

          // Add a method to check if schedule is paused (simulating ScheduleExecutorImpl's isSchedulePaused)
          (mockScheduleExecutor as any).isSchedulePaused = jest.fn().mockImplementation((deviceId: string) => {
            return isPaused;
          });

          const mobileAPI = new MobileAPIImpl(
            mockDeviceManager,
            mockEnergyMonitor,
            mockCarbonDashboard,
            mockScheduleExecutor
          );

          // Test initial state
          const initialPausedState = (mockScheduleExecutor as any).isSchedulePaused(device.id);
          expect(initialPausedState).toBe(!initialEnabled);

          // Test: Toggle schedule to opposite state
          const newEnabled = !initialEnabled;
          await mobileAPI.toggleAdaptiveSchedule(device.id, newEnabled);

          // Property: Schedule state should immediately change
          if (newEnabled) {
            expect(mockScheduleExecutor.resumeSchedule).toHaveBeenCalledWith(device.id);
            expect(mockScheduleExecutor.pauseSchedule).not.toHaveBeenCalled();
          } else {
            expect(mockScheduleExecutor.pauseSchedule).toHaveBeenCalledWith(device.id);
            expect(mockScheduleExecutor.resumeSchedule).not.toHaveBeenCalled();
          }

          // Property: The schedule execution state should reflect the toggle
          const finalPausedState = (mockScheduleExecutor as any).isSchedulePaused(device.id);
          expect(finalPausedState).toBe(!newEnabled);

          // Test: Toggle back to original state
          mockScheduleExecutor.pauseSchedule.mockClear();
          mockScheduleExecutor.resumeSchedule.mockClear();
          
          await mobileAPI.toggleAdaptiveSchedule(device.id, initialEnabled);

          // Property: Schedule state should change back immediately
          if (initialEnabled) {
            expect(mockScheduleExecutor.resumeSchedule).toHaveBeenCalledWith(device.id);
            expect(mockScheduleExecutor.pauseSchedule).not.toHaveBeenCalled();
          } else {
            expect(mockScheduleExecutor.pauseSchedule).toHaveBeenCalledWith(device.id);
            expect(mockScheduleExecutor.resumeSchedule).not.toHaveBeenCalled();
          }

          // Property: The schedule execution state should be back to initial state
          const backToInitialState = (mockScheduleExecutor as any).isSchedulePaused(device.id);
          expect(backToInitialState).toBe(!initialEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: smart-energy-copilot, Property 20: Data synchronization consistency
   * Validates: Requirements 7.5
   * 
   * For any data change made in the mobile app, the change should be reflected 
   * in subsequent app sessions (round-trip property).
   */
  test('Property 20: Data synchronization consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate device
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          type: fc.constantFrom('smart_plug', 'energy_sensor', 'camera', 'hvac', 'light') as fc.Arbitrary<DeviceType>,
          name: fc.string({ minLength: 1, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 30 }),
          capabilities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          normalPowerRange: fc.record({
            min: fc.nat(100),
            max: fc.integer({ min: 101, max: 5000 })
          }),
          isOnline: fc.boolean(),
          lastSeen: fc.date()
        }),
        
        // Generate device control request
        fc.record({
          action: fc.constantFrom('turn_on', 'turn_off', 'set_value') as fc.Arbitrary<'turn_on' | 'turn_off' | 'set_value'>,
          parameters: fc.option(fc.dictionary(fc.string(), fc.anything()))
        }),
        
        // Generate schedule toggle state
        fc.boolean(),
        
        async (device, controlRequest, scheduleEnabled) => {
          // Create mock implementations that simulate persistent storage
          const mockDeviceManager: jest.Mocked<DeviceManager> = {
            registerDevice: jest.fn(),
            discoverDevices: jest.fn(),
            getDeviceStatus: jest.fn(),
            sendCommand: jest.fn(),
            subscribeToTelemetry: jest.fn(),
          } as any;

          const mockEnergyMonitor: jest.Mocked<EnergyMonitor> = {
            recordConsumption: jest.fn(),
            getCurrentConsumption: jest.fn(),
            getHistoricalData: jest.fn(),
            getTotalConsumption: jest.fn(),
            calculateCarbonFootprint: jest.fn(),
          } as any;

          const mockCarbonDashboard: jest.Mocked<CarbonDashboard> = {
            getDashboardData: jest.fn(),
            calculateCarbonEmissions: jest.fn(),
            calculatePercentageChange: jest.fn(),
            calculateProjectedAnnualSavings: jest.fn(),
            getEnergySaved: jest.fn(),
          } as any;

          // Create a mock ScheduleExecutor that simulates persistent schedule state
          let persistentScheduleState = new Map<string, boolean>();
          const mockScheduleExecutor: jest.Mocked<ScheduleExecutor> = {
            executeSchedule: jest.fn(),
            handleOverride: jest.fn(),
            pauseSchedule: jest.fn().mockImplementation((deviceId: string) => {
              persistentScheduleState.set(deviceId, false); // false = paused
            }),
            resumeSchedule: jest.fn().mockImplementation((deviceId: string) => {
              persistentScheduleState.set(deviceId, true); // true = resumed
            }),
          } as any;

          // Add method to check schedule state (simulating persistent storage)
          (mockScheduleExecutor as any).isScheduleEnabled = jest.fn().mockImplementation((deviceId: string) => {
            return persistentScheduleState.get(deviceId) ?? true; // default to enabled
          });

          // Create persistent device state storage
          let persistentDeviceStates = new Map<string, DeviceStatus>();
          
          // Initialize device state
          const initialDeviceState: DeviceStatus = {
            deviceId: device.id,
            isOnline: device.isOnline,
            powerState: 'off',
            currentWatts: 0,
            lastUpdated: new Date()
          };
          persistentDeviceStates.set(device.id, initialDeviceState);

          // Mock device manager to simulate persistent device state changes
          mockDeviceManager.sendCommand.mockImplementation(async (deviceId: string, command) => {
            const currentState = persistentDeviceStates.get(deviceId);
            if (currentState) {
              // Simulate state change based on command
              const newState: DeviceStatus = {
                ...currentState,
                powerState: command.action === 'turn_on' ? 'on' : 
                           command.action === 'turn_off' ? 'off' : currentState.powerState,
                lastUpdated: new Date()
              };
              persistentDeviceStates.set(deviceId, newState);
            }
          });

          mockDeviceManager.getDeviceStatus.mockImplementation(async (deviceId: string) => {
            const state = persistentDeviceStates.get(deviceId);
            if (!state) {
              throw new Error(`Device ${deviceId} not found`);
            }
            return state;
          });

          // Create first mobile API instance (simulating first app session)
          const mobileAPI1 = new MobileAPIImpl(
            mockDeviceManager,
            mockEnergyMonitor,
            mockCarbonDashboard,
            mockScheduleExecutor
          );

          // Test 1: Make data changes in first session
          
          // Change 1: Send device control command
          const deviceControlRequest = {
            deviceId: device.id,
            action: controlRequest.action,
            parameters: controlRequest.parameters || undefined
          };
          
          await mobileAPI1.controlDevice(deviceControlRequest);
          
          // Change 2: Toggle adaptive schedule
          await mobileAPI1.toggleAdaptiveSchedule(device.id, scheduleEnabled);
          
          // Capture state after changes in first session
          const deviceStateAfterChanges = await mobileAPI1.getDeviceStatus(device.id);
          const scheduleStateAfterChanges = (mockScheduleExecutor as any).isScheduleEnabled(device.id);

          // Create second mobile API instance (simulating subsequent app session)
          // This simulates a new app session that should see the synchronized data
          const mobileAPI2 = new MobileAPIImpl(
            mockDeviceManager,
            mockEnergyMonitor,
            mockCarbonDashboard,
            mockScheduleExecutor
          );

          // Test 2: Verify data consistency in subsequent session
          
          // Property: Device state changes should be reflected in subsequent sessions
          const deviceStateInNewSession = await mobileAPI2.getDeviceStatus(device.id);
          expect(deviceStateInNewSession.powerState).toBe(deviceStateAfterChanges.powerState);
          expect(deviceStateInNewSession.deviceId).toBe(deviceStateAfterChanges.deviceId);
          expect(deviceStateInNewSession.isOnline).toBe(deviceStateAfterChanges.isOnline);
          
          // Property: Schedule state changes should be reflected in subsequent sessions
          const scheduleStateInNewSession = (mockScheduleExecutor as any).isScheduleEnabled(device.id);
          expect(scheduleStateInNewSession).toBe(scheduleStateAfterChanges);
          expect(scheduleStateInNewSession).toBe(scheduleEnabled);

          // Test 3: Verify round-trip consistency
          // Make another change in the second session and verify it persists
          const oppositeScheduleState = !scheduleEnabled;
          await mobileAPI2.toggleAdaptiveSchedule(device.id, oppositeScheduleState);
          
          // Create third mobile API instance (simulating another subsequent session)
          const mobileAPI3 = new MobileAPIImpl(
            mockDeviceManager,
            mockEnergyMonitor,
            mockCarbonDashboard,
            mockScheduleExecutor
          );
          
          // Property: Changes made in second session should be reflected in third session
          const finalScheduleState = (mockScheduleExecutor as any).isScheduleEnabled(device.id);
          expect(finalScheduleState).toBe(oppositeScheduleState);
          
          // Verify that the underlying services were called correctly to persist changes
          expect(mockDeviceManager.sendCommand).toHaveBeenCalledWith(device.id, {
            action: controlRequest.action,
            parameters: controlRequest.parameters || undefined
          });
          
          if (scheduleEnabled) {
            expect(mockScheduleExecutor.resumeSchedule).toHaveBeenCalledWith(device.id);
          } else {
            expect(mockScheduleExecutor.pauseSchedule).toHaveBeenCalledWith(device.id);
          }
          
          if (oppositeScheduleState) {
            expect(mockScheduleExecutor.resumeSchedule).toHaveBeenCalledWith(device.id);
          } else {
            expect(mockScheduleExecutor.pauseSchedule).toHaveBeenCalledWith(device.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});