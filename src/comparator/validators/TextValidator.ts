import { Page } from '@playwright/test';
import { ValidationResult } from '../../config/types';
import { logger } from '../../utils/Logger';

/**
 * Text content validator
 */
export class TextValidator {
  /**
   * Validate text content between two pages
   */
  static async validate(sourcePage: Page, destPage: Page): Promise<ValidationResult> {
    try {
      // Extract visible text from both pages
      const sourceText = await this.extractVisibleText(sourcePage);
      const destText = await this.extractVisibleText(destPage);

      // Normalize text for comparison
      const normalizedSource = this.normalizeText(sourceText);
      const normalizedDest = this.normalizeText(destText);

      // Compare text
      if (normalizedSource === normalizedDest) {
        return {
          passed: true,
          message: 'Text content matches',
          details: {
            sourceLength: sourceText.length,
            destLength: destText.length,
          },
        };
      } else {
        // Calculate similarity
        const similarity = this.calculateSimilarity(normalizedSource, normalizedDest);

        // Find differences
        const differences = this.findTextDifferences(normalizedSource, normalizedDest);

        return {
          passed: false,
          message: `Text content differs (${(similarity * 100).toFixed(1)}% similar)`,
          details: {
            similarity,
            sourceLength: sourceText.length,
            destLength: destText.length,
            differences: differences.slice(0, 5), // Show first 5 differences
            totalDifferences: differences.length,
          },
        };
      }
    } catch (error) {
      logger.error(`Text validation error: ${error}`);
      return {
        passed: false,
        message: `Text validation failed: ${error}`,
      };
    }
  }

  /**
   * Extract visible text from a page
   */
  private static async extractVisibleText(page: Page): Promise<string> {
    return await page.evaluate(() => {
      // Get all visible text nodes
      function getVisibleText(element: Element): string {
        // Skip hidden elements
        const style = window.getComputedStyle(element);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        ) {
          return '';
        }

        // Skip script and style tags
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
          return '';
        }

        let text = '';

        // Process child nodes
        for (const node of Array.from(element.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE) {
            // Add text content
            text += (node.textContent || '').trim() + ' ';
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Recursively get text from child elements
            text += getVisibleText(node as Element);
          }
        }

        return text;
      }

      return getVisibleText(document.body);
    });
  }

  /**
   * Normalize text for comparison
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .trim();
  }

  /**
   * Calculate text similarity (simple approach)
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;
    if (text1.length === 0 || text2.length === 0) return 0.0;

    // Use Levenshtein distance for short texts, word overlap for longer texts
    if (text1.length < 1000 && text2.length < 1000) {
      const distance = this.levenshteinDistance(text1, text2);
      const maxLength = Math.max(text1.length, text2.length);
      return 1 - distance / maxLength;
    } else {
      return this.wordOverlapSimilarity(text1, text2);
    }
  }

  /**
   * Levenshtein distance for text comparison
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Word overlap similarity for longer texts
   */
  private static wordOverlapSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' ').filter((w) => w.length > 0));
    const words2 = new Set(text2.split(' ').filter((w) => w.length > 0));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Find text differences
   */
  private static findTextDifferences(text1: string, text2: string): string[] {
    const differences: string[] = [];
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');

    // Find words in source but not in destination
    const uniqueToSource = words1.filter((w) => !words2.includes(w));
    if (uniqueToSource.length > 0) {
      differences.push(`Words only in source: ${uniqueToSource.slice(0, 10).join(', ')}`);
    }

    // Find words in destination but not in source
    const uniqueToDest = words2.filter((w) => !words1.includes(w));
    if (uniqueToDest.length > 0) {
      differences.push(`Words only in destination: ${uniqueToDest.slice(0, 10).join(', ')}`);
    }

    return differences;
  }
}
