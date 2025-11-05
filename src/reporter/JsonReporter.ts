import * as fs from 'fs';
import * as path from 'path';
import { ComparisonReport, DomainComparisonResult } from '../config/types';
import { logger } from '../utils/Logger';

/**
 * JSON reporter
 */
export class JsonReporter {
  /**
   * Generate JSON report
   */
  static generate(
    results: DomainComparisonResult[],
    outputDir: string,
    config: any
  ): string {
    logger.info('Generating JSON report');

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

    // Create report
    const report: ComparisonReport = {
      timestamp,
      config,
      results,
      summary,
    };

    // Ensure output directory exists
    const reportsDir = path.join(outputDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate filename
    const filename = `sitediff-report-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    // Write file
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    logger.info(`JSON report saved to: ${filepath}`);

    return filepath;
  }
}
