import { createId } from '@paralleldrive/cuid2';
import { writeFile, readFile, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { logger } from '@/lib/logger';
import { 
  ComparativeReport, 
  ComparativeReportError,
  ReportGenerationResult 
} from '@/types/comparativeReport';

interface ComparativeReportRepository {
  create(report: ComparativeReport): Promise<ComparativeReport>;
  findById(id: string): Promise<ComparativeReport | null>;
  findByProjectId(projectId: string): Promise<ComparativeReport[]>;
  findByProductId(productId: string): Promise<ComparativeReport[]>;
  findByAnalysisId(analysisId: string): Promise<ComparativeReport | null>;
  update(id: string, updates: Partial<ComparativeReport>): Promise<ComparativeReport>;
  delete(id: string): Promise<void>;
  list(options?: {
    limit?: number;
    offset?: number;
    status?: ComparativeReport['status'];
    format?: ComparativeReport['format'];
  }): Promise<ComparativeReport[]>;
  saveReportFile(report: ComparativeReport, content: string): Promise<string>;
  getReportFile(reportId: string): Promise<string>;
}

export class FileBasedComparativeReportRepository implements ComparativeReportRepository {
  private readonly reportsDir: string;
  private readonly metadataDir: string;

  constructor(baseDir: string = 'reports/comparative') {
    this.reportsDir = join(process.cwd(), baseDir, 'content');
    this.metadataDir = join(process.cwd(), baseDir, 'metadata');
  }

  async create(report: ComparativeReport): Promise<ComparativeReport> {
    const context = { reportId: report.id, productId: report.productId };

    try {
      logger.info('Creating comparative report', context);

      // Ensure directories exist
      await this.ensureDirectoriesExist();

      // Save metadata
      await this.saveMetadata(report);

      // Generate and save report content
      const content = this.generateReportContent(report);
      await this.saveReportFile(report, content);

      logger.info('Comparative report created successfully', {
        ...context,
        sectionsCount: report.sections.length,
        format: report.format
      });

      return report;

    } catch (error) {
      logger.error('Failed to create comparative report', error as Error, context);
      throw new ComparativeReportError(
        `Failed to create report: ${(error as Error).message}`,
        'GENERATION_FAILED',
        { reportId: report.id }
      );
    }
  }

  async findById(id: string): Promise<ComparativeReport | null> {
    const context = { reportId: id };

    try {
      logger.debug('Finding comparative report by ID', context);

      const metadataPath = join(this.metadataDir, `${id}.json`);
      
      try {
        const metadataContent = await readFile(metadataPath, 'utf-8');
        const report = JSON.parse(metadataContent) as ComparativeReport;
        
        // Parse date fields
        report.createdAt = new Date(report.createdAt);
        report.updatedAt = new Date(report.updatedAt);
        report.metadata.analysisDate = new Date(report.metadata.analysisDate);
        report.metadata.reportGeneratedAt = new Date(report.metadata.reportGeneratedAt);

        logger.debug('Comparative report found', context);
        return report;

      } catch (fileError) {
        if ((fileError as NodeJS.ErrnoException).code === 'ENOENT') {
          logger.debug('Comparative report not found', context);
          return null;
        }
        throw fileError;
      }

    } catch (error) {
      logger.error('Failed to find comparative report', error as Error, context);
      throw new ComparativeReportError(
        `Failed to find report: ${(error as Error).message}`,
        'GENERATION_FAILED',
        { reportId: id }
      );
    }
  }

  async findByProjectId(projectId: string): Promise<ComparativeReport[]> {
    const context = { projectId };

    try {
      logger.debug('Finding comparative reports by project ID', context);

      const reports = await this.getAllReports();
      const projectReports = reports.filter(report => report.projectId === projectId);

      logger.debug('Found comparative reports for project', {
        ...context,
        count: projectReports.length
      });

      return projectReports;

    } catch (error) {
      logger.error('Failed to find reports by project ID', error as Error, context);
      throw new ComparativeReportError(
        `Failed to find reports for project: ${(error as Error).message}`,
        'GENERATION_FAILED',
        { projectId }
      );
    }
  }

  async findByProductId(productId: string): Promise<ComparativeReport[]> {
    const context = { productId };

    try {
      logger.debug('Finding comparative reports by product ID', context);

      const reports = await this.getAllReports();
      const productReports = reports.filter(report => report.productId === productId);

      logger.debug('Found comparative reports for product', {
        ...context,
        count: productReports.length
      });

      return productReports;

    } catch (error) {
      logger.error('Failed to find reports by product ID', error as Error, context);
      throw new ComparativeReportError(
        `Failed to find reports for product: ${(error as Error).message}`,
        'GENERATION_FAILED',
        { productId }
      );
    }
  }

  async findByAnalysisId(analysisId: string): Promise<ComparativeReport | null> {
    const context = { analysisId };

    try {
      logger.debug('Finding comparative report by analysis ID', context);

      const reports = await this.getAllReports();
      const analysisReport = reports.find(report => report.analysisId === analysisId);

      if (analysisReport) {
        logger.debug('Found comparative report for analysis', context);
      } else {
        logger.debug('No comparative report found for analysis', context);
      }

      return analysisReport || null;

    } catch (error) {
      logger.error('Failed to find report by analysis ID', error as Error, context);
      throw new ComparativeReportError(
        `Failed to find report for analysis: ${(error as Error).message}`,
        'GENERATION_FAILED',
        { analysisId }
      );
    }
  }

  async update(id: string, updates: Partial<ComparativeReport>): Promise<ComparativeReport> {
    const context = { reportId: id };

    try {
      logger.info('Updating comparative report', context);

      const existingReport = await this.findById(id);
      if (!existingReport) {
        throw new ComparativeReportError(
          `Report with ID ${id} not found`,
          'ANALYSIS_NOT_FOUND',
          { reportId: id }
        );
      }

      const updatedReport: ComparativeReport = {
        ...existingReport,
        ...updates,
        id, // Ensure ID cannot be changed
        updatedAt: new Date()
      };

      await this.saveMetadata(updatedReport);

      // If content changed, regenerate file
      if (updates.sections || updates.format) {
        const content = this.generateReportContent(updatedReport);
        await this.saveReportFile(updatedReport, content);
      }

      logger.info('Comparative report updated successfully', context);
      return updatedReport;

    } catch (error) {
      logger.error('Failed to update comparative report', error as Error, context);
      throw new ComparativeReportError(
        `Failed to update report: ${(error as Error).message}`,
        'GENERATION_FAILED',
        { reportId: id }
      );
    }
  }

  async delete(id: string): Promise<void> {
    const context = { reportId: id };

    try {
      logger.info('Deleting comparative report', context);

      const metadataPath = join(this.metadataDir, `${id}.json`);
      const contentPath = join(this.reportsDir, `${id}.md`);

      // Delete metadata file
      try {
        await readFile(metadataPath);
        await require('fs').promises.unlink(metadataPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      // Delete content file
      try {
        await readFile(contentPath);
        await require('fs').promises.unlink(contentPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      logger.info('Comparative report deleted successfully', context);

    } catch (error) {
      logger.error('Failed to delete comparative report', error as Error, context);
      throw new ComparativeReportError(
        `Failed to delete report: ${(error as Error).message}`,
        'GENERATION_FAILED',
        { reportId: id }
      );
    }
  }

  async list(options: {
    limit?: number;
    offset?: number;
    status?: ComparativeReport['status'];
    format?: ComparativeReport['format'];
  } = {}): Promise<ComparativeReport[]> {
    try {
      logger.debug('Listing comparative reports', { options });

      let reports = await this.getAllReports();

      // Apply filters
      if (options.status) {
        reports = reports.filter(report => report.status === options.status);
      }

      if (options.format) {
        reports = reports.filter(report => report.format === options.format);
      }

      // Sort by creation date (newest first)
      reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      const paginatedReports = reports.slice(offset, offset + limit);

      logger.debug('Listed comparative reports', {
        totalCount: reports.length,
        returnedCount: paginatedReports.length,
        offset,
        limit
      });

      return paginatedReports;

    } catch (error) {
      logger.error('Failed to list comparative reports', error as Error);
      throw new ComparativeReportError(
        `Failed to list reports: ${(error as Error).message}`,
        'GENERATION_FAILED'
      );
    }
  }

  async saveReportFile(report: ComparativeReport, content: string): Promise<string> {
    const context = { reportId: report.id, format: report.format };

    try {
      logger.debug('Saving report content file', context);

      await this.ensureDirectoriesExist();

      const extension = this.getFileExtension(report.format);
      const filename = `${report.id}${extension}`;
      const filepath = join(this.reportsDir, filename);

      await writeFile(filepath, content, 'utf-8');

      // Update report with download URL
      const downloadUrl = `/api/reports/comparative/${report.id}/download`;
      await this.update(report.id, { downloadUrl });

      logger.debug('Report content file saved successfully', {
        ...context,
        filepath,
        contentLength: content.length
      });

      return filepath;

    } catch (error) {
      logger.error('Failed to save report content file', error as Error, context);
      throw new ComparativeReportError(
        `Failed to save report file: ${(error as Error).message}`,
        'GENERATION_FAILED',
        { reportId: report.id }
      );
    }
  }

  async getReportFile(reportId: string): Promise<string> {
    const context = { reportId };

    try {
      logger.debug('Getting report content file', context);

      // Try different extensions
      const extensions = ['.md', '.html', '.pdf'];
      
      for (const ext of extensions) {
        const filepath = join(this.reportsDir, `${reportId}${ext}`);
        
        try {
          const content = await readFile(filepath, 'utf-8');
          logger.debug('Report content file found', { ...context, extension: ext });
          return content;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }

      throw new ComparativeReportError(
        `Report content file not found for ID ${reportId}`,
        'ANALYSIS_NOT_FOUND',
        { reportId }
      );

    } catch (error) {
      logger.error('Failed to get report content file', error as Error, context);
      throw error;
    }
  }

  private async getAllReports(): Promise<ComparativeReport[]> {
    try {
      await this.ensureDirectoriesExist();

      const files = await readdir(this.metadataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      const reports: ComparativeReport[] = [];

      for (const file of jsonFiles) {
        try {
          const filepath = join(this.metadataDir, file);
          const content = await readFile(filepath, 'utf-8');
          const report = JSON.parse(content) as ComparativeReport;
          
          // Parse date fields
          report.createdAt = new Date(report.createdAt);
          report.updatedAt = new Date(report.updatedAt);
          report.metadata.analysisDate = new Date(report.metadata.analysisDate);
          report.metadata.reportGeneratedAt = new Date(report.metadata.reportGeneratedAt);

          reports.push(report);
        } catch (error) {
          logger.warn('Failed to parse report metadata file', { file, error: (error as Error).message });
        }
      }

      return reports;

    } catch (error) {
      logger.error('Failed to get all reports', error as Error);
      throw error;
    }
  }

  private async saveMetadata(report: ComparativeReport): Promise<void> {
    const metadataPath = join(this.metadataDir, `${report.id}.json`);
    const metadataContent = JSON.stringify(report, null, 2);
    await writeFile(metadataPath, metadataContent, 'utf-8');
  }

  private generateReportContent(report: ComparativeReport): string {
    if (report.format === 'markdown') {
      return this.generateMarkdownContent(report);
    } else if (report.format === 'html') {
      return this.generateHtmlContent(report);
    } else {
      return this.generateMarkdownContent(report); // Default to markdown
    }
  }

  private generateMarkdownContent(report: ComparativeReport): string {
    const sections = report.sections
      .sort((a, b) => a.order - b.order)
      .map(section => section.content)
      .join('\n\n---\n\n');

    return `---
title: "${report.title}"
description: "${report.description}"
generated: ${report.createdAt.toISOString()}
product: "${report.metadata.productName}"
competitors: ${report.metadata.competitorCount}
confidence: ${report.metadata.confidenceScore}%
---

${sections}

---

## Report Metadata

- **Product:** ${report.metadata.productName}
- **Analysis Date:** ${report.metadata.analysisDate.toLocaleDateString()}
- **Report Generated:** ${report.metadata.reportGeneratedAt.toLocaleDateString()}
- **Competitors Analyzed:** ${report.metadata.competitorCount}
- **Confidence Score:** ${report.metadata.confidenceScore}%
- **Data Quality:** ${report.metadata.dataQuality}
- **Analysis Method:** ${report.metadata.analysisMethod}
- **Focus Areas:** ${report.metadata.focusAreas.join(', ')}
- **Analysis Depth:** ${report.metadata.analysisDepth}

---

*Report generated by Competitor Research Agent v${report.metadata.reportVersion}*
`;
  }

  private generateHtmlContent(report: ComparativeReport): string {
    const sections = report.sections
      .sort((a, b) => a.order - b.order)
      .map(section => `<section class="report-section">
        <h2>${section.title}</h2>
        <div class="section-content">${this.markdownToHtml(section.content)}</div>
      </section>`)
      .join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <title>${report.title}</title>
  <meta charset="utf-8">
  <meta name="description" content="${report.description}">
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .report-header { border-bottom: 2px solid #333; margin-bottom: 30px; }
    .report-section { margin-bottom: 40px; }
    .section-content { margin-top: 20px; }
    .metadata { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-top: 40px; }
    h1, h2, h3 { color: #333; }
    .confidence-score { font-size: 24px; font-weight: bold; color: #2d5aa0; }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${report.title}</h1>
    <p>${report.description}</p>
    <div class="confidence-score">Confidence: ${report.metadata.confidenceScore}%</div>
  </div>
  
  ${sections}
  
  <div class="metadata">
    <h3>Report Metadata</h3>
    <ul>
      <li><strong>Product:</strong> ${report.metadata.productName}</li>
      <li><strong>Analysis Date:</strong> ${report.metadata.analysisDate.toLocaleDateString()}</li>
      <li><strong>Report Generated:</strong> ${report.metadata.reportGeneratedAt.toLocaleDateString()}</li>
      <li><strong>Competitors Analyzed:</strong> ${report.metadata.competitorCount}</li>
      <li><strong>Data Quality:</strong> ${report.metadata.dataQuality}</li>
      <li><strong>Analysis Method:</strong> ${report.metadata.analysisMethod}</li>
      <li><strong>Focus Areas:</strong> ${report.metadata.focusAreas.join(', ')}</li>
      <li><strong>Analysis Depth:</strong> ${report.metadata.analysisDepth}</li>
    </ul>
  </div>

  <footer style="margin-top: 40px; text-align: center; color: #666;">
    <p><em>Report generated by Competitor Research Agent v${report.metadata.reportVersion}</em></p>
  </footer>
</body>
</html>`;
  }

  private markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion (in production, use a proper markdown parser)
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/gim, '<br>');
  }

  private getFileExtension(format: ComparativeReport['format']): string {
    switch (format) {
      case 'html': return '.html';
      case 'pdf': return '.pdf';
      case 'markdown':
      default: return '.md';
    }
  }

  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await mkdir(this.reportsDir, { recursive: true });
      await mkdir(this.metadataDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

// Default export
export const comparativeReportRepository = new FileBasedComparativeReportRepository(); 