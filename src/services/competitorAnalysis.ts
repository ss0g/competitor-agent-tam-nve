import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas
export const competitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().url('Invalid website URL'),
  description: z.string().optional(),
  industry: z.string().min(1, 'Industry is required'),
  employeeCount: z.number().optional(),
  revenue: z.number().optional(),
  founded: z.number().optional(),
  headquarters: z.string().optional(),
  socialMedia: z.object({
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    twitter: z.string().url('Invalid Twitter URL').optional(),
    facebook: z.string().url('Invalid Facebook URL').optional(),
  }).optional(),
});

export type CompetitorData = z.infer<typeof competitorSchema>;

export class CompetitorAnalysisService {
  // Create a new competitor
  async createCompetitor(data: CompetitorData) {
    const validated = competitorSchema.parse(data);
    
    return prisma.competitor.create({
      data: {
        name: validated.name,
        website: validated.website,
        description: validated.description,
        industry: validated.industry,
        employeeCount: validated.employeeCount,
        revenue: validated.revenue,
        founded: validated.founded,
        headquarters: validated.headquarters,
        socialMedia: validated.socialMedia,
      },
    });
  }

  // Get competitor by ID
  async getCompetitor(id: string) {
    return prisma.competitor.findUnique({
      where: { id },
      include: {
        projects: true,
        reports: true,
      },
    });
  }

  // Update competitor
  async updateCompetitor(id: string, data: Partial<CompetitorData>) {
    const validated = competitorSchema.partial().parse(data);
    
    return prisma.competitor.update({
      where: { id },
      data: validated,
    });
  }

  // Delete competitor
  async deleteCompetitor(id: string) {
    return prisma.competitor.delete({
      where: { id },
    });
  }

  // List all competitors
  async listCompetitors(filters?: {
    industry?: string;
    search?: string;
  }) {
    const where = {
      ...(filters?.industry && { industry: filters.industry }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    return prisma.competitor.findMany({
      where,
      include: {
        projects: true,
        reports: true,
      },
    });
  }

  // Analyze competitor data
  async analyzeCompetitor(id: string) {
    const competitor = await this.getCompetitor(id);
    if (!competitor) {
      throw new Error('Competitor not found');
    }

    // Create a new analysis record
    const analysis = await prisma.analysis.create({
      data: {
        competitorId: id,
        data: {
          marketShare: this.calculateMarketShare(competitor),
          strengthsWeaknesses: this.analyzeStrengthsWeaknesses(competitor),
          opportunities: this.identifyOpportunities(competitor),
          threats: this.identifyThreats(competitor),
        },
        timestamp: new Date(),
      },
    });

    return analysis;
  }

  // Helper methods for analysis
  private calculateMarketShare(competitor: any) {
    // Implement market share calculation logic
    return {
      value: 0, // Placeholder
      trend: 'stable',
      confidence: 'medium',
    };
  }

  private analyzeStrengthsWeaknesses(competitor: any) {
    // Implement SWOT analysis logic
    return {
      strengths: [],
      weaknesses: [],
      confidence: 'medium',
    };
  }

  private identifyOpportunities(competitor: any) {
    // Implement opportunities analysis
    return {
      opportunities: [],
      confidence: 'medium',
    };
  }

  private identifyThreats(competitor: any) {
    // Implement threats analysis
    return {
      threats: [],
      confidence: 'medium',
    };
  }
} 