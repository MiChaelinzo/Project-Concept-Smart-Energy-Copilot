# Smart Energy Copilot - Project Structure

## Overview
This document describes the complete project structure created for the Smart Energy Copilot system.

## Directory Structure

```
smart-energy-copilot/
├── src/
│   ├── edge/                           # Edge computing components
│   │   ├── interfaces/                 # Core interface definitions
│   │   │   ├── AnomalyDetector.ts      # Anomaly detection interface
│   │   │   ├── BehaviorLearningEngine.ts # Behavior learning interface
│   │   │   ├── DeviceManager.ts        # Device management interface
│   │   │   ├── DeviceManager.test.ts   # Sample test file
│   │   │   ├── EnergyMonitor.ts        # Energy monitoring interface
│   │   │   ├── OccupancyDetector.ts    # Occupancy detection interface
│   │   │   ├── ScheduleExecutor.ts     # Schedule execution interface
│   │   │   ├── VoiceAssistant.ts       # Voice assistant interface
│   │   │   └── index.ts                # Barrel export
│   │   └── types.ts                    # Edge type definitions
│   │
│   ├── cloud/                          # Cloud service components
│   │   ├── interfaces/
│   │   │   ├── DataStorage.ts          # Data storage interface
│   │   │   └── index.ts                # Barrel export
│   │   └── types.ts                    # Cloud type definitions
│   │
│   ├── mobile/                         # Mobile app components
│   │   ├── interfaces/
│   │   │   ├── MobileAPI.ts            # Mobile API interface
│   │   │   └── index.ts                # Barrel export
│   │   └── types.ts                    # Mobile type definitions
│   │
│   └── index.ts                        # Main entry point
│
├── dist/                               # Compiled TypeScript output
│   ├── edge/
│   ├── cloud/
│   ├── mobile/
│   └── index.js
│
├── node_modules/                       # Dependencies
│
├── .kiro/                              # Kiro spec files
│   └── specs/
│       └── smart-energy-copilot/
│           ├── requirements.md
│           ├── design.md
│           ├── tasks.md
│           └── PROJECT_STRUCTURE.md (this file)
│
├── jest.config.js                      # Jest configuration
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Project dependencies
├── package-lock.json                   # Locked dependencies
├── README.md                           # Project documentation
└── LICENSE                             # MIT License
```

## Core Interfaces

### Edge Components

1. **DeviceManager** (`src/edge/interfaces/DeviceManager.ts`)
   - Manages registration, discovery, and communication with Tuya IoT devices
   - Methods: registerDevice, discoverDevices, getDeviceStatus, sendCommand, subscribeToTelemetry

2. **EnergyMonitor** (`src/edge/interfaces/EnergyMonitor.ts`)
   - Collects, aggregates, and persists energy consumption data
   - Methods: recordConsumption, getCurrentConsumption, getHistoricalData, getTotalConsumption, calculateCarbonFootprint

3. **BehaviorLearningEngine** (`src/edge/interfaces/BehaviorLearningEngine.ts`)
   - Analyzes usage patterns and generates adaptive schedules
   - Methods: analyzeUsagePattern, generateSchedule, updateSchedule, predictPeakUsage

4. **OccupancyDetector** (`src/edge/interfaces/OccupancyDetector.ts`)
   - Processes camera images to detect human presence using computer vision
   - Methods: detectOccupancy, startMonitoring, stopMonitoring, getOccupancyHistory

5. **VoiceAssistant** (`src/edge/interfaces/VoiceAssistant.ts`)
   - Processes voice commands and generates spoken responses
   - Methods: processVoiceCommand, synthesizeSpeech, extractIntent

6. **AnomalyDetector** (`src/edge/interfaces/AnomalyDetector.ts`)
   - Monitors device behavior for unusual patterns indicating safety issues
   - Methods: checkForAnomalies, recordAnomaly, getAnomalyHistory, shouldDisableDevice

7. **ScheduleExecutor** (`src/edge/interfaces/ScheduleExecutor.ts`)
   - Executes scheduled device actions and handles user overrides
   - Methods: executeSchedule, handleOverride, pauseSchedule, resumeSchedule

### Cloud Components

1. **DataStorage** (`src/cloud/interfaces/DataStorage.ts`)
   - Manages persistence of energy data to cloud storage
   - Methods: storeReading, storeAggregatedData, getReadings, getAggregatedData

### Mobile Components

1. **MobileAPI** (`src/mobile/interfaces/MobileAPI.ts`)
   - Provides API endpoints for mobile app interactions
   - Methods: getDevices, getDeviceStatus, controlDevice, getDashboardData, getHistoricalData, toggleAdaptiveSchedule

## Type Definitions

### Edge Types (`src/edge/types.ts`)
- DeviceType
- Device
- DeviceStatus
- DeviceCommand
- TelemetryCallback
- TelemetryData

### Cloud Types (`src/cloud/types.ts`)
- EnergyReading
- AggregatedEnergy
- Schedule
- UserPreferences

### Mobile Types (`src/mobile/types.ts`)
- DashboardData
- DeviceControlRequest
- HistoricalDataRequest

## Testing Framework

### Configuration
- **Jest**: Unit testing framework (configured in `jest.config.js`)
- **fast-check**: Property-based testing library
- **ts-jest**: TypeScript preprocessor for Jest

### Test Files
- Test files use the `.test.ts` suffix
- Located alongside source files
- Example: `src/edge/interfaces/DeviceManager.test.ts`

### Running Tests
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
```

## Build Configuration

### TypeScript (`tsconfig.json`)
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Source maps and declarations generated
- Output directory: `./dist`

### Building
```bash
npm run build           # Compile TypeScript to JavaScript
```

## Dependencies

### Development Dependencies
- `@types/jest`: TypeScript definitions for Jest
- `@types/node`: TypeScript definitions for Node.js
- `jest`: Testing framework
- `ts-jest`: TypeScript support for Jest
- `typescript`: TypeScript compiler
- `fast-check`: Property-based testing library

## Next Steps

This completes Task 1: "Set up project structure and core interfaces"

The following have been successfully implemented:
✅ Directory structure for edge, cloud, and mobile components
✅ TypeScript interfaces for all core components
✅ Testing frameworks (Jest for unit tests, fast-check for property tests)
✅ Build tools and development environment configured
✅ All tests passing
✅ TypeScript compilation successful

You can now proceed to Task 2: "Implement Device Manager and Tuya integration"
