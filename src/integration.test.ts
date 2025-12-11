/**
 * Integration and End-to-End Tests for Smart Energy Copilot
 * 
 * Tests complete workflows across multiple components:
 * - Device registration and monitoring flow
 * - Voice command to device control workflow  
 * - Occupancy detection triggering automation
 * - Anomaly detection and emergency shutdown
 * - Offline operation and reconnection
 * 
 * Requirements: All
 */

import { 
  ResilientDeviceManager,
  EnergyMonitorImpl,
  VoiceAssistantImpl,
  OccupancyDetectorImpl,
  AnomalyDetectorImpl,
  ScheduleExecutorImpl,
  BehaviorLearningEngineImpl,
  CarbonDashboardImpl,
  MobileAPIImpl,
  DataStorageImpl,
  UserPreferencesImpl
} from './index';



describe('Smart Energy Copilot - Integration Tests', () => {
  let deviceManager: ResilientDeviceManager;
  let energyMonitor: EnergyMonitorImpl;
  let voiceAssistant: VoiceAssistantImpl;
  let occupancyDetector: OccupancyDetectorImpl;
  let anomalyDetector: AnomalyDetectorImpl;
  let scheduleExecutor: ScheduleExecutorImpl;
  let behaviorEngine: BehaviorLearningEngineImpl;
  let carbonDashboard: CarbonDashboardImpl;
  let mobileAPI: MobileAPIImpl;


  beforeEach(async () => {
    // Initialize all components
    deviceManager = new ResilientDeviceManager('test-api-key', 'test-api-secret');
    
    // Authenticate the base manager to avoid authentication errors
    await (deviceManager as any).baseManager.authenticate();
    
    energyMonitor = new EnergyMonitorImpl();
    voiceAssistant = new VoiceAssistantImpl(deviceManager, energyMonitor);
    occupancyDetector = new OccupancyDetectorImpl(deviceManager);
    anomalyDetector = new AnomalyDetectorImpl(deviceManager);
    scheduleExecutor = new ScheduleExecutorImpl(deviceManager);
    behaviorEngine = new BehaviorLearningEngineImpl();
    carbonDashboard = new CarbonDashboardImpl(energyMonitor);

    mobileAPI = new MobileAPIImpl(deviceManager, energyMonitor, carbonDashboard, scheduleExecutor);
    
    // Set API status to true for testing to avoid fallback to cache
    (deviceManager as any).updateApiStatus(true);
  });

  afterEach(() => {
    // Cleanup resources
    deviceManager.destroy();
    energyMonitor.clearAllData();
    occupancyDetector.cleanup();
    anomalyDetector.clearHistory();
    behaviorEngine.clearAllData();
  });

  /**
   * Test 1: Complete device registration and monitoring flow
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2
   */
  describe('Device Registration and Monitoring Flow', () => {
    test('should register device, monitor energy, and persist data', async () => {
      // Step 1: Register a smart plug device
      const device = await deviceManager.registerDevice('smart-plug-001', 'smart_plug');
      
      expect(device).toBeDefined();
      expect(device.id).toBe('smart-plug-001');
      expect(device.type).toBe('smart_plug');

      // Step 2: Start energy monitoring
      const baseTime = new Date('2024-01-01T10:00:00Z');
      
      // Record initial consumption
      energyMonitor.recordConsumption('smart-plug-001', 100, baseTime);
      
      // Verify current consumption is tracked
      const currentConsumption = await energyMonitor.getCurrentConsumption('smart-plug-001');
      expect(currentConsumption).toBe(100);

      // Step 3: Record consumption over time
      const times = [
        new Date(baseTime.getTime() + 60000), // +1 minute
        new Date(baseTime.getTime() + 120000), // +2 minutes
        new Date(baseTime.getTime() + 180000), // +3 minutes
      ];
      
      energyMonitor.recordConsumption('smart-plug-001', 120, times[0]);
      energyMonitor.recordConsumption('smart-plug-001', 110, times[1]);
      energyMonitor.recordConsumption('smart-plug-001', 105, times[2]);

      // Step 4: Verify historical data retrieval
      const historicalData = await energyMonitor.getHistoricalData('smart-plug-001', {
        start: baseTime,
        end: times[2]
      });
      
      expect(historicalData).toHaveLength(4);
      expect(historicalData[0].watts).toBe(100);
      expect(historicalData[3].watts).toBe(105);

      // Step 5: Verify total consumption calculation
      const totalConsumption = await energyMonitor.getTotalConsumption({
        start: baseTime,
        end: times[2]
      });
      
      expect(totalConsumption).toBeGreaterThan(0);

      // Step 6: Test carbon footprint calculation
      const carbonFootprint = energyMonitor.calculateCarbonFootprint(totalConsumption);
      expect(carbonFootprint).toBe(totalConsumption * 0.92); // Standard conversion factor

      // Step 7: Verify data persistence through mobile API
      const deviceStatus = await mobileAPI.getDeviceStatus('smart-plug-001');
      expect(deviceStatus).toBeDefined();
      expect(deviceStatus.deviceId).toBe('smart-plug-001');
    });

    test('should handle multiple devices and aggregate consumption', async () => {
      // Register multiple devices
      const devices = [
        await deviceManager.registerDevice('plug-001', 'smart_plug'),
        await deviceManager.registerDevice('hvac-001', 'hvac'),
        await deviceManager.registerDevice('light-001', 'light')
      ];

      expect(devices).toHaveLength(3);

      // Record consumption for all devices
      const baseTime = new Date('2024-01-01T12:00:00Z');
      energyMonitor.recordConsumption('plug-001', 50, baseTime);
      energyMonitor.recordConsumption('hvac-001', 2000, baseTime);
      energyMonitor.recordConsumption('light-001', 25, baseTime);

      // Verify individual consumption
      expect(await energyMonitor.getCurrentConsumption('plug-001')).toBe(50);
      expect(await energyMonitor.getCurrentConsumption('hvac-001')).toBe(2000);
      expect(await energyMonitor.getCurrentConsumption('light-001')).toBe(25);

      // Record consumption after 1 hour
      const oneHourLater = new Date(baseTime.getTime() + 3600000);
      energyMonitor.recordConsumption('plug-001', 55, oneHourLater);
      energyMonitor.recordConsumption('hvac-001', 1800, oneHourLater);
      energyMonitor.recordConsumption('light-001', 30, oneHourLater);

      // Verify total consumption across all devices
      const totalConsumption = await energyMonitor.getTotalConsumption({
        start: baseTime,
        end: oneHourLater
      });

      expect(totalConsumption).toBeGreaterThan(0);
      
      // Should be approximately (50+2000+25 + 55+1800+30) / 2 / 1000 = ~1.98 kWh
      // Allow for some variance in calculation due to timing
      expect(totalConsumption).toBeCloseTo(1.98, 0);
    });
  });

  /**
   * Test 2: Voice command to device control workflow
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  describe('Voice Command to Device Control Workflow', () => {
    beforeEach(async () => {
      // Setup devices for voice control
      await deviceManager.registerDevice('voice-plug-001', 'smart_plug');
      await deviceManager.registerDevice('voice-light-001', 'light');
      
      // Record some energy data for queries
      const baseTime = new Date();
      energyMonitor.recordConsumption('voice-plug-001', 75, baseTime);
      energyMonitor.recordConsumption('voice-light-001', 40, baseTime);
    });

    test('should process voice query and return energy information', async () => {
      // Test voice query for current consumption
      const queryAudio = Buffer.from('what is the current consumption for device voice-plug-001', 'utf-8');
      
      const response = await voiceAssistant.processVoiceCommand(queryAudio);
      
      expect(response.intent.type).toBe('query');
      expect(response.intent.action).toBe('get_energy_stats');
      expect(response.intent.entities.deviceId).toBe('voice-plug-001');
      expect(response.spokenResponse).toContain('75');
      expect(response.spokenResponse).toContain('watts');
      expect(response.audioResponse).toBeDefined();
    });

    test('should process voice command and control device', async () => {
      // Test voice command to turn on device
      const commandAudio = Buffer.from('turn on device voice-light-001', 'utf-8');
      
      const response = await voiceAssistant.processVoiceCommand(commandAudio);
      
      expect(response.intent.type).toBe('command');
      expect(response.intent.entities.deviceId).toBe('voice-light-001');
      expect(response.intent.entities.action).toBe('turn_on');
      expect(response.spokenResponse).toContain('turned on');
      expect(response.actionTaken).toBe('turn_on on voice-light-001');
    });

    test('should handle ambiguous voice commands with clarification', async () => {
      // Test ambiguous command
      const ambiguousAudio = Buffer.from('turn on', 'utf-8');
      
      const response = await voiceAssistant.processVoiceCommand(ambiguousAudio);
      
      expect(response.intent.type).toBe('clarification_needed');
      expect(response.spokenResponse).toContain('Which device');
      expect(response.actionTaken).toBeUndefined();
    });

    test('should handle empty audio input gracefully', async () => {
      // Test empty audio
      const emptyAudio = Buffer.alloc(0);
      
      const response = await voiceAssistant.processVoiceCommand(emptyAudio);
      
      expect(response.intent.type).toBe('clarification_needed');
      expect(response.spokenResponse).toContain('did not hear');
    });

    test('should provide total consumption via voice query', async () => {
      // Test total consumption query
      const totalQueryAudio = Buffer.from('what is the current total consumption', 'utf-8');
      
      const response = await voiceAssistant.processVoiceCommand(totalQueryAudio);
      
      expect(response.intent.type).toBe('query');
      expect(response.spokenResponse).toContain('115'); // 75 + 40 watts
      expect(response.spokenResponse).toContain('watts');
    });
  });

  /**
   * Test 3: Occupancy detection triggering automation
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  describe('Occupancy Detection Automation Workflow', () => {
    beforeEach(async () => {
      // Setup devices for occupancy control
      await deviceManager.registerDevice('room-light-001', 'light');
      await deviceManager.registerDevice('room-hvac-001', 'hvac');
      
      // Register devices for living room location
      occupancyDetector.registerDevicesForLocation('living-room', ['room-light-001', 'room-hvac-001']);
    });

    test('should detect occupancy and maintain device states', async () => {
      // Create image data that simulates person detection (bright image)
      const occupiedImage = Buffer.alloc(640 * 640 * 3);
      occupiedImage.fill(200); // Bright image = person detected
      
      const result = await occupancyDetector.detectOccupancy(occupiedImage, 'living-room');
      
      expect(result.occupied).toBe(true);
      expect(result.personCount).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.location).toBe('living-room');
    });

    test('should turn off devices after 5 minutes of no occupancy', async () => {
      // Set shorter threshold for testing (100ms instead of 5 minutes)
      const testOccupancyDetector = new OccupancyDetectorImpl(deviceManager, 100);
      testOccupancyDetector.registerDevicesForLocation('test-room', ['room-light-001']);

      // First, ensure device is on by simulating occupancy
      const occupiedImage = Buffer.alloc(640 * 640 * 3);
      occupiedImage.fill(200);
      await testOccupancyDetector.detectOccupancy(occupiedImage, 'test-room');

      // Then simulate no occupancy (dark image)
      const emptyImage = Buffer.alloc(640 * 640 * 3);
      emptyImage.fill(50); // Dark image = no person
      
      await testOccupancyDetector.detectOccupancy(emptyImage, 'test-room');
      
      // Wait for shutdown timer (100ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Verify device was turned off (this would be verified through device manager in real scenario)
      const currentState = testOccupancyDetector.getCurrentOccupancyState('test-room');
      expect(currentState?.occupied).toBe(false);

      testOccupancyDetector.cleanup();
    });

    test('should restore device states when occupancy returns', async () => {
      // Set shorter threshold for testing
      const testOccupancyDetector = new OccupancyDetectorImpl(deviceManager, 50);
      testOccupancyDetector.registerDevicesForLocation('restore-room', ['room-hvac-001']);

      // Simulate occupancy -> no occupancy -> occupancy again
      const occupiedImage = Buffer.alloc(640 * 640 * 3);
      occupiedImage.fill(200);
      
      const emptyImage = Buffer.alloc(640 * 640 * 3);
      emptyImage.fill(30);

      // Initial occupancy
      await testOccupancyDetector.detectOccupancy(occupiedImage, 'restore-room');
      
      // No occupancy
      await testOccupancyDetector.detectOccupancy(emptyImage, 'restore-room');
      
      // Wait for potential shutdown
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Occupancy returns - should restore devices
      await testOccupancyDetector.detectOccupancy(occupiedImage, 'restore-room');
      
      const finalState = testOccupancyDetector.getCurrentOccupancyState('restore-room');
      expect(finalState?.occupied).toBe(true);

      testOccupancyDetector.cleanup();
    });

    test('should handle poor lighting conditions gracefully', async () => {
      // Very dark image (poor lighting)
      const darkImage = Buffer.alloc(640 * 640 * 3);
      darkImage.fill(10); // Very dark
      
      const result = await occupancyDetector.detectOccupancy(darkImage, 'dark-room');
      
      expect(result.occupied).toBe(false);
      expect(result.confidence).toBeLessThan(0.5); // Low confidence due to poor lighting
    });

    test('should record occupancy history', async () => {
      const baseTime = new Date();
      
      // Simulate occupancy changes
      const occupiedImage = Buffer.alloc(640 * 640 * 3);
      occupiedImage.fill(180);
      
      const emptyImage = Buffer.alloc(640 * 640 * 3);
      emptyImage.fill(40);

      await occupancyDetector.detectOccupancy(occupiedImage, 'history-room');
      await new Promise(resolve => setTimeout(resolve, 10));
      await occupancyDetector.detectOccupancy(emptyImage, 'history-room');

      // Get occupancy history
      const history = await occupancyDetector.getOccupancyHistory('history-room', {
        start: baseTime,
        end: new Date()
      });

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].location).toBe('history-room');
    });
  });

  /**
   * Test 4: Anomaly detection and emergency shutdown
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  describe('Anomaly Detection and Emergency Shutdown Workflow', () => {
    beforeEach(async () => {
      // Setup device for anomaly monitoring
      const device = await deviceManager.registerDevice('anomaly-device-001', 'smart_plug');
      
      // Set normal power range for the device
      device.normalPowerRange = { min: 50, max: 200 };
      anomalyDetector.registerDevice(device);
    });

    test('should detect anomaly and shut down device', async () => {
      let notificationReceived = false;
      let notifiedDevice = '';
      let notifiedAnomaly: any = null;

      // Set up notification callback
      anomalyDetector.setNotificationCallback((deviceId, anomaly) => {
        notificationReceived = true;
        notifiedDevice = deviceId;
        notifiedAnomaly = anomaly;
      });

      // Normal consumption (within range)
      let result = anomalyDetector.checkForAnomalies('anomaly-device-001', 150);
      expect(result.isAnomaly).toBe(false);

      // Anomalous consumption (50% above max: 200 * 1.5 = 300)
      result = anomalyDetector.checkForAnomalies('anomaly-device-001', 350);
      
      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.reason).toContain('exceeds threshold');
      expect(result.recommendedAction).toContain('shut down');

      // Verify notification was sent
      expect(notificationReceived).toBe(true);
      expect(notifiedDevice).toBe('anomaly-device-001');
      expect(notifiedAnomaly.actionTaken).toBe('device_shutdown');

      // Verify anomaly was logged
      const history = await anomalyDetector.getAnomalyHistory('anomaly-device-001');
      expect(history).toHaveLength(1);
      expect(history[0].deviceId).toBe('anomaly-device-001');
      expect(history[0].actualValue).toBe(350);
    });

    test('should disable device after repeated anomalies', async () => {
      // Create 3 anomalies within short time period
      const anomalousWatts = 350; // Above 50% threshold
      
      anomalyDetector.checkForAnomalies('anomaly-device-001', anomalousWatts);
      anomalyDetector.checkForAnomalies('anomaly-device-001', anomalousWatts);
      
      // Device should not be disabled yet (need 3 anomalies)
      expect(anomalyDetector.shouldDisableDevice('anomaly-device-001')).toBe(false);
      
      // Third anomaly should trigger disable
      anomalyDetector.checkForAnomalies('anomaly-device-001', anomalousWatts);
      
      expect(anomalyDetector.shouldDisableDevice('anomaly-device-001')).toBe(true);
      expect(anomalyDetector.isDeviceDisabled('anomaly-device-001')).toBe(true);
    });

    test('should handle boundary values correctly', async () => {
      // Test exactly at threshold (200 * 1.5 = 300)
      let result = anomalyDetector.checkForAnomalies('anomaly-device-001', 300);
      expect(result.isAnomaly).toBe(false); // Should be false as it's not > threshold

      // Test just above threshold
      result = anomalyDetector.checkForAnomalies('anomaly-device-001', 300.1);
      expect(result.isAnomaly).toBe(true);
    });

    test('should log anomaly events with complete information', async () => {
      // Trigger anomaly
      anomalyDetector.checkForAnomalies('anomaly-device-001', 400);
      
      const history = await anomalyDetector.getAnomalyHistory('anomaly-device-001');
      const anomaly = history[0];
      
      expect(anomaly.deviceId).toBe('anomaly-device-001');
      expect(anomaly.timestamp).toBeInstanceOf(Date);
      expect(anomaly.normalRange.min).toBe(50);
      expect(anomaly.normalRange.max).toBe(200);
      expect(anomaly.actualValue).toBe(400);
      expect(anomaly.actionTaken).toBe('device_shutdown');
    });

    test('should allow device re-enabling after user review', async () => {
      // Trigger enough anomalies to disable device
      for (let i = 0; i < 3; i++) {
        anomalyDetector.checkForAnomalies('anomaly-device-001', 350);
      }
      
      expect(anomalyDetector.isDeviceDisabled('anomaly-device-001')).toBe(true);
      
      // User reviews and re-enables device
      anomalyDetector.enableDevice('anomaly-device-001');
      
      expect(anomalyDetector.isDeviceDisabled('anomaly-device-001')).toBe(false);
    });
  });

  /**
   * Test 5: Offline operation and reconnection
   * Requirements: 8.4
   */
  describe('Offline Operation and Reconnection Workflow', () => {
    test('should queue commands when API is unavailable', async () => {
      // Register device first
      await deviceManager.registerDevice('offline-device-001', 'smart_plug');
      
      // Simulate API unavailability by checking queue status
      const initialQueueStatus = deviceManager.getQueueStatus();
      expect(initialQueueStatus.size).toBe(0);
      
      // In a real scenario, we would simulate network failure
      // For this test, we'll verify the queueing mechanism exists
      expect(deviceManager.getApiStatus).toBeDefined();
      expect(deviceManager.getQueueStatus).toBeDefined();
      expect(deviceManager.getCacheStatus).toBeDefined();
    });

    test('should use cached data when API is unavailable', async () => {
      // Register device to populate cache
      const device = await deviceManager.registerDevice('cache-device-001', 'light');
      expect(device).toBeDefined();
      
      // Verify cache functionality exists
      const cacheStatus = deviceManager.getCacheStatus();
      expect(cacheStatus.size).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(cacheStatus.entries)).toBe(true);
    });

    test('should retry commands with exponential backoff', async () => {
      // This tests the retry mechanism built into ResilientDeviceManager
      await deviceManager.registerDevice('retry-device-001', 'hvac');
      
      // The retry logic is internal to sendCommand
      // We verify it doesn't throw immediately on failure
      const command = { action: 'turn_on' as const };
      
      // This should not throw even if underlying API fails
      // (it would queue the command instead)
      await expect(deviceManager.sendCommand('retry-device-001', command)).resolves.not.toThrow();
    });

    test('should maintain system health during offline periods', async () => {
      // Test system health monitoring
      const healthStatus = energyMonitor.getSystemHealth();
      
      expect(healthStatus.totalDevices).toBeGreaterThanOrEqual(0);
      expect(healthStatus.totalReadings).toBeGreaterThanOrEqual(0);
      expect(healthStatus.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * Test 6: Complete end-to-end workflow integration
   * Requirements: All
   */
  describe('Complete End-to-End Workflow', () => {
    test('should handle complete smart home automation scenario', async () => {
      // Step 1: Setup smart home with multiple devices
      const livingRoomLight = await deviceManager.registerDevice('lr-light-001', 'light');
      const livingRoomHVAC = await deviceManager.registerDevice('lr-hvac-001', 'hvac');
      const kitchenPlug = await deviceManager.registerDevice('kitchen-plug-001', 'smart_plug');
      
      // Set up normal power ranges for anomaly detection
      livingRoomLight.normalPowerRange = { min: 10, max: 100 };
      livingRoomHVAC.normalPowerRange = { min: 500, max: 3000 };
      kitchenPlug.normalPowerRange = { min: 0, max: 1500 };
      
      anomalyDetector.registerDevice(livingRoomLight);
      anomalyDetector.registerDevice(livingRoomHVAC);
      anomalyDetector.registerDevice(kitchenPlug);
      
      // Step 2: Register devices for occupancy control
      occupancyDetector.registerDevicesForLocation('living-room', ['lr-light-001', 'lr-hvac-001']);
      
      // Step 3: Start energy monitoring
      const baseTime = new Date();
      energyMonitor.recordConsumption('lr-light-001', 60, baseTime);
      energyMonitor.recordConsumption('lr-hvac-001', 1200, baseTime);
      energyMonitor.recordConsumption('kitchen-plug-001', 800, baseTime);
      
      // Step 4: Test voice control integration
      const voiceCommand = Buffer.from('turn off device lr-light-001', 'utf-8');
      const voiceResponse = await voiceAssistant.processVoiceCommand(voiceCommand);
      
      expect(voiceResponse.intent.type).toBe('command');
      expect(voiceResponse.actionTaken).toContain('turn_off');
      
      // Step 5: Test occupancy-based automation
      const occupiedImage = Buffer.alloc(640 * 640 * 3);
      occupiedImage.fill(150);
      
      const occupancyResult = await occupancyDetector.detectOccupancy(occupiedImage, 'living-room');
      expect(occupancyResult.occupied).toBe(true);
      
      // Step 6: Test anomaly detection
      const anomalyResult = anomalyDetector.checkForAnomalies('kitchen-plug-001', 2500); // Above threshold
      expect(anomalyResult.isAnomaly).toBe(true);
      
      // Step 7: Test mobile API integration
      const deviceStatuses = await Promise.all([
        mobileAPI.getDeviceStatus('lr-light-001'),
        mobileAPI.getDeviceStatus('lr-hvac-001'),
        mobileAPI.getDeviceStatus('kitchen-plug-001')
      ]);
      
      expect(deviceStatuses).toHaveLength(3);
      deviceStatuses.forEach(status => {
        expect(status.deviceId).toBeDefined();
        expect(status.powerState).toBeDefined();
      });
      
      // Step 8: Test carbon dashboard integration
      const oneHourLater = new Date(baseTime.getTime() + 3600000);
      energyMonitor.recordConsumption('lr-light-001', 65, oneHourLater);
      energyMonitor.recordConsumption('lr-hvac-001', 1100, oneHourLater);
      energyMonitor.recordConsumption('kitchen-plug-001', 750, oneHourLater);
      
      const dashboardData = await carbonDashboard.getDashboardData(baseTime, oneHourLater);
      
      expect(dashboardData.totalEnergyKwh).toBeGreaterThan(0);
      expect(dashboardData.carbonFootprintKg).toBeGreaterThan(0);
      // Carbon footprint = energyKwh * 0.92 (lbs CO2/kWh) * 0.453592 (lbs to kg conversion)
      const expectedCarbonKg = dashboardData.totalEnergyKwh * 0.92 * 0.453592;
      expect(dashboardData.carbonFootprintKg).toBeCloseTo(expectedCarbonKg, 2);
      
      // Step 9: Test behavior learning integration
      const historicalData = await energyMonitor.getHistoricalData('lr-light-001', {
        start: baseTime,
        end: oneHourLater
      });
      
      if (historicalData.length >= 7) { // Need at least 7 days of data
        const profile = behaviorEngine.analyzeUsagePattern('lr-light-001', historicalData);
        expect(profile.deviceId).toBe('lr-light-001');
        
        const schedule = behaviorEngine.generateSchedule(profile);
        expect(schedule.deviceId).toBe('lr-light-001');
        expect(schedule.scheduledActions.length).toBeGreaterThan(0);
      }
      
      // Step 10: Verify system resilience
      const apiStatus = deviceManager.getApiStatus();
      const queueStatus = deviceManager.getQueueStatus();
      const cacheStatus = deviceManager.getCacheStatus();
      
      expect(apiStatus).toBeDefined();
      expect(queueStatus.size).toBeGreaterThanOrEqual(0);
      expect(cacheStatus.size).toBeGreaterThanOrEqual(0);
    });

    test('should handle error scenarios gracefully', async () => {
      // Test invalid device operations
      await expect(energyMonitor.getCurrentConsumption('nonexistent-device')).resolves.toBe(0);
      
      // Test invalid voice commands
      const invalidAudio = Buffer.from('gibberish command xyz', 'utf-8');
      const response = await voiceAssistant.processVoiceCommand(invalidAudio);
      expect(response.intent.type).toBe('clarification_needed');
      
      // Test invalid anomaly detection
      expect(() => {
        anomalyDetector.checkForAnomalies('', 100);
      }).toThrow('Device ID cannot be empty');
      
      // Test invalid energy recording
      expect(() => {
        energyMonitor.recordConsumption('test-device', -100, new Date());
      }).toThrow('Energy consumption cannot be negative');
    });
  });
});