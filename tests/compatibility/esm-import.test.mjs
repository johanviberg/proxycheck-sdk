/**
 * ESM import compatibility test
 * Tests that the package can be imported using import syntax
 */

import { describe, test, expect } from '@jest/globals';
import proxycheck from '../../dist/index.mjs';
import { 
  ProxyCheckClient, 
  CheckService, 
  ListingService, 
  RulesService, 
  StatsService,
  ProxyCheckError, 
  ProxyCheckAPIError, 
  ProxyCheckValidationError 
} from '../../dist/index.mjs';

describe('ESM Import Compatibility', () => {
  test('should import default export', () => {
    expect(proxycheck).toBeDefined();
    expect(typeof proxycheck).toBe('object');
  });

  test('should import named exports', () => {
    expect(ProxyCheckClient).toBeDefined();
    expect(typeof ProxyCheckClient).toBe('function');
    
    expect(CheckService).toBeDefined();
    expect(ListingService).toBeDefined();
    expect(RulesService).toBeDefined();
    expect(StatsService).toBeDefined();
  });

  test('should import error classes', () => {
    expect(ProxyCheckError).toBeDefined();
    expect(ProxyCheckAPIError).toBeDefined();
    expect(ProxyCheckValidationError).toBeDefined();
    
    expect(typeof ProxyCheckError).toBe('function');
    expect(typeof ProxyCheckAPIError).toBe('function');
    expect(typeof ProxyCheckValidationError).toBe('function');
  });

  test('should create ProxyCheckClient instance', () => {
    const client = new ProxyCheckClient({
      apiKey: 'test-key',
      tlsSecurity: true
    });
    
    expect(client).toBeInstanceOf(ProxyCheckClient);
  });

  test('should access service instances through client', () => {
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

  test('should support tree-shaking with named imports', () => {
    // Test that we can import only specific parts
    expect(ProxyCheckClient).toBeDefined();
    expect(CheckService).toBeDefined();
    
    // Verify they're separate from the default export
    expect(ProxyCheckClient).toBe(proxycheck.ProxyCheckClient);
  });
});