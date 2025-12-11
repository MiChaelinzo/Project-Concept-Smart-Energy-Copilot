# Error Handling and Recovery System

This directory contains the comprehensive error handling and recovery system for the Smart Energy Copilot application.

## Components

### ErrorHandler.ts
- **ErrorHandler**: Central error handling and recovery system
- **RetryManager**: Exponential backoff retry utility with jitter
- **NotificationManager**: User notification system for critical errors
- **GracefulDegradation**: Utility for graceful degradation with feature flags

### ManualOverride.ts
- **ManualOverrideManager**: Manual override system for emergency and maintenance situations
- Support for device control, schedule bypass, anomaly ignore, and emergency shutdown overrides

## Features Implemented

### Error Handling
- ✅ Comprehensive error categorization (Device Communication, Cloud API, AI Inference, etc.)
- ✅ Error severity levels (Low, Medium, High, Critical)
- ✅ Automatic error logging with context
- ✅ Error statistics and monitoring
- ✅ Recovery strategy execution

### Retry Logic
- ✅ Exponential backoff with jitter
- ✅ Configurable retry parameters
- ✅ Retry attempt logging
- ✅ Maximum retry limits

### User Notifications
- ✅ Multi-channel notification support (push, email, SMS)
- ✅ Notification throttling to prevent spam
- ✅ Severity-based notification filtering
- ✅ Formatted notification messages

### Graceful Degradation
- ✅ Feature flag management
- ✅ Fallback value caching
- ✅ Automatic feature disabling on failure
- ✅ Temporary feature re-enabling

### Manual Override System
- ✅ Device control overrides
- ✅ Schedule bypass overrides
- ✅ Anomaly detection ignore overrides
- ✅ Emergency shutdown capabilities
- ✅ Override expiration and revocation
- ✅ Permission-based override management

### Integration
- ✅ Enhanced ResilientDeviceManager with error handling
- ✅ Enhanced EnergyMonitorImpl with validation and error handling
- ✅ Global error handler and override manager instances

## Usage Examples

### Basic Error Handling
```typescript
import { globalErrorHandler, ErrorCategory, ErrorSeverity } from './ErrorHandler';

try {
  await riskyOperation();
} catch (error) {
  await globalErrorHandler.handleError(
    ErrorCategory.DEVICE_COMMUNICATION,
    ErrorSeverity.HIGH,
    'Device operation failed',
    {
      component: 'DeviceManager',
      operation: 'sendCommand',
      deviceId: 'device-123',
      timestamp: new Date()
    },
    error
  );
}
```

### Retry with Error Handling
```typescript
const result = await globalErrorHandler.executeWithErrorHandling(
  () => apiCall(),
  ErrorCategory.CLOUD_API,
  {
    component: 'APIClient',
    operation: 'fetchData',
    timestamp: new Date()
  },
  {
    maxRetries: 3,
    baseDelayMs: 1000,
    backoffMultiplier: 2
  }
);
```

### Manual Override
```typescript
import { globalOverrideManager, OverrideType } from './ManualOverride';

// Create emergency shutdown
const overrides = globalOverrideManager.createEmergencyShutdown(
  'admin',
  'Gas leak detected',
  ['device-1', 'device-2']
);

// Check if device is overridden
if (globalOverrideManager.isDeviceControlOverridden('device-123')) {
  console.log('Device control is overridden');
}
```

### Graceful Degradation
```typescript
import { GracefulDegradation } from './ErrorHandler';

const result = await GracefulDegradation.executeWithFallback(
  () => complexOperation(),
  () => simpleOperation(),
  'complex-feature'
);
```

## Testing

The system includes comprehensive unit tests covering:
- Error handling and logging
- Retry mechanisms with exponential backoff
- Notification management and throttling
- Graceful degradation scenarios
- Manual override functionality
- Network timeout recovery
- Invalid API response handling
- Corrupted configuration data recovery

Run tests with:
```bash
npm test -- src/common/ErrorHandler.test.ts
npm test -- src/common/ManualOverride.test.ts
```

## Requirements Satisfied

This implementation satisfies all cross-cutting error handling requirements:
- ✅ Retry logic with exponential backoff for device communication
- ✅ Graceful degradation for component failures
- ✅ User notification system for critical errors
- ✅ Error logging and debugging support
- ✅ Manual override capabilities
- ✅ Network timeout recovery
- ✅ Invalid API response handling
- ✅ Corrupted configuration data recovery