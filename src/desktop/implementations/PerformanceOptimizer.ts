import { ConversationContext, ChatResponse, LightPattern, HealthMetrics } from '../types';

/**
 * Performance Optimizer for AI Chatbot Desktop Device
 * 
 * Optimizes AI response times, manages memory efficiently, monitors resources,
 * implements caching strategies, and optimizes visual pattern rendering.
 */
export class PerformanceOptimizer {
  private responseTimeCache = new Map<string, { response: ChatResponse; timestamp: number; hitCount: number }>();
  private conversationContextCache = new Map<string, { context: ConversationContext; lastAccess: number }>();
  private patternCache = new Map<string, LightPattern>();
  private healthDataCache = new Map<string, { data: HealthMetrics; timestamp: number }>();
  
  // Performance monitoring
  private performanceMetrics = {
    averageResponseTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    totalRequests: 0,
    cachedRequests: 0,
    optimizationsSaved: 0
  };

  // Configuration
  private config = {
    maxCacheSize: 1000,
    cacheExpiryMs: 5 * 60 * 1000, // 5 minutes
    maxContextHistoryLength: 50,
    maxConversationAge: 24 * 60 * 60 * 1000, // 24 hours
    responseTimeTarget: 2000, // 2 seconds
    memoryThresholdMB: 100,
    gcIntervalMs: 30 * 1000, // 30 seconds
    patternOptimizationEnabled: true,
    aggressiveOptimization: false
  };

  private gcTimer?: NodeJS.Timeout;
  private initialized = false;

  /**
   * Initialize the performance optimizer
   */
  async initialize(customConfig?: Partial<typeof this.config>): Promise<void> {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Start garbage collection timer
    this.startGarbageCollection();
    
    // Pre-warm common patterns
    this.preWarmPatternCache();
    
    this.initialized = true;
  }

  /**
   * Optimize AI response processing
   */
  async optimizeResponse(
    inputHash: string,
    responseGenerator: () => Promise<ChatResponse>,
    context: ConversationContext
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;

    // Check cache first
    const cached = this.getCachedResponse(inputHash);
    if (cached) {
      this.performanceMetrics.cachedRequests++;
      this.updateCacheHitRate();
      
      // Update cache statistics
      cached.hitCount++;
      cached.timestamp = Date.now();
      
      return {
        ...cached.response,
        processingTime: Date.now() - startTime,
        context: { ...cached.response.context, fromCache: true }
      };
    }

    // Generate new response with optimizations
    const response = await this.generateOptimizedResponse(responseGenerator, context);
    
    // Cache the response if it's cacheable
    if (this.isCacheable(response)) {
      this.cacheResponse(inputHash, response);
    }

    // Update performance metrics
    const processingTime = Date.now() - startTime;
    this.updateAverageResponseTime(processingTime);

    return {
      ...response,
      processingTime
    };
  }

  /**
   * Optimize conversation context management
   */
  optimizeConversationContext(context: ConversationContext): ConversationContext {
    const optimized = { ...context };

    // Trim message history to prevent memory bloat
    if (optimized.messageHistory.length > this.config.maxContextHistoryLength) {
      // Keep recent messages and important ones
      const recentMessages = optimized.messageHistory.slice(-this.config.maxContextHistoryLength * 0.7);
      const importantMessages = optimized.messageHistory
        .slice(0, -this.config.maxContextHistoryLength * 0.7)
        .filter(msg => this.isImportantMessage(msg));
      
      optimized.messageHistory = [...importantMessages, ...recentMessages];
      this.performanceMetrics.optimizationsSaved++;
    }

    // Optimize context variables
    optimized.contextVariables = this.optimizeContextVariables(optimized.contextVariables);

    // Cache the optimized context
    this.cacheConversationContext(optimized);

    return optimized;
  }

