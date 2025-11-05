import { Page } from '@playwright/test';
import { ValidationResult } from '../../config/types';
import { logger } from '../../utils/Logger';

/**
 * Image validator
 */
export class ImageValidator {
  /**
   * Validate images between two pages
   */
  static async validate(sourcePage: Page, destPage: Page): Promise<ValidationResult> {
    try {
      // Extract image information from both pages
      const sourceImages = await this.extractImageInfo(sourcePage);
      const destImages = await this.extractImageInfo(destPage);

      // Compare image counts
      if (sourceImages.length !== destImages.length) {
        return {
          passed: false,
          message: `Image count mismatch: source has ${sourceImages.length}, destination has ${destImages.length}`,
          details: {
            sourceImages,
            destImages,
          },
        };
      }

      // Compare images
      const differences: string[] = [];

      for (let i = 0; i < sourceImages.length; i++) {
        const srcImg = sourceImages[i];
        const dstImg = destImages[i];

        // Check if images have the same alt text
        if (srcImg.alt !== dstImg.alt) {
          differences.push(
            `Image ${i}: alt text mismatch (source: "${srcImg.alt}", dest: "${dstImg.alt}")`
          );
        }

        // Check if images loaded successfully
        if (!srcImg.loaded) {
          differences.push(`Image ${i}: failed to load on source (${srcImg.src})`);
        }
        if (!dstImg.loaded) {
          differences.push(`Image ${i}: failed to load on destination (${dstImg.src})`);
        }

        // Check dimensions if both loaded
        if (srcImg.loaded && dstImg.loaded) {
          if (srcImg.width !== dstImg.width || srcImg.height !== dstImg.height) {
            differences.push(
              `Image ${i}: dimension mismatch (source: ${srcImg.width}x${srcImg.height}, dest: ${dstImg.width}x${dstImg.height})`
            );
          }
        }
      }

      if (differences.length === 0) {
        return {
          passed: true,
          message: `All ${sourceImages.length} images match`,
          details: {
            imageCount: sourceImages.length,
            sourceImages,
            destImages,
          },
        };
      } else {
        return {
          passed: false,
          message: `Image validation failed: ${differences.length} issues found`,
          details: {
            differences: differences.slice(0, 10), // Limit to first 10
            totalDifferences: differences.length,
            sourceImages,
            destImages,
          },
        };
      }
    } catch (error) {
      logger.error(`Image validation error: ${error}`);
      return {
        passed: false,
        message: `Image validation failed: ${error}`,
      };
    }
  }

  /**
   * Extract image information from a page
   */
  private static async extractImageInfo(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));

      return images.map((img, index) => {
        return {
          index,
          src: img.src,
          alt: img.alt || '',
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          loaded: img.complete && img.naturalWidth > 0,
          visible: img.offsetParent !== null,
        };
      });
    });
  }
}
