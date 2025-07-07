/**
 * ESM usage example
 * Demonstrates how to use the package with import syntax
 */

import { ProxyCheckClient } from '../../dist/index.mjs';

// Create client instance
const client = new ProxyCheckClient({
  apiKey: process.env.PROXYCHECK_API_KEY || 'demo-key',
  tlsSecurity: true
});

// Example usage
async function testESMUsage() {
  try {
    console.log('Testing ESM import...');
    
    // Test that services are accessible
    console.log('✓ CheckService available:', typeof client.check);
    console.log('✓ ListingService available:', typeof client.listing);
    console.log('✓ RulesService available:', typeof client.rules);
    console.log('✓ StatsService available:', typeof client.stats);
    
    // Test dynamic import
    const dynamicImport = await import('../../dist/index.mjs');
    console.log('✓ Dynamic import working:', typeof dynamicImport.ProxyCheckClient);
    
    // Test basic functionality (without making actual API calls)
    console.log('✓ Client created successfully');
    console.log('✓ ESM import working correctly');
    
    return true;
  } catch (error) {
    console.error('✗ ESM import failed:', error);
    return false;
  }
}

// Run test if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testESMUsage()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testESMUsage };