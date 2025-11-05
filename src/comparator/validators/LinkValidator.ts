import { Page } from '@playwright/test';
import { ValidationResult } from '../../config/types';
import { logger } from '../../utils/Logger';

/**
 * Link validator
 */
export class LinkValidator {
  /**
   * Validate links between two pages
   */
  static async validate(sourcePage: Page, destPage: Page): Promise<ValidationResult> {
    try {
      // Extract link information from both pages
      const sourceLinks = await this.extractLinkInfo(sourcePage);
      const destLinks = await this.extractLinkInfo(destPage);

      // Compare link counts
      if (sourceLinks.length !== destLinks.length) {
        return {
          passed: false,
          message: `Link count mismatch: source has ${sourceLinks.length}, destination has ${destLinks.length}`,
          details: {
            sourceCount: sourceLinks.length,
            destCount: destLinks.length,
            sourceLinks: sourceLinks.slice(0, 10),
            destLinks: destLinks.slice(0, 10),
          },
        };
      }

      // Compare links
      const differences: string[] = [];

      for (let i = 0; i < sourceLinks.length; i++) {
        const srcLink = sourceLinks[i];
        const dstLink = destLinks[i];

        // Normalize URLs for comparison (remove protocol/domain for internal links)
        const srcNormalized = this.normalizeUrl(srcLink.href);
        const dstNormalized = this.normalizeUrl(dstLink.href);

        // Check if normalized URLs match
        if (srcNormalized !== dstNormalized) {
          differences.push(
            `Link ${i}: href mismatch (source: "${srcLink.href}", dest: "${dstLink.href}")`
          );
        }

        // Check if link text matches
        if (srcLink.text !== dstLink.text) {
          differences.push(
            `Link ${i}: text mismatch (source: "${srcLink.text}", dest: "${dstLink.text}")`
          );
        }
      }

      if (differences.length === 0) {
        return {
          passed: true,
          message: `All ${sourceLinks.length} links match`,
          details: {
            linkCount: sourceLinks.length,
          },
        };
      } else {
        return {
          passed: false,
          message: `Link validation failed: ${differences.length} issues found`,
          details: {
            differences: differences.slice(0, 10), // Limit to first 10
            totalDifferences: differences.length,
            sourceCount: sourceLinks.length,
            destCount: destLinks.length,
          },
        };
      }
    } catch (error) {
      logger.error(`Link validation error: ${error}`);
      return {
        passed: false,
        message: `Link validation failed: ${error}`,
      };
    }
  }

  /**
   * Extract link information from a page
   */
  private static async extractLinkInfo(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));

      return links
        .map((link, index) => {
          const anchor = link as HTMLAnchorElement;

          // Skip hidden links
          const style = window.getComputedStyle(anchor);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          ) {
            return null;
          }

          return {
            index,
            href: anchor.href,
            text: anchor.textContent?.trim() || '',
            target: anchor.target || '',
          };
        })
        .filter((link) => link !== null);
    });
  }

  /**
   * Normalize URL for comparison
   */
  private static normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // For internal links, just return the path + search + hash
      const path = parsed.pathname;
      const search = parsed.search;
      const hash = parsed.hash;

      return `${path}${search}${hash}`.toLowerCase();
    } catch (error) {
      // If URL parsing fails, return as-is
      return url.toLowerCase();
    }
  }
}
