import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';
import {
  BaselineDomainData,
  BaselinePageData,
  DiscoveredPage
} from '../config/types';
import { logger } from '../utils/Logger';

/**
 * Manages baseline creation and loading for before/after comparisons
 */
export class BaselineManager {
  private baselineDir: string;

  constructor(baselineDir: string) {
    this.baselineDir = baselineDir;
  }

  /**
   * Save baseline data for a domain
   */
  async saveBaseline(
    domain: string,
    discoveredPages: DiscoveredPage[],
    pageData: BaselinePageData[]
  ): Promise<void> {
    const domainDir = path.join(this.baselineDir, this.sanitizeDomain(domain));

    // Create directory structure
    if (!fs.existsSync(domainDir)) {
      fs.mkdirSync(domainDir, { recursive: true });
    }

    const screenshotsDir = path.join(domainDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const baselineData: BaselineDomainData = {
      domain,
      timestamp: new Date().toISOString(),
      discoveredPages,
      pageData,
    };

    // Save metadata
    const metadataPath = path.join(domainDir, 'baseline.json');
    fs.writeFileSync(metadataPath, JSON.stringify(baselineData, null, 2));

    logger.info(`Baseline saved for ${domain} in ${domainDir}`);
  }

  /**
   * Load baseline data for a domain
   */
  loadBaseline(domain: string): BaselineDomainData | null {
    const domainDir = path.join(this.baselineDir, this.sanitizeDomain(domain));
    const metadataPath = path.join(domainDir, 'baseline.json');

    if (!fs.existsSync(metadataPath)) {
      logger.warn(`No baseline found for ${domain} at ${metadataPath}`);
      return null;
    }

    try {
      const data = fs.readFileSync(metadataPath, 'utf-8');
      const baseline: BaselineDomainData = JSON.parse(data);
      logger.info(`Loaded baseline for ${domain} from ${new Date(baseline.timestamp).toLocaleString()}`);
      return baseline;
    } catch (error) {
      logger.error(`Failed to load baseline for ${domain}: ${error}`);
      return null;
    }
  }

  /**
   * Capture baseline data for a page
   */
  async capturePageBaseline(
    page: Page,
    domain: string,
    discoveredPage: DiscoveredPage,
    url: string
  ): Promise<BaselinePageData> {
    const domainDir = path.join(this.baselineDir, this.sanitizeDomain(domain));
    const screenshotsDir = path.join(domainDir, 'screenshots');

    // Capture screenshot
    const sanitizedPath = this.sanitizePath(discoveredPage.path);
    const screenshotFilename = `${sanitizedPath}_${Date.now()}.png`;
    const screenshotPath = path.join(screenshotsDir, screenshotFilename);

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    // Capture HTML content
    const htmlContent = await page.content();

    // Capture visible text
    const textContent = await page.evaluate(() => document.body.innerText);

    // Capture images
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map((img) => ({
        src: img.src,
        alt: img.alt || '',
      }));
    });

    // Capture links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map((a) => ({
        href: a.href,
        text: a.textContent?.trim() || '',
      }));
    });

    return {
      page: discoveredPage,
      url,
      timestamp: new Date().toISOString(),
      screenshot: screenshotPath,
      htmlContent,
      textContent,
      images,
      links,
    };
  }

  /**
   * Get baseline screenshot path
   */
  getBaselineScreenshotPath(domain: string, screenshotFilename: string): string {
    return path.join(
      this.baselineDir,
      this.sanitizeDomain(domain),
      'screenshots',
      screenshotFilename
    );
  }

  /**
   * List all domains with baselines
   */
  listBaselines(): string[] {
    if (!fs.existsSync(this.baselineDir)) {
      return [];
    }

    return fs.readdirSync(this.baselineDir).filter((dir) => {
      const metadataPath = path.join(this.baselineDir, dir, 'baseline.json');
      return fs.existsSync(metadataPath);
    });
  }

  /**
   * Sanitize domain name for filesystem
   */
  private sanitizeDomain(domain: string): string {
    return domain.replace(/[^a-z0-9.-]/gi, '_');
  }

  /**
   * Sanitize path for filesystem
   */
  private sanitizePath(pagePath: string): string {
    return pagePath
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/[^a-z0-9_-]/gi, '')
      .substring(0, 50) || 'home';
  }
}
