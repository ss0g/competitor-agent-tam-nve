import { PrismaClient, ReportScheduleFrequency } from '@prisma/client';
import { ScraperScheduler, SchedulerConfig } from './scraperScheduler';
import { frequencyToCronExpression, frequencyToString } from '../utils/frequencyParser';

const prisma = new PrismaClient();

export class ProjectScrapingService {
  private scheduler: ScraperScheduler;
  private activeSchedules: Map<string, string> = new Map(); // projectId -> jobId

  constructor() {
    this.scheduler = new ScraperScheduler();
  }

  /**
   * Set up scraping schedule for a project based on its frequency
   */
  async scheduleProjectScraping(projectId: string): Promise<string | null> {
    try {
      // Get project details including frequency and competitors
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          competitors: {
            select: { id: true, name: true, website: true }
          }
        }
      });

      if (!project) {
        console.error(`Project ${projectId} not found`);
        return null;
      }

      if (!project.scrapingFrequency) {
        console.log(`Project ${projectId} has no scraping frequency set, skipping schedule`);
        return null;
      }

      if (project.competitors.length === 0) {
        console.log(`Project ${projectId} has no competitors assigned, skipping schedule`);
        return null;
      }

      console.log(`📅 Setting up scraping schedule for project: ${project.name}`);
      console.log(`🔄 Frequency: ${frequencyToString(project.scrapingFrequency)}`);
      console.log(`🏢 Competitors: ${project.competitors.length}`);

      // Create scheduler configuration
      const cronExpression = frequencyToCronExpression(project.scrapingFrequency);
      const competitorIds = project.competitors.map(c => c.id);

      const schedulerConfig: Partial<SchedulerConfig> = {
        enabled: true,
        cronExpression,
        competitorFilter: competitorIds,
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

      // Schedule the job
      const jobId = await this.scheduler.scheduleCompetitorScraping(schedulerConfig);

      // Store the mapping
      this.activeSchedules.set(projectId, jobId);

      // Update project parameters to include job info
      await prisma.project.update({
        where: { id: projectId },
        data: {
          parameters: {
            ...project.parameters as object,
            scrapingJobId: jobId,
            scrapingScheduled: true,
            scheduleCreatedAt: new Date().toISOString(),
            frequency: project.scrapingFrequency,
            cronExpression,
            competitorCount: competitorIds.length
          }
        }
      });

      console.log(`✅ Scraping schedule created for project ${project.name}`);
      console.log(`🆔 Job ID: ${jobId}`);
      console.log(`⏰ Schedule: ${frequencyToString(project.scrapingFrequency)} (${cronExpression})`);

      return jobId;

    } catch (error) {
      console.error(`❌ Failed to schedule scraping for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update scraping frequency for an existing project
   */
  async updateProjectFrequency(projectId: string, newFrequency: ReportScheduleFrequency): Promise<boolean> {
    try {
      console.log(`🔄 Updating scraping frequency for project ${projectId} to ${frequencyToString(newFrequency)}`);

      // Stop existing schedule if any
      await this.stopProjectScraping(projectId);

      // Update project frequency
      await prisma.project.update({
        where: { id: projectId },
        data: { scrapingFrequency: newFrequency }
      });

      // Create new schedule
      const jobId = await this.scheduleProjectScraping(projectId);

      return jobId !== null;

    } catch (error) {
      console.error(`❌ Failed to update frequency for project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Stop scraping schedule for a project
   */
  async stopProjectScraping(projectId: string): Promise<boolean> {
    try {
      const jobId = this.activeSchedules.get(projectId);
      
      if (jobId) {
        const stopped = this.scheduler.stopJob(jobId);
        if (stopped) {
          this.activeSchedules.delete(projectId);
          console.log(`⏹️ Stopped scraping schedule for project ${projectId}`);
          
          // Update project parameters
          const project = await prisma.project.findUnique({
            where: { id: projectId }
          });
          
          if (project) {
            await prisma.project.update({
              where: { id: projectId },
              data: {
                parameters: {
                  ...project.parameters as object,
                  scrapingScheduled: false,
                  scheduleStoppedAt: new Date().toISOString()
                }
              }
            });
          }
          
          return true;
        }
      }

      console.log(`⚠️ No active scraping schedule found for project ${projectId}`);
      return false;

    } catch (error) {
      console.error(`❌ Failed to stop scraping for project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Get scraping status for a project
   */
  async getProjectScrapingStatus(projectId: string): Promise<{
    isScheduled: boolean;
    jobId?: string;
    frequency?: ReportScheduleFrequency;
    cronExpression?: string;
    nextRun?: string;
    competitorCount?: number;
  }> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          competitors: { select: { id: true } }
        }
      });

      if (!project) {
        return { isScheduled: false };
      }

      const jobId = this.activeSchedules.get(projectId);
      const parameters = project.parameters as any;

      return {
        isScheduled: !!jobId && !!parameters?.scrapingScheduled,
        jobId,
        frequency: project.scrapingFrequency || undefined,
        cronExpression: parameters?.cronExpression,
        competitorCount: project.competitors.length
      };

    } catch (error) {
      console.error(`❌ Failed to get scraping status for project ${projectId}:`, error);
      return { isScheduled: false };
    }
  }

  /**
   * Initialize scraping for all existing projects that have frequencies set
   */
  async initializeAllProjectSchedules(): Promise<void> {
    try {
      console.log('🚀 Initializing scraping schedules for all projects...');

      const projects = await prisma.project.findMany({
        where: {
          scrapingFrequency: { not: null },
          status: { in: ['ACTIVE', 'DRAFT'] }
        },
        include: {
          competitors: { select: { id: true } }
        }
      });

      console.log(`📋 Found ${projects.length} projects with scraping frequencies`);

      let successful = 0;
      for (const project of projects) {
        try {
          const jobId = await this.scheduleProjectScraping(project.id);
          if (jobId) {
            successful++;
          }
        } catch (error) {
          console.error(`Failed to initialize schedule for project ${project.id}:`, error);
        }
      }

      console.log(`✅ Successfully initialized ${successful}/${projects.length} project schedules`);

    } catch (error) {
      console.error('❌ Failed to initialize project schedules:', error);
    }
  }

  /**
   * Trigger manual scraping for a project
   */
  async triggerManualProjectScraping(projectId: string): Promise<boolean> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          competitors: { select: { id: true } }
        }
      });

      if (!project) {
        console.error(`Project ${projectId} not found`);
        return false;
      }

      if (project.competitors.length === 0) {
        console.log(`Project ${projectId} has no competitors, skipping manual scraping`);
        return false;
      }

      console.log(`🔧 Triggering manual scraping for project: ${project.name}`);

      const competitorIds = project.competitors.map(c => c.id);
      
      await this.scheduler.triggerManualScraping({
        competitorFilter: competitorIds,
        scrapingOptions: {
          timeout: 30000,
          retries: 3,
          retryDelay: 2000,
          blockedResourceTypes: ['image', 'font', 'media']
        }
      });

      console.log(`✅ Manual scraping triggered for project ${project.name}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to trigger manual scraping for project ${projectId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const projectScrapingService = new ProjectScrapingService(); 