  /**
   * Optimize visual pattern rendering
   */
  optimizePattern(pattern: LightPattern): LightPattern {
    if (!this.config.patternOptimizationEnabled) {
      return pattern;
    }

    const patternKey = this.generatePatternKey(pattern);
    
    // Check pattern cache
    const cached = this.patternCache.get(patternKey);
    if (cached) {
      return cached;
    }

    // Optimize pattern for performance
    const optimized: LightPattern = {
      ...pattern,
      // Reduce color complexity for better performance
      colors: this.optimizeColors(pattern.colors),
      // Optimize duration for smooth animations
      duration: this.optimizeDuration(pattern.duration),
      // Optimize intensity for power efficiency
      intensity: this.optimizeIntensity(pattern.intensity)
    };

    // Cache optimized pattern
    this.patternCache.set(patternKey, optimized);
    
    return optimized;
  }

  /**
   * Monitor and report resource usage
   */
  getResourceMonitoring(): {
    memory: { used: number; threshold: number; percentage: number };
    cpu: { usage: number; cores: number };
    cache: { size: number; hitRate: number; efficiency: number };
    performance: {
      averageResponseTime: number;
      cacheHitRate: number;
      totalRequests: number;
      cachedRequests: number;
      optimizationsSaved: number;
    };
  } {
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCpuUsage();
    
    return {
      memory: {
        used: memoryUsage,
        threshold: this.config.memoryThresholdMB,
        percentage: (memoryUsage / this.config.memoryThresholdMB) * 100
      },
      cpu: {
        usage: cpuUsage,
        cores: this.getCpuCores()
      },
      cache: {
        size: this.getTotalCacheSize(),
        hitRate: this.performanceMetrics.cacheHitRate,
        efficiency: this.calculateCacheEfficiency()
      },
      performance: {
        averageResponseTime: this.performanceMetrics.averageResponseTime,
        cacheHitRate: this.performanceMetrics.cacheHitRate,
        totalRequests: this.performanceMetrics.totalRequests,
        cachedRequests: this.performanceMetrics.cachedRequests,
        optimizationsSaved: this.performanceMetrics.optimizationsSaved
      }
    };
  }

  /**
   * Implement automatic performance tuning
   */
  async autoTune(): Promise<void> {
    const resources = this.getResourceMonitoring();
    
    // Memory optimization
    if (resources.memory.percentage > 80) {
      await this.aggressiveMemoryCleanup();
    } else if (resources.memory.percentage > 60) {
      await this.moderateMemoryCleanup();
    }

    // Cache optimization
    if (resources.cache.hitRate < 0.3) {
      this.optimizeCacheStrategy();
    }

    // Response time optimization
    if (this.performanceMetrics.averageResponseTime > this.config.responseTimeTarget) {
      this.enableAggressiveOptimizations();
    }

    // CPU optimization
    if (resources.cpu.usage > 80) {
      this.reduceCpuIntensiveOperations();
    }
  }

  /**
   * Create caching strategy for frequently accessed data
   */
  cacheFrequentData(key: string, data: any, type: 'health' | 'calendar' | 'energy' | 'general'): void {
    switch (type) {
      case 'health':
        if (this.isValidHealthData(data)) {
          this.healthDataCache.set(key, {
            data: data as HealthMetrics,
            timestamp: Date.now()
          });
        }
        break;
      // Add other cache types as needed
    }
  }

  /**
   * Get cached data
   */
  getCachedData(key: string, type: 'health' | 'calendar' | 'energy' | 'general'): any | null {
    switch (type) {
      case 'health':
        const healthData = this.healthDataCache.get(key);
        if (healthData && !this.isExpired(healthData.timestamp)) {
          return healthData.data;
        }
        break;
      // Add other cache types as needed
    }
    return null;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    
    this.clearAllCaches();
    this.initialized = false;
  }

  // Private helper methods

  private getCachedResponse(inputHash: string): { response: ChatResponse; timestamp: number; hitCount: number } | null {
    const cached = this.responseTimeCache.get(inputHash);
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.responseTimeCache.delete(inputHash);
    }
    
