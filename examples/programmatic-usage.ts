/**
 * Example: Using SiteDiff Programmatically
 *
 * This example shows how to use SiteDiff as a library in your own
 * Node.js applications, rather than via the CLI.
 */

import { ConfigLoader } from '../src/config/ConfigLoader';
import { ComparisonEngine } from '../src/comparator/ComparisonEngine';
import { HtmlReporter } from '../src/reporter/HtmlReporter';
import { JsonReporter } from '../src/reporter/JsonReporter';
import { getLogger } from '../src/utils/Logger';
import { SiteDiffConfig, ComparisonResults } from '../src/config/types';
import * as path from 'path';

/**
 * Example 1: Basic programmatic usage
 */
async function basicUsage() {
  const logger = getLogger();

  try {
    logger.info('Starting SiteDiff comparison');

    // Load configuration from file
    const configPath = path.join(__dirname, '../config/test-config.json');
    const config = ConfigLoader.loadConfig(configPath);

    // Create comparison engine
    const engine = new ComparisonEngine(config);

    // Run comparison
    const results = await engine.runComparison();

    // Generate reports
    const outputDir = config.output.directory;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (config.output.htmlReport) {
      const htmlReporter = new HtmlReporter();
      const htmlPath = path.join(
        outputDir,
        `report-${timestamp}.html`
      );
      await htmlReporter.generate(results, htmlPath);
      logger.info('HTML report generated', { path: htmlPath });
    }

    if (config.output.jsonReport) {
      const jsonReporter = new JsonReporter();
      const jsonPath = path.join(
        outputDir,
        `report-${timestamp}.json`
      );
      await jsonReporter.generate(results, jsonPath);
      logger.info('JSON report generated', { path: jsonPath });
    }

    // Log summary
    logResultsSummary(results);

    return results;
  } catch (error) {
    logger.error('Comparison failed', { error: error.message });
    throw error;
  }
}

/**
 * Example 2: Programmatic configuration (no config file)
 */
async function programmaticConfig() {
  const logger = getLogger();

  // Build configuration programmatically
  const config: SiteDiffConfig = {
    mode: 'server-compare',
    sourceServer: {
      ip: '192.168.1.100',
      port: 80,
      protocol: 'http'
    },
    destinationServer: {
      ip: '192.168.1.101',
      port: 80,
      protocol: 'http'
    },
    domains: [
      { domain: 'example.com', user: 'exampleuser', enabled: true },
      { domain: 'mysite.net', user: 'mysiteuser', enabled: true }
    ],
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
      maxPages: 20,
      timeout: 30000,
      waitForNetworkIdle: true
    },
    parallel: 2
  };

  logger.info('Running comparison with programmatic config');

  const engine = new ComparisonEngine(config);
  const results = await engine.runComparison();

  logResultsSummary(results);

  return results;
}

/**
 * Example 3: Custom result processing
 */
async function customResultProcessing() {
  const logger = getLogger();

  const config = ConfigLoader.loadConfig('../config/test-config.json');
  const engine = new ComparisonEngine(config);
  const results = await engine.runComparison();

  // Custom processing of results
  console.log('\n=== Custom Result Analysis ===\n');

  // Find all failed pages
  const failedPages: Array<{
    domain: string;
    page: string;
    failures: string[];
  }> = [];

  results.domains.forEach(domain => {
    domain.pages.forEach(page => {
      if (!page.passed) {
        const failures: string[] = [];

        // Collect failure reasons
        if (page.validations.htmlStructure && !page.validations.htmlStructure.passed) {
          failures.push('HTML Structure');
        }
        if (page.validations.textContent && !page.validations.textContent.passed) {
          failures.push('Text Content');
        }
        if (page.validations.images && !page.validations.images.passed) {
          failures.push('Images');
        }
        if (page.validations.links && !page.validations.links.passed) {
          failures.push('Links');
        }
        if (page.validations.screenshot && !page.validations.screenshot.passed) {
          failures.push('Screenshot');
        }

        failedPages.push({
          domain: domain.domain,
          page: page.url,
          failures
        });
      }
    });
  });

  // Print failed pages
  if (failedPages.length > 0) {
    console.log('Failed Pages:');
    failedPages.forEach(({ domain, page, failures }) => {
      console.log(`  ${domain}${page}`);
      console.log(`    Failed: ${failures.join(', ')}`);
    });
  } else {
    console.log('All pages passed! 🎉');
  }

  // Calculate statistics
  const stats = calculateStatistics(results);
  console.log('\n=== Statistics ===\n');
  console.log(`Total Domains: ${stats.totalDomains}`);
  console.log(`Total Pages: ${stats.totalPages}`);
  console.log(`Passed Pages: ${stats.passedPages} (${stats.passRate.toFixed(1)}%)`);
  console.log(`Failed Pages: ${stats.failedPages} (${stats.failRate.toFixed(1)}%)`);
  console.log(`Average Similarity: ${stats.avgSimilarity.toFixed(2)}`);

  return results;
}

/**
 * Example 4: Integration with CI/CD
 */
