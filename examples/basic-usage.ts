/**
 * Basic Usage Examples
 * 
 * This example demonstrates the basic functionality of the ProxyCheck.io TypeScript SDK.
 */

import { ProxyCheckClient } from '../src';

// Create client instance
const client = new ProxyCheckClient({
  apiKey: process.env.PROXYCHECK_API_KEY || 'your-api-key-here'
});

async function basicExamples() {
  console.log('🚀 ProxyCheck.io TypeScript SDK - Basic Examples\n');

  try {
    // Example 1: Check a single IP address
    console.log('1. Checking single IP address...');
    const result = await client.check.checkAddress('8.8.8.8');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('');

    // Example 2: Quick proxy check
    console.log('2. Quick proxy check...');
    const isProxy = await client.check.isProxy('1.2.3.4');
    console.log(`Is 1.2.3.4 a proxy? ${isProxy}`);
    console.log('');

    // Example 3: VPN detection
    console.log('3. VPN detection...');
    const isVPN = await client.check.isVPN('5.6.7.8');
    console.log(`Is 5.6.7.8 a VPN? ${isVPN}`);
    console.log('');

    // Example 4: Email validation
    console.log('4. Email validation...');
    const isDisposable = await client.check.isDisposableEmail('test@mailinator.com');
    console.log(`Is test@mailinator.com disposable? ${isDisposable}`);
    console.log('');  

    // Example 5: Risk assessment
    console.log('5. Risk assessment...');
    const riskScore = await client.check.getRiskScore('1.1.1.1');
    console.log(`Risk score for 1.2.3.4: ${riskScore}%`);
    console.log('');

    // Example 6: Get detailed information
    console.log('6. Detailed information...');
    const detailed = await client.check.getDetailedInfo('8.8.8.8');
    console.log('Detailed info:', JSON.stringify(detailed, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

// Example 7: Client information
async function clientInfo() {
  console.log('\n7. Client information...');
  const info = client.getClientInfo();
  console.log('Client info:', JSON.stringify(info, null, 2));
  
  console.log(`\nConfiguration status: ${client.isConfigured() ? '✅ Configured' : '❌ Not configured'}`);
}

// Run examples
async function main() {
  await basicExamples();
  await clientInfo();
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runBasicExamples };