    return null;
  }

  private async generateOptimizedResponse(
    responseGenerator: () => Promise<ChatResponse>,
    context: ConversationContext
  ): Promise<ChatResponse> {
    // Optimize context before processing
    const optimizedContext = this.optimizeConversationContext(context);
    
    // Generate response with timeout to ensure 2-second target
    const timeoutPromise = new Promise<ChatResponse>((_, reject) => {
      setTimeout(() => reject(new Error('Response timeout')), this.config.responseTimeTarget);
    });

    try {
      const response = await Promise.race([
        responseGenerator(),
        timeoutPromise
      ]);

      return response;
    } catch (error) {
      // Return fallback response if generation fails or times out
      return this.getFallbackResponse(context);
    }
  }

  private isCacheable(response: ChatResponse): boolean {
    // Don't cache responses that require follow-up or are user-specific
    return !response.requiresFollowUp && 
           response.confidence > 0.7 &&
           !response.context?.needsClarification;
  }

  private cacheResponse(inputHash: string, response: ChatResponse): void {
    // Implement LRU eviction if cache is full
    if (this.responseTimeCache.size >= this.config.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.responseTimeCache.set(inputHash, {
      response: { ...response },
      timestamp: Date.now(),
      hitCount: 0
    });
  }

  private cacheConversationContext(context: ConversationContext): void {
    this.conversationContextCache.set(context.conversationId, {
      context: { ...context },
      lastAccess: Date.now()
    });
  }

  private isImportantMessage(message: any): boolean {
    // Consider messages important if they contain key information
    const importantKeywords = ['appointment', 'reminder', 'health', 'energy', 'error', 'warning'];
    return importantKeywords.some(keyword => 
      message.content?.toLowerCase().includes(keyword)
    );
  }

  private optimizeContextVariables(variables: Record<string, any>): Record<string, any> {
    const optimized: Record<string, any> = {};
    
    // Keep only recent and important variables
    for (const [key, value] of Object.entries(variables)) {
      if (this.isImportantContextVariable(key, value)) {
        optimized[key] = value;
      }
    }
    
    return optimized;
  }

  private isImportantContextVariable(key: string, value: any): boolean {
    // Keep essential context variables
    const essentialKeys = ['userId', 'sessionStart', 'currentTopic', 'domain', 'intent'];
    return essentialKeys.includes(key) || 
           (typeof value === 'object' && value.timestamp && !this.isExpired(value.timestamp));
  }

  private generatePatternKey(pattern: LightPattern): string {
    return `${pattern.type}_${pattern.colors.length}_${pattern.duration}_${pattern.intensity}`;
  }

  private optimizeColors(colors: any[]): any[] {
    // Reduce color complexity for better performance
    if (colors.length > 5) {
      return colors.slice(0, 5); // Limit to 5 colors max
    }
    return colors;
  }

  private optimizeDuration(duration: number): number {
    // Ensure duration is optimized for smooth 60fps animations
    const frameTime = 16.67; // 60fps
    const optimized = Math.round(duration / frameTime) * frameTime;
    // Never exceed the original duration to maintain timing constraints
    return Math.min(optimized, duration);
  }

  private optimizeIntensity(intensity: number): number {
    // Optimize intensity for power efficiency
    if (this.config.aggressiveOptimization) {
      return Math.min(intensity, 80); // Cap at 80% for power savings
    }
    return intensity;
  }

  private preWarmPatternCache(): void {
    // Pre-cache common patterns
    const commonPatterns = [
      { type: 'pulse', colors: [{ red: 0, green: 150, blue: 255 }], duration: 2000, intensity: 70, repeat: true },
      { type: 'wave', colors: [{ red: 0, green: 255, blue: 100 }], duration: 1000, intensity: 75, repeat: true },
      { type: 'flash', colors: [{ red: 255, green: 0, blue: 0 }], duration: 500, intensity: 90, repeat: false }
    ];

    for (const pattern of commonPatterns) {
      const key = this.generatePatternKey(pattern as any);
      this.patternCache.set(key, pattern as any);
    }
  }

  private startGarbageCollection(): void {
    this.gcTimer = setInterval(() => {
      this.performGarbageCollection();
    }, this.config.gcIntervalMs);
  }

  private performGarbageCollection(): void {
    const now = Date.now();
    
    // Clean expired response cache
    for (const [key, cached] of this.responseTimeCache.entries()) {
      if (this.isExpired(cached.timestamp)) {
        this.responseTimeCache.delete(key);
      }
    }

    // Clean expired conversation contexts
    for (const [key, cached] of this.conversationContextCache.entries()) {
      if (now - cached.lastAccess > this.config.maxConversationAge) {
        this.conversationContextCache.delete(key);
      }
    }

    // Clean expired health data
    for (const [key, cached] of this.healthDataCache.entries()) {
      if (this.isExpired(cached.timestamp)) {
        this.healthDataCache.delete(key);
      }
    }
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.config.cacheExpiryMs;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, cached] of this.responseTimeCache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.responseTimeCache.delete(oldestKey);
    }
  }

  private updateAverageResponseTime(newTime: number): void {
    const totalRequests = this.performanceMetrics.totalRequests;
    this.performanceMetrics.averageResponseTime = 
      ((this.performanceMetrics.averageResponseTime * (totalRequests - 1)) + newTime) / totalRequests;
  }

  private updateCacheHitRate(): void {
    this.performanceMetrics.cacheHitRate = 
      this.performanceMetrics.cachedRequests / this.performanceMetrics.totalRequests;
  }

  private getMemoryUsage(): number {
    // Get memory usage in MB
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    return 0;
  }

  private getCpuUsage(): number {
    // Get CPU usage percentage
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return (usage.user + usage.system) / 1000000; // Convert to seconds
    }
    return 0;
  }

  private getCpuCores(): number {
    if (typeof require !== 'undefined') {
      try {
        const os = require('os');
        return os.cpus().length;
      } catch {
        return 1;
      }
    }
    return 1;
  }

  private getTotalCacheSize(): number {
    return this.responseTimeCache.size + 
           this.conversationContextCache.size + 
           this.patternCache.size + 
           this.healthDataCache.size;
  }

  private calculateCacheEfficiency(): number {
    const totalSize = this.getTotalCacheSize();
    const hitRate = this.performanceMetrics.cacheHitRate;
    return totalSize > 0 ? hitRate * (totalSize / this.config.maxCacheSize) : 0;
  }

  private async aggressiveMemoryCleanup(): Promise<void> {
    // Clear half of the caches
    const responseEntries = Array.from(this.responseTimeCache.entries());
    const contextEntries = Array.from(this.conversationContextCache.entries());
    
    // Keep most recently used entries
    responseEntries
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(Math.floor(responseEntries.length / 2))
      .forEach(([key]) => this.responseTimeCache.delete(key));
    
    contextEntries
      .sort((a, b) => b[1].lastAccess - a[1].lastAccess)
      .slice(Math.floor(contextEntries.length / 2))
      .forEach(([key]) => this.conversationContextCache.delete(key));

    this.performanceMetrics.optimizationsSaved++;
  }

  private async moderateMemoryCleanup(): Promise<void> {
    // Clear expired entries only
    this.performGarbageCollection();
  }

  private optimizeCacheStrategy(): void {
    // Increase cache expiry time to improve hit rate
    this.config.cacheExpiryMs = Math.min(this.config.cacheExpiryMs * 1.5, 15 * 60 * 1000);
  }

  private enableAggressiveOptimizations(): void {
    this.config.aggressiveOptimization = true;
    this.config.responseTimeTarget = Math.max(this.config.responseTimeTarget * 0.9, 1500);
  }

  private reduceCpuIntensiveOperations(): void {
    this.config.patternOptimizationEnabled = false;
    this.config.aggressiveOptimization = true;
  }

  private getFallbackResponse(context: ConversationContext): ChatResponse {
    return {
      text: "I'm processing your request. Please give me a moment.",
      confidence: 0.5,
      processingTime: 100,
      requiresFollowUp: false,
      context: { fallback: true }
    };
  }

  private isValidHealthData(data: any): boolean {
    return data && typeof data === 'object' && 
           typeof data.sedentaryTime === 'number' &&
           data.lastMovement instanceof Date;
  }

  private clearAllCaches(): void {
    this.responseTimeCache.clear();
    this.conversationContextCache.clear();
    this.patternCache.clear();
    this.healthDataCache.clear();
  }
}