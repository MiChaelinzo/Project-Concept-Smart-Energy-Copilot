# Smart Energy Copilot

An AI-powered IoT system that optimizes energy consumption in homes and offices by learning user behavior and dynamically managing connected devices.

## Project Structure

```
src/
├── edge/                    # Edge computing components
│   ├── interfaces/          # Core interface definitions
│   │   ├── DeviceManager.ts
│   │   ├── EnergyMonitor.ts
│   │   ├── BehaviorLearningEngine.ts
│   │   ├── OccupancyDetector.ts
│   │   ├── VoiceAssistant.ts
│   │   ├── AnomalyDetector.ts
│   │   ├── ScheduleExecutor.ts
│   │   └── index.ts
│   └── types.ts             # Edge type definitions
├── cloud/                   # Cloud service components
│   ├── interfaces/
│   │   ├── DataStorage.ts
│   │   └── index.ts
│   └── types.ts             # Cloud type definitions
├── mobile/                  # Mobile app components
│   ├── interfaces/
│   │   ├── MobileAPI.ts
│   │   └── index.ts
│   └── types.ts             # Mobile type definitions
└── index.ts                 # Main entry point
```

## Setup

Install dependencies:
```bash
npm install
```

## Development

Build the project:
```bash
npm run build
```

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## Testing Frameworks

- **Jest**: Unit testing framework
- **fast-check**: Property-based testing library

## Architecture

The system follows a three-tier architecture:

1. **Edge Tier**: Tuya T5AI-CORE kit and Raspberry Pi 4 running local AI inference
2. **Cloud Tier**: AWS-based services for data storage and analytics
3. **Device Tier**: Tuya IoT ecosystem devices for energy monitoring and control

## Core Components

- **DeviceManager**: Manages registration and communication with Tuya IoT devices
- **EnergyMonitor**: Collects and aggregates energy consumption data
- **BehaviorLearningEngine**: Analyzes patterns and generates adaptive schedules
- **OccupancyDetector**: Detects human presence using computer vision
- **VoiceAssistant**: Processes voice commands and generates responses
- **AnomalyDetector**: Monitors for unusual device behavior
- **ScheduleExecutor**: Executes scheduled device actions

## License

MIT
