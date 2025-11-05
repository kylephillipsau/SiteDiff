import { Page } from '@playwright/test';
import { ValidationResult } from '../../config/types';
import { logger } from '../../utils/Logger';

/**
 * HTML structure validator
 */
export class HtmlValidator {
  /**
   * Validate HTML structure between two pages
   */
  static async validate(sourcePage: Page, destPage: Page): Promise<ValidationResult> {
    try {
      // Extract DOM structure from both pages
      const sourceStructure = await this.extractDomStructure(sourcePage);
      const destStructure = await this.extractDomStructure(destPage);

      // Compare structures
      const differences = this.compareStructures(sourceStructure, destStructure);

      if (differences.length === 0) {
        return {
          passed: true,
          message: 'HTML structures match',
          details: {
            sourceElements: sourceStructure.length,
            destElements: destStructure.length,
          },
        };
      } else {
        return {
          passed: false,
          message: `HTML structure differences found: ${differences.length} mismatches`,
          details: {
            differences: differences.slice(0, 10), // Limit to first 10 differences
            totalDifferences: differences.length,
            sourceElements: sourceStructure.length,
            destElements: destStructure.length,
          },
        };
      }
    } catch (error) {
      logger.error(`HTML validation error: ${error}`);
      return {
        passed: false,
        message: `HTML validation failed: ${error}`,
      };
    }
  }

  /**
   * Extract DOM structure from a page
   */
  private static async extractDomStructure(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const structure: any[] = [];

      function traverseNode(node: Element, depth: number = 0, index: number = 0) {
        // Skip script and style tags
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') {
          return;
        }

        // Get important attributes
        const attrs: Record<string, string> = {};
        if (node.id) attrs.id = node.id;
        if (node.className) attrs.class = node.className;

        // Special handling for certain elements
        const tagName = node.tagName.toLowerCase();
        if (tagName === 'img' && node.hasAttribute('alt')) {
          attrs.alt = node.getAttribute('alt') || '';
        }
        if (tagName === 'a' && node.hasAttribute('href')) {
          attrs.href = node.getAttribute('href') || '';
        }

        structure.push({
          tag: tagName,
          depth,
          index,
          attrs,
          childCount: node.children.length,
        });

        // Traverse children
        Array.from(node.children).forEach((child, idx) => {
          traverseNode(child as Element, depth + 1, idx);
        });
      }

      // Start from body
      const body = document.body;
      if (body) {
        traverseNode(body, 0, 0);
      }

      return structure;
    });
  }

  /**
   * Compare two DOM structures
   */
  private static compareStructures(source: any[], dest: any[]): string[] {
    const differences: string[] = [];

    // Check if lengths match
    if (source.length !== dest.length) {
      differences.push(
        `Element count mismatch: source has ${source.length}, destination has ${dest.length}`
      );
    }

    // Compare element by element
    const minLength = Math.min(source.length, dest.length);

    for (let i = 0; i < minLength; i++) {
      const srcNode = source[i];
      const dstNode = dest[i];

      // Check tag name
      if (srcNode.tag !== dstNode.tag) {
        differences.push(
          `Element ${i}: tag mismatch (source: ${srcNode.tag}, dest: ${dstNode.tag})`
        );
        continue; // Skip further checks for this element
      }

      // Check depth (structure)
      if (srcNode.depth !== dstNode.depth) {
        differences.push(
          `Element ${i} (${srcNode.tag}): depth mismatch (source: ${srcNode.depth}, dest: ${dstNode.depth})`
        );
      }

      // Check child count
      if (srcNode.childCount !== dstNode.childCount) {
        differences.push(
          `Element ${i} (${srcNode.tag}): child count mismatch (source: ${srcNode.childCount}, dest: ${dstNode.childCount})`
        );
      }

      // Check important attributes (ID)
      if (srcNode.attrs.id !== dstNode.attrs.id) {
        differences.push(
          `Element ${i} (${srcNode.tag}): ID mismatch (source: ${srcNode.attrs.id || 'none'}, dest: ${dstNode.attrs.id || 'none'})`
        );
      }
    }

    return differences;
  }
}
