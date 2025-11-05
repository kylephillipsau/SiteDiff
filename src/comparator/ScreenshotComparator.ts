import { Page } from '@playwright/test';
import { ScreenshotComparisonResult } from '../config/types';
import { logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * Screenshot comparator using pixelmatch
 */
export class ScreenshotComparator {
  private threshold: number;
  private outputDir: string;

  constructor(threshold: number, outputDir: string) {
    this.threshold = threshold;
    this.outputDir = outputDir;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Compare screenshots between source and destination pages
   */
  async compare(
    sourcePage: Page,
    destPage: Page,
    domain: string,
    pagePath: string,
    fullPage: boolean = true
  ): Promise<ScreenshotComparisonResult> {
    try {
      // Create sanitized filename
      const sanitizedPath = this.sanitizePath(pagePath);
      const sanitizedDomain = domain.replace(/[^a-z0-9]/gi, '_');
      const timestamp = Date.now();

      const sourceFilename = `${sanitizedDomain}_${sanitizedPath}_source_${timestamp}.png`;
      const destFilename = `${sanitizedDomain}_${sanitizedPath}_dest_${timestamp}.png`;
      const diffFilename = `${sanitizedDomain}_${sanitizedPath}_diff_${timestamp}.png`;

      const sourcePath = path.join(this.outputDir, sourceFilename);
      const destPath = path.join(this.outputDir, destFilename);
      const diffPath = path.join(this.outputDir, diffFilename);

      // Take screenshots
      logger.debug(`Taking screenshots for ${domain}${pagePath}`);

      await sourcePage.screenshot({
        path: sourcePath,
        fullPage,
      });

      await destPage.screenshot({
        path: destPath,
        fullPage,
      });

      // Load images
      const sourceImg = PNG.sync.read(fs.readFileSync(sourcePath));
      const destImg = PNG.sync.read(fs.readFileSync(destPath));

      // Check if dimensions match
      if (sourceImg.width !== destImg.width || sourceImg.height !== destImg.height) {
        logger.warn(
          `Screenshot dimensions differ: source ${sourceImg.width}x${sourceImg.height}, dest ${destImg.width}x${destImg.height}`
        );

        // Resize to match (use smaller dimensions)
        const width = Math.min(sourceImg.width, destImg.width);
        const height = Math.min(sourceImg.height, destImg.height);

        // Create a new diff image with matching dimensions
        const diff = new PNG({ width, height });

        // Compare only the overlapping region
        const diffPixels = pixelmatch(
          sourceImg.data,
          destImg.data,
          diff.data,
          width,
          height,
          {
            threshold: 0.1,
            includeAA: false,
          }
        );

        // Save diff image
        fs.writeFileSync(diffPath, PNG.sync.write(diff));

        const totalPixels = width * height;
        const diffPercentage = (diffPixels / totalPixels) * 100;

        const passed = diffPercentage / 100 <= this.threshold;

        logger.debug(
          `Screenshot comparison: ${diffPixels} different pixels (${diffPercentage.toFixed(2)}%)`
        );

        return {
          passed,
          diffPixels,
          diffPercentage: diffPercentage / 100,
          threshold: this.threshold,
          sourceScreenshot: sourcePath,
          destinationScreenshot: destPath,
          diffScreenshot: diffPath,
        };
      }

      // Create diff image
      const { width, height } = sourceImg;
      const diff = new PNG({ width, height });

      // Compare images
      const diffPixels = pixelmatch(sourceImg.data, destImg.data, diff.data, width, height, {
        threshold: 0.1,
        includeAA: false,
      });

      // Save diff image
      fs.writeFileSync(diffPath, PNG.sync.write(diff));

      // Calculate percentage
      const totalPixels = width * height;
      const diffPercentage = (diffPixels / totalPixels) * 100;

      const passed = diffPercentage / 100 <= this.threshold;

      logger.debug(
        `Screenshot comparison: ${diffPixels} different pixels (${diffPercentage.toFixed(2)}%), threshold: ${this.threshold * 100}%`
      );

      return {
        passed,
        diffPixels,
        diffPercentage: diffPercentage / 100,
        threshold: this.threshold,
        sourceScreenshot: sourcePath,
        destinationScreenshot: destPath,
        diffScreenshot: diffPath,
      };
    } catch (error) {
      logger.error(`Screenshot comparison error: ${error}`);
      throw error;
    }
  }

  /**
   * Sanitize path for use in filename
   */
  private sanitizePath(pagePath: string): string {
    return pagePath
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/[^a-z0-9_-]/gi, '')
      .substring(0, 50) || 'home';
  }
}
