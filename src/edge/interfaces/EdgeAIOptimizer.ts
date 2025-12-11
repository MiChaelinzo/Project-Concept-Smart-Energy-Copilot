/**
 * Edge AI Optimizer Interface
 * 
 * Manages AI model loading, resource monitoring, and cloud fallback
 * for edge-based inference operations.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

export interface EdgeResourceUsage {
  cpu: number;      // CPU usage as percentage (0.0 to 1.0)
  memory: number;   // Memory usage as percentage (0.0 to 1.0)
  gpu: number;      // GPU usage as percentage (0.0 to 1.0)
  temperature: number; // Device temperature in Celsius
}

export interface ModelLoadResult {
  success: boolean;
  modelName: string;
  loadTimeMs: number;
  errorMessage?: string;
}

export interface InferenceRequest {
  id: string;
  type: 'occupancy' | 'voice' | 'anomaly';
  data: Buffer;
  priority: 'low' | 'medium' | 'high';
  maxLatencyMs: number;
}

export interface InferenceResult {
  requestId: string;
  success: boolean;
  result?: any;
  latencyMs: number;
  processedOnEdge: boolean;
  errorMessage?: string;
}

export interface BatchInferenceOptions {
  maxBatchSize: number;
  maxWaitTimeMs: number;
  priorityThreshold: 'low' | 'medium' | 'high';
}

export interface EdgeAIOptimizer {
  /**
   * Initialize the edge AI optimizer and load models
   * Requirements: 9.1
   */
  initialize(): Promise<void>;

  /**
   * Load AI models onto edge device
   * Requirements: 9.1
   */
  loadModels(modelNames: string[]): Promise<ModelLoadResult[]>;

  /**
   * Get current edge hardware resource usage
   * Requirements: 9.4
   */
  getResourceUsage(): Promise<EdgeResourceUsage>;

  /**
   * Check if edge resources are exhausted (>80% usage)
   * Requirements: 9.4
   */
  isResourceExhausted(): Promise<boolean>;

  /**
   * Process inference request on edge or cloud
   * Requirements: 9.2, 9.3, 9.4, 9.5
   */
  processInference(request: InferenceRequest): Promise<InferenceResult>;

  /**
   * Process multiple inference requests in batch
   * Requirements: 9.5
   */
  processBatchInference(
    requests: InferenceRequest[], 
    options?: BatchInferenceOptions
  ): Promise<InferenceResult[]>;

  /**
   * Force offload inference to cloud
   * Requirements: 9.4
   */
  offloadToCloud(request: InferenceRequest): Promise<InferenceResult>;

  /**
   * Get inference performance metrics
   * Requirements: 9.5
   */
  getPerformanceMetrics(): {
    edgeInferenceCount: number;
    cloudInferenceCount: number;
    averageLatencyMs: number;
    successRate: number;
  };

  /**
   * Cleanup resources and stop monitoring
   */
  cleanup(): void;
}