import * as fs from 'fs';
import * as path from 'path';
import { SiteDiffConfig } from './types';

/**
 * Configuration loader and validator
 */
export class ConfigLoader {
  /**
   * Load configuration from a JSON file
   */
  static load(configPath: string): SiteDiffConfig {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    let config: SiteDiffConfig;

    try {
      config = JSON.parse(rawConfig);
    } catch (error) {
      throw new Error(`Failed to parse configuration file: ${error}`);
    }

    return this.validate(config);
  }

  /**
   * Validate configuration
   */
  static validate(config: SiteDiffConfig): SiteDiffConfig {
    const mode = config.mode || 'server-compare';

    // Validate servers based on mode
    if (mode === 'server-compare') {
      // Server-compare mode requires both servers
      if (!config.sourceServer || !config.sourceServer.ip) {
        throw new Error('Source server configuration is required for server-compare mode');
      }
      if (!config.destinationServer || !config.destinationServer.ip) {
        throw new Error('Destination server configuration is required for server-compare mode');
      }
    } else if (mode === 'compare') {
      // Compare mode only requires destination server (baseline is the source)
      if (!config.destinationServer || !config.destinationServer.ip) {
        throw new Error('Destination server configuration is required for compare mode');
      }
      if (!config.baselineDir) {
        throw new Error('Baseline directory is required for compare mode');
      }
    } else if (mode === 'baseline') {
      // Baseline mode doesn't require any servers (uses DNS)
      if (!config.baselineDir) {
        config.baselineDir = './baselines'; // Set default baseline directory
      }
    }

    // Validate domains
    if (!config.domains || !Array.isArray(config.domains) || config.domains.length === 0) {
      throw new Error('At least one domain must be specified');
    }

    for (const domainConfig of config.domains) {
      if (!domainConfig.domain) {
        throw new Error('Each domain must have a "domain" property');
      }
    }

    // Validate validation settings
    if (!config.validation) {
      throw new Error('Validation settings are required');
    }

    // Validate screenshot settings
    if (!config.screenshot) {
      throw new Error('Screenshot settings are required');
    }

    if (
      config.screenshot.enabled &&
      (config.screenshot.threshold < 0 || config.screenshot.threshold > 1)
    ) {
      throw new Error('Screenshot threshold must be between 0 and 1');
    }

    // Validate output settings
    if (!config.output) {
      throw new Error('Output settings are required');
    }

    if (!config.output.directory) {
      throw new Error('Output directory must be specified');
    }

    // Apply server defaults if they exist
    if (config.sourceServer) {
      config.sourceServer.port = config.sourceServer.port || 80;
      config.sourceServer.protocol = config.sourceServer.protocol || 'http';
    }
    if (config.destinationServer) {
      config.destinationServer.port = config.destinationServer.port || 80;
      config.destinationServer.protocol = config.destinationServer.protocol || 'http';
    }
    config.parallel = config.parallel || 1;

    // Apply crawler defaults
    if (!config.crawler) {
      config.crawler = {};
    }
    config.crawler.maxPages = config.crawler.maxPages || 50;
    config.crawler.timeout = config.crawler.timeout || 30000;
    config.crawler.waitForNetworkIdle = config.crawler.waitForNetworkIdle !== false;

    return config;
  }

  /**
   * Create default configuration
   */
  static createDefault(): SiteDiffConfig {
    return {
      sourceServer: {
        ip: '192.168.1.100',
        port: 80,
        protocol: 'http',
      },
      destinationServer: {
        ip: '192.168.1.101',
        port: 80,
        protocol: 'http',
      },
      domains: [
        { domain: 'example.com', enabled: true },
        { domain: 'example2.com', enabled: true },
      ],
      validation: {
        htmlStructure: true,
        textContent: true,
        images: true,
        links: true,
      },
      screenshot: {
        enabled: true,
        threshold: 0.1, // 10% difference allowed
        fullPage: true,
      },
      output: {
        directory: './output',
        htmlReport: true,
        jsonReport: true,
        screenshotArtifacts: true,
      },
      crawler: {
        maxPages: 50,
        timeout: 30000,
        waitForNetworkIdle: true,
      },
      parallel: 3,
    };
  }

  /**
   * Save configuration to file
   */
  static save(config: SiteDiffConfig, outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  }
}
