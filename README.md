# SiteDiff - cPanel Migration Validator

A Playwright-based tool for validating cPanel migrations by comparing domains before and after transfer. Performs comprehensive content validation and visual screenshot comparison to ensure accurate one-to-one site transfers.

## Features

- **Baseline/Compare Workflow**: Create a baseline from live sites before migration, then compare after migration
- **Smart Page Discovery**: Automatically crawls domains to discover key pages (homepage, contact, blog/news, product/service)
- **Direct IP Access**: Compare sites on different servers using direct IP access with cPanel user paths (no DNS changes required)
- **Comprehensive Validation**:
  - HTML structure comparison
  - Text content validation
  - Image validation (sources, alt text, loading status)
  - Link validation
- **Visual Comparison**: Screenshot comparison with configurable tolerance threshold using pixelmatch
- **Dual Report Formats**:
  - HTML report with side-by-side screenshots and visual diff highlighting
  - JSON report for automation and integration
- **Parallel Processing**: Process multiple domains concurrently for faster validation

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Install Playwright Browsers

```bash
npx playwright install
```

## Usage Modes

SiteDiff supports two workflows for validation:

### 1. Baseline/Compare Workflow (Recommended)

This is the recommended approach for real-world migrations where you need to compare before and after DNS migration.

**Workflow:**
1. **Before Migration** - Create a baseline from the live site (via DNS)
2. Migrate your sites to the new cPanel server
3. **After Migration** - Compare the new server against the saved baseline

**Benefits:**
- No need to access the old server after migration
- Compare against the exact state before migration
- Works even after DNS has been updated

### 2. Server-Compare Mode

Directly compare two servers by IP address (traditional mode).

**Use case:** When both servers are accessible simultaneously and you want real-time comparison.

## Quick Start

### Baseline/Compare Workflow

#### Step 1: Create a Configuration File

```bash
npm run dev -- init -o config/myconfig.json
```

Edit `config/myconfig.json`:

```json
{
  "mode": "baseline",
  "baselineDir": "./baselines",
  "domains": [
    { "domain": "example.com", "enabled": true },
    { "domain": "example2.com", "enabled": true }
  ],
  "destinationServer": {
    "ip": "192.168.1.101",
    "port": 80,
    "protocol": "http"
  },
  "validation": { ... },
  "screenshot": { ... },
  "output": { ... }
}
```

