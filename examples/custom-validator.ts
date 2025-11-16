/**
 * Example: Creating a Custom Validator
 *
 * This example demonstrates how to create a custom validator
 * that checks for meta tags (SEO, Open Graph, etc.)
 */

import { Page } from '@playwright/test';
import { ValidationResult } from '../src/config/types';
import { getLogger } from '../src/utils/Logger';

const logger = getLogger();

/**
 * Interface for meta tag data
 */
interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

/**
 * Custom validator that compares meta tags between pages
 *
 * Useful for ensuring SEO and social media metadata is preserved
 * during migration.
 */
export class MetaTagValidator {
  /**
   * Validates meta tags between source and destination pages
   *
   * @param sourcePage - Source page to compare
   * @param destPage - Destination page to compare
   * @returns Validation result with differences
   */
  async validate(
    sourcePage: Page,
    destPage: Page
  ): Promise<ValidationResult> {
    try {
      logger.debug('Extracting meta tags from both pages');

      // Extract meta tags from both pages
      const sourceMeta = await this.extractMetaTags(sourcePage);
      const destMeta = await this.extractMetaTags(destPage);

      // Compare meta tags
      const differences = this.compareMetaTags(sourceMeta, destMeta);

      const passed = differences.length === 0;

      logger.info('Meta tag validation completed', {
        passed,
        differenceCount: differences.length,
        sourceMetaCount: Object.keys(sourceMeta).length,
        destMetaCount: Object.keys(destMeta).length
      });

      return {
        passed,
        differences: differences.slice(0, 10), // Limit to 10 differences
        details: {
          sourceMeta,
          destMeta,
          totalDifferences: differences.length
        }
      };
    } catch (error) {
      logger.error('Meta tag validation failed', {
        error: error.message
      });

      return {
        passed: false,
        differences: [`Meta tag validation error: ${error.message}`]
      };
    }
  }

  /**
   * Extracts all meta tags from a page
   *
   * @param page - Playwright page
   * @returns Record of meta tag key-value pairs
   */
  private async extractMetaTags(page: Page): Promise<Record<string, string>> {
    return await page.evaluate(() => {
      const meta: Record<string, string> = {};
      const tags = document.querySelectorAll('meta');

      tags.forEach(tag => {
        // Get meta tag identifier (name or property)
        const name = tag.getAttribute('name') || tag.getAttribute('property');
        const content = tag.getAttribute('content');

        if (name && content) {
          meta[name] = content;
        }
      });

      return meta;
    });
  }

  /**
   * Compares meta tags between source and destination
   *
   * @param source - Source meta tags
   * @param dest - Destination meta tags
   * @returns Array of difference descriptions
   */
  private compareMetaTags(
    source: Record<string, string>,
    dest: Record<string, string>
  ): string[] {
    const differences: string[] = [];

    // Check for missing or different tags in destination
    for (const [key, value] of Object.entries(source)) {
      if (!(key in dest)) {
        differences.push(`Meta tag '${key}' missing in destination`);
      } else if (dest[key] !== value) {
        differences.push(
          `Meta tag '${key}': source='${value}', dest='${dest[key]}'`
        );
      }
    }

    // Check for extra tags in destination
    for (const key of Object.keys(dest)) {
      if (!(key in source)) {
        differences.push(`Extra meta tag '${key}' in destination: '${dest[key]}'`);
      }
    }

    return differences;
  }

  /**
   * Validates specific meta tags (e.g., only SEO-related)
   *
   * @param sourcePage - Source page
   * @param destPage - Destination page
   * @param tagNames - Specific tag names to validate
   * @returns Validation result
   */
  async validateSpecificTags(
    sourcePage: Page,
    destPage: Page,
    tagNames: string[]
  ): Promise<ValidationResult> {
    try {
      const sourceMeta = await this.extractMetaTags(sourcePage);
      const destMeta = await this.extractMetaTags(destPage);

      // Filter to only specified tags
      const filteredSource: Record<string, string> = {};
      const filteredDest: Record<string, string> = {};

      tagNames.forEach(tag => {
        if (tag in sourceMeta) filteredSource[tag] = sourceMeta[tag];
        if (tag in destMeta) filteredDest[tag] = destMeta[tag];
      });

      const differences = this.compareMetaTags(filteredSource, filteredDest);

      return {
        passed: differences.length === 0,
        differences,
        details: {
          sourceMeta: filteredSource,
          destMeta: filteredDest
        }
      };
    } catch (error) {
      logger.error('Specific meta tag validation failed', { error: error.message });
      return {
        passed: false,
        differences: [`Validation error: ${error.message}`]
      };
    }
  }
}

/**
 * Example usage of the custom validator
 */
async function exampleUsage() {
  const { chromium } = require('@playwright/test');

  // Create browser and pages
  const browser = await chromium.launch();
  const sourcePage = await browser.newPage();
  const destPage = await browser.newPage();

  try {
    // Navigate to pages
    await sourcePage.goto('https://example.com');
    await destPage.goto('http://192.168.1.100/~user/');

    // Create validator
    const validator = new MetaTagValidator();

    // Validate all meta tags
    const result = await validator.validate(sourcePage, destPage);

    console.log('Validation Result:', result.passed ? 'PASSED' : 'FAILED');

    if (!result.passed) {
      console.log('Differences:');
      result.differences?.forEach(diff => console.log(`  - ${diff}`));
    }

    // Validate only SEO-related meta tags
    const seoResult = await validator.validateSpecificTags(
      sourcePage,
      destPage,
      ['description', 'keywords', 'author', 'robots']
    );

    console.log('SEO Validation:', seoResult.passed ? 'PASSED' : 'FAILED');

  } finally {
    await sourcePage.close();
    await destPage.close();
    await browser.close();
  }
}

// Integration example: Adding to ComparisonEngine
/*
// In src/comparator/ComparisonEngine.ts:

import { MetaTagValidator } from './validators/MetaTagValidator';

// Add to validation config:
export interface ValidationConfig {
  htmlStructure: boolean;
  textContent: boolean;
  images: boolean;
  links: boolean;
  metaTags: boolean; // New validator
}

// In comparison method:
if (config.validation.metaTags) {
  const metaValidator = new MetaTagValidator();
  validationResults.metaTags = await metaValidator.validate(
    sourcePage,
    destPage
  );
}
*/

export default MetaTagValidator;
