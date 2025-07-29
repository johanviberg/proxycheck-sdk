# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.2] - 2025-07-11

### ⚠️ BREAKING CHANGES

This release introduces a modernized API that significantly improves developer experience. While we maintain backward compatibility through aliases, we strongly recommend migrating to the new API.

### Changed

#### New Modern API
- **Simplified client instantiation**: Use `ProxyCheck` instead of `ProxyCheckClient`
  ```typescript
  // Old
  const client = new ProxyCheckClient({ apiKey: 'your-key' });
  
  // New
  const client = new ProxyCheck({ apiKey: 'your-key' });
  ```

- **Direct method access**: Check methods are now available directly on the client
  ```typescript
  // Old
  await client.check.checkAddress('8.8.8.8');
  
  // New
  await client.check('8.8.8.8');
  ```

- **Semantic options**: More intuitive option names with better TypeScript support
  ```typescript
  // Old
  await client.check.checkAddress('8.8.8.8', {
    asnData: true,
    riskData: 2,
    maskAddress: true
  });
  
  // New
  await client.check('8.8.8.8', {
    enrich: {
      network: true,
      risk: 'detailed',
      location: true
    },
    privacy: {
      maskEmail: true
    }
  });
  ```

- **Enhanced response types**: Responses now use more intuitive property names
  ```typescript
  // Old
  if (result['8.8.8.8'].proxy === 'yes') { }
  
  // New
  if (result.isProxy) { }
  ```

- **Improved batch operations**: Batch checks now return a Map for better iteration
  ```typescript
  // Old
  const results = await client.check.checkAddresses(['8.8.8.8', '1.1.1.1']);
  for (const address in results) {
    if (results[address].proxy === 'yes') { }
  }
  
  // New
  const results = await client.checkBatch(['8.8.8.8', '1.1.1.1']);
  for (const [address, result] of results) {
    if (result.isProxy) { }
  }
  ```

### Added
- New convenience methods for common operations:
  - `client.isSuspicious(address)` - Quick security check
  - `client.isProxy(address)` - Direct proxy detection
  - `client.isVPN(address)` - Direct VPN detection
  - `client.isDisposableEmail(email)` - Email validation
  - `client.getRiskLevel(address)` - Risk assessment

- Enhanced error handling with recovery strategies
- Response interceptors for custom processing
- Built-in performance benchmarks
- Tree-shaking support with `sideEffects: false`

### Deprecated
- `ProxyCheckClient` class (use `ProxyCheck` instead)
- `client.check.checkAddress()` method (use `client.check()` instead)
- `client.check.checkAddresses()` method (use `client.checkBatch()` instead)
- Old option names (`asnData`, `riskData`, `maskAddress`, etc.)

### Removed
- Internal batch processing utilities (now handled automatically)
- Legacy client implementation details

### Fixed
- TypeScript strict mode compatibility
- Response transformation edge cases
- Integration test reliability

### Migration Guide

For a smooth migration to the new API:

1. Update imports:
   ```typescript
   // Old
   import { ProxyCheckClient } from 'proxycheck-sdk';
   
   // New
   import { ProxyCheck } from 'proxycheck-sdk';
   ```

2. Update client instantiation (see examples above)

3. Update method calls to use the new simplified API

4. Update option objects to use semantic names

5. Update response handling to use new property names

The old API remains available through aliases for backward compatibility, but will be removed in version 1.0.0.

## [0.9.0] - 2025-07-07

### 🎉 Initial Public Release

First public release of the unofficial ProxyCheck.io TypeScript SDK. This SDK provides a modern, type-safe interface for the ProxyCheck.io API with comprehensive error handling, automatic retries, and full TypeScript support.

### Added

#### Core Features
- **Full API Coverage**: Complete implementation of all ProxyCheck.io API endpoints
  - Check Service: IP address and email validation
  - Listing Service: Whitelist and blacklist management
  - Rules Service: Custom detection rules
  - Stats Service: Usage statistics and data export

#### TypeScript & JavaScript Support
- Full TypeScript support with comprehensive type definitions
- Dual module support (CommonJS and ESM)
- Strict type safety with intelligent IntelliSense
- Zod schema validation for all inputs

