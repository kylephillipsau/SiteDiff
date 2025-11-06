import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { DomainComparisonResult, PageComparisonResult } from '../config/types';
import { logger } from '../utils/Logger';

/**
 * HTML reporter with visual comparison
 */
export class HtmlReporter {
  /**
   * Generate HTML report
   */
  static async generate(results: DomainComparisonResult[], outputDir: string): Promise<string> {
    logger.info('Generating HTML report');

    const timestamp = new Date().toISOString();

    // Calculate summary
    const summary = {
      totalDomains: results.length,
      passedDomains: results.filter((r) => r.passed).length,
      failedDomains: results.filter((r) => !r.passed).length,
      totalPages: results.reduce((sum, r) => sum + r.summary.totalPages, 0),
      passedPages: results.reduce((sum, r) => sum + r.summary.passedPages, 0),
      failedPages: results.reduce((sum, r) => sum + r.summary.failedPages, 0),
    };

    // Ensure output directory exists
    const reportsDir = path.join(outputDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Compress screenshots for HTML report
    logger.info('Compressing screenshots for HTML report...');
    const compressedDir = path.join(outputDir, 'screenshots', 'compressed');
    if (!fs.existsSync(compressedDir)) {
      fs.mkdirSync(compressedDir, { recursive: true });
    }

    await this.compressScreenshots(results, compressedDir);

    // Build HTML with report directory for relative paths
    const html = this.buildHtml(results, summary, timestamp, reportsDir, compressedDir);

    // Generate filename
    const filename = `sitediff-report-${Date.now()}.html`;
    const filepath = path.join(reportsDir, filename);

    // Write file
    fs.writeFileSync(filepath, html);

    logger.info(`HTML report saved to: ${filepath}`);

    return filepath;
  }

  /**
   * Compress all screenshots for HTML report
   */
  private static async compressScreenshots(
    results: DomainComparisonResult[],
    compressedDir: string
  ): Promise<void> {
    const compressionTasks: Promise<void>[] = [];

    for (const domainResult of results) {
      for (const pageResult of domainResult.pageResults) {
        if (pageResult.screenshot) {
          // Compress source screenshot
          if (pageResult.screenshot.sourceScreenshot && fs.existsSync(pageResult.screenshot.sourceScreenshot)) {
            compressionTasks.push(
              this.compressImage(pageResult.screenshot.sourceScreenshot, compressedDir)
            );
          }

          // Compress destination screenshot
          if (pageResult.screenshot.destinationScreenshot && fs.existsSync(pageResult.screenshot.destinationScreenshot)) {
            compressionTasks.push(
              this.compressImage(pageResult.screenshot.destinationScreenshot, compressedDir)
            );
          }

          // Compress diff screenshot
          if (pageResult.screenshot.diffScreenshot && fs.existsSync(pageResult.screenshot.diffScreenshot)) {
            compressionTasks.push(
              this.compressImage(pageResult.screenshot.diffScreenshot, compressedDir)
            );
          }
        }
      }
    }

    await Promise.all(compressionTasks);
    logger.info(`Compressed ${compressionTasks.length} screenshots`);
  }

  /**
   * Compress a single image
   */
  private static async compressImage(imagePath: string, compressedDir: string): Promise<void> {
    try {
      const filename = path.basename(imagePath);
      const compressedPath = path.join(compressedDir, filename);

      // Skip if already compressed
      if (fs.existsSync(compressedPath)) {
        return;
      }

      // Compress to JPEG with 80% quality and max width of 1200px
      await sharp(imagePath)
        .resize(1200, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 80 })
        .toFile(compressedPath.replace('.png', '.jpg'));
    } catch (error) {
      logger.warn(`Failed to compress ${imagePath}: ${error}`);
    }
  }

