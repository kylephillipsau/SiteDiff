import { Page } from '@playwright/test';
import { DiscoveredPage, PageType, CrawlerSettings } from '../config/types';
import { logger } from '../utils/Logger';
import { PageClassifier } from './PageClassifier';

/**
 * Page discovery and crawling
 */
export class PageDiscovery {
  private domain: string;
  private visited: Set<string> = new Set();
  private discovered: DiscoveredPage[] = [];
  private settings: CrawlerSettings;

  constructor(domain: string, settings: CrawlerSettings) {
    this.domain = domain;
    this.settings = settings;
  }

  /**
   * Discover pages on the domain
   */
  async discover(page: Page, startPath: string = '/'): Promise<DiscoveredPage[]> {
    logger.info(`Starting page discovery for ${this.domain}`);

    // Start with homepage
    await this.crawlPage(page, startPath);

    // Log discovered pages
    logger.info(`Discovered ${this.discovered.length} pages for ${this.domain}`);
    for (const discoveredPage of this.discovered) {
      logger.debug(`  - ${discoveredPage.path} (${discoveredPage.type})`);
    }

    return this.discovered;
  }

  /**
   * Crawl a single page
   */
  private async crawlPage(page: Page, path: string): Promise<void> {
    // Check if already visited or max pages reached
    if (this.visited.has(path) || this.visited.size >= (this.settings.maxPages || 50)) {
      return;
    }

    this.visited.add(path);
    logger.debug(`Crawling page: ${path}`);

    try {
      // Page should already be navigated to by the caller for the first page
      // For subsequent pages, we need to navigate
      if (path !== '/' || this.visited.size > 1) {
        const currentUrl = page.url();
        const baseUrl = new URL(currentUrl).origin;
        await page.goto(`${baseUrl}${path}`, {
          waitUntil: this.settings.waitForNetworkIdle ? 'networkidle' : 'load',
          timeout: this.settings.timeout || 30000,
        });
      }

      // Get page title
      const title = await page.title();

      // Classify page type
      const pageType = await PageClassifier.classifyPage(page, path);

      // Add to discovered pages
      const discoveredPage: DiscoveredPage = {
        url: page.url(),
        path,
        type: pageType,
        title,
      };

      this.discovered.push(discoveredPage);
      logger.debug(`Classified ${path} as ${pageType}`);

      // Extract links and crawl if we haven't found all key pages yet
      if (!this.hasAllKeyPages()) {
        const links = await this.extractLinks(page);
        logger.debug(`Found ${links.length} internal links on ${path}`);

        // Crawl links in order
        for (const link of links) {
          if (this.visited.size >= (this.settings.maxPages || 50)) {
            break;
          }

          if (!this.hasAllKeyPages()) {
            await this.crawlPage(page, link);
          }
        }
      }
    } catch (error) {
      logger.error(`Error crawling ${path}: ${error}`);
      // Continue crawling other pages
    }
  }

  /**
   * Extract internal links from a page
   */
  private async extractLinks(page: Page): Promise<string[]> {
    try {
      const links = await page.evaluate((domain) => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        const internalLinks: string[] = [];

        for (const anchor of anchors) {
          const href = (anchor as HTMLAnchorElement).href;

          // Parse URL
          try {
            const url = new URL(href);

            // Only include links to the same domain
            if (url.hostname === domain || url.hostname === `www.${domain}` || url.hostname === domain.replace('www.', '')) {
              const path = url.pathname;

              // Skip fragments and queries for now
              const cleanPath = path.split('#')[0].split('?')[0];

              // Skip common file types and admin paths
              if (
                !cleanPath.match(/\.(jpg|jpeg|png|gif|pdf|zip|doc|docx|xls|xlsx)$/i) &&
                !cleanPath.startsWith('/wp-admin') &&
                !cleanPath.startsWith('/admin') &&
                cleanPath !== ''
              ) {
                internalLinks.push(cleanPath);
              }
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }

        // Remove duplicates and return
        return Array.from(new Set(internalLinks));
      }, this.domain);

      return links;
    } catch (error) {
      logger.error(`Error extracting links: ${error}`);
      return [];
    }
  }

  /**
   * Check if we've found all key page types
   */
  private hasAllKeyPages(): boolean {
    const types = new Set(this.discovered.map((p) => p.type));
    return (
      types.has(PageType.HOMEPAGE) &&
      types.has(PageType.CONTACT) &&
      types.has(PageType.BLOG) &&
      types.has(PageType.PRODUCT)
    );
  }

  /**
   * Get discovered pages of a specific type
   */
  getPagesByType(type: PageType): DiscoveredPage[] {
    return this.discovered.filter((p) => p.type === type);
  }

  /**
   * Get all discovered pages
   */
  getAllPages(): DiscoveredPage[] {
    return this.discovered;
  }
}
