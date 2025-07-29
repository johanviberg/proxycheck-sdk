/**
 * CommonJS Import Compatibility Test
 * Verifies that the SDK can be imported and used correctly with CommonJS
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

describe('CommonJS Import Compatibility', () => {
  const distPath = path.resolve(__dirname, '../../dist/index.js');
  
  beforeAll(() => {
    if (!fs.existsSync(distPath)) {
      throw new Error('Distribution files not found. Please run "pnpm build" first.');
    }
  });

  test('should import main class using require', () => {
    const { ProxyCheck } = require('../../dist/index.js');
    expect(ProxyCheck).toBeDefined();
    expect(typeof ProxyCheck).toBe('function');
  });

  test('should import legacy client name for backward compatibility', () => {
    const { ProxyCheckClient } = require('../../dist/index.js');
    expect(ProxyCheckClient).toBeDefined();
    expect(typeof ProxyCheckClient).toBe('function');
  });

  test('should import all exported types', () => {
    const sdk = require('../../dist/index.js');
    
    // Core exports
    expect(sdk.ProxyCheck).toBeDefined();
    expect(sdk.ProxyCheckClient).toBeDefined();
    expect(sdk.VERSION).toBeDefined();
    
    // Error exports
    expect(sdk.ProxyCheckError).toBeDefined();
    expect(sdk.ProxyCheckConfigurationError).toBeDefined();
    expect(sdk.ProxyCheckAuthError).toBeDefined();
    expect(sdk.ProxyCheckRateLimitError).toBeDefined();
    expect(sdk.ProxyCheckNetworkError).toBeDefined();
    expect(sdk.ProxyCheckServiceError).toBeDefined();
    expect(sdk.ProxyCheckDataError).toBeDefined();
    expect(sdk.ProxyCheckTimeoutError).toBeDefined();
    expect(sdk.ProxyCheckNotFoundError).toBeDefined();
    expect(sdk.ProxyCheckQuotaError).toBeDefined();
  });

  test('should create client instance with new API', () => {
    const { ProxyCheck } = require('../../dist/index.js');
    
    const client = new ProxyCheck({
      apiKey: 'test-key'
    });
    
    expect(client).toBeDefined();
    expect(typeof client.check).toBe('function');
    expect(typeof client.checkBatch).toBe('function');
    expect(typeof client.isProxy).toBe('function');
    expect(typeof client.isVPN).toBe('function');
    expect(typeof client.isSuspicious).toBe('function');
    expect(typeof client.isDisposableEmail).toBe('function');
    expect(typeof client.getRiskLevel).toBe('function');
    expect(typeof client.isFromCountry).toBe('function');
    expect(client.dashboard).toBeDefined();
    expect(client.lists).toBeDefined();
  });

  test('should handle destructuring imports', () => {
    const { ProxyCheck, VERSION, ProxyCheckError } = require('../../dist/index.js');
    
    expect(ProxyCheck).toBeDefined();
    expect(VERSION).toBeDefined();
    expect(ProxyCheckError).toBeDefined();
  });

  test('should validate version string', () => {
    const { VERSION } = require('../../dist/index.js');
    
    expect(typeof VERSION).toBe('string');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(VERSION).toBe('0.9.2');
  });
});