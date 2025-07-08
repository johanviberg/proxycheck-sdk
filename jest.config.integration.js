/**
 * Jest configuration for integration tests
 * 
 * These tests run against the live ProxyCheck.io API
 */

module.exports = {
  displayName: 'Live API Integration',
  testMatch: [
    '**/tests/integration/**/*.test.ts',
    '**/tests/integration/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  
  // Integration test specific settings
  testTimeout: 30000, // 30 seconds per test
  maxConcurrency: 2, // Limit concurrent tests to respect rate limits
  maxWorkers: 1, // Run tests serially to avoid rate limiting
  
  // Coverage settings (integration tests don't need coverage)
  collectCoverage: false,
  
  // Verbose output for debugging
  verbose: true,
  
  // Note: ts-jest config moved to transform section
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  }
};