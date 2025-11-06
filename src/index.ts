#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import chalk from 'chalk';
import { ConfigLoader } from './config/ConfigLoader';
import { ComparisonEngine } from './comparator/ComparisonEngine';
import { HtmlReporter } from './reporter/HtmlReporter';
import { JsonReporter } from './reporter/JsonReporter';
import { Logger, logger } from './utils/Logger';

const program = new Command();

program
  .name('sitediff')
  .description('Playwright-based tool for validating cPanel migrations')
  .version('1.0.0');

program
  .command('compare')
  .description('Compare domains between source and destination servers')
  .requiredOption('-c, --config <path>', 'Path to configuration file')
  .option('-o, --output <path>', 'Output directory (overrides config)')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--log-level <level>', 'Set log level (debug, info, warn, error)', 'info')
  .action(async (options) => {
    try {
      // Set log level
      if (options.verbose) {
        Logger.setLevel('debug');
      } else if (options.logLevel) {
        Logger.setLevel(options.logLevel);
      }

      console.log(chalk.blue.bold('\n🔍 SiteDiff - cPanel Migration Validator\n'));

      // Load configuration
      logger.info(`Loading configuration from: ${options.config}`);
      const config = ConfigLoader.load(options.config);

      // Override output directory if specified
      if (options.output) {
        config.output.directory = options.output;
      }

      // Ensure output directory exists
      if (!fs.existsSync(config.output.directory)) {
        fs.mkdirSync(config.output.directory, { recursive: true });
      }

      // Add file logging
      Logger.addFileTransport(config.output.directory);

      // Display configuration summary
      console.log(chalk.cyan('Configuration:'));
      console.log(`  Source Server: ${config.sourceServer.protocol}://${config.sourceServer.ip}:${config.sourceServer.port}`);
      console.log(`  Destination Server: ${config.destinationServer.protocol}://${config.destinationServer.ip}:${config.destinationServer.port}`);
      console.log(`  Domains: ${config.domains.length}`);
      console.log(`  Output: ${config.output.directory}`);
      console.log(`  Parallel: ${config.parallel}\n`);

      // Run comparison engine
      console.log(chalk.yellow('Starting comparison...\n'));
      const startTime = Date.now();

      const engine = new ComparisonEngine(config);
      const results = await engine.run();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Generate reports
      console.log(chalk.yellow('\nGenerating reports...\n'));

      if (config.output.jsonReport) {
        const jsonPath = JsonReporter.generate(results, config.output.directory, config);
        console.log(chalk.green(`✓ JSON report: ${jsonPath}`));
      }

      if (config.output.htmlReport) {
        const htmlPath = await HtmlReporter.generate(results, config.output.directory);
        console.log(chalk.green(`✓ HTML report: ${htmlPath}`));
      }

      // Display summary
      const summary = {
        totalDomains: results.length,
        passedDomains: results.filter((r) => r.passed).length,
        failedDomains: results.filter((r) => !r.passed).length,
        totalPages: results.reduce((sum, r) => sum + r.summary.totalPages, 0),
        passedPages: results.reduce((sum, r) => sum + r.summary.passedPages, 0),
        failedPages: results.reduce((sum, r) => sum + r.summary.failedPages, 0),
      };

      console.log(chalk.blue.bold('\n📊 Summary:\n'));
      console.log(`  Duration: ${duration}s`);
      console.log(`  Domains: ${chalk.green(summary.passedDomains)} passed, ${chalk.red(summary.failedDomains)} failed (${summary.totalDomains} total)`);
      console.log(`  Pages: ${chalk.green(summary.passedPages)} passed, ${chalk.red(summary.failedPages)} failed (${summary.totalPages} total)`);

      // Exit with appropriate code
      if (summary.failedDomains > 0 || summary.failedPages > 0) {
        console.log(chalk.red.bold('\n❌ Migration validation FAILED\n'));
        process.exit(1);
      } else {
        console.log(chalk.green.bold('\n✅ Migration validation PASSED\n'));
        process.exit(0);
      }
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error:'), error);
      logger.error(`Command failed: ${error}`);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a sample configuration file')
  .option('-o, --output <path>', 'Output path for config file', './config/sitediff.json')
  .action((options) => {
    try {
      const config = ConfigLoader.createDefault();
      ConfigLoader.save(config, options.output);

      console.log(chalk.green(`✓ Configuration file created: ${options.output}`));
      console.log(chalk.cyan('\nEdit the configuration file and run:'));
      console.log(chalk.white(`  sitediff compare -c ${options.output}\n`));
    } catch (error) {
      console.error(chalk.red('Error creating configuration:'), error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