  /**
   * Build HTML content
   */
  private static buildHtml(
    results: DomainComparisonResult[],
    summary: any,
    timestamp: string,
    reportDir: string,
    compressedDir: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SiteDiff Report - ${timestamp}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
    }
    .timestamp {
      color: #7f8c8d;
      font-size: 14px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      font-size: 14px;
      color: #7f8c8d;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
    }
    .summary-card.pass .value {
      color: #27ae60;
    }
    .summary-card.fail .value {
      color: #e74c3c;
    }
    .summary-card.total .value {
      color: #3498db;
    }
    .domain-section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .domain-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #ecf0f1;
    }
    .domain-name {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }
    .status-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      text-transform: uppercase;
    }
    .status-badge.pass {
      background: #d4edda;
      color: #27ae60;
    }
    .status-badge.fail {
      background: #f8d7da;
      color: #e74c3c;
    }
    .page-result {
      margin: 20px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid #3498db;
    }
    .page-result.fail {
      border-left-color: #e74c3c;
    }
    .page-result.pass {
      border-left-color: #27ae60;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .page-path {
      font-weight: bold;
      font-size: 16px;
    }
    .page-type {
      display: inline-block;
      padding: 4px 12px;
      background: #3498db;
      color: white;
      border-radius: 12px;
      font-size: 12px;
      text-transform: uppercase;
    }
    .validation-results {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }
    .validation-item {
      padding: 10px;
      background: white;
      border-radius: 4px;
      border-left: 3px solid #95a5a6;
    }
    .validation-item.pass {
      border-left-color: #27ae60;
    }
    .validation-item.fail {
      border-left-color: #e74c3c;
    }
    .validation-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .validation-message {
      font-size: 14px;
      font-weight: 500;
    }
    .screenshots {
      margin-top: 20px;
    }
    .screenshot-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .screenshot-item {
      background: white;
      padding: 10px;
      border-radius: 6px;
    }
    .screenshot-label {
      font-size: 12px;
      font-weight: bold;
      color: #7f8c8d;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .screenshot-item img {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .screenshot-item img:hover {
      transform: scale(1.02);
    }
    .errors {
      margin-top: 15px;
      padding: 15px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    .errors h4 {
      color: #856404;
      margin-bottom: 10px;
    }
    .error-item {
      padding: 5px 0;
      color: #856404;
      font-size: 14px;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.9);
    }
    .modal-content {
      margin: auto;
      display: block;
      max-width: 90%;
      max-height: 90%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .close {
      position: absolute;
      top: 15px;
      right: 35px;
      color: #f1f1f1;
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>SiteDiff Migration Validation Report</h1>
      <p class="timestamp">Generated: ${new Date(timestamp).toLocaleString()}</p>
    </header>

    <div class="summary">
      <div class="summary-card total">
        <h3>Total Domains</h3>
        <div class="value">${summary.totalDomains}</div>
      </div>
      <div class="summary-card pass">
        <h3>Passed Domains</h3>
        <div class="value">${summary.passedDomains}</div>
      </div>
      <div class="summary-card fail">
        <h3>Failed Domains</h3>
        <div class="value">${summary.failedDomains}</div>
      </div>
      <div class="summary-card total">
        <h3>Total Pages</h3>
        <div class="value">${summary.totalPages}</div>
      </div>
      <div class="summary-card pass">
        <h3>Passed Pages</h3>
        <div class="value">${summary.passedPages}</div>
      </div>
      <div class="summary-card fail">
        <h3>Failed Pages</h3>
        <div class="value">${summary.failedPages}</div>
      </div>
    </div>

    ${results.map((result) => this.buildDomainSection(result, reportDir, compressedDir)).join('\n')}
  </div>

  <div id="imageModal" class="modal">
    <span class="close">&times;</span>
    <img class="modal-content" id="modalImage">
  </div>

  <script>
    // Image modal
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = document.querySelector('.close');

    document.querySelectorAll('.screenshot-item img').forEach(img => {
      img.onclick = function() {
        modal.style.display = 'block';
        modalImg.src = this.src;
      }
    });

    closeBtn.onclick = function() {
      modal.style.display = 'none';
    }

    modal.onclick = function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    }
  </script>
</body>
</html>
    `;
  }

  /**
   * Build domain section HTML
   */
  private static buildDomainSection(result: DomainComparisonResult, reportDir: string, compressedDir: string): string {
    return `
    <div class="domain-section">
      <div class="domain-header">
        <div class="domain-name">${result.domain}</div>
        <div class="status-badge ${result.passed ? 'pass' : 'fail'}">
          ${result.passed ? 'PASSED' : 'FAILED'}
        </div>
      </div>
      <p><strong>Source:</strong> ${result.sourceServer.ip} | <strong>Destination:</strong> ${result.destinationServer.ip}</p>
      <p><strong>Pages Tested:</strong> ${result.summary.totalPages} | <strong>Passed:</strong> ${result.summary.passedPages} | <strong>Failed:</strong> ${result.summary.failedPages}</p>

      ${result.pageResults.map((page) => this.buildPageResult(page, reportDir, compressedDir)).join('\n')}
    </div>
    `;
  }

  /**
   * Build page result HTML
   */
  private static buildPageResult(page: PageComparisonResult, reportDir: string, compressedDir: string): string {
    const screenshotHtml = page.screenshot
      ? `
      <div class="screenshots">
        <strong>Visual Comparison:</strong>
        <div class="screenshot-grid">
          <div class="screenshot-item">
            <div class="screenshot-label">Source</div>
            <img src="${this.getCompressedImagePath(page.screenshot.sourceScreenshot, reportDir, compressedDir)}" alt="Source">
          </div>
          <div class="screenshot-item">
            <div class="screenshot-label">Destination</div>
            <img src="${this.getCompressedImagePath(page.screenshot.destinationScreenshot, reportDir, compressedDir)}" alt="Destination">
          </div>
          <div class="screenshot-item">
            <div class="screenshot-label">Difference (${(page.screenshot.diffPercentage * 100).toFixed(2)}%)</div>
            <img src="${this.getCompressedImagePath(page.screenshot.diffScreenshot || '', reportDir, compressedDir)}" alt="Diff">
          </div>
        </div>
      </div>
      `
      : '';

    const errorsHtml =
      page.errors.length > 0
        ? `
      <div class="errors">
        <h4>Errors:</h4>
        ${page.errors.map((error) => `<div class="error-item">• ${this.escapeHtml(error)}</div>`).join('\n')}
      </div>
      `
        : '';

    return `
    <div class="page-result ${page.passed ? 'pass' : 'fail'}">
      <div class="page-header">
        <div>
          <div class="page-path">${page.page.path}</div>
          <span class="page-type">${page.page.type}</span>
        </div>
        <div class="status-badge ${page.passed ? 'pass' : 'fail'}">
          ${page.passed ? 'PASSED' : 'FAILED'}
        </div>
      </div>

      <div class="validation-results">
        ${this.buildValidationItem('HTML Structure', page.validation.htmlStructure)}
        ${this.buildValidationItem('Text Content', page.validation.textContent)}
        ${this.buildValidationItem('Images', page.validation.images)}
        ${this.buildValidationItem('Links', page.validation.links)}
      </div>

      ${screenshotHtml}
      ${errorsHtml}
    </div>
    `;
  }

  /**
   * Build validation item HTML
   */
  private static buildValidationItem(label: string, validation: any): string {
    if (!validation) return '';

    return `
    <div class="validation-item ${validation.passed ? 'pass' : 'fail'}">
      <div class="validation-label">${label}</div>
      <div class="validation-message">${this.escapeHtml(validation.message)}</div>
    </div>
    `;
  }

  /**
   * Get compressed image path for HTML report
   */
  private static getCompressedImagePath(originalPath: string, reportDir: string, compressedDir: string): string {
    if (!originalPath) return '';

    const filename = path.basename(originalPath);
    const compressedFilename = filename.replace('.png', '.jpg');
    const compressedPath = path.join(compressedDir, compressedFilename);

    return path.relative(reportDir, compressedPath).replace(/\\/g, '/');
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
