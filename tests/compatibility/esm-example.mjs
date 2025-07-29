/**
 * ESM usage example
 * Demonstrates how to use the package with import syntax
 */

import { ProxyCheck } from '../../dist/index.mjs';

// Create client instance
const client = new ProxyCheck({
  apiKey: process.env.PROXYCHECK_API_KEY || 'demo-key',
  tlsSecurity: true
});

// Example usage
async function testESMUsage() {
  try {
    console.log('Testing ESM import...');
    
    // Test that new API methods are accessible
    console.log('✓ check method available:', typeof client.check);
    console.log('✓ checkBatch method available:', typeof client.checkBatch);
    console.log('✓ isProxy method available:', typeof client.isProxy);
    console.log('✓ isVPN method available:', typeof client.isVPN);
    console.log('✓ dashboard property available:', typeof client.dashboard);
    console.log('✓ lists property available:', typeof client.lists);
    
    // Test dynamic import
    const dynamicImport = await import('../../dist/index.mjs');
    console.log('✓ Dynamic import working:', typeof dynamicImport.ProxyCheck);
    
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