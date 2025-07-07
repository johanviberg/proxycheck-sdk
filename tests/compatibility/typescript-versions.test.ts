/**
 * TypeScript version compatibility test
 * Tests that the package works with different TypeScript versions
 */

import { describe, test, expect } from '@jest/globals';
import { ProxyCheckClient, ProxyCheckError } from '../../src/index';
import type { 
  ProxyCheckOptions, 
  ClientConfig,
  ProxyType
} from '../../src/types';

describe('TypeScript Version Compatibility', () => {
  test('should provide correct type definitions', () => {
    // Test that TypeScript can infer types correctly
    const config: ClientConfig = {
      apiKey: 'test-key',
      tlsSecurity: true,
      timeout: 5000,
      retries: 3
    };
    
    expect(config).toBeDefined();
    expect(typeof config.apiKey).toBe('string');
    expect(typeof config.tlsSecurity).toBe('boolean');
  });

  test('should support strict TypeScript mode', () => {
    // Test strict mode compatibility
    const client = new ProxyCheckClient({
      apiKey: 'test-key'
    });
    
    // TypeScript should enforce proper typing
    expect(client).toBeInstanceOf(ProxyCheckClient);
    expect(client.check).toBeDefined();
  });

  test('should properly type service methods', () => {
    const client = new ProxyCheckClient({ apiKey: 'test' });
    
    // Test that service methods have correct signatures
    expect(typeof client.check.checkAddress).toBe('function');
    expect(typeof client.check.checkAddresses).toBe('function');
    expect(typeof client.listing.addToWhitelist).toBe('function');
    expect(typeof client.listing.addToBlacklist).toBe('function');
  });

  test('should support union types for API responses', () => {
    // Test that union types work correctly
    const proxyType: ProxyType = 'VPN';
    const vpnLevel: 0 | 1 | 2 | 3 = 2;
    
    expect(['VPN', 'PUB', 'WEB', 'TOR'].includes(proxyType)).toBe(true);
    expect([0, 1, 2, 3].includes(vpnLevel)).toBe(true);
  });

  test('should support generic types', () => {
    // Test generic type parameters
    const options: ProxyCheckOptions = {
      vpnDetection: 1,
      asnData: true,
      riskData: 1
    };
    
    expect(options).toBeDefined();
    expect(typeof options.vpnDetection).toBe('number');
    expect(typeof options.asnData).toBe('boolean');
  });

  test('should properly extend Error classes', () => {
    // Test that error classes extend Error correctly
    const error = new ProxyCheckError('Test error', 'TEST_ERROR');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ProxyCheckError);
    expect(error.name).toBe('ProxyCheckError');
    expect(error.message).toBe('Test error');
  });

  test('should support utility types', () => {
    // Test that utility types work correctly
    type PartialConfig = Partial<ClientConfig>;
    
    const partialConfig: PartialConfig = {
      apiKey: 'test'
    };
    
    expect(partialConfig).toBeDefined();
    expect(typeof partialConfig.apiKey).toBe('string');
  });

  test('should support conditional types', () => {
    // Test conditional type support
    type ApiKeyType<T extends ClientConfig> = T['apiKey'];
    
    const config: ClientConfig = { apiKey: 'test' };
    const apiKey: ApiKeyType<typeof config> = config.apiKey;
    
    expect(typeof apiKey).toBe('string');
  });

  test('should support mapped types', () => {
    // Test mapped type support
    type OptionalConfig = {
      [K in keyof ClientConfig]?: ClientConfig[K];
    };
    
    const optionalConfig: OptionalConfig = {
      apiKey: 'test',
      tlsSecurity: true
    };
    
    expect(optionalConfig).toBeDefined();
  });

  test('should support template literal types', () => {
    // Test template literal type support
    type CountryCode = 'US' | 'CA' | 'GB';
    type CountryMessage = `Country: ${CountryCode}`;
    
    const message: CountryMessage = 'Country: US';
    
    expect(message).toBe('Country: US');
  });
});