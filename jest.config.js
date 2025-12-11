module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/types.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: false, // Disable verbose output
  testTimeout: 10000, // 10 second timeout for all tests
  maxWorkers: 1, // Run tests sequentially to avoid resource conflicts
  forceExit: true, // Force exit after tests complete
  detectOpenHandles: true, // Help detect hanging resources
  silent: true, // Suppress console output during tests
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'] // Setup test environment
};
