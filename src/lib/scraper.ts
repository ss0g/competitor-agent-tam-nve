import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

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
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async takeSnapshot(url: string): Promise<WebsiteSnapshot> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Set a reasonable viewport
      await page.setViewport({ width: 1920, height: 1080 });

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
        }
      });

      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Get page content
      const html = await page.content();
      const text = await page.evaluate(() => document.body.innerText);
      const title = await page.title();

      // Use cheerio to parse meta description
      const $ = cheerio.load(html);
      const description = $('meta[name="description"]').attr('content') || '';

      return {
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
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
} 