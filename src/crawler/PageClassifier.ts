import { Page } from '@playwright/test';
import { PageType } from '../config/types';
import { logger } from '../utils/Logger';

/**
 * Page classifier using heuristics to identify page types
 */
export class PageClassifier {
  /**
   * Classify a page based on content and URL patterns
   */
  static async classifyPage(page: Page, path: string): Promise<PageType> {
    // Homepage is always /
    if (path === '/' || path === '/index.html' || path === '/index.php') {
      return PageType.HOMEPAGE;
    }

    // Get page content for analysis
    const content = await this.getPageContent(page);
    const lowerPath = path.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Contact page detection
    if (this.isContactPage(lowerPath, lowerContent)) {
      return PageType.CONTACT;
    }

    // Blog/News page detection
    if (this.isBlogPage(lowerPath, lowerContent)) {
      return PageType.BLOG;
    }

    // Product/Service page detection
    if (this.isProductPage(lowerPath, lowerContent)) {
      return PageType.PRODUCT;
    }

    return PageType.OTHER;
  }

  /**
   * Get page content (text and metadata)
   */
  private static async getPageContent(page: Page): Promise<string> {
    try {
      const content = await page.evaluate(() => {
        const title = document.title || '';
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
          .map((h) => h.textContent)
          .join(' ');
        const bodyText = document.body?.textContent || '';
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

        return `${title} ${headings} ${bodyText} ${metaDesc}`;
      });

      return content;
    } catch (error) {
      logger.error(`Error getting page content: ${error}`);
      return '';
    }
  }

  /**
   * Check if page is a contact page
   */
  private static isContactPage(path: string, content: string): boolean {
    // URL patterns
    const urlPatterns = [
      /contact/,
      /get-in-touch/,
      /reach-us/,
      /contact-us/,
      /contactus/,
    ];

    // Content patterns
    const contentPatterns = [
      /contact\s+(us|form|information)/,
      /get\s+in\s+touch/,
      /send\s+(us\s+)?a\s+message/,
      /email\s+us/,
      /(phone|email|address).*contact/,
      /contact.*details/,
    ];

    // Check URL
    if (urlPatterns.some((pattern) => pattern.test(path))) {
      return true;
    }

    // Check content
    if (contentPatterns.some((pattern) => pattern.test(content))) {
      // Additional validation: look for form or contact details
      if (
        content.includes('email') ||
        content.includes('phone') ||
        content.includes('address') ||
        content.includes('form')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if page is a blog/news page
   */
  private static isBlogPage(path: string, content: string): boolean {
    // URL patterns
    const urlPatterns = [
      /\/(blog|news|article|post|press)/,
      /\/\d{4}\/\d{2}\//, // Date pattern (YYYY/MM/)
    ];

    // Content patterns
    const contentPatterns = [
      /blog\s+(post|article|entry)/,
      /posted\s+(on|by|in)/,
      /published\s+(on|by|in)/,
      /(written|authored)\s+by/,
      /read\s+more/,
      /continue\s+reading/,
      /share\s+this\s+(post|article)/,
      /comments?\s*\(/,
    ];

    // Check URL
    if (urlPatterns.some((pattern) => pattern.test(path))) {
      return true;
    }

    // Check content - need multiple indicators for blog
    const matches = contentPatterns.filter((pattern) => pattern.test(content)).length;
    return matches >= 2;
  }

  /**
   * Check if page is a product/service page
   */
  private static isProductPage(path: string, content: string): boolean {
    // URL patterns
    const urlPatterns = [
      /\/(product|service|shop|store|catalog|offering)/,
      /\/item\//,
      /\/sku\//,
    ];

    // Content patterns
    const contentPatterns = [
      /(buy|purchase|order)\s+(now|today)/,
      /add\s+to\s+(cart|basket)/,
      /price[:\s]+\$/,
      /\$\d+(\.\d{2})?/,
      /(product|service)\s+(description|details|features)/,
      /in\s+stock/,
      /out\s+of\s+stock/,
      /availability/,
      /specifications/,
      /features\s+(include|and\s+benefits)/,
    ];

    // Check URL
    if (urlPatterns.some((pattern) => pattern.test(path))) {
      return true;
    }

    // Check content - need multiple indicators for product
    const matches = contentPatterns.filter((pattern) => pattern.test(content)).length;
    return matches >= 2;
  }

  /**
   * Get confidence score for page classification
   */
  static async getClassificationConfidence(
    page: Page,
    path: string,
    expectedType: PageType
  ): Promise<number> {
    const actualType = await this.classifyPage(page, path);

    if (actualType === expectedType) {
      return 1.0;
    }

    // Partial match for OTHER type
    if (expectedType === PageType.OTHER || actualType === PageType.OTHER) {
      return 0.5;
    }

    return 0.0;
  }
}
