/**
 * Comprehensive error handling and recovery system
 * Requirements: All (cross-cutting)
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  DEVICE_COMMUNICATION = 'device_communication',
  CLOUD_API = 'cloud_api',
  AI_INFERENCE = 'ai_inference',
  DATA_VALIDATION = 'data_validation',
  ANOMALY_DETECTION = 'anomaly_detection',
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  SYSTEM = 'system'
}

export interface ErrorContext {
  component: string;
  operation: string;
  deviceId?: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SystemError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  context: ErrorContext;
  retryCount: number;
  maxRetries: number;
  isRecoverable: boolean;
  recoveryActions: string[];
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs?: number;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: ('push' | 'email' | 'sms')[];
  throttleMs: number;
}

/**
 * Exponential backoff retry utility with jitter
 */
export class RetryManager {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 100
  };

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    let lastError: Error;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === finalConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(
          finalConfig.baseDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelayMs
        );
        
        const jitter = finalConfig.jitterMs ? 
          Math.random() * finalConfig.jitterMs : 0;
        
        const delay = baseDelay + jitter;

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * User notification system for critical errors
 */
export class NotificationManager {
  private notificationHistory: Map<string, Date> = new Map();
  private config: NotificationConfig;

  constructor(config: NotificationConfig = {
    enabled: true,
    channels: ['push'],
    throttleMs: 300000 // 5 minutes
  }) {
    this.config = config;
  }

  async notifyUser(error: SystemError): Promise<void> {
    if (!this.config.enabled || error.severity === ErrorSeverity.LOW) {
      return;
    }

    const notificationKey = `${error.category}_${error.context.component}`;
    const lastNotification = this.notificationHistory.get(notificationKey);
    
    // Throttle notifications to prevent spam
    if (lastNotification && 
        Date.now() - lastNotification.getTime() < this.config.throttleMs) {
      return;
    }

    this.notificationHistory.set(notificationKey, new Date());

    const message = this.formatNotificationMessage(error);
    
    for (const channel of this.config.channels) {
      try {
        await this.sendNotification(channel, message, error);
      } catch (notificationError) {
        console.error(`Failed to send ${channel} notification:`, notificationError);
      }
    }
  }

  private formatNotificationMessage(error: SystemError): string {
    const severity = error.severity.toUpperCase();
    const component = error.context.component;
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return `🚨 CRITICAL: ${component} failure - ${error.message}. Immediate attention required.`;
      case ErrorSeverity.HIGH:
        return `⚠️ HIGH: ${component} error - ${error.message}. Please check system status.`;
      case ErrorSeverity.MEDIUM:
        return `⚡ MEDIUM: ${component} issue - ${error.message}. System continuing with degraded functionality.`;
      default:
        return `ℹ️ INFO: ${component} - ${error.message}`;
    }
  }

  private async sendNotification(
    channel: 'push' | 'email' | 'sms',
    message: string,
    error: SystemError
  ): Promise<void> {
    // In a real implementation, this would integrate with notification services
    // For now, we'll log the notification
    console.log(`[${channel.toUpperCase()}] ${message}`);
    
    // Store notification for debugging/monitoring
    const notification = {
      channel,
      message,
      errorId: error.id,
      timestamp: new Date(),
      severity: error.severity
    };
    
    // In production, this would be sent to monitoring/logging service
    console.log('Notification sent:', notification);
  }
}

/**
 * Central error handling and recovery system
 */
export class ErrorHandler {
  private errorLog: SystemError[] = [];
  private notificationManager: NotificationManager;
  private recoveryStrategies: Map<ErrorCategory, (error: SystemError) => Promise<boolean>> = new Map();

  constructor(notificationConfig?: NotificationConfig) {
    this.notificationManager = new NotificationManager(notificationConfig);
    this.initializeRecoveryStrategies();
  }

  /**
   * Handle an error with automatic recovery attempts
   */
  async handleError(
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    context: ErrorContext,
    originalError?: Error,
    retryConfig?: Partial<RetryConfig>
  ): Promise<SystemError> {
    const systemError: SystemError = {
      id: this.generateErrorId(),
      category,
      severity,
      message,
      originalError,
      context,
      retryCount: 0,
      maxRetries: retryConfig?.maxRetries || 3,
      isRecoverable: this.isRecoverable(category, severity),
      recoveryActions: this.getRecoveryActions(category)
    };

    // Log the error
    this.logError(systemError);

    // Send notifications for high severity errors
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
      await this.notificationManager.notifyUser(systemError);
    }

    // Attempt automatic recovery for recoverable errors
    if (systemError.isRecoverable) {
      await this.attemptRecovery(systemError);
    }

    return systemError;
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    category: ErrorCategory,
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    try {
      return await RetryManager.executeWithRetry(
        operation,
        retryConfig,
        (attempt, error) => {
          this.handleError(
            category,
            ErrorSeverity.MEDIUM,
            `Retry attempt ${attempt}: ${error.message}`,
            { ...context, operation: `${context.operation}_retry_${attempt}` },
            error
          );
        }
      );
    } catch (error) {
      const systemError = await this.handleError(
        category,
        this.determineSeverity(error as Error, category),
        (error as Error).message,
        context,
        error as Error,
        retryConfig
      );
      
      throw systemError;
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: SystemError[];
  } {
    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    // Count errors
    this.errorLog.forEach(error => {
      errorsByCategory[error.category]++;
      errorsBySeverity[error.severity]++;
    });

    // Get recent errors (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentErrors = this.errorLog.filter(
      error => error.context.timestamp > oneDayAgo
    );

