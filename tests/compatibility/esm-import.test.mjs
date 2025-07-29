/**
 * ESM Import Compatibility Test
 * Verifies that the SDK can be imported and used correctly with ES modules
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ESM Import Compatibility', () => {
  const distPath = resolve(__dirname, '../../dist/index.mjs');
  
  beforeAll(() => {
    if (!existsSync(distPath)) {
      throw new Error('Distribution files not found. Please run "pnpm build" first.');
    }
  });

  test('should import main class', async () => {
    const { ProxyCheck } = await import('../../dist/index.mjs');
    expect(ProxyCheck).toBeDefined();
    expect(typeof ProxyCheck).toBe('function');
  });

  test('should import legacy client name for backward compatibility', async () => {
    const { ProxyCheckClient } = await import('../../dist/index.mjs');
    expect(ProxyCheckClient).toBeDefined();
    expect(typeof ProxyCheckClient).toBe('function');
  });

  test('should import all exported types', async () => {
    const sdk = await import('../../dist/index.mjs');
    
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

  test('should create client instance with new API', async () => {
    const { ProxyCheck } = await import('../../dist/index.mjs');
    
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

  test('should handle destructuring imports', async () => {
    const { ProxyCheck, VERSION, ProxyCheckError } = await import('../../dist/index.mjs');
    
    expect(ProxyCheck).toBeDefined();
    expect(VERSION).toBeDefined();
    expect(ProxyCheckError).toBeDefined();
  });

  test('should support dynamic imports', async () => {
    const dynamicImport = await import('../../dist/index.mjs');
    
    expect(dynamicImport).toBeDefined();
    expect(dynamicImport.ProxyCheck).toBeDefined();
    expect(typeof dynamicImport.ProxyCheck).toBe('function');
  });

  test('should validate version string', async () => {
    const { VERSION } = await import('../../dist/index.mjs');
    
    expect(typeof VERSION).toBe('string');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(VERSION).toBe('0.9.2');
  });

  test('should support tree-shaking with named imports', async () => {
    // Test that we can import only specific parts
    const { ProxyCheck, ProxyCheckError } = await import('../../dist/index.mjs');
    const sdk = await import('../../dist/index.mjs');
    
    expect(ProxyCheck).toBeDefined();
    expect(ProxyCheckError).toBeDefined();
    
    // Verify they're the same references
    expect(ProxyCheck).toBe(sdk.ProxyCheck);
    expect(ProxyCheckError).toBe(sdk.ProxyCheckError);
  });
});