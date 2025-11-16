# Contributing to SiteDiff

Thank you for your interest in contributing to SiteDiff! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Adding New Features](#adding-new-features)
- [Documentation](#documentation)
- [Getting Help](#getting-help)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Assume good intentions
- Be patient and understanding

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **Git** for version control
- A code editor (VS Code recommended)
- Basic understanding of TypeScript and Playwright

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/sitediff.git
cd sitediff
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/sitediff.git
```

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install
```

### 3. Build the Project

```bash
npm run build
```

### 4. Run in Development Mode

```bash
npm run dev -- --help
```

### 5. Watch Mode (for active development)

```bash
npm run watch
```

This compiles TypeScript automatically when files change.

### 6. Verify Setup

Create a test configuration:

```bash
npm run dev -- init -o config/test.json
```

Edit the config and run a test comparison:

```bash
npm run dev -- baseline -c config/test.json
```

## Project Structure

Understanding the codebase structure is crucial for contributing:

```
SiteDiff/
├── src/                           # TypeScript source code
│   ├── index.ts                   # CLI entry point
│   ├── config/                    # Configuration management
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── ConfigLoader.ts       # Config loading/validation
│   ├── crawler/                   # Page discovery
│   │   ├── PageDiscovery.ts
│   │   └── PageClassifier.ts
│   ├── comparator/                # Comparison logic
│   │   ├── ComparisonEngine.ts
│   │   ├── ScreenshotComparator.ts
│   │   └── validators/            # Validation modules
│   │       ├── HtmlValidator.ts
│   │       ├── TextValidator.ts
│   │       ├── ImageValidator.ts
│   │       └── LinkValidator.ts
│   ├── baseline/                  # Baseline management
│   │   └── BaselineManager.ts
│   ├── server/                    # Server access
│   │   └── ServerManager.ts
│   ├── reporter/                  # Report generation
│   │   ├── HtmlReporter.ts
│   │   └── JsonReporter.ts
│   └── utils/                     # Utilities
│       └── Logger.ts
├── config/                        # Config files and examples
├── dist/                          # Compiled JavaScript (gitignored)
├── output/                        # Generated reports (gitignored)
├── baselines/                     # Baseline data (gitignored)
├── tests/                         # Test files (to be added)
├── docs/                          # Additional documentation
├── ARCHITECTURE.md                # Architecture documentation
├── API.md                         # API reference
├── CONTRIBUTING.md                # This file
├── README.md                      # User documentation
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── playwright.config.ts           # Playwright configuration
```

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Development Workflow

### 1. Create a Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes

### 2. Make Changes

- Write clean, readable code
- Follow TypeScript best practices
- Add comments for complex logic
- Update relevant documentation

### 3. Test Your Changes

```bash
# Build the project
npm run build

# Test with a real configuration
npm run dev -- baseline -c config/test.json
npm run dev -- compare -c config/test.json

# Check for TypeScript errors
npm run build
```

### 4. Commit Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: Add CSS comparison validator"
```

**Commit Message Format**:
```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Example**:
```
feat: Add CSS comparison validator

Implements a new validator that compares CSS stylesheets between
source and destination pages. Detects missing rules, property
differences, and value changes.

Closes #123
```

### 5. Push Changes

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

1. Go to GitHub and create a Pull Request
2. Fill out the PR template (if available)
3. Link related issues
4. Request review from maintainers

## Coding Standards

### TypeScript Guidelines

#### 1. Use Strict Mode

The project uses TypeScript strict mode. Ensure your code passes strict type checking:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

#### 2. Type Everything

Always provide explicit types:

```typescript
// Good
function processPages(pages: string[], maxPages: number): Promise<PageResult[]> {
  // ...
}

// Bad
function processPages(pages, maxPages) {
  // ...
}
```

#### 3. Use Interfaces for Objects

Define interfaces for all object structures:

```typescript
interface PageData {
  url: string;
  type: PageType;
  content: string;
  timestamp: Date;
}

function savePage(data: PageData): void {
  // ...
}
```

#### 4. Prefer `const` and `let`

Never use `var`:

```typescript
// Good
const maxPages = 50;
let currentPage = 0;

// Bad
var maxPages = 50;
```

#### 5. Use Async/Await

Prefer async/await over raw Promises:

```typescript
// Good
async function loadPage(url: string): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(url);
  return page;
}

// Avoid
function loadPage(url: string): Promise<Page> {
  return browser.newPage().then(page => {
    return page.goto(url).then(() => page);
  });
}
```

#### 6. Error Handling

Always handle errors gracefully:

```typescript
async function processPage(url: string): Promise<PageResult> {
  try {
    const page = await browser.newPage();
    await page.goto(url, { timeout: 30000 });
    // Process page...
    return result;
  } catch (error) {
    logger.error('Page processing failed', { url, error: error.message });
    return {
      url,
      success: false,
      error: error.message
    };
  } finally {
    await page?.close();
  }
}
```

### Code Style

#### 1. Indentation and Formatting

- Use 2 spaces for indentation (no tabs)
- Maximum line length: 80-100 characters
- Use trailing commas in multi-line structures

```typescript
const config: SiteDiffConfig = {
  mode: 'compare',
  domains: [
    { domain: 'example.com', user: 'user1' },
    { domain: 'example2.com', user: 'user2' },
  ], // trailing comma
};
```

#### 2. Naming Conventions

- **Classes**: PascalCase (`ComparisonEngine`, `HtmlValidator`)
- **Interfaces**: PascalCase (`ValidationResult`, `DomainConfig`)
- **Functions/Methods**: camelCase (`discoverPages`, `loadConfig`)
- **Variables**: camelCase (`maxPages`, `screenshotPath`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Private members**: prefix with `_` (`_internalState`)

```typescript
const MAX_RETRIES = 3;

class PageDiscovery {
  private _visitedUrls: Set<string>;

  async discoverPages(startUrl: string): Promise<string[]> {
    // ...
  }
}
```

#### 3. Comments and Documentation

Add JSDoc comments for public APIs:

```typescript
/**
 * Discovers pages by crawling from a start URL.
 *
 * @param startUrl - The URL to start crawling from
 * @param maxPages - Maximum number of pages to discover
 * @returns Array of discovered page URLs
 *
 * @example
 * ```typescript
 * const pages = await discovery.discoverPages('https://example.com', 50);
 * console.log(`Found ${pages.length} pages`);
 * ```
 */
async discoverPages(startUrl: string, maxPages: number): Promise<string[]> {
  // Implementation...
}
```

Add inline comments for complex logic:

```typescript
// Normalize URLs by removing protocol, domain, and trailing slashes
// This allows for more accurate comparison between source and destination
const normalized = url
  .replace(/^https?:\/\//, '')      // Remove protocol
  .replace(/\/$/, '')                // Remove trailing slash
  .toLowerCase();                    // Case-insensitive comparison
```

### Import Organization

Organize imports in this order:

1. Node.js built-in modules
2. External dependencies
3. Internal modules (absolute paths)
4. Relative imports

```typescript
// 1. Node.js built-ins
import * as fs from 'fs/promises';
import * as path from 'path';

// 2. External dependencies
import { Page, Browser } from '@playwright/test';
import chalk from 'chalk';

// 3. Internal modules
import { SiteDiffConfig, ValidationResult } from './config/types';
import { getLogger } from './utils/Logger';

// 4. Relative imports
import { HtmlValidator } from './validators/HtmlValidator';
```

## Testing

### Writing Tests

While comprehensive tests are still being added, here are guidelines for writing tests:

#### 1. Unit Tests

Test individual functions and classes in isolation:

```typescript
// tests/validators/HtmlValidator.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { HtmlValidator } from '../../src/comparator/validators/HtmlValidator';

describe('HtmlValidator', () => {
  let validator: HtmlValidator;

  beforeEach(() => {
    validator = new HtmlValidator();
  });

  it('should pass when HTML structures are identical', async () => {
    const sourcePage = createMockPage('<div><p>Test</p></div>');
    const destPage = createMockPage('<div><p>Test</p></div>');

    const result = await validator.validate(sourcePage, destPage);

    expect(result.passed).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it('should detect tag differences', async () => {
    const sourcePage = createMockPage('<div><p>Test</p></div>');
    const destPage = createMockPage('<div><span>Test</span></div>');

    const result = await validator.validate(sourcePage, destPage);

    expect(result.passed).toBe(false);
    expect(result.differences).toContain(
      expect.stringContaining('expected <p>, got <span>')
    );
  });
});
```

#### 2. Integration Tests

Test multiple components working together:

```typescript
// tests/integration/comparison.test.ts
import { describe, it, expect } from '@jest/globals';
import { ComparisonEngine } from '../../src/comparator/ComparisonEngine';
import { ConfigLoader } from '../../src/config/ConfigLoader';

describe('Comparison Integration', () => {
  it('should complete full comparison workflow', async () => {
    const config = ConfigLoader.loadConfig('./tests/fixtures/test-config.json');
    const engine = new ComparisonEngine(config);

    const results = await engine.runComparison();

    expect(results.domains).toBeDefined();
    expect(results.domains.length).toBeGreaterThan(0);
  });
});
```

#### 3. Test Fixtures

Create test fixtures for consistent testing:

```
tests/
├── fixtures/
│   ├── test-config.json
│   ├── sample-pages/
│   │   ├── homepage.html
│   │   ├── contact.html
│   │   └── blog.html
│   └── baselines/
│       └── example.com/
└── unit/
    └── validators/
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- HtmlValidator.test.ts

# Run with coverage
npm test -- --coverage
```

## Submitting Changes

### Pull Request Guidelines

1. **One PR per feature/fix**: Keep PRs focused on a single change
2. **Update documentation**: Include relevant documentation updates
3. **Add tests**: Include tests for new functionality
4. **Pass CI checks**: Ensure all automated checks pass
5. **No merge conflicts**: Rebase on latest main if needed

### PR Checklist

Before submitting, ensure:

- [ ] Code builds without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages are clear and descriptive
- [ ] PR description explains the change
- [ ] Related issues are linked

### PR Template

```markdown
## Description
Brief description of the changes

## Motivation
Why is this change needed? What problem does it solve?

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
Related to #456

## Checklist
- [ ] Code builds without errors
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Follows coding standards
```

## Adding New Features

### Adding a New Validator

To add a new validator (e.g., CSS Validator):

#### 1. Create Validator File

```typescript
// src/comparator/validators/CssValidator.ts
import { Page } from '@playwright/test';
import { ValidationResult } from '../../config/types';
import { getLogger } from '../../utils/Logger';

const logger = getLogger();

export class CssValidator {
  /**
   * Validates CSS stylesheets between two pages.
   */
  async validate(
    sourcePage: Page,
    destPage: Page
  ): Promise<ValidationResult> {
    try {
      const sourceCss = await this.extractCss(sourcePage);
      const destCss = await this.extractCss(destPage);

      const differences = this.compare(sourceCss, destCss);

      return {
        passed: differences.length === 0,
        differences,
        details: { sourceCss, destCss }
      };
    } catch (error) {
      logger.error('CSS validation failed', { error: error.message });
      return {
        passed: false,
        differences: [`CSS validation error: ${error.message}`]
      };
    }
  }

  private async extractCss(page: Page): Promise<Record<string, string>> {
    // Extract CSS stylesheets
    return await page.evaluate(() => {
      const styles: Record<string, string> = {};
      const sheets = Array.from(document.styleSheets);

      sheets.forEach((sheet, index) => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          styles[`sheet-${index}`] = rules
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      });

      return styles;
    });
  }

  private compare(
    source: Record<string, string>,
    dest: Record<string, string>
  ): string[] {
    const differences: string[] = [];

    // Compare stylesheets
    for (const [key, value] of Object.entries(source)) {
      if (!dest[key]) {
        differences.push(`Stylesheet '${key}' missing in destination`);
      } else if (dest[key] !== value) {
        differences.push(`Stylesheet '${key}' differs`);
      }
    }

    return differences.slice(0, 10); // Limit to 10 differences
  }
}
```

#### 2. Add to Configuration Types

```typescript
// src/config/types.ts
export interface ValidationConfig {
  htmlStructure: boolean;
  textContent: boolean;
  images: boolean;
  links: boolean;
  css: boolean; // Add new validator
}
```

#### 3. Update ConfigLoader Defaults

```typescript
// src/config/ConfigLoader.ts
const defaultConfig: Partial<SiteDiffConfig> = {
  validation: {
    htmlStructure: true,
    textContent: true,
    images: true,
    links: true,
    css: true, // Add default
  },
  // ...
};
```

#### 4. Integrate into ComparisonEngine

```typescript
// src/comparator/ComparisonEngine.ts
import { CssValidator } from './validators/CssValidator';

// In the comparison method:
if (config.validation.css) {
  const cssValidator = new CssValidator();
  validationResults.css = await cssValidator.validate(
    sourcePage,
    destPage
  );
}
```

#### 5. Add Tests

```typescript
// tests/unit/validators/CssValidator.test.ts
import { describe, it, expect } from '@jest/globals';
import { CssValidator } from '../../../src/comparator/validators/CssValidator';

describe('CssValidator', () => {
  it('should detect CSS differences', async () => {
    // Test implementation
  });
});
```

#### 6. Update Documentation

- Add to [API.md](./API.md) in Validators section
- Update [README.md](./README.md) validation section
- Add example to [ARCHITECTURE.md](./ARCHITECTURE.md)

### Adding a New Report Format

To add a new report format (e.g., PDF):

#### 1. Create Reporter Class

```typescript
// src/reporter/PdfReporter.ts
import { ComparisonResults } from '../config/types';
import * as fs from 'fs/promises';
import PDFDocument from 'pdfkit'; // hypothetical dependency

export class PdfReporter {
  async generate(
    results: ComparisonResults,
    outputPath: string
  ): Promise<void> {
    const doc = new PDFDocument();
    const stream = createWriteStream(outputPath);

    doc.pipe(stream);

    // Add content to PDF
    doc.fontSize(20).text('SiteDiff Validation Report', { align: 'center' });
    doc.moveDown();

    results.domains.forEach(domain => {
      doc.fontSize(16).text(domain.name);
      doc.fontSize(12).text(`Status: ${domain.passed ? 'PASS' : 'FAIL'}`);
      // Add more details...
      doc.moveDown();
    });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}
```

#### 2. Add Configuration Option

```typescript
// src/config/types.ts
export interface OutputConfig {
  directory: string;
  htmlReport: boolean;
  jsonReport: boolean;
  pdfReport: boolean; // Add new format
  screenshotArtifacts: boolean;
}
```

#### 3. Integrate into ComparisonEngine

```typescript
if (config.output.pdfReport) {
  const pdfReporter = new PdfReporter();
  await pdfReporter.generate(results, `${outputDir}/report.pdf`);
}
```

## Documentation

### Documentation Standards

1. **API Documentation**: Update [API.md](./API.md) for all public APIs
2. **Architecture Documentation**: Update [ARCHITECTURE.md](./ARCHITECTURE.md) for architectural changes
3. **User Documentation**: Update [README.md](./README.md) for user-facing features
4. **Code Comments**: Add JSDoc comments for all public methods
5. **Examples**: Add examples to demonstrate new features

### Documentation Checklist

When adding a feature:

- [ ] JSDoc comments on all public methods
- [ ] API reference updated
- [ ] Architecture documentation updated (if applicable)
- [ ] README updated with usage examples
- [ ] Config examples updated (if applicable)
- [ ] Inline comments for complex logic

## Getting Help

### Resources

- **Documentation**: Start with [README.md](./README.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference**: See [API.md](./API.md)
- **Issues**: Check existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions

### Asking Questions

When asking for help:

1. **Check existing documentation** first
2. **Search existing issues** for similar questions
3. **Provide context**: OS, Node version, config, error messages
4. **Include code samples**: Minimal reproducible example
5. **Be specific**: What did you try? What happened? What did you expect?

### Reporting Bugs

Use this template for bug reports:

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g., Ubuntu 22.04]
- Node.js version: [e.g., 18.17.0]
- SiteDiff version: [e.g., 1.0.0]

## Configuration
```json
{
  // Your config
}
```

## Error Messages
```
Paste error messages here
```

## Additional Context
Any other relevant information
```

### Feature Requests

Use this template for feature requests:

```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How should this feature work?

## Alternatives Considered
What alternatives did you consider?

## Additional Context
Mockups, examples, references, etc.
```

## Release Process

### Versioning

SiteDiff follows [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

### Release Checklist

For maintainers:

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Release notes written
- [ ] npm package published (if applicable)

## Code Review Process

### For Contributors

- Be responsive to feedback
- Make requested changes promptly
- Ask questions if feedback is unclear
- Be open to suggestions and alternatives

### For Reviewers

- Be respectful and constructive
- Explain the "why" behind suggestions
- Approve when ready, request changes when needed
- Test the changes locally if possible

## Recognition

Contributors will be recognized in:

- GitHub Contributors list
- CHANGELOG.md for significant contributions
- Project documentation
- Release notes

## License

By contributing to SiteDiff, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SiteDiff! Your efforts help make cPanel migrations easier and more reliable for everyone.
