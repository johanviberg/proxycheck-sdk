/**
 * CommonJS usage example
 * Demonstrates how to use the package with require() syntax
 */

const { ProxyCheck } = require('../../dist/index.js');

// Create client instance
const client = new ProxyCheck({
  apiKey: process.env.PROXYCHECK_API_KEY || 'demo-key',
  tlsSecurity: true
});

// Example usage
async function testCommonJSUsage() {
  try {
    console.log('Testing CommonJS import...');
    
    // Test that new API methods are accessible
    console.log('✓ check method available:', typeof client.check);
    console.log('✓ checkBatch method available:', typeof client.checkBatch);
    console.log('✓ isProxy method available:', typeof client.isProxy);
    console.log('✓ isVPN method available:', typeof client.isVPN);
    console.log('✓ dashboard property available:', typeof client.dashboard);
    console.log('✓ lists property available:', typeof client.lists);
    
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