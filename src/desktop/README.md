# AI Chatbot Desktop Device

The AI Chatbot Desktop Device is a comprehensive multi-functional smart assistant that integrates conversational AI, health monitoring, and calendar management into a unified desktop experience.

## Features

- **Conversational AI**: Natural language processing with voice and text input
- **Visual Feedback**: Flashing interface with synchronized visual patterns
- **Health Monitoring**: Sedentary behavior detection, hydration reminders, and posture monitoring
- **Calendar Management**: Natural language scheduling and proactive reminders
- **Smart Energy Integration**: Seamless integration with Smart Energy Copilot system
- **Multi-Modal Interface**: Voice, touch, and gesture input support
- **Security & Privacy**: Local processing prioritization and data encryption

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Initialize configuration
npm run desktop:config
```

### Running the System

#### Interactive Mode (Default)
```bash
npm run desktop:start
```

#### CLI Management Mode
```bash
npm run desktop:cli
```

#### Service Mode (Background)
```bash
npm run desktop:service
```

#### API Mode (Web API only)
```bash
npm run desktop:api
```

### System Status

```bash
# Check system status
npm run desktop:status

# Detailed health report
npm run desktop:status -- --detailed

# JSON output
npm run desktop:status -- --json
```

## Configuration

### Initial Setup

Run the configuration wizard:
```bash
npm run desktop:config
```

### Manual Configuration

Create a `config.json` file in the project root:

```json
{
  "mode": "interactive",
  "enableAutoStart": true,
  "enablePerformanceOptimization": true,
  "enableHealthMonitoring": true,
  "enableCalendarIntegration": true,
  "enableEnergyIntegration": true,
  "enableSecurityFeatures": true,
  "apiPort": 3000,
  "enableWebAPI": true,
  "enableCLI": true,
  "logLevel": "info",
  "maxConcurrentRequests": 10,
  "requestTimeoutMs": 30000
}
```

### Configuration Options

- **mode**: Operating mode (`interactive`, `cli`, `service`, `api`)
- **enableAutoStart**: Automatically start all components
- **enablePerformanceOptimization**: Enable performance monitoring and optimization
- **enableHealthMonitoring**: Enable health tracking and reminders
- **enableCalendarIntegration**: Enable calendar management features
- **enableEnergyIntegration**: Enable Smart Energy Copilot integration
- **enableSecurityFeatures**: Enable security and privacy features
- **apiPort**: Port for web API server
- **enableWebAPI**: Enable REST API interface
- **enableCLI**: Enable command-line interface
- **logLevel**: Logging level (`debug`, `info`, `warn`, `error`)

## Usage

### Command Line Interface

The system provides a comprehensive CLI for management:

```bash
# Configuration management
ai-chatbot-desktop config show
ai-chatbot-desktop config set user.language en
ai-chatbot-desktop config validate

# System monitoring
ai-chatbot-desktop monitor status
ai-chatbot-desktop monitor health
ai-chatbot-desktop monitor diagnostics

# Service management
ai-chatbot-desktop service start
ai-chatbot-desktop service stop
ai-chatbot-desktop service restart

# Maintenance
ai-chatbot-desktop maintenance list
ai-chatbot-desktop maintenance run <taskId>

# Backup management
ai-chatbot-desktop backup create
ai-chatbot-desktop backup list
ai-chatbot-desktop backup restore <backupId>
```

### Web API

When running in API mode or interactive mode with web API enabled, the system exposes REST endpoints:

#### System Endpoints
- `GET /health` - Health check
- `GET /api/system/status` - System status
- `GET /api/system/health` - Detailed health report

#### Chat Endpoints
- `POST /api/chat` - Process chat input
  ```json
  {
    "input": {
      "text": "Hello, how are you?",
      "audioData": "..." // For voice input
    },
    "context": {
      "conversationId": "conv-123",
      "userId": "user-456"
    },
    "modality": "text" // or "voice"
  }
  ```

#### Health Endpoints
- `POST /api/health` - Health operations
  ```json
  {
    "action": "getInsights", // or "getStatus", "trackActivity"
    "parameters": {
      "activityData": {...} // For trackActivity
    }
  }
  ```

#### Calendar Endpoints
- `POST /api/calendar` - Calendar operations
  ```json
  {
    "action": "getEvents", // or "createAppointment", "parseRequest"
    "parameters": {
      "timeframe": {...}, // For getEvents
      "appointment": {...}, // For createAppointment
      "naturalLanguage": "..." // For parseRequest
    }
  }
  ```

#### Energy Endpoints
- `POST /api/energy` - Energy operations
  ```json
  {
    "query": "What is my current energy consumption?", // String query
    "userId": "user-456"
  }
  ```

### Programming Interface

```typescript
import { DesktopHubImpl } from './src/desktop';

// Initialize the hub
const hub = new DesktopHubImpl({
  enableAutoStart: true,
  enableHealthMonitoring: true,
  enableCalendarIntegration: true,
  enableEnergyIntegration: true
});

// Initialize and start
await hub.initialize();
await hub.start();

// Process user input
const response = await hub.processUserInput(
  "What meetings do I have today?",
  "text"
);

// Get system status
const status = await hub.getSystemStatus();
const health = await hub.getSystemHealthReport();

// Stop the system
await hub.stop();
```

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Flashing Interface  │  Voice Interface  │  Touch Interface │
├─────────────────────────────────────────────────────────────┤
│                    Application Services                     │
├─────────────────────────────────────────────────────────────┤
│  AI Chatbot Engine  │  Health Monitor   │  Calendar Manager │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Energy Copilot API │  Device Manager   │  Cloud Services   │
├─────────────────────────────────────────────────────────────┤
│                    Hardware Abstraction                     │
├─────────────────────────────────────────────────────────────┤
│  T5 Processor       │  Sensors          │  Display & Audio  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **DesktopHubImpl**: Main orchestrator and unified API
2. **AIChatbotEngineImpl**: Conversational AI processing
3. **FlashingInterfaceManagerImpl**: Visual feedback system
4. **HealthMonitorIntegrationImpl**: Health tracking and insights
5. **CalendarManagerImpl**: Schedule management
6. **SmartEnergyCopilotIntegrationImpl**: Energy system integration
7. **MultiModalInterfaceControllerImpl**: Input coordination
8. **SecurityManagerImpl**: Security and privacy features

### Integration Points

- **Smart Energy Copilot**: Full integration with existing energy management system
- **External Calendars**: Google Calendar, Outlook, Apple Calendar
- **Health Devices**: Fitness trackers, smart scales, heart rate monitors
- **Voice Assistants**: Compatible with existing voice platforms
- **IoT Devices**: Tuya-based smart home devices

## Development

### Building

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Integration tests
npm run desktop:test -- --integration
```

### Adding Components

1. Create interface in `src/desktop/interfaces/`
2. Implement in `src/desktop/implementations/`
3. Register with DesktopHub in initialization
4. Add tests in corresponding `.test.ts` files
5. Add property-based tests in `.property.test.ts` files

### Configuration Management

The system uses a hierarchical configuration system:

1. Default configuration (hardcoded)
2. Configuration file (`config.json`)
3. Environment variables
4. Command-line arguments
5. Runtime updates via API

## Troubleshooting

### Common Issues

#### System Won't Start
- Check configuration file syntax
- Verify all dependencies are installed
- Check port availability (default: 3000)
- Review logs for specific error messages

#### Components Not Responding
- Check component status: `npm run desktop:status`
- Run diagnostics: `ai-chatbot-desktop monitor diagnostics`
- Restart specific components via CLI

#### Performance Issues
- Enable performance optimization in config
- Run performance optimization: `ai-chatbot-desktop maintenance run optimize-performance`
- Check system resources and memory usage

#### Integration Problems
- Verify Smart Energy Copilot system is running
- Check network connectivity
- Validate API keys and credentials
- Review integration logs

### Logs and Diagnostics

```bash
# View system logs
ai-chatbot-desktop monitor logs

# Filter by component
ai-chatbot-desktop monitor logs --component AIChatbotEngine

# Filter by log level
ai-chatbot-desktop monitor logs --level error

# Run comprehensive diagnostics
ai-chatbot-desktop monitor diagnostics
```

### Support

For issues and support:

1. Check the troubleshooting section above
2. Review system logs and diagnostics
3. Check component status and health reports
4. Verify configuration and dependencies
5. Consult the integration test examples for usage patterns

## License

MIT License - see LICENSE file for details.