#### Error Handling & Reliability
- Comprehensive error hierarchy with specific error types:
  - `ProxyCheckError`: Base error class
  - `ProxyCheckAPIError`: API-specific errors
  - `ProxyCheckValidationError`: Input validation errors
  - `ProxyCheckRateLimitError`: Rate limiting errors
  - `ProxyCheckNetworkError`: Network errors
  - `ProxyCheckAuthenticationError`: Authentication errors
  - `ProxyCheckTimeoutError`: Timeout errors
- Automatic retry logic with exponential backoff
- Built-in rate limit detection and handling

#### Developer Experience
- Environment variable support for configuration
- Comprehensive logging system with customizable output
- Batch operations for efficient multiple IP/email checks
- Convenient helper methods for common operations
- Well-documented API with JSDoc comments
- Extensive examples for all major use cases

#### Testing & Quality
- Comprehensive test suite with >90% code coverage
- Unit tests for all services and utilities
- Integration test examples
- Compatibility tests for different environments

### Configuration Options
- `apiKey`: ProxyCheck.io API key (required)
- `baseUrl`: API base URL (default: 'proxycheck.io')
- `timeout`: Request timeout in milliseconds (default: 30000)
- `retries`: Number of retry attempts (default: 3)
- `retryDelay`: Initial retry delay in milliseconds (default: 1000)
- `tlsSecurity`: Use HTTPS connections (default: true)
- `userAgent`: Custom user agent string
- `logging`: Comprehensive logging configuration

### Supported Environment Variables
- `PROXYCHECK_API_KEY`
- `PROXYCHECK_BASE_URL`
- `PROXYCHECK_TIMEOUT`
- `PROXYCHECK_RETRIES`
- `PROXYCHECK_RETRY_DELAY`
- `PROXYCHECK_TLS_SECURITY`

### API Methods

#### Check Service
- `checkAddress(address, options?)`: Check single IP/email
- `checkAddresses(addresses, options?)`: Check multiple addresses
- `getDetailedInfo(address, options?)`: Get comprehensive information
- `isProxy(address, options?)`: Quick proxy check
- `isVPN(address, options?)`: Quick VPN check
- `isDisposableEmail(email, options?)`: Check disposable email
- `getRiskScore(address, options?)`: Get risk assessment

#### Listing Service
- `addToWhitelist(entries)`: Add to whitelist
- `removeFromWhitelist(entries)`: Remove from whitelist
- `getWhitelist()`: Get whitelist entries
- `setWhitelist(entries)`: Replace whitelist
- `clearWhitelist()`: Clear all whitelist entries
- `addToBlacklist(entries)`: Add to blacklist
- `removeFromBlacklist(entries)`: Remove from blacklist
- `getBlacklist()`: Get blacklist entries
- `setBlacklist(entries)`: Replace blacklist
- `clearBlacklist()`: Clear all blacklist entries

#### Rules Service
- `createRule(name, conditions)`: Create custom rule
- `testRule(name)`: Test a rule
- `listRules()`: List all rules
- `updateRule(name, conditions)`: Update existing rule
- `deleteRule(name)`: Delete a rule

#### Stats Service
- `getDetections(limit?, offset?)`: Get detection statistics
- `getQueries(limit?, offset?)`: Get query logs
- `getQueriesPaginated(page, pageSize)`: Get paginated queries
- `getUsage()`: Get usage statistics
- `exportDetections(options)`: Export detection data
- `exportQueries(options)`: Export query data
- `exportUsage()`: Export usage data
- `getAllStats()`: Get all statistics at once

### Project Structure
```
proxycheck-sdk/
├── src/              # Source code
├── tests/            # Test files
├── examples/         # Usage examples
├── dist/             # Build output
└── docs/             # Documentation
```

### Dependencies
- `axios`: HTTP client for API requests
- `zod`: Runtime type validation

### Development Tools
- TypeScript 5.8+
- Jest for testing
- Biome for linting and formatting
- Rollup for building
- TypeDoc for API documentation

### License
MIT License - See [LICENSE](LICENSE) file for details

### Notes
- This is an unofficial third-party SDK not affiliated with ProxyCheck.io
- Minimum Node.js version: 14.0.0
- Full API documentation available in the README
- Contributions welcome - see [CONTRIBUTING.md](CONTRIBUTING.md)

---

[0.9.0]: https://github.com/johanviberg/proxycheck-sdk/releases/tag/v0.9.0