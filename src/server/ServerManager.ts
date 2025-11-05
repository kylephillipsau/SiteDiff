import { Page } from '@playwright/test';
import { ServerConfig } from '../config/types';
import { logger } from '../utils/Logger';

/**
 * Server manager for handling direct IP access via cPanel user paths
 */
export class ServerManager {
  /**
   * Build URL for accessing a domain on a specific server
   *
   * For cPanel migrations, uses the ~user format to access sites directly by IP
   * without requiring DNS changes. Format: http://IP/~user/path
   */
  static buildUrl(
    server: ServerConfig,
    _domain: string,
    path: string = '/',
    user?: string
  ): string {
    const protocol = server.protocol || 'http';
    const port = server.port || (protocol === 'https' ? 443 : 80);

    const portSuffix = (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)
      ? ''
      : `:${port}`;

    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Use cPanel user path format (primary method for cPanel migrations)
    const fullPath = user ? `/~${user}${cleanPath}` : cleanPath;

    return `${protocol}://${server.ip}${portSuffix}${fullPath}`;
  }

  /**
   * Navigate to a domain on a specific server using cPanel user path
   *
   * This is the primary method for accessing cPanel-hosted sites before DNS migration.
   * Sites are accessed as http://IP/~user/ which works reliably on cPanel servers.
   */
  static async navigateToServer(
    page: Page,
    server: ServerConfig,
    domain: string,
    path: string = '/',
    user?: string
  ): Promise<void> {
    const protocol = server.protocol || 'http';
    const port = server.port || (protocol === 'https' ? 443 : 80);

    const portSuffix = (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)
      ? ''
      : `:${port}`;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Use cPanel user path format (primary method for cPanel migrations)
    const fullPath = user ? `/~${user}${cleanPath}` : cleanPath;
    const ipUrl = `${protocol}://${server.ip}${portSuffix}${fullPath}`;

    const displayPath = user ? `~${user}${path}` : path;
    logger.debug(`Navigating to ${domain}${displayPath} via server ${server.ip}`);

    try {
      await page.goto(ipUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      logger.debug(`Successfully loaded ${domain}${displayPath} from server ${server.ip}`);
    } catch (error) {
      logger.error(`Failed to load ${domain}${displayPath} from server ${server.ip}: ${error}`);
      throw error;
    }
  }

  /**
   * Check if a server is accessible
   */
  static async checkServerAccessibility(
    page: Page,
    server: ServerConfig,
    domain: string,
    user?: string
  ): Promise<boolean> {
    try {
      await this.navigateToServer(page, server, domain, '/', user);
      return true;
    } catch (error) {
      logger.error(`Server ${server.ip} is not accessible for domain ${domain}: ${error}`);
      return false;
    }
  }

  /**
   * Get base URL for a server (without path)
   */
  static getBaseUrl(server: ServerConfig): string {
    const protocol = server.protocol || 'http';
    const port = server.port || (protocol === 'https' ? 443 : 80);
    const portSuffix = (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)
      ? ''
      : `:${port}`;

    return `${protocol}://${server.ip}${portSuffix}`;
  }

  /**
   * Configure page for server access
   */
  static async configurePage(page: Page, _domain: string): Promise<void> {
    // Disable animations for consistent screenshots
    await page.addInitScript(() => {
      // Disable CSS animations and transitions
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });
  }
}
