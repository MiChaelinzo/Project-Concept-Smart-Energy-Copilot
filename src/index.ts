/**
 * Smart Energy Copilot - Main entry point
 * 
 * This is an AI-powered IoT system that optimizes energy consumption
 * by learning user behavior and dynamically managing connected devices.
 */

// Export all edge interfaces and implementations
export * from './edge/interfaces';
export * from './edge/implementations';
export * from './edge/types';

// Export all cloud interfaces and implementations
export * from './cloud/interfaces';
export * from './cloud/implementations';
export * from './cloud/types';

// Export all mobile interfaces and implementations
export * from './mobile/interfaces';
export * from './mobile/implementations';
export * from './mobile/types';

// Export all blockchain interfaces and implementations
export * from './blockchain/interfaces/EnergyTrading';
export * from './blockchain/implementations';

// Export all common utilities
export * from './common';

// Export all desktop interfaces and implementations
export * from './desktop';
