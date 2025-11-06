import { chromium, Browser } from '@playwright/test';
import {
  SiteDiffConfig,
  DomainComparisonResult,
  PageComparisonResult,
  DiscoveredPage,
  DomainConfig,
  BaselinePageData,
} from '../config/types';
import { logger } from '../utils/Logger';
import { ServerManager } from '../server/ServerManager';
import { PageDiscovery } from '../crawler/PageDiscovery';
import { HtmlValidator } from './validators/HtmlValidator';
import { TextValidator } from './validators/TextValidator';
import { ImageValidator } from './validators/ImageValidator';
import { LinkValidator } from './validators/LinkValidator';
import { ScreenshotComparator } from './ScreenshotComparator';
import { BaselineManager } from '../baseline/BaselineManager';
import * as path from 'path';

/**
 * Main comparison engine
 */
export class ComparisonEngine {
  private config: SiteDiffConfig;
  private browser?: Browser;
  private screenshotComparator: ScreenshotComparator;
  private baselineManager?: BaselineManager;

  constructor(config: SiteDiffConfig) {
    this.config = config;
    this.screenshotComparator = new ScreenshotComparator(
      config.screenshot.threshold,
      path.join(config.output.directory, 'screenshots')
    );

    // Initialize baseline manager if needed
    if (config.baselineDir && (config.mode === 'baseline' || config.mode === 'compare')) {
      this.baselineManager = new BaselineManager(config.baselineDir);
    }
  }

  /**
   * Run comparisons for all domains based on mode
   */
  async run(): Promise<DomainComparisonResult[]> {
    const mode = this.config.mode || 'server-compare';
    logger.info(`Starting SiteDiff in ${mode} mode`);

    // Initialize browser
    this.browser = await chromium.launch({ headless: true });

    let results: DomainComparisonResult[] = [];

    switch (mode) {
      case 'baseline':
        results = await this.runBaselineMode();
        break;
      case 'compare':
        results = await this.runCompareMode();
        break;
      case 'server-compare':
      default:
        results = await this.runServerCompareMode();
        break;
    }

    // Clean up
    await this.browser.close();

    logger.info('Comparison engine completed');
    return results;
  }

