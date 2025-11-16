# Example: Basic Baseline Workflow

This example demonstrates the recommended baseline/compare workflow for cPanel migrations.

## Scenario

You're migrating websites from an old cPanel server to a new one and want to ensure content is identical.

## Step 1: Create Configuration (Before Migration)

Create `config/migration.json`:

```json
{
  "mode": "baseline",
  "baselineDir": "./baselines",
  "domains": [
    { "domain": "example.com", "enabled": true },
    { "domain": "mysite.net", "enabled": true },
    { "domain": "testsite.org", "enabled": true }
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

## Step 2: Create Baseline (Before Migration)

Before migrating, capture the current state of all sites:

```bash
sitediff baseline -c config/migration.json -v
```

**What happens**:
- Accesses each domain via DNS (https://example.com)
- Crawls up to 50 pages per domain
- Captures HTML, text, images, links, and screenshots
- Saves baseline to `./baselines/example.com/`, etc.

**Output**:
```
✓ Discovered 45 pages for example.com
✓ Discovered 32 pages for mysite.net
✓ Discovered 28 pages for testsite.org
✓ Baseline saved for example.com
✓ Baseline saved for mysite.net
✓ Baseline saved for testsite.org
```

## Step 3: Perform Migration

Migrate your sites to the new cPanel server using your preferred method (WHM, rsync, etc.).

## Step 4: Update Configuration (After Migration)

Update `config/migration.json` to compare mode:

```json
{
  "mode": "compare",
  "baselineDir": "./baselines",
  "destinationServer": {
    "ip": "192.168.1.101",
    "port": 80,
    "protocol": "http"
  },
  "domains": [
    { "domain": "example.com", "user": "exampleuser", "enabled": true },
    { "domain": "mysite.net", "user": "mysiteuser", "enabled": true },
    { "domain": "testsite.org", "user": "testuser", "enabled": true }
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

**Key changes**:
- `mode`: Changed to `"compare"`
- `destinationServer`: Added new server IP
- `domains`: Added `user` field for each domain (cPanel username)

## Step 5: Compare Against Baseline (After Migration)

Run the comparison:

```bash
sitediff compare -c config/migration.json -v
```

**What happens**:
- Loads baseline data from disk
- Accesses each domain on the new server via `http://192.168.1.101/~username/`
- Compares against baseline using all enabled validators
- Generates HTML and JSON reports

**Output**:
```
✓ Loaded baseline for example.com (45 pages)
✓ Loaded baseline for mysite.net (32 pages)
✓ Loaded baseline for testsite.org (28 pages)

Comparing example.com...
  ✓ Homepage (/)
  ✓ About (/about)
  ✗ Contact (/contact) - Text content differs
  ✓ Blog (/blog)
  ...

Comparing mysite.net...
  ✓ All 32 pages passed

Comparing testsite.org...
  ✓ All 28 pages passed

Report generated: ./output/reports/sitediff-report-2024-01-15T10-30-00.html
```

## Step 6: Review Results

### HTML Report

Open `./output/reports/sitediff-report-[timestamp].html` in a browser:

- **Summary**: Total domains, passed/failed counts
- **Domain results**: Expandable sections for each domain
- **Page details**: Validation results, screenshots, differences
- **Visual diff**: Side-by-side screenshots with highlighted differences

### JSON Report

The JSON report at `./output/reports/sitediff-report-[timestamp].json` contains:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": {
    "domains": [
      {
        "domain": "example.com",
        "passed": false,
        "pages": [
          {
            "url": "/contact",
            "type": "contact",
            "passed": false,
            "validations": {
              "htmlStructure": { "passed": true },
              "textContent": {
                "passed": false,
                "score": 0.85,
                "differences": ["Text differs in contact section"]
              },
              "images": { "passed": true },
              "links": { "passed": true },
              "screenshot": { "passed": true, "score": 0.02 }
            }
          }
        ]
      }
    ]
  }
}
```

## Step 7: Fix Issues

Based on the report, fix any discrepancies found:

1. Review failed pages in the HTML report
2. Check the specific validation that failed
3. Compare screenshots to identify visual differences
4. Fix issues on the destination server
5. Re-run comparison to verify fixes:

```bash
sitediff compare -c config/migration.json
```

## Step 8: Update DNS

Once all validations pass, update DNS records to point to the new server.

## Tips

### Adjusting Screenshot Threshold

If screenshots fail due to minor rendering differences:

```json
{
  "screenshot": {
    "enabled": true,
    "threshold": 0.15,  // Increased from 0.1 to 0.15 (15% tolerance)
    "fullPage": true
  }
}
```

### Processing Fewer Pages

For faster testing, reduce `maxPages`:

```json
{
  "crawler": {
    "maxPages": 10,  // Test with just 10 pages
    "timeout": 30000,
    "waitForNetworkIdle": true
  }
}
```

### Selective Domain Testing

Disable domains you don't want to test:

```json
{
  "domains": [
    { "domain": "example.com", "user": "exampleuser", "enabled": true },
    { "domain": "mysite.net", "user": "mysiteuser", "enabled": false },  // Disabled
    { "domain": "testsite.org", "user": "testuser", "enabled": true }
  ]
}
```

### Increasing Parallelism

Process more domains concurrently:

```json
{
  "parallel": 5  // Process 5 domains at once (default is 3)
}
```

## Troubleshooting

### Issue: Baseline creation fails

**Solution**: Check that domains are accessible via DNS and not password-protected.

### Issue: Comparison can't access new server

**Solution**:
- Verify server IP is correct
- Check firewall allows connections
- Ensure cPanel username is correct
- Test URL manually: `http://IP/~username/`

### Issue: Too many false positives

**Solution**:
- Increase screenshot threshold
- Disable problematic validators temporarily
- Check for dynamic content (timestamps, etc.)

### Issue: Pages timeout

**Solution**: Increase timeout:

```json
{
  "crawler": {
    "timeout": 60000,  // Increase to 60 seconds
    "waitForNetworkIdle": false  // Disable network idle wait
  }
}
```

## Next Steps

- Try [server-compare.md](./server-compare.md) for traditional direct comparison
- See [advanced-config.md](./advanced-config.md) for advanced options
- Read [API.md](../API.md) for programmatic usage
