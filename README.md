# ProxyCheck.io TypeScript SDK (Unofficial)

[![npm version](https://badge.fury.io/js/proxycheck-sdk.svg)](https://badge.fury.io/js/proxycheck-sdk)
[![CI](https://github.com/johanviberg/proxycheck-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/johanviberg/proxycheck-sdk/actions/workflows/ci.yml)
[![CodeQL](https://github.com/johanviberg/proxycheck-sdk/actions/workflows/codeql.yml/badge.svg)](https://github.com/johanviberg/proxycheck-sdk/security/code-scanning)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An unofficial, modern, type-safe TypeScript/JavaScript SDK for the [ProxyCheck.io](https://proxycheck.io) API. Detect proxies, VPNs, and disposable email addresses with comprehensive error handling, retry logic, and full TypeScript support.

> **Note**: This is an unofficial third-party SDK and is not affiliated with or endorsed by ProxyCheck.io.

## Features

- 🚀 **Modern TypeScript**: Full type safety with intelligent IntelliSense
- 🔄 **Dual Module Support**: Works with both CommonJS and ESM
- 🛡️ **Built-in Error Handling**: Comprehensive error hierarchy with detailed context
- 🔁 **Automatic Retries**: Smart retry logic with exponential backoff
- ⚡ **Rate Limit Handling**: Automatic rate limit detection and retry delays
- 🎯 **Batch Operations**: Efficiently check multiple IPs/emails at once
- 📊 **Complete API Coverage**: All ProxyCheck.io endpoints supported
- 🧪 **Thoroughly Tested**: Comprehensive test suite with >90% coverage
- 📚 **Well Documented**: Complete API documentation and examples
- 🔒 **Security**: Regular security scanning with CodeQL and dependency audits
- 🏗️ **CI/CD**: Automated testing, building, and publishing pipeline

## Quick Start

### Requirements

- Node.js 18.12.0 or higher
- TypeScript 4.5+ (for TypeScript users)

### Installation

```bash
# Using npm
npm install proxycheck-sdk

# Using yarn
yarn add proxycheck-sdk

# Using pnpm
pnpm add proxycheck-sdk
```

### Basic Usage

```typescript
import { ProxyCheckClient } from 'proxycheck-sdk';

// Initialize the client
const client = new ProxyCheckClient({
  apiKey: 'your-api-key-here'
});

// Check a single IP address
const result = await client.check.checkAddress('8.8.8.8');
console.log(result);

// Check if an IP is a proxy/VPN
const isProxy = await client.check.isProxy('1.2.3.4');
console.log(`Is proxy: ${isProxy}`);

// Check if an email is disposable
const isDisposable = await client.check.isDisposableEmail('test@tempmail.org');
console.log(`Is disposable: ${isDisposable}`);
```

## Configuration

### Environment Variables

You can set configuration options via environment variables:

```bash
export PROXYCHECK_API_KEY="your-api-key-here"
export PROXYCHECK_BASE_URL="proxycheck.io"
export PROXYCHECK_TIMEOUT="30000"
export PROXYCHECK_RETRIES="3"
export PROXYCHECK_RETRY_DELAY="1000"
export PROXYCHECK_TLS_SECURITY="true"
```

### Configuration Options

```typescript
const client = new ProxyCheckClient({
  apiKey: 'your-api-key',           // Your ProxyCheck.io API key
  baseUrl: 'proxycheck.io',         // API base URL (default: 'proxycheck.io')
  timeout: 30000,                   // Request timeout in ms (default: 30000)
  retries: 3,                       // Number of retries (default: 3)
  retryDelay: 1000,                 // Initial retry delay in ms (default: 1000)
  tlsSecurity: true,                // Use HTTPS (default: true)
  userAgent: 'proxycheck-sdk/0.9.0', // Custom user agent
  logging: {                        // Optional logging configuration
    level: 'info',                  // Log level: 'debug' | 'info' | 'warn' | 'error' | 'silent'
    format: 'pretty',              // Log format: 'json' | 'pretty'
    timestamp: true,                // Include timestamps
    colors: true,                   // Use colors in output
    output: (entry) => console.log(entry) // Custom output function
  }
});
```

## API Reference

### Check Service

The Check Service provides IP address and email validation functionality.

#### Basic Checking

```typescript
// Check single IP address
const result = await client.check.checkAddress('8.8.8.8');

// Check multiple addresses at once
const results = await client.check.checkAddresses(['8.8.8.8', 'test@example.com']);

// Get detailed information with all features enabled
const detailed = await client.check.getDetailedInfo('1.2.3.4', {
  asnData: true,
  riskData: 2,
  vpnDetection: 3
});
```

#### Convenience Methods

```typescript
// Quick proxy/VPN checks
const isProxy = await client.check.isProxy('1.2.3.4');
const isVPN = await client.check.isVPN('1.2.3.4');

// Email validation
const isDisposable = await client.check.isDisposableEmail('test@tempmail.org');

// Risk assessment
const riskScore = await client.check.getRiskScore('1.2.3.4');
```

#### Advanced Options

```typescript
const result = await client.check.checkAddress('1.2.3.4', {
  // VPN Detection levels: 0=disabled, 1=basic, 2=enhanced, 3=paranoid
  vpnDetection: 2,
  
  // ASN and geolocation data
  asnData: true,
  
  // Risk assessment: 0=disabled, 1=basic, 2=detailed
  riskData: 2,
  
  // Country restrictions
  allowedCountries: ['US', 'CA'],
  blockedCountries: ['CN', 'RU'],
  
  // Query tagging for analytics
  queryTagging: true,
  customTag: 'website-signup',
  
  // Email masking for privacy
  maskAddress: true,
  
  // Days restrictor
  dayRestrictor: 7
});
```

### Listing Service

Manage whitelists and blacklists for your account.

```typescript
// Whitelist management
await client.listing.addToWhitelist(['192.168.1.1', '10.0.0.1']);
await client.listing.removeFromWhitelist(['192.168.1.1']);
const whitelist = await client.listing.getWhitelist();
await client.listing.setWhitelist(['192.168.1.1']); // Replace entire list
await client.listing.clearWhitelist();

// Blacklist management
await client.listing.addToBlacklist(['1.2.3.4', '5.6.7.8']);
await client.listing.removeFromBlacklist(['1.2.3.4']);
const blacklist = await client.listing.getBlacklist();
await client.listing.setBlacklist(['5.6.7.8']); // Replace entire list
await client.listing.clearBlacklist();
```

### Rules Service

Create and manage custom detection rules.

```typescript
// Create a custom rule
await client.rules.createRule('high_risk_countries', 
  'country == "CN" OR country == "RU" OR risk > 80'
);

// Test a rule
const testResult = await client.rules.testRule('high_risk_countries');

// List all rules
const rules = await client.rules.listRules();

// Update existing rule
await client.rules.updateRule('high_risk_countries',
  'country == "CN" OR country == "RU" OR risk > 75'
);

// Delete a rule
await client.rules.deleteRule('high_risk_countries');
```

### Stats Service

Retrieve usage statistics and export data.

```typescript
// Get recent detections
const detections = await client.stats.getDetections(100);

// Get query logs
const queries = await client.stats.getQueries(100);

// Get query logs with pagination (convenience method)
const queriesPaginated = await client.stats.getQueriesPaginated(2, 50); // page 2, 50 per page

// Get usage statistics
const usage = await client.stats.getUsage();

// Export data
const exportDetections = await client.stats.exportDetections({ limit: 1000 });
const exportQueries = await client.stats.exportQueries({ limit: 500 });
const exportUsage = await client.stats.exportUsage();

// Get all stats at once
const allStats = await client.stats.getAllStats();
```

## Error Handling

The SDK provides comprehensive error handling with specific error types:

```typescript
import { 
  ProxyCheckError,
  ProxyCheckAPIError,
  ProxyCheckValidationError,
  ProxyCheckRateLimitError,
  ProxyCheckNetworkError,
  ProxyCheckAuthenticationError,
  ProxyCheckTimeoutError
} from 'proxycheck-sdk';

try {
  const result = await client.check.checkAddress('invalid-ip');
} catch (error) {
  if (error instanceof ProxyCheckValidationError) {
    console.log('Validation error:', error.message);
    console.log('Field:', error.field);
    console.log('Value:', error.value);
  } else if (error instanceof ProxyCheckRateLimitError) {
    console.log('Rate limited. Retry after:', error.retryAfter, 'seconds');
    console.log('Remaining:', error.remaining);
  } else if (error instanceof ProxyCheckAuthenticationError) {
    console.log('Authentication error - check your API key');
  } else if (error instanceof ProxyCheckNetworkError) {
    console.log('Network error:', error.message);
  }
}
```

## Rate Limiting

The SDK automatically handles rate limiting:

```typescript
// Check rate limit info
const rateLimitInfo = client.getRateLimitInfo();
if (rateLimitInfo) {
  console.log(`Requests remaining: ${rateLimitInfo.remaining}`);
  console.log(`Reset time: ${rateLimitInfo.reset}`);
}

// The client automatically retries with proper delays when rate limited
// You can also manually handle rate limits in error handling
```

## TypeScript Support

The SDK is built with TypeScript and provides excellent type safety:

```typescript
import type { 
  CheckResponse,
  AddressCheckResult,
  ProxyCheckOptions,
  ClientConfig 
} from 'proxycheck-sdk';

// All responses are fully typed
const response: CheckResponse = await client.check.checkAddress('1.2.3.4');

// Options are validated at compile time
const options: ProxyCheckOptions = {
  vpnDetection: 2,        // ✅ Valid: 0, 1, 2, or 3
  // vpnDetection: 5,     // ❌ TypeScript error: not assignable
  asnData: true,
  riskData: 1
};

// Access typed result properties
const result: AddressCheckResult = response['1.2.3.4'];
if (result.proxy === 'yes') {
  console.log(`Proxy type: ${result.type}`); // 'VPN' | 'PUB' | 'WEB' | etc.
  console.log(`Risk score: ${result.risk}`); // number (0-100)
}
```

## Examples

### Country-Based Filtering

```typescript
// Block traffic from specific countries
const result = await client.check.checkAddress('1.2.3.4', {
  asnData: true, // Required for country detection
  blockedCountries: ['CN', 'RU', 'KP'],
  allowedCountries: ['US', 'CA', 'GB']
});

if (result.block === 'yes') {
  console.log(`Blocked: ${result.block_reason}`); // 'country', 'proxy', 'vpn', etc.
}
```

### Batch Processing

```typescript
// Process multiple IPs efficiently
const addresses = ['1.2.3.4', '5.6.7.8', '8.8.8.8'];
const results = await client.check.checkAddresses(addresses, {
  vpnDetection: 2,
  riskData: 1
});

// Process results
for (const [ip, data] of Object.entries(results)) {
  if (ip === 'status') continue; // Skip status field
  
  console.log(`${ip}: ${data.proxy === 'yes' ? 'PROXY' : 'CLEAN'}`);
  if (data.risk) {
    console.log(`  Risk: ${data.risk}%`);
  }
}
```

### Real-time Monitoring with Rules

```typescript
// Set up custom rule for high-risk detection
await client.rules.createRule('high_risk_monitor',
  '(proxy == "yes" AND type == "VPN") OR risk > 90 OR country == "anonymous"'
);

// Function to check and log high-risk activity
async function monitorAddress(ip: string) {
  try {
    const result = await client.check.checkAddress(ip, {
      riskData: 2,
      vpnDetection: 3,
      asnData: true,
      queryTagging: true,
      customTag: 'security-monitor'
    });
    
    if (result.block === 'yes') {
      console.warn(`⚠️ High-risk IP detected: ${ip}`);
      console.warn(`  Reason: ${result.block_reason}`);
      console.warn(`  Risk: ${result[ip].risk}%`);
      console.warn(`  Country: ${result[ip].country}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to check ${ip}:`, error.message);
  }
}
```


## Development

### Building from Source

```bash
git clone https://github.com/johanviberg/proxycheck-sdk.git
cd proxycheck-sdk
pnpm install
pnpm build
```

### Running Tests

```bash
pnpm test           # Run all tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage
```

### Code Quality

```bash
pnpm lint           # Check code quality
pnpm lint:fix       # Fix linting issues
pnpm format         # Format code
pnpm type-check     # Type checking
```

### Git Hooks

This project uses [Lefthook](https://github.com/evilmartians/lefthook) for git hooks to ensure code quality and consistent commit messages.

#### Automatic Setup

Git hooks are automatically installed when you run `pnpm install`. If you need to install them manually:

```bash
pnpm hooks:install   # Install git hooks
pnpm hooks:uninstall # Remove git hooks
pnpm hooks:run       # Run hooks manually
```

#### Active Hooks

- **pre-commit**: Runs automatically before each commit
  - Code formatting with Biome
  - TypeScript linting
  - Type checking
  - Secret detection
  - JSON validation

- **commit-msg**: Validates commit messages
  - Enforces [Conventional Commits](https://www.conventionalcommits.org/) format
  - Required format: `<type>(<scope>): <subject>`

- **pre-push**: Runs before pushing to remote
  - Runs all tests
  - Verifies build succeeds

#### Commit Message Format

All commits must follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or dependency changes
- `ci`: CI configuration changes
- `chore`: Other changes that don't modify src or test
- `revert`: Reverts a previous commit

**Examples:**
```bash
git commit -m "feat(check): add batch IP validation support"
git commit -m "fix: handle rate limit errors correctly"
git commit -m "docs(readme): update installation instructions"
git commit -m "chore(deps): update typescript to v5.3"
```

**Skip Hooks:** If needed, you can skip hooks with:
```bash
git commit --no-verify -m "your message"
```

### Continuous Integration

This project uses GitHub Actions for automated testing and deployment:

#### CI Pipeline

The CI pipeline runs on every push and pull request:

- **Linting & Type Checking**: Ensures code quality and type safety
- **Testing**: Runs tests across multiple Node.js versions (18, 20, 22)
- **Cross-Platform**: Tests on Ubuntu, Windows, and macOS
- **Coverage**: Generates code coverage reports with Codecov
- **Security**: Automated security scanning with CodeQL
- **Package Validation**: Validates package structure and TypeScript definitions

#### Automated Checks

- **Bundle Size**: Monitors package size to prevent bloat
- **Dependencies**: Automated updates via Dependabot and Renovate
- **Compatibility**: Verifies CommonJS/ESM compatibility
- **Performance**: Checks for performance regressions

### Publishing

Releases are automated using [Release Please](https://github.com/googleapis/release-please):

#### How it works:
1. **Push conventional commits** to the `main` branch
2. **Release Please automatically**:
   - Analyzes commits since last release
   - Calculates appropriate version bump (patch/minor/major)
   - Creates/updates a Release PR with changelog
3. **Review and merge** the Release PR to trigger:
   - Automatic tag creation
   - Package building and validation
   - NPM publishing with provenance
   - GitHub Release creation

#### Manual release (legacy):
For emergency releases, you can still manually create tags:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [ProxyCheck.io Documentation](https://docs.proxycheck.io)
- 🐛 [SDK Issues](https://github.com/johanviberg/proxycheck-sdk/issues)
- 💬 [ProxyCheck.io Discord](https://discord.gg/proxycheck)
- 📧 [ProxyCheck.io Support](mailto:support@proxycheck.io)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes.

---

Made with ❤️ by [Johan Viberg](https://johanviberg.com)

*This is an unofficial third-party SDK and is not affiliated with ProxyCheck.io*