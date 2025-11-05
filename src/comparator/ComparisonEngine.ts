import { chromium, Browser } from '@playwright/test';
import {
  SiteDiffConfig,
  DomainComparisonResult,
  PageComparisonResult,
  DiscoveredPage,
  DomainConfig,
} from '../config/types';
import { logger } from '../utils/Logger';
import { ServerManager } from '../server/ServerManager';
import { PageDiscovery } from '../crawler/PageDiscovery';
import { HtmlValidator } from './validators/HtmlValidator';
import { TextValidator } from './validators/TextValidator';
import { ImageValidator } from './validators/ImageValidator';
import { LinkValidator } from './validators/LinkValidator';
import { ScreenshotComparator } from './ScreenshotComparator';
import * as path from 'path';

/**
 * Main comparison engine
 */
export class ComparisonEngine {
  private config: SiteDiffConfig;
  private browser?: Browser;
  private screenshotComparator: ScreenshotComparator;

  constructor(config: SiteDiffConfig) {
    this.config = config;
    this.screenshotComparator = new ScreenshotComparator(
      config.screenshot.threshold,
      path.join(config.output.directory, 'screenshots')
    );
  }

  /**
   * Run comparisons for all domains
   */
  async run(): Promise<DomainComparisonResult[]> {
    logger.info('Starting SiteDiff comparison engine');

    // Initialize browser
    this.browser = await chromium.launch({ headless: true });

    const results: DomainComparisonResult[] = [];

    // Process domains (respect parallel setting)
    const enabledDomains = this.config.domains.filter((d) => d.enabled !== false);

    if (this.config.parallel && this.config.parallel > 1) {
      // Process in parallel batches
      for (let i = 0; i < enabledDomains.length; i += this.config.parallel) {
        const batch = enabledDomains.slice(i, i + this.config.parallel);
        const batchResults = await Promise.all(
          batch.map((domainConfig) => this.compareDomain(domainConfig))
        );
        results.push(...batchResults);
      }
    } else {
      // Process sequentially
      for (const domainConfig of enabledDomains) {
        const result = await this.compareDomain(domainConfig);
        results.push(result);
      }
    }

    // Clean up
    await this.browser.close();

    logger.info('Comparison engine completed');
    return results;
  }

  /**
   * Compare a single domain
   */
  private async compareDomain(domainConfig: DomainConfig): Promise<DomainComparisonResult> {
    const domain = domainConfig.domain;
    const user = domainConfig.user;

    logger.info(`Comparing domain: ${domain}${user ? ` (cPanel user: ${user})` : ''}`);

    const timestamp = new Date().toISOString();
    const result: DomainComparisonResult = {
      domain,
      timestamp,
      sourceServer: this.config.sourceServer,
      destinationServer: this.config.destinationServer,
      discoveredPages: [],
      pageResults: [],
      passed: true,
      summary: {
        totalPages: 0,
        passedPages: 0,
        failedPages: 0,
      },
    };

    try {
      // Create a new page for discovery
      const discoveryPage = await this.browser!.newPage();

      // Configure page for source server
      await ServerManager.configurePage(discoveryPage, domain);

      // Navigate to source server homepage
      await ServerManager.navigateToServer(
        discoveryPage,
        this.config.sourceServer,
        domain,
        '/',
        user
      );

      // Discover pages on source
      const crawler = new PageDiscovery(domain, this.config.crawler!);
      const discoveredPages = await crawler.discover(discoveryPage, '/');
      result.discoveredPages = discoveredPages;

      await discoveryPage.close();

      logger.info(`Discovered ${discoveredPages.length} pages for ${domain}`);

      // Compare each discovered page
      for (const page of discoveredPages) {
        const pageResult = await this.comparePage(domainConfig, page);
        result.pageResults.push(pageResult);

        if (!pageResult.passed) {
          result.passed = false;
        }
      }

      // Calculate summary
      result.summary.totalPages = result.pageResults.length;
      result.summary.passedPages = result.pageResults.filter((r) => r.passed).length;
      result.summary.failedPages = result.summary.totalPages - result.summary.passedPages;
    } catch (error) {
      logger.error(`Error comparing domain ${domain}: ${error}`);
      result.passed = false;
    }

    logger.info(
      `Domain ${domain} comparison complete: ${result.summary.passedPages}/${result.summary.totalPages} pages passed`
    );

    return result;
  }

