// AI Chatbot Desktop Device Module
export * from './interfaces';
export * from './implementations';

// Export desktop-specific types with namespace to avoid conflicts
export * as DesktopTypes from './types';

// Export performance optimization components
export { PerformanceOptimizer } from './implementations/PerformanceOptimizer';
export { ResourceMonitor } from './implementations/ResourceMonitor';
export { PerformanceManager } from './implementations/PerformanceManager';

// Export main entry point and hub
export { DesktopHubImpl } from './implementations/DesktopHubImpl';
export { DesktopHubMain } from './main';
export { SystemManagerCLI } from './cli/system-manager';