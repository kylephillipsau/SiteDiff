/**
 * Configuration types for SiteDiff
 */

/**
 * Server configuration for source and destination
 */
export interface ServerConfig {
  ip: string;
  port?: number;
  protocol?: 'http' | 'https';
}

/**
 * Domain configuration
 */
export interface DomainConfig {
  domain: string;
  user?: string; // Required for cPanel: user for accessing site via ~user path (primary method for cPanel migrations)
  enabled?: boolean;
}

/**
 * Validation settings
 */
export interface ValidationSettings {
  htmlStructure: boolean;
  textContent: boolean;
  images: boolean;
  links: boolean;
}

/**
 * Screenshot comparison settings
 */
export interface ScreenshotSettings {
  enabled: boolean;
  threshold: number; // 0-1, where 0 = exact match, 1 = any difference allowed
  fullPage: boolean;
}

/**
 * Output settings
 */
export interface OutputSettings {
  directory: string;
  htmlReport: boolean;
  jsonReport: boolean;
  screenshotArtifacts: boolean;
}

/**
 * Crawler settings
 */
export interface CrawlerSettings {
  maxPages?: number;
  timeout?: number;
  waitForNetworkIdle?: boolean;
}

/**
 * Comparison mode
 */
export type ComparisonMode = 'server-compare' | 'baseline' | 'compare';

/**
 * Main configuration
 */
export interface SiteDiffConfig {
  mode?: ComparisonMode; // Default: 'server-compare' for legacy compatibility
  sourceServer?: ServerConfig; // Optional in baseline/compare modes
  destinationServer?: ServerConfig; // Optional in baseline/compare modes
  baselineDir?: string; // Directory for baseline data (required for baseline/compare modes)
  domains: DomainConfig[];
  validation: ValidationSettings;
  screenshot: ScreenshotSettings;
  output: OutputSettings;
  crawler?: CrawlerSettings;
  parallel?: number; // Number of domains to process in parallel
}

/**
 * Page types that can be discovered
 */
export enum PageType {
  HOMEPAGE = 'homepage',
  CONTACT = 'contact',
  BLOG = 'blog',
  PRODUCT = 'product',
  OTHER = 'other',
}

/**
 * Discovered page information
 */
export interface DiscoveredPage {
  url: string;
  path: string;
  type: PageType;
  title?: string;
}

/**
 * Validation result for a single check
 */
export interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * Screenshot comparison result
 */
export interface ScreenshotComparisonResult {
  passed: boolean;
  diffPixels: number;
  diffPercentage: number;
  threshold: number;
  sourceScreenshot: string;
  destinationScreenshot: string;
  diffScreenshot?: string;
}

/**
 * Page comparison result
 */
export interface PageComparisonResult {
  domain: string;
  page: DiscoveredPage;
  sourceUrl: string;
  destinationUrl: string;
  timestamp: string;
  validation: {
    htmlStructure?: ValidationResult;
    textContent?: ValidationResult;
    images?: ValidationResult;
    links?: ValidationResult;
  };
  screenshot?: ScreenshotComparisonResult;
  passed: boolean;
  errors: string[];
}

/**
 * Domain comparison result
 */
export interface DomainComparisonResult {
  domain: string;
  timestamp: string;
  sourceServer: ServerConfig;
  destinationServer: ServerConfig;
  discoveredPages: DiscoveredPage[];
  pageResults: PageComparisonResult[];
  passed: boolean;
  summary: {
    totalPages: number;
    passedPages: number;
    failedPages: number;
  };
}

/**
 * Complete report
 */
export interface ComparisonReport {
  timestamp: string;
  config: SiteDiffConfig;
  results: DomainComparisonResult[];
  summary: {
    totalDomains: number;
    passedDomains: number;
    failedDomains: number;
    totalPages: number;
    passedPages: number;
    failedPages: number;
  };
}

/**
 * Baseline page data
 */
export interface BaselinePageData {
  page: DiscoveredPage;
  url: string;
  timestamp: string;
  screenshot?: string; // Path to screenshot
  htmlContent?: string; // Saved HTML content for validation
  textContent?: string; // Saved text content
  images?: Array<{ src: string; alt: string }>;
  links?: Array<{ href: string; text: string }>;
}

/**
 * Baseline data for a domain
 */
export interface BaselineDomainData {
  domain: string;
  timestamp: string;
  discoveredPages: DiscoveredPage[];
  pageData: BaselinePageData[];
}

/**
 * Complete baseline
 */
export interface Baseline {
  timestamp: string;
  domains: BaselineDomainData[];
}
