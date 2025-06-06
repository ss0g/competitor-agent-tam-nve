import { NextApiRequest, NextApiResponse } from 'next';
import { webScraperService } from '../../../services/webScraper';
import { scraperScheduler } from '../../../services/scraperScheduler';

interface ScrapeRequest {
  competitorIds?: string[];
  scrapingOptions?: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    blockedResourceTypes?: string[];
  };
  scheduleType?: 'manual' | 'scheduled';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { competitorIds, scrapingOptions, scheduleType = 'manual' }: ScrapeRequest = req.body;

    console.log('🌐 API: Starting competitor scraping');
    console.log(`📋 Competitor IDs: ${competitorIds?.length || 'all'}`);
    console.log(`🔧 Options: ${JSON.stringify(scrapingOptions)}`);

    if (scheduleType === 'manual') {
      // Manual immediate scraping
      await webScraperService.initialize();

      let snapshotIds: string[] = [];

      if (competitorIds && competitorIds.length > 0) {
        // Scrape specific competitors
        console.log(`🎯 Scraping specific competitors: ${competitorIds.join(', ')}`);
        
        for (const competitorId of competitorIds) {
          try {
            const snapshotId = await webScraperService.scrapeCompetitor(competitorId, scrapingOptions);
            snapshotIds.push(snapshotId);
          } catch (error) {
            console.error(`❌ Failed to scrape competitor ${competitorId}:`, error);
          }
        }
      } else {
        // Scrape all competitors
        console.log('🌐 Scraping all competitors');
        snapshotIds = await webScraperService.scrapeAllCompetitors(scrapingOptions);
      }

      await webScraperService.close();

      return res.status(200).json({
        success: true,
        message: `Successfully scraped ${snapshotIds.length} competitors`,
        snapshotIds,
        timestamp: new Date().toISOString()
      });

    } else if (scheduleType === 'scheduled') {
      // Schedule recurring scraping
      const jobId = await scraperScheduler.scheduleCompetitorScraping({
        scrapingOptions: scrapingOptions || {},
        competitorFilter: competitorIds,
        enabled: true
      });

      return res.status(200).json({
        success: true,
        message: 'Scraping job scheduled successfully',
        jobId,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(400).json({ error: 'Invalid schedule type' });

  } catch (error) {
    console.error('❌ API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
} 