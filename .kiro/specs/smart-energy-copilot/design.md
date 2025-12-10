# Design Document: Smart Energy Copilot

## Overview

The Smart Energy Copilot is a distributed AI-powered system that combines edge computing, cloud services, and IoT device management to optimize energy consumption. The architecture follows a three-tier model:

1. **Edge Tier**: Tuya T5AI-CORE kit and Raspberry Pi 4 running local AI inference for occupancy detection and voice processing
2. **Cloud Tier**: AWS-based services for data storage, advanced analytics, and model training
3. **Device Tier**: Tuya IoT ecosystem devices (smart plugs, sensors, cameras) providing real-time energy monitoring and control

The system employs machine learning to learn user behavior patterns and generate adaptive schedules, while maintaining low latency through edge processing and ensuring privacy by keeping sensitive data (images, voice) local.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloud Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Tuya Cloud   │  │ Data Storage │  │ ML Training     │  │
│  │ API          │  │ (Time Series)│  │ Service         │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ HTTPS/MQTT
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Edge Layer                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tuya T5AI-CORE / Raspberry Pi 4                     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │  │
│  │  │ Occupancy  │  │ Voice      │  │ Schedule       │ │  │
│  │  │ Detection  │  │ Processing │  │ Engine         │ │  │
│  │  │ (CV Model) │  │ (ASR/NLU)  │  │                │ │  │
│  │  └────────────┘  └────────────┘  └────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ Local Data Cache & Command Queue              │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Zigbee/WiFi
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Device Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Smart    │  │ Energy   │  │ Camera   │  │ HVAC      │  │
│  │ Plugs    │  │ Sensors  │  │ (OV5647) │  │ Controls  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Communication Patterns

- **Device → Edge**: Real-time telemetry via MQTT (100ms intervals for energy data)
- **Edge → Cloud**: Aggregated metrics and events via HTTPS (60s intervals)
- **Cloud → Edge**: Schedule updates and model deployments via MQTT
- **User → System**: Mobile app (HTTPS REST API) and voice (local processing)

## Components and Interfaces

### 1. Device Manager

**Responsibility**: Manages registration, discovery, and communication with Tuya IoT devices.

**Interfaces**:
```typescript
interface DeviceManager {
  registerDevice(deviceId: string, deviceType: DeviceType): Promise<Device>;
  discoverDevices(): Promise<Device[]>;
  getDeviceStatus(deviceId: string): Promise<DeviceStatus>;
  sendCommand(deviceId: string, command: DeviceCommand): Promise<void>;
  subscribeToTelemetry(deviceId: string, callback: TelemetryCallback): void;
}

interface Device {
  id: string;
  type: DeviceType;
  name: string;
  capabilities: string[];
  location: string;
}

interface DeviceCommand {
  action: 'turn_on' | 'turn_off' | 'set_value';
  parameters?: Record<string, any>;
}
```

### 2. Energy Monitor

**Responsibility**: Collects, aggregates, and persists energy consumption data.

**Interfaces**:
```typescript
interface EnergyMonitor {
  recordConsumption(deviceId: string, watts: number, timestamp: Date): void;
  getCurrentConsumption(deviceId: string): Promise<number>;
  getHistoricalData(deviceId: string, range: TimeRange): Promise<EnergyData[]>;
  getTotalConsumption(range: TimeRange): Promise<number>;
  calculateCarbonFootprint(energyKwh: number): number;
}

interface EnergyData {
  deviceId: string;
  timestamp: Date;
  watts: number;
  cumulativeKwh: number;
}

interface TimeRange {
  start: Date;
  end: Date;
}
```

### 3. Behavior Learning Engine

**Responsibility**: Analyzes usage patterns and generates adaptive schedules.

