import * as cron from 'node-cron';
import { webScraperService, ScrapingOptions } from './webScraper';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SchedulerConfig {
  enabled: boolean;
  cronExpression: string; // e.g., '0 9 * * *' for daily at 9 AM
  scrapingOptions: ScrapingOptions;
  notifyOnCompletion: boolean;
  notifyOnErrors: boolean;
  maxConcurrentJobs: number;
  competitorFilter?: string[]; // Optional: only scrape specific competitors
}

export class ScraperScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;
  private defaultConfig: SchedulerConfig = {
    enabled: true,
    cronExpression: '0 9 * * *', // Daily at 9 AM
    scrapingOptions: {
      timeout: 30000,
      retries: 3,
      retryDelay: 2000,
      blockedResourceTypes: ['image', 'font', 'media']
    },
    notifyOnCompletion: true,
    notifyOnErrors: true,
    maxConcurrentJobs: 1
  };

  /**
   * Schedule regular competitor scraping
   */
  async scheduleCompetitorScraping(config: Partial<SchedulerConfig> = {}): Promise<string> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const jobId = `competitor-scraping-${Date.now()}`;

    try {
      console.log(`📅 Scheduling competitor scraping job: ${jobId}`);
      console.log(`⏰ Cron expression: ${mergedConfig.cronExpression}`);

             const task = cron.schedule(mergedConfig.cronExpression, async () => {
         await this.executeScrapingJob(jobId, mergedConfig);
       }, {
         timezone: 'America/New_York' // Adjust timezone as needed
       });

      this.jobs.set(jobId, task);
      
      if (mergedConfig.enabled) {
        task.start();
        console.log(`✅ Scraping job ${jobId} scheduled and started`);
      } else {
        console.log(`⏸️ Scraping job ${jobId} scheduled but not started (disabled)`);
      }

      return jobId;

    } catch (error) {
      console.error(`❌ Failed to schedule scraping job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a scraping job
   */
  private async executeScrapingJob(jobId: string, config: SchedulerConfig): Promise<void> {
    if (this.isRunning && config.maxConcurrentJobs === 1) {
      console.log(`⏳ Scraping job ${jobId} skipped - another job is already running`);
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`\n🚀 Starting scraping job: ${jobId}`);
      console.log(`📅 Started at: ${new Date().toISOString()}`);

      // Get competitors to scrape
      let competitors;
      if (config.competitorFilter && config.competitorFilter.length > 0) {
        competitors = await prisma.competitor.findMany({
          where: {
            id: { in: config.competitorFilter }
          },
          select: { id: true, name: true, website: true }
        });
      } else {
        competitors = await prisma.competitor.findMany({
          select: { id: true, name: true, website: true }
        });
      }

      if (competitors.length === 0) {
        console.log(`📭 No competitors found for job ${jobId}`);
        return;
      }

      console.log(`📋 Found ${competitors.length} competitors to scrape`);

      // Initialize web scraper
      await webScraperService.initialize();

      // Execute scraping
      const results = await webScraperService.scrapeAllCompetitors(config.scrapingOptions);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Log completion
      console.log(`\n✅ Scraping job ${jobId} completed`);
      console.log(`⏱️ Duration: ${duration.toFixed(2)} seconds`);
      console.log(`📊 Results: ${results.length}/${competitors.length} successful`);

      // Create job log
      await this.logJobExecution(jobId, {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        competitorsProcessed: competitors.length,
        successfulSnapshots: results.length,
        failedSnapshots: competitors.length - results.length,
        config
      });

      // Send notifications if enabled
      if (config.notifyOnCompletion) {
        await this.sendCompletionNotification(jobId, {
          duration,
          successful: results.length,
          total: competitors.length
        });
      }

    } catch (error) {
      console.error(`❌ Scraping job ${jobId} failed:`, error);

      // Log error
      await this.logJobError(jobId, error);

      // Send error notification if enabled
      if (config.notifyOnErrors) {
        await this.sendErrorNotification(jobId, error);
      }

    } finally {
      this.isRunning = false;
      await webScraperService.close();
    }
  }

  /**
   * Log job execution details
   */
  private async logJobExecution(jobId: string, details: any): Promise<void> {
    try {
      // In a real application, you might want to create a dedicated jobs table
      console.log(`📝 Logging job execution for ${jobId}:`, JSON.stringify(details, null, 2));
      
      // For now, we can store this in a simple way or extend the schema
      // await prisma.jobLog.create({ data: { jobId, details } });
      
    } catch (error) {
      console.error(`❌ Failed to log job execution for ${jobId}:`, error);
    }
  }

  /**
   * Log job error
   */
  private async logJobError(jobId: string, error: any): Promise<void> {
    try {
      console.log(`📝 Logging job error for ${jobId}:`, error.message);
      // await prisma.jobError.create({ data: { jobId, error: error.message } });
    } catch (logError) {
      console.error(`❌ Failed to log job error for ${jobId}:`, logError);
    }
  }

  /**
   * Send completion notification
   */
  private async sendCompletionNotification(jobId: string, summary: any): Promise<void> {
    try {
      const message = `
🎊 Competitor Scraping Job Completed

Job ID: ${jobId}
Duration: ${summary.duration.toFixed(2)} seconds
Success Rate: ${summary.successful}/${summary.total} (${((summary.successful / summary.total) * 100).toFixed(1)}%)
Completed at: ${new Date().toISOString()}
      `.trim();

      console.log(`🔔 Completion notification:\n${message}`);
      
      // In a real application, you could send email, Slack, etc.
      // await emailService.send({ subject: 'Scraping Job Completed', body: message });
      // await slackService.send({ channel: '#alerts', message });
      
    } catch (error) {
      console.error(`❌ Failed to send completion notification for ${jobId}:`, error);
    }
  }

  /**
   * Send error notification
   */
  private async sendErrorNotification(jobId: string, error: any): Promise<void> {
    try {
      const message = `
❌ Competitor Scraping Job Failed

Job ID: ${jobId}
Error: ${error.message}
Failed at: ${new Date().toISOString()}
Stack: ${error.stack}
      `.trim();

      console.log(`🚨 Error notification:\n${message}`);
      
      // In a real application, you could send email, Slack, etc.
      // await emailService.send({ subject: 'Scraping Job Failed', body: message });
      // await slackService.send({ channel: '#alerts', message });
      
    } catch (notifyError) {
      console.error(`❌ Failed to send error notification for ${jobId}:`, notifyError);
    }
  }

  /**
   * Stop a scheduled job
   */
  stopJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job) {
      job.stop();
      this.jobs.delete(jobId);
      console.log(`🛑 Stopped job: ${jobId}`);
      return true;
    }
    console.warn(`⚠️ Job ${jobId} not found`);
    return false;
  }

  /**
   * Start a stopped job
   */
  startJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job) {
      job.start();
      console.log(`▶️ Started job: ${jobId}`);
      return true;
    }
    console.warn(`⚠️ Job ${jobId} not found`);
    return false;
  }

  /**
   * List all scheduled jobs
   */
  listJobs(): Array<{ jobId: string; running: boolean }> {
    const jobList: Array<{ jobId: string; running: boolean }> = [];
    this.jobs.forEach((task, jobId) => {
      jobList.push({
        jobId,
        running: task.getStatus() === 'scheduled'
      });
    });
    return jobList;
  }

  /**
   * Stop all jobs
   */
  stopAllJobs(): void {
    this.jobs.forEach((task, jobId) => {
      task.stop();
      console.log(`🛑 Stopped job: ${jobId}`);
    });
    this.jobs.clear();
    console.log(`🛑 All jobs stopped`);
  }

  /**
   * Manually trigger a scraping job (useful for testing)
   */
  async triggerManualScraping(config: Partial<SchedulerConfig> = {}): Promise<void> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const jobId = `manual-scraping-${Date.now()}`;
    
    console.log(`🎯 Triggering manual scraping job: ${jobId}`);
    await this.executeScrapingJob(jobId, mergedConfig);
  }
}

// Singleton instance
export const scraperScheduler = new ScraperScheduler();

// Utility functions
export async function scheduleDaily(hour: number = 9, minute: number = 0): Promise<string> {
  return await scraperScheduler.scheduleCompetitorScraping({
    cronExpression: `${minute} ${hour} * * *`, // Daily at specified time
    enabled: true
  });
}

export async function scheduleWeekly(dayOfWeek: number = 1, hour: number = 9): Promise<string> {
  return await scraperScheduler.scheduleCompetitorScraping({
    cronExpression: `0 ${hour} * * ${dayOfWeek}`, // Weekly on specified day
    enabled: true
  });
}

export async function scheduleHourly(): Promise<string> {
  return await scraperScheduler.scheduleCompetitorScraping({
    cronExpression: '0 * * * *', // Every hour
    enabled: true
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down scraper scheduler...');
  scraperScheduler.stopAllJobs();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down scraper scheduler...');
  scraperScheduler.stopAllJobs();
  process.exit(0);
}); 