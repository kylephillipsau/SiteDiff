# SiteDiff API Reference

Complete API documentation for all classes, interfaces, and methods in SiteDiff.

## Table of Contents

- [Type Definitions](#type-definitions)
- [Configuration API](#configuration-api)
- [Comparison Engine](#comparison-engine)
- [Crawler API](#crawler-api)
- [Validators API](#validators-api)
- [Baseline Manager](#baseline-manager)
- [Server Manager](#server-manager)
- [Reporters API](#reporters-api)
- [Logger API](#logger-api)

---

## Type Definitions

### Core Interfaces

Located in `src/config/types.ts`

#### `SiteDiffConfig`

Main configuration interface for SiteDiff.

```typescript
interface SiteDiffConfig {
  mode: 'baseline' | 'compare' | 'server-compare';
  baselineDir?: string;
  sourceServer?: ServerConfig;
  destinationServer?: ServerConfig;
  domains: DomainConfig[];
  validation: ValidationConfig;
  screenshot: ScreenshotConfig;
  output: OutputConfig;
  crawler: CrawlerConfig;
  parallel: number;
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | `'baseline' \| 'compare' \| 'server-compare'` | Yes | - | Comparison mode |
| `baselineDir` | `string` | Conditional* | `'./baselines'` | Baseline storage directory |
| `sourceServer` | `ServerConfig` | Conditional** | - | Source server configuration |
| `destinationServer` | `ServerConfig` | Conditional*** | - | Destination server configuration |
| `domains` | `DomainConfig[]` | Yes | - | List of domains to validate |
| `validation` | `ValidationConfig` | Yes | See below | Validation settings |
| `screenshot` | `ScreenshotConfig` | Yes | See below | Screenshot settings |
| `output` | `OutputConfig` | Yes | See below | Output settings |
| `crawler` | `CrawlerConfig` | Yes | See below | Crawler settings |
| `parallel` | `number` | No | `3` | Concurrent domain processing |

\* Required for `baseline` and `compare` modes
\*\* Required for `server-compare` mode
\*\*\* Required for `compare` and `server-compare` modes

---

#### `ServerConfig`

Server connection configuration.

```typescript
interface ServerConfig {
  ip: string;
  port?: number;
  protocol?: 'http' | 'https';
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ip` | `string` | Yes | - | Server IP address or hostname |
| `port` | `number` | No | `80` (HTTP) / `443` (HTTPS) | Port number |
| `protocol` | `'http' \| 'https'` | No | `'http'` | Protocol to use |

**Example**:
```json
{
  "ip": "192.168.1.100",
  "port": 8080,
  "protocol": "http"
}
```

---

#### `DomainConfig`

Domain-specific configuration.

```typescript
interface DomainConfig {
  domain: string;
  user?: string;
  enabled?: boolean;
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `domain` | `string` | Yes | - | Domain name (e.g., "example.com") |
| `user` | `string` | Conditional* | - | cPanel username for ~user path access |
| `enabled` | `boolean` | No | `true` | Enable/disable this domain |

\* Required for `compare` and `server-compare` modes

**Example**:
```json
{
  "domain": "example.com",
  "user": "exampleuser",
  "enabled": true
}
```

---

#### `ValidationConfig`

Validation toggles.

```typescript
interface ValidationConfig {
  htmlStructure: boolean;
  textContent: boolean;
  images: boolean;
  links: boolean;
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `htmlStructure` | `boolean` | No | `true` | Enable HTML structure validation |
| `textContent` | `boolean` | No | `true` | Enable text content validation |
| `images` | `boolean` | No | `true` | Enable image validation |
| `links` | `boolean` | No | `true` | Enable link validation |

---

#### `ScreenshotConfig`

Screenshot comparison configuration.

```typescript
interface ScreenshotConfig {
  enabled: boolean;
  threshold: number;
  fullPage: boolean;
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | `boolean` | No | `true` | Enable screenshot comparison |
| `threshold` | `number` | No | `0.1` | Acceptable difference (0-1) |
| `fullPage` | `boolean` | No | `true` | Capture full page vs viewport only |

**Threshold Guide**:
- `0.0`: Exact match required
- `0.05`: Very strict (5% tolerance)
- `0.1`: Recommended (10% tolerance)
- `0.2`: Lenient (20% tolerance)
- `1.0`: Any difference allowed

---

#### `OutputConfig`

Output and report configuration.

```typescript
interface OutputConfig {
  directory: string;
  htmlReport: boolean;
  jsonReport: boolean;
  screenshotArtifacts: boolean;
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `directory` | `string` | Yes | `'./output'` | Output directory path |
| `htmlReport` | `boolean` | No | `true` | Generate HTML report |
| `jsonReport` | `boolean` | No | `true` | Generate JSON report |
| `screenshotArtifacts` | `boolean` | No | `true` | Save screenshot files |

---

#### `CrawlerConfig`

Page discovery configuration.

```typescript
interface CrawlerConfig {
  maxPages: number;
  timeout: number;
  waitForNetworkIdle: boolean;
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `maxPages` | `number` | No | `50` | Maximum pages to discover per domain |
| `timeout` | `number` | No | `30000` | Page load timeout (milliseconds) |
| `waitForNetworkIdle` | `boolean` | No | `true` | Wait for network idle before continuing |

---

#### `ValidationResult`

Result from a validator.

```typescript
interface ValidationResult {
  passed: boolean;
  score?: number;
  differences?: string[];
  details?: any;
}
```

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `passed` | `boolean` | Whether validation passed |
| `score` | `number` | Optional similarity score (0-1) |
| `differences` | `string[]` | Array of difference descriptions |
| `details` | `any` | Validator-specific additional data |

---

#### `PageClassification`

Page type classification result.

```typescript
interface PageClassification {
  type: 'homepage' | 'contact' | 'blog' | 'product' | 'other';
  confidence: number;
}
```

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Classified page type |
| `confidence` | `number` | Confidence score (0-1) |

---

## Configuration API

### ConfigLoader

Located in `src/config/ConfigLoader.ts`

Loads and validates configuration files.

#### `loadConfig(configPath: string): SiteDiffConfig`

Loads a configuration file from disk and validates it.

**Parameters**:
- `configPath` (string): Absolute or relative path to config JSON file

**Returns**: `SiteDiffConfig` - Validated configuration object with defaults applied

**Throws**:
- `Error` if file not found
- `Error` if JSON is invalid
- `Error` if configuration validation fails

**Example**:
```typescript
import { ConfigLoader } from './config/ConfigLoader';

const config = ConfigLoader.loadConfig('./config/myconfig.json');
console.log(`Mode: ${config.mode}`);
```

**Validation Performed**:
- Mode-specific server requirements
- Domain configuration completeness
- Screenshot threshold range (0-1)
- Output directory specified
- At least one domain present

---

#### `applyDefaults(config: Partial<SiteDiffConfig>): SiteDiffConfig`

Applies default values to partial configuration.

**Parameters**:
- `config` (Partial<SiteDiffConfig>): Partial configuration object

**Returns**: `SiteDiffConfig` - Complete configuration with defaults

**Default Values**:
```typescript
{
  mode: 'server-compare',
  baselineDir: './baselines',
  validation: {
    htmlStructure: true,
    textContent: true,
    images: true,
    links: true
  },
  screenshot: {
    enabled: true,
    threshold: 0.1,
    fullPage: true
  },
  output: {
    directory: './output',
    htmlReport: true,
    jsonReport: true,
    screenshotArtifacts: true
  },
  crawler: {
    maxPages: 50,
    timeout: 30000,
    waitForNetworkIdle: true
  },
  parallel: 3
}
```

---

## Comparison Engine

### ComparisonEngine

Located in `src/comparator/ComparisonEngine.ts`

Main orchestration engine for comparisons.

#### `constructor(config: SiteDiffConfig)`

Creates a new comparison engine.

**Parameters**:
- `config` (SiteDiffConfig): Validated configuration object

**Example**:
```typescript
import { ComparisonEngine } from './comparator/ComparisonEngine';

const engine = new ComparisonEngine(config);
```

---

#### `async runComparison(): Promise<ComparisonResults>`

Executes the comparison workflow based on configuration mode.

**Returns**: `Promise<ComparisonResults>` - Complete comparison results

**Workflow**:
1. Determines mode from config (baseline/compare/server-compare)
2. Processes domains in parallel (up to `config.parallel` concurrency)
3. For each domain:
   - Discovers/loads pages
   - Runs validations
   - Captures screenshots
   - Compares results
4. Aggregates all results
5. Generates reports (if enabled)
6. Returns complete results

**Error Handling**:
- Individual domain failures logged but don't stop other domains
- Uses `Promise.allSettled()` for parallel processing
- Includes error details in results

**Example**:
```typescript
const results = await engine.runComparison();
console.log(`Total domains: ${results.domains.length}`);
console.log(`Passed: ${results.domains.filter(d => d.passed).length}`);
```

---

#### `async processDomain(domain: DomainConfig): Promise<DomainResult>`

Processes a single domain based on mode.

**Parameters**:
- `domain` (DomainConfig): Domain configuration

**Returns**: `Promise<DomainResult>` - Results for this domain

**Internal Method** - Called by `runComparison()`

---

## Crawler API

### PageDiscovery

Located in `src/crawler/PageDiscovery.ts`

Automated page discovery via crawling.

#### `constructor(config: CrawlerConfig)`

Creates a page discovery instance.

**Parameters**:
- `config` (CrawlerConfig): Crawler configuration

---

#### `async discoverPages(startUrl: string, browser: Browser): Promise<string[]>`

Discovers pages by crawling from a start URL.

**Parameters**:
- `startUrl` (string): Starting URL for crawling
- `browser` (Browser): Playwright browser instance

**Returns**: `Promise<string[]>` - Array of discovered page URLs

**Algorithm**:
1. Initialize queue with start URL
2. Load page with Playwright
3. Extract all internal links (same domain)
4. Normalize URLs (remove fragments, params)
5. Add new URLs to queue
6. Repeat until `maxPages` or queue empty
7. Return deduplicated URL array

**Respects**:
- `maxPages`: Maximum pages to discover
- `timeout`: Page load timeout
- `waitForNetworkIdle`: Network idle strategy

**Example**:
```typescript
import { PageDiscovery } from './crawler/PageDiscovery';

const discovery = new PageDiscovery(config.crawler);
const pages = await discovery.discoverPages(
  'https://example.com',
  browser
);

console.log(`Discovered ${pages.length} pages`);
```

---

### PageClassifier

Located in `src/crawler/PageClassifier.ts`

Classifies pages by type for reporting.

#### `classify(url: string, content: string): PageClassification`

Classifies a page based on URL and content.

**Parameters**:
- `url` (string): Page URL
- `content` (string): Page HTML content

**Returns**: `PageClassification` - Classification result

**Detection Patterns**:

**Homepage**:
- URL: `/`, `/index.html`, `/index.php`
- Confidence: 1.0

**Contact**:
- URL: `/contact`, `/contact-us`, `/get-in-touch`
- Content: Contact forms, phone numbers, addresses
- Confidence: 0.8-1.0

**Blog/News**:
- URL: `/blog`, `/news`, `/article`, `/YYYY/MM/DD`
- Content: Article tags, dates, author bylines
- Confidence: 0.7-1.0

**Product/Service**:
- URL: `/product`, `/shop`, `/service`, `/pricing`
- Content: Price indicators, "Add to cart", features
- Confidence: 0.7-1.0

**Other**:
- Fallback for unmatched patterns
- Confidence: 0.5

**Example**:
```typescript
import { PageClassifier } from './crawler/PageClassifier';

const classifier = new PageClassifier();
const classification = classifier.classify(
  '/contact-us',
  '<html>...</html>'
);

console.log(`Type: ${classification.type}`); // 'contact'
console.log(`Confidence: ${classification.confidence}`); // 0.9
```

---

## Validators API

All validators follow this interface:

```typescript
interface Validator {
  validate(sourcePage: Page, destPage: Page): Promise<ValidationResult>;
}
```

### HtmlValidator

Located in `src/comparator/validators/HtmlValidator.ts`

Validates HTML structure (DOM tree).

#### `async validate(sourcePage: Page, destPage: Page): Promise<ValidationResult>`

Compares HTML structure between two pages.

**Parameters**:
- `sourcePage` (Page): Playwright page for source
- `destPage` (Page): Playwright page for destination

**Returns**: `Promise<ValidationResult>` - Validation result

**Comparison**:
- Tag names
- Element depth
- Child counts
- Attributes (id, class, href, alt, src)

**Filters**:
- Ignores `<script>` and `<style>` tags
- Normalizes whitespace
- Case-insensitive tag names

**Example Result**:
```typescript
{
  passed: false,
  differences: [
    "Element at depth 2: expected <div>, got <section>",
    "Element .header: child count mismatch (3 vs 4)"
  ]
}
```

---

### TextValidator

Located in `src/comparator/validators/TextValidator.ts`

Validates visible text content.

#### `async validate(sourcePage: Page, destPage: Page): Promise<ValidationResult>`

Compares visible text between two pages.

**Parameters**:
- `sourcePage` (Page): Playwright page for source
- `destPage` (Page): Playwright page for destination

**Returns**: `Promise<ValidationResult>` - Validation result with similarity score

**Algorithm**:
1. Extract visible text (`innerText()`)
2. Normalize (lowercase, collapse whitespace)
3. Compare using:
   - **Short text (<1000 chars)**: Levenshtein distance
   - **Long text**: Word overlap analysis
4. Calculate similarity score (0-1)
5. Pass if score >= 0.9

**Example Result**:
```typescript
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

---

### ImageValidator

Located in `src/comparator/validators/ImageValidator.ts`

Validates images (count, alt text, dimensions).

#### `async validate(sourcePage: Page, destPage: Page): Promise<ValidationResult>`

Compares images between two pages.

**Parameters**:
- `sourcePage` (Page): Playwright page for source
- `destPage` (Page): Playwright page for destination

**Returns**: `Promise<ValidationResult>` - Validation result

**Validation**:
- Total image count
- Alt text for each image
- Image dimensions (width/height)
- Loading status (loaded vs failed)

**Example Result**:
```typescript
{
  passed: false,
  differences: [
    "Image count mismatch: 5 vs 4",
    "Image 2: alt text differs ('Product' vs 'Product Image')",
    "Image 3: dimension mismatch (800x600 vs 1024x768)"
  ]
}
```

---

### LinkValidator

Located in `src/comparator/validators/LinkValidator.ts`

Validates links (hrefs, link text).

#### `async validate(sourcePage: Page, destPage: Page): Promise<ValidationResult>`

Compares links between two pages.

**Parameters**:
- `sourcePage` (Page): Playwright page for source
- `destPage` (Page): Playwright page for destination

**Returns**: `Promise<ValidationResult>` - Validation result

**Validation**:
- Total link count
- Href values (normalized)
- Link text content

**URL Normalization**:
- Removes protocol (`http://`, `https://`)
- Removes domain for internal links
- Removes trailing slashes
- Sorts alphabetically

**Example Result**:
```typescript
{
  passed: false,
  differences: [
    "Link count mismatch: 12 vs 11",
    "Link '/about': text differs ('About Us' vs 'About')",
    "Link '/products/new': missing in destination"
  ]
}
```

---

### ScreenshotComparator

Located in `src/comparator/ScreenshotComparator.ts`

Performs pixel-level screenshot comparison.

#### `async compare(sourcePage: Page, destPage: Page, config: ScreenshotConfig): Promise<ValidationResult>`

Compares screenshots between two pages.

**Parameters**:
- `sourcePage` (Page): Playwright page for source
- `destPage` (Page): Playwright page for destination
- `config` (ScreenshotConfig): Screenshot configuration

**Returns**: `Promise<ValidationResult>` - Validation result with diff percentage

**Algorithm**:
1. Capture screenshots on both pages
2. Load PNG images using `pngjs`
3. Ensure dimensions match (crop if needed)
4. Run `pixelmatch` algorithm
5. Calculate difference percentage
6. Pass if difference <= threshold

**Generates**:
- Source screenshot PNG
- Destination screenshot PNG
- Diff image PNG (differences highlighted)

**Example Result**:
```typescript
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

---

## Baseline Manager

### BaselineManager

Located in `src/baseline/BaselineManager.ts`

Manages baseline data storage and retrieval.

#### `constructor(baselineDir: string)`

Creates a baseline manager.

**Parameters**:
- `baselineDir` (string): Base directory for baseline storage

---

#### `async saveBaseline(domain: string, data: BaselineData): Promise<void>`

Saves baseline data for a domain.

**Parameters**:
- `domain` (string): Domain name
- `data` (BaselineData): Baseline data to save

**Storage Structure**:
```
baselines/
└── example.com/
    ├── baseline.json      # Metadata + page list
    ├── pages/
    │   ├── homepage.json
    │   └── ...
    └── screenshots/
        ├── homepage.png
        └── ...
```

**Writes**:
- `baseline.json`: Metadata and page list
- `pages/*.json`: Individual page data
- `screenshots/*.png`: Screenshot images

**Example**:
```typescript
import { BaselineManager } from './baseline/BaselineManager';

const manager = new BaselineManager('./baselines');
await manager.saveBaseline('example.com', {
  domain: 'example.com',
  createdAt: new Date().toISOString(),
  pages: [...]
});
```

---

#### `async loadBaseline(domain: string): Promise<BaselineData>`

Loads baseline data for a domain.

**Parameters**:
- `domain` (string): Domain name

**Returns**: `Promise<BaselineData>` - Loaded baseline data

**Throws**:
- `Error` if baseline not found
- `Error` if baseline data is corrupted

**Example**:
```typescript
const baseline = await manager.loadBaseline('example.com');
console.log(`Created: ${baseline.createdAt}`);
console.log(`Pages: ${baseline.pages.length}`);
```

---

#### `async baselineExists(domain: string): Promise<boolean>`

Checks if baseline exists for a domain.

**Parameters**:
- `domain` (string): Domain name

**Returns**: `Promise<boolean>` - True if baseline exists

**Example**:
```typescript
if (await manager.baselineExists('example.com')) {
  const baseline = await manager.loadBaseline('example.com');
} else {
  console.log('No baseline found');
}
```

---

## Server Manager

### ServerManager

Located in `src/server/ServerManager.ts`

Constructs server access URLs.

#### `constructUrl(server: ServerConfig | null, domain: string, user: string | undefined, path: string): string`

Constructs a URL for accessing a page.

**Parameters**:
- `server` (ServerConfig | null): Server configuration (null for DNS access)
- `domain` (string): Domain name
- `user` (string | undefined): cPanel username
- `path` (string): Page path

**Returns**: `string` - Constructed URL

**Modes**:

**DNS Access** (server = null):
```typescript
constructUrl(null, 'example.com', undefined, '/about')
// Returns: "https://example.com/about"
```

**cPanel ~user Access** (server provided):
```typescript
constructUrl(
  { ip: '192.168.1.100', port: 80, protocol: 'http' },
  'example.com',
  'exampleuser',
  '/about'
)
// Returns: "http://192.168.1.100/~exampleuser/about"
```

**Example**:
```typescript
import { ServerManager } from './server/ServerManager';

const manager = new ServerManager();
const url = manager.constructUrl(
  config.destinationServer,
  'example.com',
  'exampleuser',
  '/contact'
);

console.log(url); // "http://192.168.1.100/~exampleuser/contact"
```

---

## Reporters API

### HtmlReporter

Located in `src/reporter/HtmlReporter.ts`

Generates interactive HTML reports.

#### `async generate(results: ComparisonResults, outputPath: string): Promise<void>`

Generates an HTML report from comparison results.

**Parameters**:
- `results` (ComparisonResults): Comparison results
- `outputPath` (string): Path for output HTML file

**Features**:
- Embedded, self-contained HTML
- Compressed screenshot images
- Interactive UI (expandable sections)
- Click-to-zoom on images
- Pass/fail color coding

**Example**:
```typescript
import { HtmlReporter } from './reporter/HtmlReporter';

const reporter = new HtmlReporter();
await reporter.generate(
  results,
  './output/report.html'
);
```

---

### JsonReporter

Located in `src/reporter/JsonReporter.ts`

Generates machine-readable JSON reports.

#### `async generate(results: ComparisonResults, outputPath: string): Promise<void>`

Generates a JSON report from comparison results.

**Parameters**:
- `results` (ComparisonResults): Comparison results
- `outputPath` (string): Path for output JSON file

**Output Structure**:
```typescript
{
  timestamp: string;
  config: SiteDiffConfig;
  results: {
    domain: string;
    passed: boolean;
    pages: Array<{
      url: string;
      type: PageType;
      passed: boolean;
      validations: {...};
      screenshotPaths: {...};
    }>;
  }[];
}
```

**Example**:
```typescript
import { JsonReporter } from './reporter/JsonReporter';

const reporter = new JsonReporter();
await reporter.generate(
  results,
  './output/report.json'
);
```

---

## Logger API

### Logger

Located in `src/utils/Logger.ts`

Centralized logging using Winston.

#### `getLogger(): Logger`

Returns the singleton logger instance.

**Returns**: `Logger` - Winston logger instance

**Log Levels**:
- `error`: Critical errors
- `warn`: Non-critical warnings
- `info`: Progress updates
- `debug`: Detailed diagnostics

**Transports**:
1. **Console**: Colorized, simple format
2. **File**: JSON format with full metadata

**Example**:
```typescript
import { getLogger } from './utils/Logger';

const logger = getLogger();

logger.info('Starting comparison', { domain: 'example.com' });
logger.warn('Page timeout', { url: '/about', timeout: 30000 });
logger.error('Validation failed', { error: error.message });
logger.debug('Screenshot captured', { size: 150000 });
```

---

#### Structured Logging

All metadata is included in file logs:

```typescript
logger.info('Page comparison completed', {
  domain: 'example.com',
  page: '/about',
  passed: true,
  duration: 2345,
  validations: {
    html: true,
    text: true,
    images: true,
    links: true,
    screenshot: true
  }
});
```

**File Output** (JSON):
```json
{
  "level": "info",
  "message": "Page comparison completed",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "domain": "example.com",
  "page": "/about",
  "passed": true,
  "duration": 2345,
  "validations": {
    "html": true,
    "text": true,
    "images": true,
    "links": true,
    "screenshot": true
  }
}
```

---

## Usage Examples

### Complete Workflow Example

```typescript
import { ConfigLoader } from './config/ConfigLoader';
import { ComparisonEngine } from './comparator/ComparisonEngine';
import { HtmlReporter } from './reporter/HtmlReporter';
import { JsonReporter } from './reporter/JsonReporter';
import { getLogger } from './utils/Logger';

async function main() {
  const logger = getLogger();

  try {
    // Load configuration
    logger.info('Loading configuration');
    const config = ConfigLoader.loadConfig('./config/myconfig.json');

    // Create comparison engine
    logger.info('Creating comparison engine');
    const engine = new ComparisonEngine(config);

    // Run comparison
    logger.info('Starting comparison');
    const results = await engine.runComparison();

    // Generate reports
    logger.info('Generating reports');
    const htmlReporter = new HtmlReporter();
    await htmlReporter.generate(
      results,
      `${config.output.directory}/report.html`
    );

    const jsonReporter = new JsonReporter();
    await jsonReporter.generate(
      results,
      `${config.output.directory}/report.json`
    );

    // Log summary
    const passedDomains = results.domains.filter(d => d.passed).length;
    logger.info('Comparison complete', {
      totalDomains: results.domains.length,
      passedDomains,
      failedDomains: results.domains.length - passedDomains
    });

  } catch (error) {
    logger.error('Comparison failed', { error: error.message });
    process.exit(1);
  }
}

main();
```

---

### Custom Validator Example

```typescript
import { Page } from '@playwright/test';
import { ValidationResult } from './config/types';

export class MetaTagValidator {
  async validate(
    sourcePage: Page,
    destPage: Page
  ): Promise<ValidationResult> {
    const sourceMeta = await this.extractMetaTags(sourcePage);
    const destMeta = await this.extractMetaTags(destPage);

    const differences: string[] = [];

    // Compare meta tags
    for (const [key, value] of Object.entries(sourceMeta)) {
      if (destMeta[key] !== value) {
        differences.push(
          `Meta tag '${key}': '${value}' vs '${destMeta[key]}'`
        );
      }
    }

    // Check for missing tags
    for (const key of Object.keys(destMeta)) {
      if (!(key in sourceMeta)) {
        differences.push(`Meta tag '${key}' missing in source`);
      }
    }

    return {
      passed: differences.length === 0,
      differences: differences.slice(0, 10),
      details: { sourceMeta, destMeta }
    };
  }

  private async extractMetaTags(page: Page): Promise<Record<string, string>> {
    return await page.evaluate(() => {
      const meta: Record<string, string> = {};
      const tags = document.querySelectorAll('meta');

      tags.forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property');
        const content = tag.getAttribute('content');

        if (name && content) {
          meta[name] = content;
        }
      });

      return meta;
    });
  }
}
```

---

### Parallel Page Processing Example

```typescript
import { Browser } from '@playwright/test';

async function processPages(
  pages: string[],
  browser: Browser,
  maxConcurrency: number = 5
): Promise<void> {
  // Process pages in batches
  for (let i = 0; i < pages.length; i += maxConcurrency) {
    const batch = pages.slice(i, i + maxConcurrency);

    await Promise.allSettled(
      batch.map(async (pageUrl) => {
        const page = await browser.newPage();
        try {
          await page.goto(pageUrl);
          // Process page...
        } finally {
          await page.close();
        }
      })
    );
  }
}
```

---

## Error Handling Best Practices

### Validator Error Handling

```typescript
async validate(sourcePage: Page, destPage: Page): Promise<ValidationResult> {
  try {
    const sourceData = await this.extractData(sourcePage);
    const destData = await this.extractData(destPage);
    const differences = this.compare(sourceData, destData);

    return {
      passed: differences.length === 0,
      differences
    };
  } catch (error) {
    logger.error('Validation error', {
      validator: 'CustomValidator',
      error: error.message
    });

    return {
      passed: false,
      differences: [`Validation error: ${error.message}`]
    };
  }
}
```

### Page Navigation Error Handling

```typescript
try {
  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: config.crawler.timeout
  });
} catch (error) {
  if (error.message.includes('timeout')) {
    logger.warn('Page load timeout', { url, timeout: config.crawler.timeout });
    // Handle timeout gracefully
  } else if (error.message.includes('net::ERR')) {
    logger.error('Network error', { url, error: error.message });
    // Handle network error
  } else {
    throw error; // Re-throw unexpected errors
  }
}
```

---

## Conclusion

This API reference provides complete documentation for all public interfaces in SiteDiff. For architectural details and design patterns, see [ARCHITECTURE.md](./ARCHITECTURE.md). For contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).
