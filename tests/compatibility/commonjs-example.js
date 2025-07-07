/**
 * CommonJS usage example
 * Demonstrates how to use the package with require() syntax
 */

const { ProxyCheckClient } = require('../../dist/index.js');

// Create client instance
const client = new ProxyCheckClient({
  apiKey: process.env.PROXYCHECK_API_KEY || 'demo-key',
  tlsSecurity: true
});

// Example usage
async function testCommonJSUsage() {
  try {
    console.log('Testing CommonJS import...');
    
    // Test that services are accessible
    console.log('✓ CheckService available:', typeof client.check);
    console.log('✓ ListingService available:', typeof client.listing);
    console.log('✓ RulesService available:', typeof client.rules);
    console.log('✓ StatsService available:', typeof client.stats);
    
    // Test basic functionality (without making actual API calls)
    console.log('✓ Client created successfully');
    console.log('✓ CommonJS import working correctly');
    
    return true;
  } catch (error) {
    console.error('✗ CommonJS import failed:', error);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testCommonJSUsage()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCommonJSUsage };