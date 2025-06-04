import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { logger, trackError, trackPerformance, trackBusinessEvent } from './logger';

export interface WebsiteSnapshot {
  url: string;
  title: string;
  description: string;
  html: string;
  text: string;
  timestamp: Date;
  metadata: {
    headers: Record<string, string>;
    statusCode: number;
    contentLength?: number;
    lastModified?: string;
  };
}

export class WebsiteScraper {
  private browser: puppeteer.Browser | null = null;

  private async initBrowser() {
    if (!this.browser) {
      logger.debug('Initializing Puppeteer browser');
      
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        
        logger.info('Puppeteer browser initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize Puppeteer browser', error as Error);
        throw error;
      }
    }
    return this.browser;
  }

  async takeSnapshot(url: string): Promise<WebsiteSnapshot> {
    const context = { url };
    logger.info('Starting website snapshot', context);
    
    return logger.timeOperation('website_snapshot', async () => {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      try {
        // Set a reasonable viewport
        await page.setViewport({ width: 1920, height: 1080 });
        logger.debug('Browser viewport set', { ...context, viewport: '1920x1080' });

        // Enable request interception to capture headers
        await page.setRequestInterception(true);
        let headers: Record<string, string> = {};
        let statusCode = 200;

        page.on('request', (request: puppeteer.HTTPRequest) => {
          request.continue();
        });

        page.on('response', (response: puppeteer.HTTPResponse) => {
          if (response.url() === url) {
            headers = response.headers();
            statusCode = response.status();
            logger.debug('Response received', {
              ...context,
              statusCode,
              contentType: headers['content-type'],
              contentLength: headers['content-length']
            });
          }
        });

        // Navigate to the page
        logger.debug('Navigating to URL', context);
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });
        
        logger.debug('Page loaded successfully', { ...context, statusCode });

        // Get page content
        const html = await page.content();
        const text = await page.evaluate(() => document.body.innerText);
        const title = await page.title();

        // Use cheerio to parse meta description
        const $ = cheerio.load(html);
        const description = $('meta[name="description"]').attr('content') || '';

        const snapshot: WebsiteSnapshot = {
          url,
          title,
          description,
          html,
          text,
          timestamp: new Date(),
          metadata: {
            headers,
            statusCode,
            contentLength: parseInt(headers['content-length'] || '0'),
            lastModified: headers['last-modified'],
          },
        };

        logger.info('Website snapshot completed successfully', {
          ...context,
          titleLength: title.length,
          htmlLength: html.length,
          textLength: text.length,
          statusCode,
          hasDescription: !!description
        });

        // Track business event for successful snapshot
        trackBusinessEvent('snapshot_captured', {
          url,
          statusCode,
          contentLength: html.length,
          hasTitle: !!title,
          hasDescription: !!description
        }, context);

        return snapshot;
      } catch (error) {
        trackError(error as Error, 'website_snapshot', context);
        throw error;
      } finally {
        await page.close();
        logger.debug('Browser page closed', context);
      }
    }, context);
  }

  async close() {
    if (this.browser) {
      logger.debug('Closing Puppeteer browser');
      
      try {
        await this.browser.close();
        this.browser = null;
        logger.info('Puppeteer browser closed successfully');
      } catch (error) {
        logger.error('Failed to close Puppeteer browser', error as Error);
        throw error;
      }
    }
  }
} 