  /**
   * Run in server-compare mode (original functionality)
   */
  private async runServerCompareMode(): Promise<DomainComparisonResult[]> {
    if (!this.config.sourceServer || !this.config.destinationServer) {
      throw new Error('sourceServer and destinationServer are required for server-compare mode');
    }

    const results: DomainComparisonResult[] = [];
    const enabledDomains = this.config.domains.filter((d) => d.enabled !== false);

    if (this.config.parallel && this.config.parallel > 1) {
      // Process in parallel batches
      for (let i = 0; i < enabledDomains.length; i += this.config.parallel) {
        const batch = enabledDomains.slice(i, i + this.config.parallel);
        const batchResults = await Promise.all(
          batch.map((domainConfig) => this.compareDomainServers(domainConfig))
        );
        results.push(...batchResults);
      }
    } else {
      // Process sequentially
      for (const domainConfig of enabledDomains) {
        const result = await this.compareDomainServers(domainConfig);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Run in baseline mode (create baseline from live site)
   */
  private async runBaselineMode(): Promise<DomainComparisonResult[]> {
    if (!this.baselineManager) {
      throw new Error('Baseline manager not initialized');
    }

    logger.info('Creating baseline from live sites');
    const results: DomainComparisonResult[] = [];
    const enabledDomains = this.config.domains.filter((d) => d.enabled !== false);

    for (const domainConfig of enabledDomains) {
      const result = await this.createBaseline(domainConfig);
      results.push(result);
    }

    return results;
  }

  /**
   * Run in compare mode (compare against baseline)
   */
  private async runCompareMode(): Promise<DomainComparisonResult[]> {
    if (!this.baselineManager) {
      throw new Error('Baseline manager not initialized');
    }

    if (!this.config.destinationServer) {
      throw new Error('destinationServer is required for compare mode');
    }

    logger.info('Comparing against baseline');
    const results: DomainComparisonResult[] = [];
    const enabledDomains = this.config.domains.filter((d) => d.enabled !== false);

    for (const domainConfig of enabledDomains) {
      const result = await this.compareAgainstBaseline(domainConfig);
      results.push(result);
    }

    return results;
  }

  /**
   * Create baseline for a single domain
   */
  private async createBaseline(domainConfig: DomainConfig): Promise<DomainComparisonResult> {
    const domain = domainConfig.domain;
    logger.info(`Creating baseline for: ${domain}`);

    const timestamp = new Date().toISOString();
    const result: DomainComparisonResult = {
      domain,
      timestamp,
      sourceServer: { ip: 'baseline', protocol: 'https' },
      destinationServer: { ip: 'baseline', protocol: 'https' },
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
      const discoveryPage = await this.browser!.newPage();
      await ServerManager.configurePage(discoveryPage, domain);

      // Navigate directly to domain via DNS
      await ServerManager.navigateToDomain(discoveryPage, domain, '/');

      // Discover pages
      const crawler = new PageDiscovery(domain, this.config.crawler!);
      const discoveredPages = await crawler.discover(discoveryPage, '/');
      result.discoveredPages = discoveredPages;

      await discoveryPage.close();

      logger.info(`Discovered ${discoveredPages.length} pages for ${domain}`);

      // Capture baseline data for each page
      const baselinePages: BaselinePageData[] = [];
      for (const page of discoveredPages) {
        const pageData = await this.captureBaselinePage(domain, page);
        baselinePages.push(pageData);
      }

      // Save baseline
      await this.baselineManager!.saveBaseline(domain, discoveredPages, baselinePages);

      result.summary.totalPages = discoveredPages.length;
      result.summary.passedPages = discoveredPages.length;
      logger.info(`✓ Baseline created for ${domain}: ${discoveredPages.length} pages`);
    } catch (error) {
      logger.error(`Error creating baseline for ${domain}: ${error}`);
      result.passed = false;
    }

    return result;
  }

  /**
   * Capture baseline data for a single page
   */
  private async captureBaselinePage(
    domain: string,
    discoveredPage: DiscoveredPage
  ): Promise<BaselinePageData> {
    const page = await this.browser!.newPage();
    await ServerManager.configurePage(page, domain);

    try {
      // Navigate to page
      await ServerManager.navigateToDomain(page, domain, discoveredPage.path);
      const url = ServerManager.buildDomainUrl(domain, discoveredPage.path);

      // Capture baseline data
      const baselineData = await this.baselineManager!.capturePageBaseline(
        page,
        domain,
        discoveredPage,
        url
      );

      await page.close();
      return baselineData;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Compare domain against baseline
   */
  private async compareAgainstBaseline(domainConfig: DomainConfig): Promise<DomainComparisonResult> {
    const domain = domainConfig.domain;

    logger.info(`Comparing ${domain} against baseline`);

    // Load baseline
    const baseline = this.baselineManager!.loadBaseline(domain);
    if (!baseline) {
      throw new Error(`No baseline found for ${domain}`);
    }

    const timestamp = new Date().toISOString();
    const result: DomainComparisonResult = {
      domain,
      timestamp,
      sourceServer: { ip: 'baseline', protocol: 'https' },
      destinationServer: this.config.destinationServer!,
      discoveredPages: baseline.discoveredPages,
      pageResults: [],
      passed: true,
      summary: {
        totalPages: 0,
        passedPages: 0,
        failedPages: 0,
      },
    };

    try {
      // Compare each page from baseline
      for (const baselinePage of baseline.pageData) {
        const pageResult = await this.comparePageAgainstBaseline(domainConfig, baselinePage);
        result.pageResults.push(pageResult);

        if (!pageResult.passed) {
          result.passed = false;
        }
      }

      result.summary.totalPages = result.pageResults.length;
      result.summary.passedPages = result.pageResults.filter((r) => r.passed).length;
      result.summary.failedPages = result.summary.totalPages - result.summary.passedPages;
    } catch (error) {
      logger.error(`Error comparing ${domain} against baseline: ${error}`);
      result.passed = false;
    }

    logger.info(
      `Domain ${domain} comparison complete: ${result.summary.passedPages}/${result.summary.totalPages} pages passed`
    );

    return result;
  }

  /**
   * Compare a page against its baseline
   */
  private async comparePageAgainstBaseline(
    domainConfig: DomainConfig,
    baselinePage: BaselinePageData
  ): Promise<PageComparisonResult> {
    const domain = domainConfig.domain;
    const user = domainConfig.user;

    logger.info(`Comparing page: ${domain}${baselinePage.page.path} against baseline`);

    const timestamp = new Date().toISOString();
    const result: PageComparisonResult = {
      domain,
      page: baselinePage.page,
      sourceUrl: baselinePage.url,
      destinationUrl: '',
      timestamp,
      validation: {},
      passed: true,
      errors: [],
    };

    try {
      // Navigate to current site
      const destPage = await this.browser!.newPage();
      await ServerManager.configurePage(destPage, domain);

      await ServerManager.navigateToServer(
        destPage,
        this.config.destinationServer!,
        domain,
        baselinePage.page.path,
        user
      );

      result.destinationUrl = ServerManager.buildUrl(
        this.config.destinationServer!,
        domain,
        baselinePage.page.path,
        user
      );

      // Run validations against baseline data
      if (this.config.validation.textContent && baselinePage.textContent) {
        const currentText = await destPage.evaluate(() => document.body.innerText);
        const passed = this.compareText(baselinePage.textContent, currentText);
        result.validation.textContent = {
          passed,
          message: passed ? 'Text content matches baseline' : 'Text content differs from baseline',
        };
        if (!passed) {
          result.passed = false;
          result.errors.push(result.validation.textContent.message);
        }
      }

      // Screenshot comparison (if baseline has screenshot)
      if (this.config.screenshot.enabled && baselinePage.screenshot) {
        const screenshotResult = await this.compareScreenshotAgainstBaseline(
          destPage,
          domain,
          baselinePage
        );
        result.screenshot = screenshotResult;

        if (screenshotResult && !screenshotResult.passed) {
          result.passed = false;
          result.errors.push(
            `Visual differences exceed threshold: ${(screenshotResult.diffPercentage * 100).toFixed(2)}%`
          );
        }
      }

      await destPage.close();
    } catch (error) {
      logger.error(`Error comparing page ${domain}${baselinePage.page.path}: ${error}`);
      result.passed = false;
      result.errors.push(`Comparison failed: ${error}`);
    }

    return result;
  }

  /**
   * Compare screenshot against baseline
   */
  private async compareScreenshotAgainstBaseline(
    currentPage: any,
    domain: string,
    baselinePage: BaselinePageData
  ): Promise<any> {
    const sanitizedPath = baselinePage.page.path
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/[^a-z0-9_-]/gi, '')
      .substring(0, 50) || 'home';

    const timestamp = Date.now();
    const destFilename = `${domain.replace(/[^a-z0-9]/gi, '_')}_${sanitizedPath}_current_${timestamp}.png`;
    const destPath = path.join(this.config.output.directory, 'screenshots', destFilename);

    // Take screenshot of current page
    await currentPage.screenshot({
      path: destPath,
      fullPage: true,
    });

    // Compare with baseline
    const fs = require('fs');
    const PNG = require('pngjs').PNG;
    const pixelmatch = require('pixelmatch');

    const baselineImg = PNG.sync.read(fs.readFileSync(baselinePage.screenshot!));
    const currentImg = PNG.sync.read(fs.readFileSync(destPath));

    // Resize if dimensions don't match
    const width = Math.min(baselineImg.width, currentImg.width);
    const height = Math.min(baselineImg.height, currentImg.height);
    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(
      baselineImg.data,
      currentImg.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );

    const diffFilename = `${domain.replace(/[^a-z0-9]/gi, '_')}_${sanitizedPath}_diff_${timestamp}.png`;
    const diffPath = path.join(this.config.output.directory, 'screenshots', diffFilename);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    const totalPixels = width * height;
    const diffPercentage = (diffPixels / totalPixels) * 100;
    const passed = diffPercentage / 100 <= this.config.screenshot.threshold;

    return {
      passed,
      diffPixels,
      diffPercentage: diffPercentage / 100,
      threshold: this.config.screenshot.threshold,
      sourceScreenshot: baselinePage.screenshot,
      destinationScreenshot: destPath,
      diffScreenshot: diffPath,
    };
  }

  /**
   * Simple text comparison
   */
  private compareText(baseline: string, current: string): boolean {
    // Simple comparison - can be enhanced with more sophisticated diff
    const baselineNormalized = baseline.replace(/\s+/g, ' ').trim();
    const currentNormalized = current.replace(/\s+/g, ' ').trim();
    return baselineNormalized === currentNormalized;
  }

  /**
   * Compare a single domain (server-compare mode)
   */
  private async compareDomainServers(domainConfig: DomainConfig): Promise<DomainComparisonResult> {
    const domain = domainConfig.domain;
    const user = domainConfig.user;

    if (!this.config.sourceServer || !this.config.destinationServer) {
      throw new Error('sourceServer and destinationServer are required for server-compare mode');
    }

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

    if (!this.config.sourceServer || !this.config.destinationServer) {
      throw new Error('sourceServer and destinationServer are required for server-compare mode');
    }

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
