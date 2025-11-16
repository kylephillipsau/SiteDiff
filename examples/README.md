# SiteDiff Examples

This directory contains practical examples demonstrating how to use SiteDiff programmatically and via CLI.

## Examples

### CLI Usage Examples

1. **[basic-baseline.md](./basic-baseline.md)** - Creating and using baselines for migration validation
2. **[server-compare.md](./server-compare.md)** - Direct server-to-server comparison
3. **[advanced-config.md](./advanced-config.md)** - Advanced configuration options

### Programmatic Usage Examples

4. **[custom-validator.ts](./custom-validator.ts)** - Creating a custom validator
5. **[programmatic-usage.ts](./programmatic-usage.ts)** - Using SiteDiff as a library
6. **[batch-processing.ts](./batch-processing.ts)** - Processing multiple configurations
7. **[custom-reporter.ts](./custom-reporter.ts)** - Creating a custom report format

## Running Examples

### CLI Examples

CLI examples are documentation files (`.md`) that show command-line usage. Follow the instructions in each file.

### TypeScript Examples

To run the TypeScript examples:

1. Ensure SiteDiff is built:
```bash
npm run build
```

2. Run an example with ts-node:
```bash
npx ts-node examples/programmatic-usage.ts
```

Or compile and run:
```bash
npx tsc examples/programmatic-usage.ts
node examples/programmatic-usage.js
```

## Prerequisites

All examples assume:
- SiteDiff is installed and built
- Playwright browsers are installed (`npx playwright install`)
- You have configured domains to test

## Need Help?

- See [README.md](../README.md) for basic usage
- See [API.md](../API.md) for API reference
- See [ARCHITECTURE.md](../ARCHITECTURE.md) for architecture details
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
