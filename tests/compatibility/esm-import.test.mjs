/**
 * ESM import compatibility test
 * Tests that the package can be imported using import syntax
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
  test('should import default export', async () => {
    const proxycheck = await import('../../dist/index.mjs');
    expect(proxycheck).toBeDefined();
    expect(typeof proxycheck).toBe('object');
  });

  test('should import named exports', async () => {
    const { 
      ProxyCheckClient, 
      CheckService, 
      ListingService, 
      RulesService, 
      StatsService 
    } = await import('../../dist/index.mjs');
    
    expect(ProxyCheckClient).toBeDefined();
    expect(typeof ProxyCheckClient).toBe('function');
    
    expect(CheckService).toBeDefined();
    expect(ListingService).toBeDefined();
    expect(RulesService).toBeDefined();
    expect(StatsService).toBeDefined();
  });

  test('should import error classes', async () => {
    const { 
      ProxyCheckError, 
      ProxyCheckAPIError, 
      ProxyCheckValidationError 
    } = await import('../../dist/index.mjs');
    
    expect(ProxyCheckError).toBeDefined();
    expect(ProxyCheckAPIError).toBeDefined();
    expect(ProxyCheckValidationError).toBeDefined();
    
    expect(typeof ProxyCheckError).toBe('function');
    expect(typeof ProxyCheckAPIError).toBe('function');
    expect(typeof ProxyCheckValidationError).toBe('function');
  });

  test('should create ProxyCheckClient instance', async () => {
    const { ProxyCheckClient } = await import('../../dist/index.mjs');
    
    const client = new ProxyCheckClient({
      apiKey: 'test-key',
      tlsSecurity: true
    });
    
    expect(client).toBeInstanceOf(ProxyCheckClient);
  });

  test('should access service instances through client', async () => {
    const { ProxyCheckClient } = await import('../../dist/index.mjs');
    
    const client = new ProxyCheckClient({
      apiKey: 'test-key'
    });
    
    expect(client.check).toBeDefined();
    expect(client.listing).toBeDefined();
    expect(client.rules).toBeDefined();
    expect(client.stats).toBeDefined();
  });

  test('should support dynamic imports', async () => {
    const dynamicImport = await import('../../dist/index.mjs');
    
    expect(dynamicImport).toBeDefined();
    expect(dynamicImport.ProxyCheckClient).toBeDefined();
    expect(typeof dynamicImport.ProxyCheckClient).toBe('function');
  });

  test('should support tree-shaking with named imports', async () => {
    // Test that we can import only specific parts
    const { ProxyCheckClient, CheckService } = await import('../../dist/index.mjs');
    const proxycheck = await import('../../dist/index.mjs');
    
    expect(ProxyCheckClient).toBeDefined();
    expect(CheckService).toBeDefined();
    
    // Verify they're separate from the default export
    expect(ProxyCheckClient).toBe(proxycheck.ProxyCheckClient);
  });
});