**Note:** For baseline mode, domains are accessed via DNS (https://example.com). The `user` field is only needed for the destination server comparison.

#### Step 2: Create Baseline (Before Migration)

```bash
npm run dev -- baseline -c config/myconfig.json
```

This will:
- Access each domain via DNS (the live site)
- Crawl and discover pages
- Capture screenshots and content
- Save baseline data to `./baselines/`

#### Step 3: Compare Against Baseline (After Migration)

Update your config with the destination server and user info:

```json
{
  "mode": "compare",
  "baselineDir": "./baselines",
  "domains": [
    { "domain": "example.com", "user": "exampleuser", "enabled": true },
    { "domain": "example2.com", "user": "example2user", "enabled": true }
  ],
  "destinationServer": {
    "ip": "192.168.1.101",
    "port": 80,
    "protocol": "http"
  },
  ...
}
```

Run the comparison:

```bash
npm run dev -- compare -c config/myconfig.json
```

### Server-Compare Mode (Traditional)

#### Step 1: Create Configuration

Edit `config/myconfig.json`:

```json
{
  "mode": "server-compare",
  "sourceServer": {
    "ip": "192.168.1.100",
    "port": 80,
    "protocol": "http"
  },
  "destinationServer": {
    "ip": "192.168.1.101",
    "port": 80,
    "protocol": "http"
  },
  "domains": [
    { "domain": "example.com", "user": "exampleuser", "enabled": true },
    { "domain": "example2.com", "user": "example2user", "enabled": true }
  ],
  ...
}
```

**Important**: For each domain, you must specify the `user` field. This is required for accessing sites on cPanel servers via the `~user` path format.

#### Step 2: Run Comparison

```bash
npm run dev -- compare -c config/myconfig.json
```

Or after building:

```bash
npm start -- compare -c config/myconfig.json
```

## Configuration

### Example Configuration File

```json
{
  "sourceServer": {
    "ip": "192.168.1.100",
    "port": 80,
    "protocol": "http"
  },
  "destinationServer": {
    "ip": "192.168.1.101",
    "port": 80,
    "protocol": "http"
  },
  "domains": [
    { "domain": "example.com", "user": "exampleuser", "enabled": true },
    { "domain": "example2.com", "user": "example2user", "enabled": true }
  ],
  "validation": {
    "htmlStructure": true,
    "textContent": true,
    "images": true,
    "links": true
  },
  "screenshot": {
    "enabled": true,
    "threshold": 0.1,
    "fullPage": true
  },
  "output": {
    "directory": "./output",
    "htmlReport": true,
    "jsonReport": true,
    "screenshotArtifacts": true
  },
  "crawler": {
    "maxPages": 50,
    "timeout": 30000,
    "waitForNetworkIdle": true
  },
  "parallel": 3
}
```

### Configuration Options

#### Server Configuration

- `ip` (required): Server IP address
- `port` (optional): Port number (default: 80 for HTTP, 443 for HTTPS)
- `protocol` (optional): `http` or `https` (default: `http`)

#### Domain Configuration

- `domain` (required): Domain name to test
- `user` (required for cPanel): cPanel user for accessing the site via `~user` path format
  - This is the primary method for accessing sites on cPanel servers before DNS migration
  - Sites will be accessed as `http://SERVER_IP/~user/path`
- `enabled` (optional): Enable/disable this domain (default: `true`)

**Note**: For cPanel migrations, you must provide the `user` for each domain. This allows SiteDiff to access sites directly by IP without requiring DNS changes or Host header manipulation.

#### Validation Settings

- `htmlStructure`: Compare DOM structure
- `textContent`: Compare visible text content
- `images`: Validate images (sources, alt text, loading)
- `links`: Validate links (hrefs, text)

#### Screenshot Settings

- `enabled`: Enable/disable screenshot comparison
- `threshold`: Difference threshold (0-1, where 0 = exact match, 1 = any difference allowed)
  - Recommended: 0.1 (10% tolerance for minor rendering differences)
- `fullPage`: Capture full page screenshots (vs viewport only)

#### Output Settings

- `directory`: Output directory path
- `htmlReport`: Generate HTML report
- `jsonReport`: Generate JSON report
- `screenshotArtifacts`: Save screenshot images

#### Crawler Settings

- `maxPages`: Maximum number of pages to crawl per domain
- `timeout`: Page load timeout in milliseconds
- `waitForNetworkIdle`: Wait for network idle before considering page loaded

#### General Settings

- `parallel`: Number of domains to process concurrently

## How It Works

### Page Discovery

1. SiteDiff starts at the homepage of each domain on the source server
2. It crawls the site to discover internal links
3. Uses heuristics to classify pages:
   - **Homepage**: Root path (/)
   - **Contact**: URLs/content containing contact information
   - **Blog/News**: URLs/content with blog posts or news articles
   - **Product/Service**: URLs/content about products or services

### Comparison Process

For each discovered page:

1. **Navigate**: Access the page on both source and destination servers using direct IP with cPanel user paths (e.g., `http://IP/~user/`)
2. **Validate**: Run enabled validators (HTML, text, images, links)
3. **Screenshot**: Capture and compare screenshots using pixelmatch
4. **Report**: Document all findings with pass/fail status

### Report Generation

- **HTML Report**: Interactive report with:
  - Summary statistics
  - Domain-level results
  - Page-level validation details
  - Side-by-side screenshots with diff highlighting
  - Click to zoom on images

- **JSON Report**: Machine-readable format containing:
  - Complete validation results
  - Detailed error messages
  - Screenshot paths
  - Timestamps and configuration

## CLI Commands

### compare

Compare domains between source and destination servers.

```bash
sitediff compare -c <config-file> [options]
```

Options:
- `-c, --config <path>`: Path to configuration file (required)
- `-o, --output <path>`: Output directory (overrides config)
- `-v, --verbose`: Enable verbose logging
- `--log-level <level>`: Set log level (debug, info, warn, error)

### init

Create a sample configuration file.

```bash
sitediff init [-o <output-path>]
```

Options:
- `-o, --output <path>`: Output path for config file (default: `./config/sitediff.json`)

## Use Cases

### cPanel Migration Validation

Validate that websites have been correctly migrated from one cPanel server to another:

1. Before DNS changes, configure source IP (old server) and destination IP (new server)
2. List all domains to validate
3. Run SiteDiff to compare sites on both servers
4. Review reports to identify any discrepancies
5. Fix issues before updating DNS

### Staging vs Production Comparison

Compare staging and production versions of sites to ensure consistency.

### Multi-Server Content Verification

Verify that content is identical across multiple servers (e.g., load-balanced servers).

## Output

### Directory Structure

```
output/
├── reports/
│   ├── sitediff-report-{timestamp}.html
│   └── sitediff-report-{timestamp}.json
├── screenshots/
│   ├── {domain}_{page}_source_{timestamp}.png
│   ├── {domain}_{page}_dest_{timestamp}.png
│   └── {domain}_{page}_diff_{timestamp}.png
└── sitediff-{timestamp}.log
```

## Troubleshooting

### Screenshots Don't Match

- Adjust the `screenshot.threshold` value (try 0.15-0.20 for more tolerance)
- Some rendering differences are normal (fonts, anti-aliasing)
- Check if timestamps or dynamic content are causing differences

### Pages Not Loading

- Verify server IPs are correct and accessible
- Check firewall rules allow connections from your machine
- Ensure domains are configured on both servers
- Try increasing `crawler.timeout` value

### Text Content Differs

- Review if there are timestamps or dynamic content
- Check for template differences between servers
- Verify database content is identical

## Development

### Project Structure

```
SiteDiff/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── config/               # Configuration types and loader
│   ├── crawler/              # Page discovery and classification
│   ├── comparator/           # Comparison engine and validators
│   ├── server/               # Server management (IP/Host headers)
│   ├── reporter/             # HTML and JSON report generators
│   └── utils/                # Logger and utilities
├── config/                   # Configuration files
├── output/                   # Generated reports and screenshots
└── dist/                     # Compiled JavaScript
```

### Build Commands

- `npm run build`: Compile TypeScript to JavaScript
- `npm run watch`: Watch mode for development
- `npm run dev`: Run from source with ts-node
- `npm run clean`: Remove build artifacts

## License

MIT; see [LICENSE](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Support

For issues and questions, please create an issue on GitHub.