  /**
   * Compare a single page between source and destination
   */
  private async comparePage(
    domainConfig: DomainConfig,
    discoveredPage: DiscoveredPage
  ): Promise<PageComparisonResult> {
    const domain = domainConfig.domain;
    const user = domainConfig.user;

    logger.info(`Comparing page: ${domain}${discoveredPage.path}`);

    const timestamp = new Date().toISOString();
    const result: PageComparisonResult = {
      domain,
      page: discoveredPage,
      sourceUrl: '',
      destinationUrl: '',
      timestamp,
      validation: {},
      passed: true,
      errors: [],
    };

    try {
      // Create pages for source and destination
      const sourcePage = await this.browser!.newPage();
      const destPage = await this.browser!.newPage();

      // Configure pages
      await ServerManager.configurePage(sourcePage, domain);
      await ServerManager.configurePage(destPage, domain);

      // Navigate to source
      await ServerManager.navigateToServer(
        sourcePage,
        this.config.sourceServer,
        domain,
        discoveredPage.path,
        user
      );
      result.sourceUrl = ServerManager.buildUrl(
        this.config.sourceServer,
        domain,
        discoveredPage.path,
        user
      );

      // Navigate to destination
      await ServerManager.navigateToServer(
        destPage,
        this.config.destinationServer,
        domain,
        discoveredPage.path,
        user
      );
      result.destinationUrl = ServerManager.buildUrl(
        this.config.destinationServer,
        domain,
        discoveredPage.path,
        user
      );

      // Run validations
      if (this.config.validation.htmlStructure) {
        result.validation.htmlStructure = await HtmlValidator.validate(sourcePage, destPage);
        if (!result.validation.htmlStructure.passed) {
          result.passed = false;
          result.errors.push(result.validation.htmlStructure.message);
        }
      }

      if (this.config.validation.textContent) {
        result.validation.textContent = await TextValidator.validate(sourcePage, destPage);
        if (!result.validation.textContent.passed) {
          result.passed = false;
          result.errors.push(result.validation.textContent.message);
        }
      }

      if (this.config.validation.images) {
        result.validation.images = await ImageValidator.validate(sourcePage, destPage);
        if (!result.validation.images.passed) {
          result.passed = false;
          result.errors.push(result.validation.images.message);
        }
      }

      if (this.config.validation.links) {
        result.validation.links = await LinkValidator.validate(sourcePage, destPage);
        if (!result.validation.links.passed) {
          result.passed = false;
          result.errors.push(result.validation.links.message);
        }
      }

      // Screenshot comparison
      if (this.config.screenshot.enabled) {
        result.screenshot = await this.screenshotComparator.compare(
          sourcePage,
          destPage,
          domain,
          discoveredPage.path,
          this.config.screenshot.fullPage
        );

        if (!result.screenshot.passed) {
          result.passed = false;
          result.errors.push(
            `Visual differences exceed threshold: ${result.screenshot.diffPercentage.toFixed(2)}% > ${result.screenshot.threshold * 100}%`
          );
        }
      }

      // Close pages
      await sourcePage.close();
      await destPage.close();
    } catch (error) {
      logger.error(`Error comparing page ${domain}${discoveredPage.path}: ${error}`);
      result.passed = false;
      result.errors.push(`Comparison failed: ${error}`);
    }

    logger.debug(
      `Page ${domain}${discoveredPage.path} comparison: ${result.passed ? 'PASSED' : 'FAILED'}`
    );

    return result;
  }
}