**Interfaces**:
```typescript
interface BehaviorLearningEngine {
  analyzeUsagePattern(deviceId: string, historicalData: EnergyData[]): EnergyProfile;
  generateSchedule(profile: EnergyProfile): AdaptiveSchedule;
  updateSchedule(deviceId: string, userOverride: ScheduleOverride): void;
  predictPeakUsage(date: Date): PeakUsagePrediction;
}

interface EnergyProfile {
  deviceId: string;
  typicalOnTimes: TimeWindow[];
  typicalOffTimes: TimeWindow[];
  averageConsumption: number;
  usageVariability: number;
}

interface AdaptiveSchedule {
  deviceId: string;
  scheduledActions: ScheduledAction[];
  confidence: number;
  lastUpdated: Date;
}

interface ScheduledAction {
  time: string; // HH:MM format
  action: 'turn_on' | 'turn_off';
  daysOfWeek: number[]; // 0-6
}
```

### 4. Occupancy Detector

**Responsibility**: Processes camera images to detect human presence using computer vision.

**Interfaces**:
```typescript
interface OccupancyDetector {
  detectOccupancy(imageData: Buffer, location: string): Promise<OccupancyResult>;
  startMonitoring(cameraId: string, location: string): void;
  stopMonitoring(cameraId: string): void;
  getOccupancyHistory(location: string, range: TimeRange): Promise<OccupancyEvent[]>;
}

interface OccupancyResult {
  location: string;
  occupied: boolean;
  confidence: number;
  timestamp: Date;
  personCount: number;
}

interface OccupancyEvent {
  location: string;
  occupied: boolean;
  timestamp: Date;
  duration: number; // seconds
}
```

### 5. Voice Assistant

**Responsibility**: Processes voice commands and generates spoken responses.

**Interfaces**:
```typescript
interface VoiceAssistant {
  processVoiceCommand(audioData: Buffer): Promise<VoiceResponse>;
  synthesizeSpeech(text: string): Promise<Buffer>;
  extractIntent(transcript: string): Intent;
}

interface VoiceResponse {
  intent: Intent;
  spokenResponse: string;
  audioResponse: Buffer;
  actionTaken?: string;
}

interface Intent {
  type: 'query' | 'command' | 'clarification_needed';
  action?: string;
  entities: Record<string, any>;
  confidence: number;
}
```

### 6. Anomaly Detector

**Responsibility**: Monitors device behavior for unusual patterns indicating safety issues.

**Interfaces**:
```typescript
interface AnomalyDetector {
  checkForAnomalies(deviceId: string, currentWatts: number): AnomalyResult;
  recordAnomaly(anomaly: AnomalyEvent): void;
  getAnomalyHistory(deviceId: string): Promise<AnomalyEvent[]>;
  shouldDisableDevice(deviceId: string): boolean;
}

interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  reason?: string;
  recommendedAction?: string;
}

interface AnomalyEvent {
  deviceId: string;
  timestamp: Date;
  normalRange: { min: number; max: number };
  actualValue: number;
  actionTaken: string;
}
```

### 7. Schedule Executor

**Responsibility**: Executes scheduled device actions and handles user overrides.

**Interfaces**:
```typescript
interface ScheduleExecutor {
  executeSchedule(schedule: AdaptiveSchedule): void;
  handleOverride(deviceId: string, override: ScheduleOverride): void;
  pauseSchedule(deviceId: string): void;
  resumeSchedule(deviceId: string): void;
}

interface ScheduleOverride {
  deviceId: string;
  action: DeviceCommand;
  timestamp: Date;
  reason: 'manual' | 'occupancy' | 'anomaly';
}
```

## Data Models

### Device Model
```typescript
type DeviceType = 'smart_plug' | 'energy_sensor' | 'camera' | 'hvac' | 'light';

interface Device {
  id: string;
  type: DeviceType;
  name: string;
  location: string;
  capabilities: string[];
  normalPowerRange: { min: number; max: number };
  isOnline: boolean;
  lastSeen: Date;
}
```

