# Contributing to ProxyCheck.io TypeScript SDK

Thank you for your interest in contributing to the ProxyCheck.io TypeScript SDK! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Reporting Issues](#reporting-issues)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Community](#community)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful and welcoming to all participants.

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members
- Gracefully accept constructive criticism

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bug fix
4. Make your changes
5. Push to your fork and submit a pull request

## Development Setup

### Prerequisites

- Node.js (>= 14.0.0)
- pnpm (>= 8.0.0)
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/proxycheck-sdk.git
cd proxycheck-sdk

# Install dependencies
pnpm install

# Run tests to ensure everything is working
pnpm test
```

### Development Commands

```bash
# Run tests
pnpm test                  # Run all tests
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Run tests with coverage report

# Code quality
pnpm lint                 # Check code style
pnpm lint:fix            # Fix code style issues
pnpm format              # Format code
pnpm typecheck           # Run TypeScript type checking

# Build
pnpm build               # Build the project
pnpm build:watch         # Build in watch mode

# Development
pnpm dev                 # Run in development mode with watch

# Documentation
pnpm docs                # Generate API documentation
```

## How to Contribute

### Types of Contributions

We welcome many types of contributions:

- **Bug Fixes**: Fix issues reported in our issue tracker
- **Features**: Implement new features or enhance existing ones
- **Documentation**: Improve or add documentation
- **Tests**: Add missing tests or improve test coverage
- **Performance**: Optimize code for better performance
- **Refactoring**: Improve code quality and maintainability

### Finding Something to Work On

- Check our [issue tracker](https://github.com/johanviberg/proxycheck-sdk/issues) for open issues
- Look for issues labeled `good first issue` if you're new to the project
- Issues labeled `help wanted` are particularly good candidates
- Feel free to propose new features by opening an issue first

## Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit Your Changes**
   - Use clear, descriptive commit messages
   - Follow conventional commits format:
     ```
     feat: add new feature
     fix: resolve issue with X
     docs: update README
     test: add tests for Y
     refactor: improve Z implementation
     chore: update dependencies
     ```

4. **Test Your Changes**
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Submit a Pull Request**
   - Go to the original repository on GitHub
   - Click "New pull request"
   - Select your fork and branch
   - Fill out the pull request template
   - Link any related issues

### Pull Request Guidelines

- **Title**: Use a clear, descriptive title
- **Description**: Explain what changes you made and why
- **Tests**: Ensure all tests pass
- **Documentation**: Update docs if you changed APIs
- **Breaking Changes**: Clearly indicate if your PR includes breaking changes

## Coding Standards

### TypeScript Style Guide

- Use TypeScript strict mode
- Prefer `const` over `let` when possible
- Use meaningful variable and function names
- Avoid `any` type - use proper types or `unknown`
- Use interfaces for object shapes
- Document public APIs with JSDoc comments

### Code Style

We use Biome for code formatting and linting. Run `pnpm format` before committing.

#### Example

```typescript
/**
 * Checks if an IP address is a proxy
 * @param address - The IP address to check
 * @param options - Optional configuration
 * @returns Promise resolving to true if the address is a proxy
 */
export async function isProxy(
  address: string,
  options?: ProxyCheckOptions
): Promise<boolean> {
  // Implementation
}
```

### File Organization

- Keep files small and focused
- One class/interface per file
- Group related functionality in directories
- Use barrel exports (`index.ts`) for public APIs

## Testing Guidelines

### Test Requirements

- All new features must have tests
- Bug fixes should include tests to prevent regression
- Maintain or improve code coverage (aim for >90%)

### Writing Tests

```typescript
describe('CheckService', () => {
  describe('isProxy', () => {
    it('should return true for known proxy IP', async () => {
      const result = await service.isProxy('1.2.3.4');
      expect(result).toBe(true);
    });

    it('should handle invalid IP addresses', async () => {
      await expect(service.isProxy('invalid')).rejects.toThrow(
        ProxyCheckValidationError
      );
    });
  });
});
```

### Test Organization

- Place tests next to the code they test (`*.test.ts`)
- Use descriptive test names
- Group related tests with `describe` blocks
- Use `beforeEach`/`afterEach` for setup/teardown
- Mock external dependencies

## Documentation

### Code Documentation

- Add JSDoc comments to all public APIs
- Include examples in documentation
- Document parameters, return values, and exceptions
- Keep documentation up-to-date with code changes

### README Updates

Update the README when you:
- Add new features
- Change public APIs
- Add new configuration options
- Fix significant bugs

### API Documentation

We use TypeDoc for API documentation. Ensure your code includes proper JSDoc comments:

```typescript
/**
 * Service for checking IP addresses and emails
 * 
 * @example
 * ```typescript
 * const client = new ProxyCheckClient({ apiKey: 'your-key' });
 * const result = await client.check.isProxy('1.2.3.4');
 * ```
 */
export class CheckService {
  // ...
}
```

## Reporting Issues

### Before Creating an Issue

- Search existing issues to avoid duplicates
- Check if the issue is already fixed in the latest version
- Gather relevant information about the problem

### Creating a Good Issue Report

Include:
- Clear, descriptive title
- Steps to reproduce the problem
- Expected behavior
- Actual behavior
- Code examples
- Environment details (Node.js version, OS, etc.)
- Error messages and stack traces

### Issue Template

```markdown
## Description
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Node.js version: 
- proxycheck-sdk version: 
- Operating System: 

## Additional Context
Any other relevant information
```

## Security Vulnerabilities

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email the maintainer directly at security@johanviberg.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to resolve the issue.

## Community

### Getting Help

- Check the [documentation](https://github.com/johanviberg/proxycheck-sdk#readme)
- Search [existing issues](https://github.com/johanviberg/proxycheck-sdk/issues)
- Ask questions in issues with the `question` label
- Join the [ProxyCheck.io Discord](https://discord.gg/proxycheck) community

### Stay Updated

- Watch the repository for updates
- Follow the [changelog](CHANGELOG.md)
- Subscribe to release notifications

## Recognition

Contributors will be recognized in:
- The project's README
- Release notes for their contributions
- GitHub's contributor graph

## Questions?

If you have questions about contributing, feel free to:
- Open an issue with the `question` label
- Contact the maintainer

Thank you for contributing to make this SDK better for everyone!