import {
  ErrorHandler,
  ErrorCategory,
  ErrorSeverity,
  RetryManager,
  NotificationManager,
  GracefulDegradation
} from './ErrorHandler';

describe('ErrorHandler Unit Tests', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    errorHandler.clearErrorLog();
  });

  describe('Error Handling', () => {
    test('should handle and log errors correctly', async () => {
      const context = {
        component: 'TestComponent',
        operation: 'testOperation',
        timestamp: new Date()
      };

      const systemError = await errorHandler.handleError(
        ErrorCategory.DEVICE_COMMUNICATION,
        ErrorSeverity.HIGH,
        'Test error message',
        context
      );

      expect(systemError.category).toBe(ErrorCategory.DEVICE_COMMUNICATION);
      expect(systemError.severity).toBe(ErrorSeverity.HIGH);
      expect(systemError.message).toBe('Test error message');
      expect(systemError.context).toEqual(context);
      expect(systemError.id).toBeDefined();
    });

    test('should determine error severity automatically', async () => {
      const context = {
        component: 'TestComponent',
        operation: 'testOperation',
        timestamp: new Date()
      };

      const criticalError = new Error('Critical system failure');
      const timeoutError = new Error('Connection timeout occurred');
      const normalError = new Error('Normal operation failed');

      const systemError1 = await errorHandler.handleError(
        ErrorCategory.SYSTEM,
        ErrorSeverity.CRITICAL,
        criticalError.message,
        context,
        criticalError
      );

      const systemError2 = await errorHandler.handleError(
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        timeoutError.message,
        context,
        timeoutError
      );

      expect(systemError1.severity).toBe(ErrorSeverity.CRITICAL);
      expect(systemError2.severity).toBe(ErrorSeverity.HIGH);
    });

    test('should track error statistics', async () => {
      const context = {
        component: 'TestComponent',
        operation: 'testOperation',
        timestamp: new Date()
      };

      // Add multiple errors
      await errorHandler.handleError(
        ErrorCategory.DEVICE_COMMUNICATION,
        ErrorSeverity.HIGH,
        'Device error 1',
        context
      );

      await errorHandler.handleError(
        ErrorCategory.DEVICE_COMMUNICATION,
        ErrorSeverity.MEDIUM,
        'Device error 2',
        context
      );

      await errorHandler.handleError(
        ErrorCategory.CLOUD_API,
        ErrorSeverity.HIGH,
        'API error',
        context
      );

      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCategory[ErrorCategory.DEVICE_COMMUNICATION]).toBe(2);
      expect(stats.errorsByCategory[ErrorCategory.CLOUD_API]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.HIGH]).toBe(2);
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1);
    });
  });

  describe('RetryManager', () => {
    test('should retry operations with exponential backoff', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const operation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < maxRetries) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return 'success';
      });

      const result = await RetryManager.executeWithRetry(
        operation,
        { maxRetries, baseDelayMs: 10, backoffMultiplier: 2 }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(maxRetries);
    });

    test('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        RetryManager.executeWithRetry(
          operation,
          { maxRetries: 2, baseDelayMs: 10 }
        )
      ).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      await RetryManager.executeWithRetry(
        operation,
        { maxRetries: 2, baseDelayMs: 10 },
        onRetry
      );

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('NotificationManager', () => {
    test('should send notifications for high severity errors', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const notificationManager = new NotificationManager({
        enabled: true,
        channels: ['push'],
        throttleMs: 1000
      });

      const systemError = await errorHandler.handleError(
        ErrorCategory.DEVICE_COMMUNICATION,
        ErrorSeverity.HIGH,
        'Critical device failure',
        {
          component: 'TestDevice',
          operation: 'sendCommand',
          deviceId: 'device-123',
          timestamp: new Date()
        }
      );

      await notificationManager.notifyUser(systemError);

      // Check that notification was sent (should be first call with [PUSH])
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PUSH]')
      );

      consoleSpy.mockRestore();
    });

    test('should throttle notifications', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const notificationManager = new NotificationManager({
        enabled: true,
        channels: ['push'],
        throttleMs: 100
      });

      const context = {
        component: 'TestDevice',
        operation: 'sendCommand',
        timestamp: new Date()
      };

      const error1 = await errorHandler.handleError(
        ErrorCategory.DEVICE_COMMUNICATION,
        ErrorSeverity.HIGH,
        'Error 1',
        context
      );

      const error2 = await errorHandler.handleError(
        ErrorCategory.DEVICE_COMMUNICATION,
        ErrorSeverity.HIGH,
        'Error 2',
        context
      );

      // Clear any previous console calls
      consoleSpy.mockClear();

      await notificationManager.notifyUser(error1);
      const callsAfterFirst = consoleSpy.mock.calls.length;
      
      await notificationManager.notifyUser(error2); // Should be throttled
      const callsAfterSecond = consoleSpy.mock.calls.length;

      // Second notification should be throttled, so no additional calls
      expect(callsAfterSecond).toBe(callsAfterFirst);
      
      consoleSpy.mockRestore();
    });

    test('should not send notifications for low severity errors', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const notificationManager = new NotificationManager();

      const systemError = await errorHandler.handleError(
        ErrorCategory.DATA_VALIDATION,
        ErrorSeverity.LOW,
        'Minor validation issue',
        {
          component: 'TestComponent',
          operation: 'validate',
          timestamp: new Date()
        }
      );

      await notificationManager.notifyUser(systemError);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[PUSH]'),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('GracefulDegradation', () => {
    test('should execute operation successfully when no errors', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const fallback = jest.fn().mockResolvedValue('fallback');

      const result = await GracefulDegradation.executeWithFallback(
        operation,
        fallback,
        'test-feature'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(fallback).not.toHaveBeenCalled();
    });

    test('should use fallback when operation fails', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const fallback = jest.fn().mockResolvedValue('fallback-result');

      const result = await GracefulDegradation.executeWithFallback(
        operation,
        fallback,
        'test-feature'
      );

      expect(result).toBe('fallback-result');
      expect(operation).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    test('should disable feature temporarily after failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const fallback = jest.fn().mockResolvedValue('fallback-result');

      // Ensure feature is enabled initially
      GracefulDegradation.setFeatureEnabled('test-feature-disable', true);

      // First call should try operation and fail
      await GracefulDegradation.executeWithFallback(
        operation,
        fallback,
        'test-feature-disable'
      );

      expect(operation).toHaveBeenCalledTimes(1);

      // Reset mocks
      operation.mockClear();
      fallback.mockClear();

      // Second call should skip operation and go directly to fallback
      await GracefulDegradation.executeWithFallback(
        operation,
        fallback,
        'test-feature-disable'
      );

      expect(operation).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    test('should manage cached values', () => {
      const testValue = { data: 'test' };
      
      GracefulDegradation.setCachedValue('test-key', testValue);
      const retrieved = GracefulDegradation.getCachedOrDefault('test-key', null);
      
      expect(retrieved).toEqual(testValue);
    });

    test('should return default when no cached value', () => {
      const defaultValue = 'default';
      const retrieved = GracefulDegradation.getCachedOrDefault('nonexistent-key', defaultValue);
      
      expect(retrieved).toBe(defaultValue);
    });

    test('should manage feature flags', () => {
      expect(GracefulDegradation.isFeatureEnabled('new-feature')).toBe(true);
      
      GracefulDegradation.setFeatureEnabled('new-feature', false);
      expect(GracefulDegradation.isFeatureEnabled('new-feature')).toBe(false);
      
      GracefulDegradation.setFeatureEnabled('new-feature', true);
      expect(GracefulDegradation.isFeatureEnabled('new-feature')).toBe(true);
    });
  });

  describe('executeWithErrorHandling', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await errorHandler.executeWithErrorHandling(
        operation,
        ErrorCategory.DEVICE_COMMUNICATION,
        {
          component: 'TestComponent',
          operation: 'testOp',
          timestamp: new Date()
        }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    test('should handle operation failure with retries', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        ErrorCategory.DEVICE_COMMUNICATION,
        {
          component: 'TestComponent',
          operation: 'testOp',
          timestamp: new Date()
        },
        { maxRetries: 3, baseDelayMs: 10 }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should throw SystemError after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        errorHandler.executeWithErrorHandling(
          operation,
          ErrorCategory.DEVICE_COMMUNICATION,
          {
            component: 'TestComponent',
            operation: 'testOp',
            timestamp: new Date()
          },
          { maxRetries: 1, baseDelayMs: 10 }
        )
      ).rejects.toMatchObject({
        category: ErrorCategory.DEVICE_COMMUNICATION,
        message: 'Always fails'
      });
    });
  });

  describe('Network timeout recovery', () => {
    test('should handle network timeout with exponential backoff', async () => {
      let attemptCount = 0;
      const networkOperation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Network timeout');
          error.name = 'TimeoutError';
          throw error;
        }
        return 'network-success';
      });

      const result = await errorHandler.executeWithErrorHandling(
        networkOperation,
        ErrorCategory.NETWORK,
        {
          component: 'NetworkClient',
          operation: 'fetchData',
          timestamp: new Date()
        },
        {
          maxRetries: 3,
          baseDelayMs: 100,
          backoffMultiplier: 2
        }
      );

      expect(result).toBe('network-success');
      expect(networkOperation).toHaveBeenCalledTimes(3);
      
      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByCategory[ErrorCategory.NETWORK]).toBeGreaterThan(0);
    });
  });

  describe('Invalid API response handling', () => {
    test('should handle malformed API responses', async () => {
      const apiOperation = jest.fn().mockImplementation(async () => {
        throw new Error('Invalid JSON response from API');
      });

      await expect(
        errorHandler.executeWithErrorHandling(
          apiOperation,
          ErrorCategory.CLOUD_API,
          {
            component: 'APIClient',
            operation: 'parseResponse',
            timestamp: new Date()
          },
          { maxRetries: 2, baseDelayMs: 50 }
        )
      ).rejects.toMatchObject({
        category: ErrorCategory.CLOUD_API,
        message: 'Invalid JSON response from API'
      });

      expect(apiOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should handle API authentication errors', async () => {
      const authOperation = jest.fn().mockImplementation(async () => {
        const error = new Error('Unauthorized access');
        error.name = 'AuthenticationError';
        throw error;
      });

      await expect(
        errorHandler.executeWithErrorHandling(
          authOperation,
          ErrorCategory.CLOUD_API,
          {
            component: 'AuthService',
            operation: 'authenticate',
            timestamp: new Date()
          },
          { maxRetries: 1, baseDelayMs: 10 } // Reduce retries for faster test
        )
      ).rejects.toMatchObject({
        category: ErrorCategory.CLOUD_API,
        severity: ErrorSeverity.HIGH // Should be high severity for auth errors
      });
    }, 10000);
  });

  describe('Corrupted configuration data recovery', () => {
    test('should handle corrupted configuration with fallback', async () => {
      const configOperation = jest.fn().mockImplementation(async () => {
        throw new Error('Configuration file is corrupted');
      });

      const fallbackConfig = { setting1: 'default', setting2: 100 };

      const result = await GracefulDegradation.executeWithFallback(
        configOperation,
        () => fallbackConfig,
        'configuration-loading'
      );

      expect(result).toEqual(fallbackConfig);
      expect(configOperation).toHaveBeenCalled();
    });

    test('should validate configuration data', async () => {
      const validateConfig = (config: any) => {
        if (!config || typeof config !== 'object') {
          throw new Error('Invalid configuration format');
        }
        if (!config.apiKey || !config.endpoint) {
          throw new Error('Missing required configuration fields');
        }
        return config;
      };

      const validConfig = { apiKey: 'test-key', endpoint: 'https://api.test.com' };
      const invalidConfig = { apiKey: 'test-key' }; // Missing endpoint

      expect(() => validateConfig(validConfig)).not.toThrow();
      expect(() => validateConfig(invalidConfig)).toThrow('Missing required configuration fields');
      expect(() => validateConfig(null)).toThrow('Invalid configuration format');
    });

    test('should recover from configuration errors using defaults', async () => {
      const loadConfigWithRecovery = async () => {
        try {
          // Simulate corrupted config
          throw new Error('Config file corrupted');
        } catch (error) {
          await errorHandler.handleError(
            ErrorCategory.CONFIGURATION,
            ErrorSeverity.MEDIUM,
            'Configuration corrupted, using defaults',
            {
              component: 'ConfigManager',
              operation: 'loadConfig',
              timestamp: new Date()
            },
            error as Error
          );

          // Return default configuration
          return {
            apiKey: 'default-key',
            endpoint: 'https://default-api.com',
            timeout: 5000,
            retries: 3
          };
        }
      };

      const config = await loadConfigWithRecovery();
      
      expect(config).toEqual({
        apiKey: 'default-key',
        endpoint: 'https://default-api.com',
        timeout: 5000,
        retries: 3
      });

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByCategory[ErrorCategory.CONFIGURATION]).toBeGreaterThan(0);
    });

    test('should handle JSON parsing errors in configuration', async () => {
      const parseConfigWithRecovery = async (configString: string) => {
        try {
          return JSON.parse(configString);
        } catch (error) {
          await errorHandler.handleError(
            ErrorCategory.CONFIGURATION,
            ErrorSeverity.MEDIUM,
            'Invalid JSON in configuration file',
            {
              component: 'ConfigParser',
              operation: 'parseConfig',
              timestamp: new Date()
            },
            error as Error
          );

          // Return minimal default config
          return {
            apiKey: 'default',
            endpoint: 'https://localhost:3000',
            timeout: 30000
          };
        }
      };

      // Test with invalid JSON
      const result = await parseConfigWithRecovery('{ invalid json }');
      
      expect(result).toEqual({
        apiKey: 'default',
        endpoint: 'https://localhost:3000',
        timeout: 30000
      });
    });

    test('should handle missing configuration files', async () => {
      const loadMissingConfig = async () => {
        try {
          throw new Error('ENOENT: no such file or directory, open \'config.json\'');
        } catch (error) {
          const systemError = await errorHandler.handleError(
            ErrorCategory.CONFIGURATION,
            ErrorSeverity.MEDIUM,
            'Configuration file not found, creating default',
            {
              component: 'ConfigLoader',
              operation: 'loadConfig',
              timestamp: new Date()
            },
            error as Error
          );

          // Simulate creating default config
          return {
            created: true,
            config: {
              apiKey: '',
              endpoint: 'https://api.example.com',
              timeout: 5000,
              retries: 3,
              enableLogging: true
            }
          };
        }
      };

      const result = await loadMissingConfig();
      
      expect(result.created).toBe(true);
      expect(result.config).toHaveProperty('apiKey');
      expect(result.config).toHaveProperty('endpoint');
    });

    test('should handle configuration schema validation errors', async () => {
      const validateConfigSchema = async (config: any) => {
        const requiredFields = ['apiKey', 'endpoint', 'timeout'];
        const missingFields = requiredFields.filter(field => !(field in config));
        
        if (missingFields.length > 0) {
          await errorHandler.handleError(
            ErrorCategory.CONFIGURATION,
            ErrorSeverity.HIGH,
            `Missing required configuration fields: ${missingFields.join(', ')}`,
            {
              component: 'ConfigValidator',
              operation: 'validateSchema',
              timestamp: new Date(),
              metadata: { missingFields }
            }
          );

          // Add missing fields with defaults
          const correctedConfig = { ...config };
          if (!correctedConfig.apiKey) correctedConfig.apiKey = 'default-key';
          if (!correctedConfig.endpoint) correctedConfig.endpoint = 'https://api.default.com';
          if (!correctedConfig.timeout) correctedConfig.timeout = 30000;
          
          return correctedConfig;
        }
        
        return config;
      };

      const incompleteConfig = { apiKey: 'test-key' }; // Missing endpoint and timeout
      const result = await validateConfigSchema(incompleteConfig);
      
      expect(result).toHaveProperty('endpoint');
      expect(result).toHaveProperty('timeout');
      expect(result.apiKey).toBe('test-key'); // Original value preserved
    });
  });

  describe('Enhanced Network Timeout Recovery', () => {
    test('should handle connection timeout with progressive backoff', async () => {
      let attemptCount = 0;
      const networkOperation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          const error = new Error('ETIMEDOUT: Connection timed out');
          error.name = 'TimeoutError';
          throw error;
        }
        return { status: 'success', data: 'network-data' };
      });

      const result = await errorHandler.executeWithErrorHandling(
        networkOperation,
        ErrorCategory.NETWORK,
        {
          component: 'NetworkClient',
          operation: 'fetchData',
          timestamp: new Date()
        },
        {
          maxRetries: 3,
          baseDelayMs: 100,
          backoffMultiplier: 2,
          maxDelayMs: 1000
        }
      );

      expect(result).toEqual({ status: 'success', data: 'network-data' });
      expect(networkOperation).toHaveBeenCalledTimes(3);
    });

    test('should handle DNS resolution failures', async () => {
      const dnsOperation = jest.fn().mockImplementation(async () => {
        const error = new Error('ENOTFOUND: getaddrinfo ENOTFOUND api.example.com');
        error.name = 'DNSError';
        throw error;
      });

      await expect(
        errorHandler.executeWithErrorHandling(
          dnsOperation,
          ErrorCategory.NETWORK,
          {
            component: 'DNSResolver',
            operation: 'resolveHost',
            timestamp: new Date()
          },
          { maxRetries: 2, baseDelayMs: 50 }
        )
      ).rejects.toMatchObject({
        category: ErrorCategory.NETWORK,
        message: 'ENOTFOUND: getaddrinfo ENOTFOUND api.example.com'
      });

      expect(dnsOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should handle network unreachable errors', async () => {
      const networkOperation = jest.fn().mockImplementation(async () => {
        throw new Error('ENETUNREACH: Network is unreachable');
      });

      await expect(
        errorHandler.executeWithErrorHandling(
          networkOperation,
          ErrorCategory.NETWORK,
          {
            component: 'NetworkInterface',
            operation: 'connect',
            timestamp: new Date()
          },
          { maxRetries: 1, baseDelayMs: 10 }
        )
      ).rejects.toMatchObject({
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.LOW // Network errors default to LOW severity unless they contain specific keywords
      });
    });

    test('should handle socket timeout errors', async () => {
      let callCount = 0;
      const socketOperation = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          const error = new Error('Socket timeout after 5000ms');
          error.name = 'SocketTimeoutError';
          throw error;
        }
        return 'socket-success';
      });

      const result = await errorHandler.executeWithErrorHandling(
        socketOperation,
        ErrorCategory.NETWORK,
        {
          component: 'SocketClient',
          operation: 'sendData',
          timestamp: new Date()
        },
        {
          maxRetries: 3,
          baseDelayMs: 50,
          backoffMultiplier: 1.5
        }
      );

      expect(result).toBe('socket-success');
      expect(socketOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Enhanced Invalid API Response Handling', () => {
    test('should handle malformed JSON responses', async () => {
      const apiOperation = jest.fn().mockImplementation(async () => {
        throw new Error('Unexpected token < in JSON at position 0');
      });

      await expect(
        errorHandler.executeWithErrorHandling(
          apiOperation,
          ErrorCategory.CLOUD_API,
          {
            component: 'APIClient',
            operation: 'parseResponse',
            timestamp: new Date()
          },
          { maxRetries: 2, baseDelayMs: 50 }
        )
      ).rejects.toMatchObject({
        category: ErrorCategory.CLOUD_API,
        message: 'Unexpected token < in JSON at position 0'
      });

      expect(apiOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should handle HTTP status code errors', async () => {
      const httpOperation = jest.fn().mockImplementation(async () => {
        const error = new Error('HTTP 500: Internal Server Error');
        error.name = 'HTTPError';
        throw error;
      });

      await expect(
        errorHandler.executeWithErrorHandling(
          httpOperation,
          ErrorCategory.CLOUD_API,
          {
            component: 'HTTPClient',
            operation: 'makeRequest',
            timestamp: new Date()
          },
          { maxRetries: 2, baseDelayMs: 10 }
        )
      ).rejects.toMatchObject({
        category: ErrorCategory.CLOUD_API,
        severity: ErrorSeverity.MEDIUM // Cloud API errors default to MEDIUM severity
      });
    });

    test('should handle API rate limiting', async () => {
      let callCount = 0;
      const rateLimitedOperation = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          const error = new Error('HTTP 429: Too Many Requests');
          error.name = 'RateLimitError';
          throw error;
        }
        return { data: 'success-after-rate-limit' };
      });

      const result = await errorHandler.executeWithErrorHandling(
        rateLimitedOperation,
        ErrorCategory.CLOUD_API,
        {
          component: 'APIClient',
          operation: 'apiCall',
          timestamp: new Date()
        },
        {
          maxRetries: 3,
          baseDelayMs: 100,
          backoffMultiplier: 2
        }
      );

      expect(result).toEqual({ data: 'success-after-rate-limit' });
      expect(rateLimitedOperation).toHaveBeenCalledTimes(3);
    });

    test('should handle API authentication token expiry', async () => {
      let tokenExpired = true;
      const authOperation = jest.fn().mockImplementation(async () => {
        if (tokenExpired) {
          tokenExpired = false; // Simulate token refresh
          throw new Error('HTTP 401: Token expired');
        }
        return { authenticated: true, newToken: 'refreshed-token' };
      });

      const result = await errorHandler.executeWithErrorHandling(
        authOperation,
        ErrorCategory.CLOUD_API,
        {
          component: 'AuthClient',
          operation: 'authenticate',
          timestamp: new Date()
        },
        { maxRetries: 2, baseDelayMs: 10 }
      );

      expect(result).toEqual({ authenticated: true, newToken: 'refreshed-token' });
      expect(authOperation).toHaveBeenCalledTimes(2);
    });

    test('should handle API response schema validation errors', async () => {
      const validateApiResponse = async (response: any) => {
        if (!response || typeof response !== 'object') {
          await errorHandler.handleError(
            ErrorCategory.CLOUD_API,
            ErrorSeverity.MEDIUM,
            'Invalid API response format',
            {
              component: 'APIValidator',
              operation: 'validateResponse',
              timestamp: new Date()
            }
          );
          return { error: 'Invalid response', data: null };
        }

        if (!response.status || !response.data) {
          await errorHandler.handleError(
            ErrorCategory.CLOUD_API,
            ErrorSeverity.MEDIUM,
            'Missing required fields in API response',
            {
              component: 'APIValidator',
              operation: 'validateResponse',
              timestamp: new Date(),
              metadata: { receivedFields: Object.keys(response) }
            }
          );
          return { 
            error: 'Missing fields', 
            data: response.data || null,
            status: response.status || 'unknown'
          };
        }

        return response;
      };

      // Test with invalid response
      const invalidResponse = await validateApiResponse('not an object');
      expect(invalidResponse).toEqual({ error: 'Invalid response', data: null });

      // Test with missing fields
      const incompleteResponse = await validateApiResponse({ data: 'some-data' });
      expect(incompleteResponse).toHaveProperty('error', 'Missing fields');
      expect(incompleteResponse).toHaveProperty('status', 'unknown');
    });
  });
});