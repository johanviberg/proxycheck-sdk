/**
 * CommonJS import compatibility test
 * Tests that the package can be imported using require() syntax
 */

const { describe, test, expect } = require('@jest/globals');

describe('CommonJS Import Compatibility', () => {
  test('should import main module using require()', () => {
    const proxycheck = require('../../dist/index.js');
    
    expect(proxycheck).toBeDefined();
    expect(typeof proxycheck).toBe('object');
  });

  test('should import ProxyCheckClient class', () => {
    const { ProxyCheckClient } = require('../../dist/index.js');
    
    expect(ProxyCheckClient).toBeDefined();
    expect(typeof ProxyCheckClient).toBe('function');
  });

  test('should import error classes', () => {
    const { 
      ProxyCheckError, 
      ProxyCheckAPIError, 
      ProxyCheckValidationError 
    } = require('../../dist/index.js');
    
    expect(ProxyCheckError).toBeDefined();
    expect(ProxyCheckAPIError).toBeDefined();
    expect(ProxyCheckValidationError).toBeDefined();
  });

  test('should import types and interfaces', () => {
    const proxycheck = require('../../dist/index.js');
    
    // Check that exported types are available at runtime
    expect(proxycheck.ProxyCheckClient).toBeDefined();
    expect(proxycheck.CheckService).toBeDefined();
    expect(proxycheck.ListingService).toBeDefined();
    expect(proxycheck.RulesService).toBeDefined();
    expect(proxycheck.StatsService).toBeDefined();
  });

  test('should create ProxyCheckClient instance', () => {
    const { ProxyCheckClient } = require('../../dist/index.js');
    
    const client = new ProxyCheckClient({
      apiKey: 'test-key',
      tlsSecurity: true
    });
    
    expect(client).toBeInstanceOf(ProxyCheckClient);
  });

  test('should access service instances through client', () => {
    const { ProxyCheckClient } = require('../../dist/index.js');
    
    const client = new ProxyCheckClient({
      apiKey: 'test-key'
    });
    
    expect(client.check).toBeDefined();
    expect(client.listing).toBeDefined();
    expect(client.rules).toBeDefined();
    expect(client.stats).toBeDefined();
  });
});