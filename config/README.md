# Configuration Files

This directory contains example configuration files for different SiteDiff modes.

## Available Examples

### 1. `config.example.json` - Baseline Mode (Recommended)
**Use for:** Creating a baseline from live sites BEFORE migration

Creates a snapshot of your live sites accessed via DNS (https://example.com). This baseline will be used later to compare against the migrated site.

**Required fields:**
- `mode: "baseline"`
- `domains` (no `user` field needed)
- No server configuration needed

**Command:**
```bash
sitediff baseline -c config/myconfig.json
```

---

### 2. `config.example-compare.json` - Compare Mode
**Use for:** Comparing migrated sites AFTER migration against the saved baseline

Compares the migrated site (accessed via cPanel ~user path) against the baseline created earlier.

**Required fields:**
- `mode: "compare"`
- `baselineDir` (where baseline was saved)
- `destinationServer` (the new cPanel server)
- `domains` (with `user` field for each domain)

**Command:**
```bash
sitediff compare -c config/myconfig.json
```

---

### 3. `config.example-server-compare.json` - Server Compare Mode (Traditional)
**Use for:** Direct server-to-server comparison when both servers are accessible

Compares two servers directly by accessing both via cPanel ~user paths.

**Required fields:**
- `mode: "server-compare"`
- `sourceServer` (old cPanel server)
- `destinationServer` (new cPanel server)
- `domains` (with `user` field for each domain)

**Command:**
```bash
sitediff compare -c config/myconfig.json
```

---

## Migration Workflow

### Recommended: Baseline/Compare Workflow

1. **Before Migration:**
   - Copy `config.example.json` to `config/myconfig.json`
   - Edit domains to match your sites
   - Run: `sitediff baseline -c config/myconfig.json`
   - Baseline saved to `./baselines/`

2. **Migrate Sites:**
   - Perform your cPanel migration
   - Sites now on new server

3. **After Migration:**
   - Copy `config.example-compare.json` to `config/myconfig.json`
   - Update `destinationServer` IP
   - Add `user` field for each domain (cPanel username)
   - Run: `sitediff compare -c config/myconfig.json`

### Alternative: Server Compare Workflow

If both servers are accessible simultaneously:
- Copy `config.example-server-compare.json` to `config/myconfig.json`
- Configure both source and destination servers
- Add `user` field for each domain
- Run: `sitediff compare -c config/myconfig.json`

---

## Notes

- The `user` field is the cPanel username (used to access sites via `http://IP/~username/`)
- User configs (`config.json`, `config-*.json`) are gitignored - safe to create your own
- Example files are tracked in git for reference