### Energy Consumption Model
```typescript
interface EnergyReading {
  id: string;
  deviceId: string;
  timestamp: Date;
  watts: number;
  voltage?: number;
  current?: number;
}

interface AggregatedEnergy {
  deviceId: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startTime: Date;
  endTime: Date;
  totalKwh: number;
  averageWatts: number;
  peakWatts: number;
  carbonKg: number;
}
```

### Schedule Model
```typescript
interface Schedule {
  id: string;
  deviceId: string;
  enabled: boolean;
  actions: ScheduledAction[];
  createdAt: Date;
  updatedAt: Date;
  confidence: number;
}
```

### User Preferences Model
```typescript
interface UserPreferences {
  userId: string;
  enableAdaptiveScheduling: boolean;
  enableOccupancyControl: boolean;
  enableVoiceControl: boolean;
  enableAnomalyDetection: boolean;
  notificationSettings: {
    anomalies: boolean;
    energySavings: boolean;
    scheduleChanges: boolean;
  };
  privacySettings: {
    storeImages: boolean;
    storeVoiceRecordings: boolean;
  };
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to avoid redundancy:

- Properties 1.3 and 1.4 both test data retrieval correctness and can be combined into a single comprehensive property about consumption data accuracy
- Properties 6.1 and 6.2 both relate to anomaly handling and can be combined into one property about anomaly detection and response
- Properties 7.1 and 7.3 both test data display and can be combined into a property about UI data completeness

The following properties represent the unique, non-redundant correctness guarantees:

### Property 1: Device registration completeness
*For any* Tuya device that is connected to the system, the device should appear in the registered device list and have energy tracking initialized.
**Validates: Requirements 1.1**

### Property 2: Consumption data accuracy
*For any* registered device with recorded energy consumption, querying that device should return the correct consumption value in kilowatt-hours, and aggregating multiple devices should return the correct sum.
**Validates: Requirements 1.3, 1.4**

### Property 3: Profile-to-schedule generation
*For any* valid energy profile, the system should generate an adaptive schedule with at least one scheduled action.
**Validates: Requirements 2.2**

### Property 4: Schedule execution correctness
*For any* adaptive schedule with a scheduled action at a specific time, when that time is reached, the associated device should be controlled according to the scheduled action.
**Validates: Requirements 2.3**

### Property 5: Override learning
*For any* device with an adaptive schedule, when a user override occurs, the next schedule update should incorporate the override pattern.
**Validates: Requirements 2.5**

### Property 6: Voice query response completeness
*For any* valid voice query requesting energy statistics, the system's response should contain the requested consumption information.
**Validates: Requirements 3.2**

### Property 7: Voice command execution
*For any* valid voice command requesting device control, the system should execute the command on the target device and provide verbal confirmation.
**Validates: Requirements 3.3**

### Property 8: Voice error handling
*For any* malformed or ambiguous voice command, the system should request clarification rather than executing an incorrect action.
**Validates: Requirements 3.4**

### Property 9: Occupancy-based device control
*For any* location with no detected occupancy for 5 consecutive minutes, all designated devices in that location should be turned off.
**Validates: Requirements 4.2**

### Property 10: Occupancy state restoration
*For any* device that was turned off due to absence, when occupancy is detected again, the device should be restored to its previous state (round-trip property).
**Validates: Requirements 4.3**

### Property 11: Carbon calculation accuracy
*For any* energy consumption value in kilowatt-hours, the calculated carbon emissions should equal the consumption multiplied by the standard conversion factor (0.92 lbs CO2/kWh).
**Validates: Requirements 5.1**

### Property 12: Dashboard data completeness
*For any* time period selected in the carbon dashboard, the display should include total energy consumed, energy saved, and carbon footprint metrics.
**Validates: Requirements 5.2**

### Property 13: Percentage change calculation
*For any* two time periods with recorded consumption data, the displayed percentage change should equal ((period2 - period1) / period1) * 100.
**Validates: Requirements 5.3**

### Property 14: Anomaly detection and response
*For any* device with a defined normal power range, when consumption exceeds the maximum by 50%, the system should classify it as an anomaly and immediately shut down the device.
**Validates: Requirements 6.1, 6.2**

### Property 15: Repeated anomaly handling
*For any* device that experiences 3 anomaly events within a 24-hour period, automatic control for that device should be disabled.
**Validates: Requirements 6.4**

### Property 16: Anomaly logging completeness
*For any* anomaly event, the system log should contain the timestamp, device identifier, and consumption values.
**Validates: Requirements 6.5**

### Property 17: Device status display
*For any* set of registered devices, opening the mobile application should display the current status of all devices in the set.
**Validates: Requirements 7.1**

### Property 18: Historical data retrieval
*For any* valid time range, requesting historical data should return energy consumption records for all devices active during that period.
**Validates: Requirements 7.3**

### Property 19: Schedule toggle responsiveness
*For any* device with an adaptive schedule, enabling or disabling the schedule should immediately change whether scheduled actions are executed.
**Validates: Requirements 7.4**

### Property 20: Data synchronization consistency
*For any* data change made in the mobile app, the change should be reflected in subsequent app sessions (round-trip property).
**Validates: Requirements 7.5**

### Property 21: Command routing correctness
*For any* device control command, the system should send the command through the Tuya Cloud API.
**Validates: Requirements 8.3**

### Property 22: Command queueing resilience
*For any* device command issued when the Tuya Cloud API is unavailable, the command should be queued locally and successfully transmitted when the API becomes available.
**Validates: Requirements 8.4**

## Error Handling

### Error Categories

1. **Device Communication Errors**
   - Timeout when communicating with Tuya devices
   - Device offline or unreachable
   - Invalid device responses
   - **Handling**: Retry with exponential backoff (3 attempts), mark device as offline, notify user

2. **Cloud API Errors**
   - Authentication failures
   - API rate limiting
   - Network connectivity issues
   - **Handling**: Queue commands locally, retry with backoff, use cached data when available

3. **AI Inference Errors**
   - Model loading failures
   - Insufficient edge hardware resources
   - Invalid input data (corrupted images/audio)
   - **Handling**: Fallback to cloud inference, use last known state, log error for debugging

4. **Data Validation Errors**
   - Invalid energy readings (negative values, extreme outliers)
   - Malformed schedule data
   - Corrupted user preferences
   - **Handling**: Reject invalid data, use default values, alert user to configuration issues

5. **Anomaly Detection Errors**
   - False positives from anomaly detection
   - Device shutdown failures
   - **Handling**: Allow user to whitelist devices, implement cooldown period before re-enabling

### Error Recovery Strategies

- **Graceful Degradation**: System continues operating with reduced functionality when components fail
- **Local Caching**: Edge device maintains 24-hour cache of critical data for offline operation
- **User Notifications**: Critical errors trigger push notifications with actionable guidance
- **Automatic Retry**: Transient failures trigger automatic retry with exponential backoff
- **Manual Override**: Users can always manually control devices regardless of system state

## Testing Strategy

### Dual Testing Approach

The Smart Energy Copilot will employ both unit testing and property-based testing to ensure comprehensive correctness validation:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

### Unit Testing

Unit tests will cover:

1. **Component Integration Points**
   - Device Manager integration with Tuya Cloud API
   - Energy Monitor data persistence layer
   - Voice Assistant integration with edge AI models

2. **Specific Edge Cases**
   - Empty device lists
   - Zero energy consumption
   - Boundary values for anomaly thresholds
   - Poor lighting conditions for occupancy detection
   - Edge hardware resource exhaustion

3. **Error Conditions**
   - Network failures during device communication
   - Invalid API responses
   - Corrupted configuration data
   - Model loading failures

**Testing Framework**: Jest for TypeScript/JavaScript components, pytest for Python AI components

### Property-Based Testing

Property-based testing will validate the 22 correctness properties defined above. Each property will be implemented as a property-based test using the following approach:

**Testing Framework**: fast-check for TypeScript/JavaScript, Hypothesis for Python

**Configuration**: Each property-based test will run a minimum of 100 iterations to ensure statistical confidence in correctness.

**Test Tagging**: Each property-based test will include a comment explicitly referencing the correctness property:
```typescript
// Feature: smart-energy-copilot, Property 1: Device registration completeness
```

**Implementation Guidelines**:
- Each correctness property maps to exactly ONE property-based test
- Tests will generate random valid inputs (devices, consumption values, schedules, etc.)
- Tests will verify the property holds across all generated inputs
- Tests will be placed close to implementation to catch errors early

**Example Property Test Structure**:
```typescript
// Feature: smart-energy-copilot, Property 2: Consumption data accuracy
test('consumption data accuracy across random devices', () => {
  fc.assert(
    fc.property(
      fc.array(deviceGenerator(), { minLength: 1, maxLength: 20 }),
      fc.array(consumptionGenerator(), { minLength: 1 }),
      (devices, consumptions) => {
        // Setup: register devices and record consumption
        devices.forEach(d => deviceManager.registerDevice(d));
        consumptions.forEach(c => energyMonitor.recordConsumption(c));
        
        // Test: query individual devices and aggregate
        const individualSum = devices
          .map(d => energyMonitor.getCurrentConsumption(d.id))
          .reduce((a, b) => a + b, 0);
        const aggregateTotal = energyMonitor.getTotalConsumption();
        
        // Verify: individual sum equals aggregate
        expect(Math.abs(individualSum - aggregateTotal)).toBeLessThan(0.001);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will validate end-to-end workflows:
- Complete device registration and energy monitoring flow
- Voice command processing from audio input to device control
- Occupancy detection triggering device automation
- Anomaly detection and emergency shutdown sequence

### Performance Testing

Performance tests will validate timing requirements:
- Energy data update latency (< 5 seconds)
- Voice command processing time (< 2 seconds)
- Occupancy detection inference time (< 3 seconds)
- Edge inference completion (< 500ms for 95% of requests)

## Implementation Notes

### Technology Stack

**Edge Computing**:
- Tuya T5AI-CORE kit or Raspberry Pi 4 (ARM64)
- TensorFlow Lite for edge AI inference
- Node.js runtime for application logic
- MQTT client for device communication

**Cloud Services**:
- AWS IoT Core for device management
- AWS Timestream for time-series energy data
- AWS Lambda for serverless compute
- AWS S3 for model storage

**AI Models**:
- YOLOv5-nano for occupancy detection (optimized for edge)
- Whisper-tiny for speech recognition
- Custom LSTM model for behavior learning

**Mobile App**:
- React Native for cross-platform development
- Tuya Smart Life SDK for device integration

### Security Considerations

1. **Data Privacy**: Images and voice recordings processed locally, never sent to cloud
2. **Authentication**: OAuth 2.0 for Tuya Cloud API, JWT for mobile app
3. **Encryption**: TLS 1.3 for all network communication, AES-256 for local storage
4. **Access Control**: Role-based permissions for device control and data access

### Scalability Considerations

1. **Device Limits**: System designed to handle up to 50 devices per household
2. **Data Retention**: 90 days of granular data, 2 years of aggregated data
3. **Edge Processing**: Batch inference for multiple cameras to optimize resource usage
4. **Cloud Offloading**: Automatic fallback to cloud when edge resources exceed 80% utilization

### Deployment Strategy

1. **Phase 1**: Core energy monitoring and device control (Requirements 1, 7, 8)
2. **Phase 2**: Adaptive scheduling and behavior learning (Requirement 2)
3. **Phase 3**: Voice control and occupancy detection (Requirements 3, 4)
4. **Phase 4**: Anomaly detection and carbon tracking (Requirements 5, 6)
5. **Phase 5**: Edge AI optimization (Requirement 9)
