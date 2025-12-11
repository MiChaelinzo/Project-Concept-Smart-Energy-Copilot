/**
 * Test setup configuration
 * Sets up environment variables and global test configuration
 */

// Set NODE_ENV to test to prevent timers from starting
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Cleanup function to ensure resources are cleaned up after each test
afterEach(() => {
  // Clear any remaining timers
  jest.clearAllTimers();
});