    return {
      totalErrors: this.errorLog.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors
    };
  }

  /**
   * Clear error log (for testing/maintenance)
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  private initializeRecoveryStrategies(): void {
    // Device communication recovery
    this.recoveryStrategies.set(ErrorCategory.DEVICE_COMMUNICATION, async (error) => {
      // Try to re-establish device connection
      console.log(`Attempting device communication recovery for ${error.context.deviceId}`);
      return true; // Simplified for now
    });

    // Cloud API recovery
    this.recoveryStrategies.set(ErrorCategory.CLOUD_API, async (error) => {
      // Check API status and attempt reconnection
      console.log(`Attempting cloud API recovery for ${error.context.component}`);
      return true; // Simplified for now
    });

    // Network recovery
    this.recoveryStrategies.set(ErrorCategory.NETWORK, async (error) => {
      // Check network connectivity
      console.log(`Attempting network recovery for ${error.context.component}`);
      return true; // Simplified for now
    });
  }

  private async attemptRecovery(error: SystemError): Promise<boolean> {
    const recoveryStrategy = this.recoveryStrategies.get(error.category);
    
    if (!recoveryStrategy) {
      return false;
    }

    try {
      const recovered = await recoveryStrategy(error);
      if (recovered) {
        console.log(`Successfully recovered from error ${error.id}`);
      }
      return recovered;
    } catch (recoveryError) {
      console.error(`Recovery failed for error ${error.id}:`, recoveryError);
      return false;
    }
  }

  private logError(error: SystemError): void {
    this.errorLog.push(error);
    
    // Keep only last 1000 errors to prevent memory issues
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-1000);
    }

    // Log to console with appropriate level
    const logLevel = this.getLogLevel(error.severity);
    console[logLevel](`[${error.category}] ${error.message}`, {
      errorId: error.id,
      component: error.context.component,
      operation: error.context.operation,
      deviceId: error.context.deviceId,
      originalError: error.originalError?.message
    });
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'info';
    }
  }

  private isRecoverable(category: ErrorCategory, severity: ErrorSeverity): boolean {
    // Critical errors are generally not auto-recoverable
    if (severity === ErrorSeverity.CRITICAL) {
      return false;
    }

    // Some categories are more recoverable than others
    const recoverableCategories = [
      ErrorCategory.DEVICE_COMMUNICATION,
      ErrorCategory.CLOUD_API,
      ErrorCategory.NETWORK
    ];

    return recoverableCategories.includes(category);
  }

  private getRecoveryActions(category: ErrorCategory): string[] {
    const actions: Record<ErrorCategory, string[]> = {
      [ErrorCategory.DEVICE_COMMUNICATION]: [
        'Retry device connection',
        'Check device power status',
        'Verify network connectivity',
        'Reset device if necessary'
      ],
      [ErrorCategory.CLOUD_API]: [
        'Retry API call with backoff',
        'Check API credentials',
        'Verify internet connection',
        'Use cached data if available'
      ],
      [ErrorCategory.AI_INFERENCE]: [
        'Fallback to cloud inference',
        'Use last known state',
        'Reduce model complexity',
        'Check hardware resources'
      ],
      [ErrorCategory.DATA_VALIDATION]: [
        'Use default values',
        'Request user input',
        'Skip invalid data',
        'Log validation errors'
      ],
      [ErrorCategory.ANOMALY_DETECTION]: [
        'Allow user override',
        'Implement cooldown period',
        'Adjust thresholds',
        'Manual device control'
      ],
      [ErrorCategory.NETWORK]: [
        'Retry connection',
        'Check network settings',
        'Use offline mode',
        'Queue operations'
      ],
      [ErrorCategory.CONFIGURATION]: [
        'Use default configuration',
        'Request user reconfiguration',
        'Validate settings',
        'Reset to factory defaults'
      ],
      [ErrorCategory.SYSTEM]: [
        'Restart component',
        'Check system resources',
        'Clear caches',
        'Contact support'
      ]
    };

    return actions[category] || ['Contact support'];
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Determine severity based on error type and category
    const message = error.message.toLowerCase();

    // Critical keywords
    if (message.includes('critical') || message.includes('fatal') || 
        message.includes('shutdown') || message.includes('emergency')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity keywords
    if (message.includes('timeout') || message.includes('connection') ||
        message.includes('authentication') || message.includes('unauthorized')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity for most operational errors
    if (category === ErrorCategory.DEVICE_COMMUNICATION || 
        category === ErrorCategory.CLOUD_API) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * Graceful degradation utility
 */
export class GracefulDegradation {
  private static featureFlags: Map<string, boolean> = new Map();
  private static fallbackValues: Map<string, any> = new Map();

  /**
   * Execute operation with graceful degradation
   */
  static async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T> | T,
    featureName: string
  ): Promise<T> {
    // Check if feature is disabled
    if (this.featureFlags.get(featureName) === false) {
      return await fallback();
    }

    try {
      return await operation();
    } catch (error) {
      console.warn(`Feature ${featureName} failed, using fallback:`, error);
      
      // Disable feature temporarily
      this.featureFlags.set(featureName, false);
      
      // Re-enable after 5 minutes
      setTimeout(() => {
        this.featureFlags.set(featureName, true);
      }, 5 * 60 * 1000);

      return await fallback();
    }
  }

  /**
   * Get cached value or default
   */
  static getCachedOrDefault<T>(key: string, defaultValue: T): T {
    return this.fallbackValues.get(key) || defaultValue;
  }

  /**
   * Set cached fallback value
   */
  static setCachedValue<T>(key: string, value: T): void {
    this.fallbackValues.set(key, value);
  }

  /**
   * Enable/disable feature
   */
  static setFeatureEnabled(featureName: string, enabled: boolean): void {
    this.featureFlags.set(featureName, enabled);
  }

  /**
   * Check if feature is enabled
   */
  static isFeatureEnabled(featureName: string): boolean {
    return this.featureFlags.get(featureName) !== false;
  }
}