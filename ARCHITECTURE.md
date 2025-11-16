# SiteDiff Architecture Documentation

This document provides a comprehensive overview of SiteDiff's architecture, design patterns, and internal workings for developers and contributors.

## Table of Contents

- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [System Architecture](#system-architecture)
- [Module Deep Dive](#module-deep-dive)
- [Data Flow](#data-flow)
- [Extension Points](#extension-points)
- [Design Patterns](#design-patterns)
- [Performance Considerations](#performance-considerations)

## Overview

SiteDiff is a Playwright-based migration validation tool designed with modularity, extensibility, and performance in mind. The architecture follows a layered approach with clear separation of concerns.

### Technology Stack

- **TypeScript 5.6+**: Type-safe development with strict mode enabled
- **Playwright 1.48+**: Browser automation for page access and screenshot capture
- **Commander.js 12+**: CLI framework for command parsing
- **Winston 3.15+**: Structured logging
- **Pixelmatch 6+**: Pixel-level image comparison
- **Sharp 0.33+**: Image compression for optimized reports

## Architecture Principles

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Dependency Injection**: Configuration and dependencies are injected, not hardcoded
3. **Composability**: Validators can be enabled/disabled independently
4. **Extensibility**: New validators, reporters, and page classifiers can be added without modifying core logic
5. **Type Safety**: Comprehensive TypeScript interfaces ensure compile-time safety
6. **Fail-Fast**: Configuration validation occurs before any processing begins
7. **Parallel Processing**: Domain processing is parallelized for performance
8. **Idempotency**: Baseline creation can be re-run safely

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLI Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   baseline   │  │   compare    │  │     init     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘          │
└─────────┼──────────────────┼──────────────────────────────────────┘
          │                  │
          └─────────┬────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                    Configuration Layer                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ConfigLoader: Loads, validates, applies defaults        │   │
│  │  - Mode validation (baseline/compare/server-compare)    │   │
│  │  - Server requirement validation                        │   │
│  │  - Domain validation                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                   Orchestration Layer                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ComparisonEngine: Main workflow orchestrator           │   │
│  │  - Mode-specific workflow execution                     │   │
│  │  - Parallel domain processing                           │   │
│  │  - Error handling and recovery                          │   │
│  └────┬────────────────────────────────────────────────┬───┘   │
└───────┼────────────────────────────────────────────────┼────────┘
        │                                                │
        │        ┌───────────────────────────────┐       │
        │        │   ServerManager               │       │
        │        │   - URL construction          │       │
        │        │   - cPanel ~user paths        │       │
        │        └───────────────────────────────┘       │
        │                                                │
┌───────▼────────────────────────────────────────────────▼────────┐
│                    Processing Layer                              │
│                                                                  │
│  ┌──────────────────┐         ┌───────────────────────┐        │
│  │  PageDiscovery   │────────▶│  PageClassifier       │        │
│  │  - Crawling      │         │  - Homepage detection │        │
│  │  - Link extract  │         │  - Contact detection  │        │
│  │  - Deduplication │         │  - Blog detection     │        │
│  └──────────────────┘         │  - Product detection  │        │
│                               └───────────────────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BaselineManager                                         │  │
│  │  - Save baseline data (JSON)                             │  │
│  │  - Load baseline data                                    │  │
│  │  - Directory management                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                      Validation Layer                             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │HtmlValidator │  │TextValidator │  │ImageValidator│           │
│  │- DOM tree    │  │- Visible text│  │- Image count │           │
│  │- Structure   │  │- Similarity  │  │- Alt text    │           │
│  │- Attributes  │  │- Levenshtein │  │- Dimensions  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌──────────────┐  ┌────────────────────────────────┐           │
│  │LinkValidator │  │  ScreenshotComparator          │           │
│  │- Link count  │  │  - Pixelmatch algorithm        │           │
│  │- Href/text   │  │  - Threshold comparison        │           │
│  │- URL norm.   │  │  - Diff image generation       │           │
│  └──────────────┘  └────────────────────────────────┘           │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                      Reporting Layer                              │
│                                                                   │
│  ┌──────────────────────┐         ┌──────────────────────┐      │
│  │  HtmlReporter        │         │  JsonReporter        │      │
│  │  - Interactive UI    │         │  - Structured data   │      │
│  │  - Screenshot embed  │         │  - CI/CD friendly    │      │
│  │  - Image compression │         │  - Complete results  │      │
│  └──────────────────────┘         └──────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                      Utility Layer                                │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Logger (Winston)                                      │     │
│  │  - Console output (colorized)                          │     │
│  │  - File output (JSON structured)                       │     │
│  │  - Configurable log levels                             │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

## Module Deep Dive

### CLI Layer (`src/index.ts`)

**Responsibility**: Command-line interface entry point

**Key Functions**:
- Parse command-line arguments using Commander.js
- Route to appropriate workflow (baseline, compare, init)
- Handle CLI-level error messages
- Configure logging based on verbosity flags

**Commands**:
1. `baseline`: Creates baseline from live domains
2. `compare`: Compares domains (baseline or server-compare mode)
3. `init`: Generates sample configuration file

### Configuration Module (`src/config/`)

#### `types.ts`
Defines all TypeScript interfaces:
- `SiteDiffConfig`: Main configuration structure
- `ServerConfig`: Server connection details
- `DomainConfig`: Domain-specific settings
- `ValidationConfig`: Validator toggles
- `ScreenshotConfig`: Screenshot comparison settings
- `OutputConfig`: Report generation settings
- `CrawlerConfig`: Page discovery settings

#### `ConfigLoader.ts`
**Responsibility**: Configuration file loading and validation

**Key Methods**:
- `loadConfig(configPath: string): SiteDiffConfig`
  - Loads JSON configuration file
  - Applies default values for optional fields
  - Validates configuration against mode requirements
  - Returns validated configuration object

**Validation Rules**:
- Baseline mode: requires `baselineDir`, no source server
- Compare mode: requires `baselineDir` and `destinationServer`, no source server
- Server-compare mode: requires both `sourceServer` and `destinationServer`
- At least one domain must be specified
- Screenshot threshold must be between 0 and 1
- Output directory must be specified

### Crawler Module (`src/crawler/`)

#### `PageDiscovery.ts`
**Responsibility**: Automated page discovery via crawling

**Algorithm**:
1. Start with homepage URL
2. Load page with Playwright
3. Extract all internal links (same domain)
4. Normalize URLs (remove fragments, query params)
5. Add new URLs to queue
6. Repeat until `maxPages` reached or queue empty

**Key Methods**:
- `discoverPages(domain: string, startUrl: string, maxPages: number): Promise<string[]>`
  - Returns array of discovered page URLs
  - Deduplicates URLs
  - Respects timeout settings
  - Handles network errors gracefully

**Configuration**:
- `maxPages`: Limit on pages to discover (default: 50)
- `timeout`: Page load timeout (default: 30000ms)
- `waitForNetworkIdle`: Wait for network activity to cease (default: true)

#### `PageClassifier.ts`
**Responsibility**: Classify pages by type for reporting

**Classification Logic**:

```typescript
interface PageClassification {
  type: 'homepage' | 'contact' | 'blog' | 'product' | 'other';
  confidence: number; // 0-1
}
```

**Detection Patterns**:

1. **Homepage**:
   - URL is `/`, `/index.html`, `/index.php`, or domain root
   - Confidence: 1.0

2. **Contact Page**:
   - URL patterns: `/contact`, `/contact-us`, `/get-in-touch`
   - Content patterns: Contact forms, phone numbers, email addresses
   - Confidence: 0.8-1.0

3. **Blog/News**:
   - URL patterns: `/blog`, `/news`, `/article`, `/YYYY/MM/DD`
   - Content patterns: Article tags, publish dates, author bylines
   - Confidence: 0.7-1.0

4. **Product/Service**:
   - URL patterns: `/product`, `/shop`, `/service`, `/pricing`
   - Content patterns: Price indicators, "Add to cart", feature lists
   - Confidence: 0.7-1.0

5. **Other**:
   - Fallback for pages not matching above patterns
   - Confidence: 0.5

### Comparison Module (`src/comparator/`)

#### `ComparisonEngine.ts`
**Responsibility**: Orchestrates the entire comparison workflow

**Key Methods**:

```typescript
async runComparison(config: SiteDiffConfig): Promise<ComparisonResults>
```

**Workflow by Mode**:

**Baseline Mode**:
```
For each domain:
  1. Discover pages (via DNS)
  2. For each page:
     a. Navigate and wait for load
     b. Extract HTML structure
     c. Extract text content
     d. Extract images
     e. Extract links
     f. Capture screenshot
  3. Save baseline data to disk
  4. Log summary
```

**Compare Mode**:
```
For each domain:
  1. Load baseline from disk
  2. For each baseline page:
     a. Navigate to destination server (via cPanel ~user path)
     b. Run all enabled validators
     c. Compare screenshots
     d. Aggregate results
  3. Return comparison results
```

**Server-Compare Mode**:
```
For each domain:
  1. Discover pages on source server
  2. For each page:
     a. Navigate source and destination in parallel
     b. Run all enabled validators
     c. Compare screenshots
     d. Aggregate results
  3. Return comparison results
```

**Parallel Processing**:
- Processes N domains concurrently (configurable via `parallel` setting)
- Uses `Promise.allSettled()` to handle failures gracefully
- Each domain runs independently

#### Validators (`src/comparator/validators/`)

All validators implement a common interface:

```typescript
interface ValidationResult {
  passed: boolean;
  score?: number;        // Optional similarity score (0-1)
  differences?: string[]; // Array of difference descriptions
  details?: any;         // Validator-specific details
}

interface Validator {
  validate(sourcePage: Page, destPage: Page): Promise<ValidationResult>;
}
```

##### `HtmlValidator.ts`
**Algorithm**:
1. Extract DOM tree from both pages using `page.content()`
2. Parse HTML into tree structure
3. Traverse trees depth-first, comparing:
   - Tag names
   - Nesting depth
   - Child counts
   - Element attributes (id, class, href, alt, src)
4. Report first 10 differences found

**Filters**:
- Ignores `<script>` and `<style>` tags
- Normalizes whitespace in attributes
- Case-insensitive tag comparison

**Example Output**:
```javascript
{
  passed: false,
  differences: [
    "Element at depth 2: expected <div>, got <section>",
    "Element .header: child count mismatch (3 vs 4)"
  ]
}
```

##### `TextValidator.ts`
**Algorithm**:
1. Extract visible text using `page.locator('body').innerText()`
2. Normalize text:
   - Convert to lowercase
   - Collapse whitespace
   - Remove punctuation (optional)
3. Compare using:
   - **Short text (<1000 chars)**: Levenshtein distance algorithm
   - **Long text**: Word overlap analysis
4. Calculate similarity score (0-1)
5. Pass if score >= 0.9

**Similarity Calculation**:
```typescript
// For short text
similarity = 1 - (levenshteinDistance / maxLength)

// For long text
commonWords = intersection(sourceWords, destWords)
similarity = (2 * commonWords.length) / (sourceWords.length + destWords.length)
```

**Example Output**:
```javascript
{
  passed: true,
  score: 0.95,
  details: {
    sourceLength: 1523,
    destLength: 1531,
    uniqueToSource: ["2024"],
    uniqueToDest: ["2025"]
  }
}
```

##### `ImageValidator.ts`
**Algorithm**:
1. Extract all `<img>` elements from both pages
2. Compare:
   - Total image count
   - Alt text for each image (by index)
   - Image dimensions (width/height)
   - Loading status (loaded vs failed)
3. Report all mismatches

**Extraction**:
```typescript
const images = await page.locator('img').evaluateAll((imgs) =>
  imgs.map(img => ({
    src: img.src,
    alt: img.alt,
    width: img.naturalWidth,
    height: img.naturalHeight,
    loaded: img.complete && img.naturalHeight > 0
  }))
);
```

**Example Output**:
```javascript
{
  passed: false,
  differences: [
    "Image count mismatch: 5 vs 4",
    "Image 2: alt text differs ('Product' vs 'Product Image')",
    "Image 3: dimension mismatch (800x600 vs 1024x768)"
  ]
}
```

##### `LinkValidator.ts`
**Algorithm**:
1. Extract all `<a>` elements
2. Normalize URLs:
   - Remove protocol (`http://`, `https://`)
   - Remove domain for internal links
   - Remove trailing slashes
   - Sort alphabetically
3. Compare:
   - Total link count
   - Href values (normalized)
   - Link text content
4. Report first 10 differences

**URL Normalization**:
```typescript
function normalizeUrl(url: string, baseDomain: string): string {
  let normalized = url.replace(/^https?:\/\//, '');
  if (normalized.startsWith(baseDomain)) {
    normalized = normalized.substring(baseDomain.length);
  }
  return normalized.replace(/\/$/, '');
}
```

**Example Output**:
```javascript
{
  passed: false,
  differences: [
    "Link count mismatch: 12 vs 11",
    "Link '/about': text differs ('About Us' vs 'About')",
    "Link '/products/new': missing in destination"
  ]
}
```

#### `ScreenshotComparator.ts`
**Responsibility**: Pixel-level visual comparison

**Algorithm**:
1. Capture screenshots on both pages using Playwright
2. Load PNG images using `pngjs`
3. Ensure dimensions match (crop to smaller if different)
4. Run `pixelmatch` algorithm:
   - Compare each pixel's RGB values
   - Apply threshold (default 0.1)
   - Mark differences in diff image
5. Calculate difference percentage
6. Pass if difference <= configured threshold

**Configuration**:
- `threshold`: Acceptable difference percentage (0-1)
- `fullPage`: Capture entire page vs viewport only

**Pixelmatch Options**:
```typescript
const diffPixels = pixelmatch(
  sourceData,
  destData,
  diffData,
  width,
  height,
  { threshold: 0.1, includeAA: true }
);
```

**Output**:
- Source screenshot PNG
- Destination screenshot PNG
- Diff image PNG (highlighting differences in red)
- Difference percentage

**Example Output**:
```javascript
{
  passed: true,
  score: 0.03, // 3% difference
  details: {
    diffPixels: 4521,
    totalPixels: 150000,
    percentage: 0.03
  }
}
```

### Baseline Module (`src/baseline/`)

#### `BaselineManager.ts`
**Responsibility**: Manage baseline data storage and retrieval

**Storage Format**:
```
baselines/
└── example.com/
    ├── baseline.json      # Metadata + page list
    ├── pages/
    │   ├── homepage.json  # Page-specific data
    │   ├── contact.json
    │   └── ...
    └── screenshots/
        ├── homepage.png
        ├── contact.png
        └── ...
```

**Baseline JSON Structure**:
```typescript
interface BaselineData {
  domain: string;
  createdAt: string;
  pages: Array<{
    url: string;
    type: PageType;
    html: string;
    text: string;
    images: ImageInfo[];
    links: LinkInfo[];
    screenshotPath: string;
  }>;
}
```

**Key Methods**:
- `saveBaseline(domain: string, data: BaselineData): Promise<void>`
  - Creates directory structure
  - Saves JSON data
  - Saves screenshot files
  - Atomic write operation

- `loadBaseline(domain: string): Promise<BaselineData>`
  - Reads baseline JSON
  - Validates data integrity
  - Returns baseline object

### Server Module (`src/server/`)

#### `ServerManager.ts`
**Responsibility**: Construct server access URLs

**URL Construction Logic**:

```typescript
function constructUrl(
  server: ServerConfig | null,
  domain: string,
  user: string | undefined,
  path: string
): string
```

**Modes**:

1. **DNS Access** (baseline mode):
   ```
   Input: domain="example.com", path="/about"
   Output: "https://example.com/about"
   ```

2. **cPanel ~user Access** (server modes):
   ```
   Input: server.ip="192.168.1.100", user="exampleuser", path="/about"
   Output: "http://192.168.1.100/~exampleuser/about"
   ```

**Special Cases**:
- Handles trailing slashes
- Supports custom ports
- Supports HTTP/HTTPS protocols
- Preserves query parameters

### Reporting Module (`src/reporter/`)

#### `HtmlReporter.ts`
**Responsibility**: Generate interactive HTML reports

**Report Structure**:
```html
<!DOCTYPE html>
<html>
<head>
  <style>/* Embedded CSS */</style>
</head>
<body>
  <!-- Summary Section -->
  <div class="summary">
    <h1>SiteDiff Validation Report</h1>
    <p>Generated: {timestamp}</p>
    <p>Total Domains: {count}</p>
    <p>Passed: {passedCount} | Failed: {failedCount}</p>
  </div>

  <!-- Domain Results -->
  <div class="domain" data-domain="example.com">
    <h2>example.com</h2>

    <!-- Page Results -->
    <div class="page">
      <h3>Homepage (/)</h3>

      <!-- Validation Results -->
      <div class="validation">
        <span class="pass">✓ HTML Structure</span>
        <span class="fail">✗ Text Content</span>
        <!-- ... -->
      </div>

      <!-- Screenshots -->
      <div class="screenshots">
        <img src="data:image/png;base64,{compressed}" alt="Source">
        <img src="data:image/png;base64,{compressed}" alt="Destination">
        <img src="data:image/png;base64,{compressed}" alt="Diff">
      </div>

      <!-- Difference Details -->
      <div class="differences">
        <ul>
          <li>Image count mismatch: 5 vs 4</li>
          <!-- ... -->
        </ul>
      </div>
    </div>
  </div>

  <script>/* Interactive JS */</script>
</body>
</html>
```

**Features**:
- Embedded, self-contained (no external dependencies)
- Compressed screenshot images using Sharp
- Click-to-zoom on images
- Expandable/collapsible sections
- Pass/fail color coding
- Responsive design

**Image Compression**:
```typescript
// Compress screenshots before embedding
const compressed = await sharp(screenshotBuffer)
  .resize(800, null, { withoutEnlargement: true })
  .jpeg({ quality: 80 })
  .toBuffer();
```

#### `JsonReporter.ts`
**Responsibility**: Generate machine-readable JSON reports

**JSON Structure**:
```typescript
interface JsonReport {
  timestamp: string;
  config: SiteDiffConfig;
  results: {
    domain: string;
    passed: boolean;
    pages: Array<{
      url: string;
      type: PageType;
      passed: boolean;
      validations: {
        htmlStructure?: ValidationResult;
        textContent?: ValidationResult;
        images?: ValidationResult;
        links?: ValidationResult;
        screenshot?: ValidationResult;
      };
      screenshotPaths?: {
        source: string;
        destination: string;
        diff: string;
      };
    }>;
  }[];
}
```

**Use Cases**:
- CI/CD integration
- Automated result parsing
- Custom report generation
- Historical comparison tracking

### Utility Module (`src/utils/`)

#### `Logger.ts`
**Responsibility**: Centralized logging

**Winston Configuration**:
```typescript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console: colorized, simple format
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // File: JSON format with full metadata
    new winston.transports.File({
      filename: `output/sitediff-${timestamp}.log`,
      format: winston.format.json()
    })
  ]
});
```

**Log Levels**:
- `error`: Critical errors, failed operations
- `warn`: Non-critical issues, timeouts
- `info`: Progress updates, summaries
- `debug`: Detailed diagnostic information

**Structured Logging**:
```typescript
logger.info('Page comparison completed', {
  domain: 'example.com',
  page: '/about',
  passed: true,
  duration: 2345
});
```

## Data Flow

### Baseline Creation Flow

```
User runs: sitediff baseline -c config.json
  ↓
CLI parses arguments → baseline command
  ↓
ConfigLoader validates config (mode: baseline)
  ↓
ComparisonEngine.runComparison(config)
  ↓
For each domain (parallel):
  ↓
  PageDiscovery.discoverPages(domain)
    → Crawls site via DNS
    → Returns array of URLs
  ↓
  For each page:
    ↓
    Navigate to page (Playwright)
      ↓
    Extract data:
      • HTML structure (DOM tree)
      • Visible text
      • Images (src, alt, dimensions)
      • Links (href, text)
      ↓
    Capture screenshot (PNG)
      ↓
    Classify page type (PageClassifier)
  ↓
  BaselineManager.saveBaseline(domain, data)
    → Writes JSON + screenshots to disk
    → baselines/{domain}/
  ↓
Logger logs summary
```

### Compare Mode Flow

```
User runs: sitediff compare -c config.json
  ↓
CLI parses arguments → compare command
  ↓
ConfigLoader validates config (mode: compare)
  ↓
ComparisonEngine.runComparison(config)
  ↓
For each domain (parallel):
  ↓
  BaselineManager.loadBaseline(domain)
    → Reads baseline JSON from disk
    → Returns baseline data
  ↓
  For each baseline page:
    ↓
    ServerManager.constructUrl(destinationServer, domain, user, path)
      → Returns: http://IP/~user/path
    ↓
    Navigate to destination URL (Playwright)
      ↓
    Run enabled validators (parallel):
      • HtmlValidator.validate() if enabled
      • TextValidator.validate() if enabled
      • ImageValidator.validate() if enabled
      • LinkValidator.validate() if enabled
      ↓
    Capture destination screenshot
      ↓
    ScreenshotComparator.compare(baseline.screenshot, dest.screenshot)
      → Runs pixelmatch
      → Generates diff image
      → Returns pass/fail + percentage
    ↓
    Aggregate results
      → passed = all validators passed
  ↓
  Return domain results
  ↓
HtmlReporter.generate(results) → HTML file
JsonReporter.generate(results) → JSON file
  ↓
Logger logs summary
```

### Server-Compare Mode Flow

```
User runs: sitediff compare -c config.json
  ↓
CLI parses arguments → compare command
  ↓
ConfigLoader validates config (mode: server-compare)
  ↓
ComparisonEngine.runComparison(config)
  ↓
For each domain (parallel):
  ↓
  ServerManager.constructUrl(sourceServer, domain, user, "/")
    → Source URL: http://SOURCE_IP/~user/
  ↓
  PageDiscovery.discoverPages(sourceUrl)
    → Crawls source server
    → Returns array of URLs
  ↓
  For each page:
    ↓
    Construct source and destination URLs:
      • Source: http://SOURCE_IP/~user/path
      • Dest: http://DEST_IP/~user/path
    ↓
    Navigate to both URLs (Playwright, parallel)
      ↓
    Run validators on both pages (parallel)
      ↓
    Compare screenshots
      ↓
    Aggregate results
  ↓
Generate reports
  ↓
Logger logs summary
```

## Extension Points

SiteDiff is designed to be extensible. Here are the main extension points:

### 1. Adding a New Validator

**Steps**:
1. Create a new file in `src/comparator/validators/`
2. Implement the validator interface:

```typescript
// src/comparator/validators/CustomValidator.ts
import { Page } from '@playwright/test';
import { ValidationResult } from '../../config/types';

export class CustomValidator {
  async validate(
    sourcePage: Page,
    destPage: Page
  ): Promise<ValidationResult> {
    try {
      // Extract data from both pages
      const sourceData = await this.extractData(sourcePage);
      const destData = await this.extractData(destPage);

      // Compare data
      const differences = this.compare(sourceData, destData);

      return {
        passed: differences.length === 0,
        differences,
        details: { sourceData, destData }
      };
    } catch (error) {
      return {
        passed: false,
        differences: [`Validation error: ${error.message}`]
      };
    }
  }

  private async extractData(page: Page): Promise<any> {
    // Your extraction logic
  }

  private compare(source: any, dest: any): string[] {
    // Your comparison logic
  }
}
```

3. Add configuration option to `src/config/types.ts`:

```typescript
export interface ValidationConfig {
  // ... existing validators
  customValidation?: boolean;
}
```

4. Integrate into `ComparisonEngine.ts`:

```typescript
if (config.validation.customValidation) {
  const customValidator = new CustomValidator();
  validationResults.custom = await customValidator.validate(
    sourcePage,
    destPage
  );
}
```

### 2. Adding a New Page Classifier Pattern

Edit `src/crawler/PageClassifier.ts`:

```typescript
export class PageClassifier {
  classify(url: string, content: string): PageClassification {
    // Add your pattern
    if (this.isCustomPageType(url, content)) {
      return { type: 'custom', confidence: 0.9 };
    }

    // ... existing patterns
  }

  private isCustomPageType(url: string, content: string): boolean {
    // URL pattern matching
    const urlPatterns = [/\/custom/, /\/special/];

    // Content pattern matching
    const contentPatterns = ['special-class', 'data-custom'];

    return urlPatterns.some(p => p.test(url)) ||
           contentPatterns.some(p => content.includes(p));
  }
}
```

### 3. Adding a New Report Format

**Steps**:
1. Create a new reporter in `src/reporter/`
2. Implement the reporter interface:

```typescript
// src/reporter/XmlReporter.ts
import { ComparisonResults } from '../config/types';
import * as fs from 'fs/promises';

export class XmlReporter {
  async generate(
    results: ComparisonResults,
    outputPath: string
  ): Promise<void> {
    const xml = this.buildXml(results);
    await fs.writeFile(outputPath, xml, 'utf-8');
  }

  private buildXml(results: ComparisonResults): string {
    // Build XML structure
    return `<?xml version="1.0"?>
      <sitediff>
        <!-- Your XML structure -->
      </sitediff>`;
  }
}
```

3. Add configuration option and integrate into `ComparisonEngine.ts`

### 4. Custom Server Access Methods

If you need to support different server access patterns (not cPanel ~user):

Edit `src/server/ServerManager.ts`:

```typescript
export class ServerManager {
  constructUrl(
    server: ServerConfig,
    domain: string,
    user: string,
    path: string,
    method: 'cpanel' | 'host-header' | 'subdomain' = 'cpanel'
  ): string {
    switch (method) {
      case 'cpanel':
        return `${protocol}://${server.ip}/~${user}${path}`;

      case 'host-header':
        // Return IP with Host header instruction
        return `${protocol}://${server.ip}${path}`;

      case 'subdomain':
        return `${protocol}://${user}.${server.ip}${path}`;

      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }
}
```

## Design Patterns

### 1. Strategy Pattern
**Used in**: Validators
- Each validator implements the same interface
- Validators can be enabled/disabled independently
- New validators can be added without modifying existing code

### 2. Factory Pattern
**Used in**: Report generation
- Different report formats (HTML, JSON) created through common interface
- Easy to add new report formats

### 3. Dependency Injection
**Used in**: Throughout the application
- Configuration injected into all components
- Logger injected where needed
- Facilitates testing and modularity

### 4. Command Pattern
**Used in**: CLI commands
- Each command (baseline, compare, init) encapsulates a specific action
- Easy to add new commands

### 5. Observer Pattern
**Used in**: Logging
- Logger observes events throughout the application
- Centralizes logging logic

## Performance Considerations

### 1. Parallel Processing

**Domain-Level Parallelism**:
```typescript
const results = await Promise.allSettled(
  domains.map(domain => this.processDomain(domain))
);
```

**Benefits**:
- Process multiple domains concurrently
- Configurable concurrency level
- Faster overall execution

**Tradeoffs**:
- Higher memory usage
- More browser instances
- Potential rate limiting issues

### 2. Screenshot Compression

**HTML Report Optimization**:
```typescript
const compressed = await sharp(screenshot)
  .resize(800, null, { withoutEnlargement: true })
  .jpeg({ quality: 80 })
  .toBuffer();
```

**Benefits**:
- Smaller HTML report files (10-20x reduction)
- Faster report loading
- Embedded images don't bloat file size

### 3. Baseline Storage

**Disk I/O Optimization**:
- Baseline data stored as JSON (fast serialization)
- Screenshots stored as separate PNG files (avoid JSON bloat)
- Directory-based organization for easy management

### 4. Memory Management

**Page Cleanup**:
```typescript
try {
  await page.goto(url);
  // ... perform operations
} finally {
  await page.close(); // Ensure page is always closed
}
```

**Benefits**:
- Prevents memory leaks
- Browser process cleanup
- Stable long-running executions

### 5. Network Optimization

**Network Idle Strategy**:
```typescript
await page.goto(url, {
  waitUntil: 'networkidle',
  timeout: 30000
});
```

**Benefits**:
- Ensures page fully loaded
- Captures dynamic content
- Reduces false positives

**Tradeoffs**:
- Slower page loads
- May timeout on slow sites

## Error Handling

### 1. Graceful Degradation

```typescript
try {
  const result = await validator.validate(sourcePage, destPage);
  validationResults.html = result;
} catch (error) {
  logger.warn('HTML validation failed', { error: error.message });
  validationResults.html = {
    passed: false,
    differences: [`Validation error: ${error.message}`]
  };
}
```

**Philosophy**:
- Continue processing even if individual validations fail
- Log errors for diagnostics
- Include error information in reports

### 2. Promise.allSettled

```typescript
const results = await Promise.allSettled(
  domains.map(d => this.processDomain(d))
);

results.forEach((result, index) => {
  if (result.status === 'rejected') {
    logger.error('Domain processing failed', {
      domain: domains[index],
      error: result.reason
    });
  }
});
```

**Benefits**:
- One domain failure doesn't stop others
- Complete results even with partial failures
- Better error reporting

### 3. Timeout Handling

```typescript
const page = await browser.newPage();
page.setDefaultTimeout(config.crawler.timeout);

try {
  await page.goto(url, { timeout: config.crawler.timeout });
} catch (error) {
  if (error.message.includes('timeout')) {
    logger.warn('Page timeout', { url, timeout: config.crawler.timeout });
    // Log warning, mark page as failed, continue
  } else {
    throw error;
  }
}
```

## Testing Strategy

### Unit Testing
- Test individual validators in isolation
- Mock Playwright pages
- Test configuration validation
- Test URL construction logic

### Integration Testing
- Test full comparison workflows
- Use test fixtures (sample HTML pages)
- Validate report generation

### End-to-End Testing
- Test against real websites
- Validate screenshot comparison
- Test all three modes (baseline, compare, server-compare)

## Future Enhancements

### Potential Extensions
1. **Additional Validators**:
   - CSS comparison
   - JavaScript file comparison
   - Meta tag validation
   - Cookie comparison

2. **Advanced Crawling**:
   - Sitemap XML parsing
   - Authentication support
   - JavaScript-rendered content

3. **Reporting Enhancements**:
   - Email notifications
   - Slack/Discord webhooks
   - Historical trend tracking
   - PDF report generation

4. **Performance**:
   - Page-level parallelism
   - Browser context reuse
   - Incremental baseline updates

5. **Cloud Integration**:
   - S3 baseline storage
   - Distributed execution
   - CI/CD plugins (GitHub Actions, GitLab CI)

## Conclusion

SiteDiff's architecture is designed for:
- **Modularity**: Each component has a single responsibility
- **Extensibility**: Easy to add new validators, reporters, classifiers
- **Performance**: Parallel processing and optimized I/O
- **Reliability**: Graceful error handling and comprehensive logging
- **Maintainability**: Strong typing and clear interfaces

The codebase follows TypeScript best practices and modern Node.js patterns, making it accessible for contributors and suitable for production use.