async function cicdIntegration() {
  const logger = getLogger();

  try {
    const config = ConfigLoader.loadConfig('../config/test-config.json');
    const engine = new ComparisonEngine(config);
    const results = await engine.runComparison();

    // Check if all validations passed
    const allPassed = results.domains.every(domain =>
      domain.pages.every(page => page.passed)
    );

    if (allPassed) {
      logger.info('All validations passed ✓');
      process.exit(0); // Success exit code
    } else {
      // Generate failure report
      const failureCount = results.domains.reduce((count, domain) =>
        count + domain.pages.filter(page => !page.passed).length,
        0
      );

      logger.error('Validation failed', {
        failedPages: failureCount,
        totalPages: results.domains.reduce((count, d) => count + d.pages.length, 0)
      });

      // Generate detailed failure report
      const jsonReporter = new JsonReporter();
      await jsonReporter.generate(results, './output/ci-report.json');

      process.exit(1); // Failure exit code
    }
  } catch (error) {
    logger.error('CI/CD validation failed', { error: error.message });
    process.exit(1);
  }
}

/**
 * Example 5: Batch processing multiple configurations
 */
async function batchProcessing() {
  const logger = getLogger();

  const configFiles = [
    '../config/config1.json',
    '../config/config2.json',
    '../config/config3.json'
  ];

  const allResults: ComparisonResults[] = [];

  for (const configFile of configFiles) {
    logger.info('Processing configuration', { file: configFile });

    try {
      const config = ConfigLoader.loadConfig(configFile);
      const engine = new ComparisonEngine(config);
      const results = await engine.runComparison();

      allResults.push(results);

      logger.info('Configuration completed', {
        file: configFile,
        domains: results.domains.length
      });
    } catch (error) {
      logger.error('Configuration failed', {
        file: configFile,
        error: error.message
      });
    }
  }

  // Aggregate results
  const totalDomains = allResults.reduce((sum, r) => sum + r.domains.length, 0);
  const totalPages = allResults.reduce(
    (sum, r) => sum + r.domains.reduce((s, d) => s + d.pages.length, 0),
    0
  );

  logger.info('Batch processing complete', {
    configurations: configFiles.length,
    totalDomains,
    totalPages
  });

  return allResults;
}

/**
 * Helper function to log results summary
 */
function logResultsSummary(results: ComparisonResults) {
  const logger = getLogger();

  const totalDomains = results.domains.length;
  const passedDomains = results.domains.filter(d => d.passed).length;
  const failedDomains = totalDomains - passedDomains;

  const totalPages = results.domains.reduce(
    (sum, domain) => sum + domain.pages.length,
    0
  );
  const passedPages = results.domains.reduce(
    (sum, domain) => sum + domain.pages.filter(p => p.passed).length,
    0
  );
  const failedPages = totalPages - passedPages;

  logger.info('Comparison summary', {
    totalDomains,
    passedDomains,
    failedDomains,
    totalPages,
    passedPages,
    failedPages
  });

  console.log('\n=== Summary ===\n');
  console.log(`Domains: ${passedDomains}/${totalDomains} passed`);
  console.log(`Pages: ${passedPages}/${totalPages} passed`);
}

/**
 * Helper function to calculate statistics
 */
function calculateStatistics(results: ComparisonResults) {
  const totalDomains = results.domains.length;
  const totalPages = results.domains.reduce((sum, d) => sum + d.pages.length, 0);
  const passedPages = results.domains.reduce(
    (sum, d) => sum + d.pages.filter(p => p.passed).length,
    0
  );
  const failedPages = totalPages - passedPages;

  // Calculate average similarity score
  let totalSimilarity = 0;
  let scoredPages = 0;

  results.domains.forEach(domain => {
    domain.pages.forEach(page => {
      if (page.validations.textContent?.score !== undefined) {
        totalSimilarity += page.validations.textContent.score;
        scoredPages++;
      }
    });
  });

  const avgSimilarity = scoredPages > 0 ? totalSimilarity / scoredPages : 0;

  return {
    totalDomains,
    totalPages,
    passedPages,
    failedPages,
    passRate: totalPages > 0 ? (passedPages / totalPages) * 100 : 0,
    failRate: totalPages > 0 ? (failedPages / totalPages) * 100 : 0,
    avgSimilarity
  };
}

/**
 * Run examples
 */
async function main() {
  const args = process.argv.slice(2);
  const example = args[0] || 'basic';

  console.log(`Running example: ${example}\n`);

  switch (example) {
    case 'basic':
      await basicUsage();
      break;
    case 'programmatic':
      await programmaticConfig();
      break;
    case 'custom':
      await customResultProcessing();
      break;
    case 'cicd':
      await cicdIntegration();
      break;
    case 'batch':
      await batchProcessing();
      break;
    default:
      console.error(`Unknown example: ${example}`);
      console.log('Available examples: basic, programmatic, custom, cicd, batch');
      process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}

export {
  basicUsage,
  programmaticConfig,
  customResultProcessing,
  cicdIntegration,
  batchProcessing
};
