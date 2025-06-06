import { ReportData, ReportSection, ReportFile } from '@/types/report';

describe('Report Types (Step 3 - Shared Types)', () => {
  describe('ReportData Interface', () => {
    it('should accept a complete ReportData object', () => {
      const completeReport: ReportData = {
        id: 'test-123',
        title: 'Test Report',
        description: 'Test Description',
        projectName: 'Test Project',
        competitorName: 'Test Competitor',
        generatedAt: '2024-01-01T00:00:00Z',
        status: 'COMPLETED',
        metadata: {
          competitor: { url: 'https://example.com' },
          dateRange: { start: '2024-01-01', end: '2024-01-31' },
          analysisCount: 10,
          significantChanges: 3,
        },
        sections: [
          { title: 'Section 1', content: 'Content 1', order: 0 },
          { title: 'Section 2', content: 'Content 2', order: 1 },
        ],
        rawContent: 'Raw markdown content',
      };

      // Type checking - if this compiles without error, the interface is correct
      expect(completeReport.id).toBe('test-123');
      expect(completeReport.title).toBe('Test Report');
      expect(completeReport.sections).toHaveLength(2);
    });

    it('should accept a minimal ReportData object', () => {
      const minimalReport: ReportData = {};

      // All fields should be optional
      expect(minimalReport.id).toBeUndefined();
      expect(minimalReport.title).toBeUndefined();
      expect(minimalReport.sections).toBeUndefined();
    });

    it('should accept ReportData with only required business fields', () => {
      const businessReport: ReportData = {
        title: 'Business Report',
        projectName: 'Q1 Analysis',
        competitorName: 'Competitor A',
        generatedAt: '2024-01-01T00:00:00Z',
        status: 'COMPLETED',
      };

      expect(businessReport.title).toBe('Business Report');
      expect(businessReport.projectName).toBe('Q1 Analysis');
      expect(businessReport.status).toBe('COMPLETED');
    });

    it('should accept ReportData with partial metadata', () => {
      const partialMetadataReport: ReportData = {
        title: 'Partial Metadata Report',
        metadata: {
          competitor: { url: 'https://test.com' },
          // Other metadata fields are optional
        },
      };

      expect(partialMetadataReport.metadata?.competitor?.url).toBe('https://test.com');
      expect(partialMetadataReport.metadata?.analysisCount).toBeUndefined();
    });
  });

  describe('ReportSection Interface', () => {
    it('should accept a complete ReportSection object', () => {
      const section: ReportSection = {
        title: 'Executive Summary',
        content: 'This is the executive summary content with multiple paragraphs.',
        order: 0,
      };

      expect(section.title).toBe('Executive Summary');
      expect(section.content).toContain('executive summary');
      expect(section.order).toBe(0);
    });

    it('should require all ReportSection fields', () => {
      // TypeScript compilation will fail if any required field is missing
      const sections: ReportSection[] = [
        { title: 'Section 1', content: 'Content 1', order: 0 },
        { title: 'Section 2', content: 'Content 2', order: 1 },
        { title: 'Section 3', content: '', order: 2 }, // Empty content should be allowed
      ];

      expect(sections).toHaveLength(3);
      expect(sections[2].content).toBe('');
    });

    it('should support different order values', () => {
      const unorderedSections: ReportSection[] = [
        { title: 'Third', content: 'Content', order: 2 },
        { title: 'First', content: 'Content', order: 0 },
        { title: 'Second', content: 'Content', order: 1 },
      ];

      const sortedSections = unorderedSections.sort((a, b) => a.order - b.order);
      
      expect(sortedSections[0].title).toBe('First');
      expect(sortedSections[1].title).toBe('Second');
      expect(sortedSections[2].title).toBe('Third');
    });
  });

  describe('ReportFile Interface', () => {
    it('should accept a complete ReportFile object for database reports', () => {
      const databaseReport: ReportFile = {
        id: 'db-report-123',
        projectId: 'project-456',
        projectName: 'Test Project',
        title: 'Database Report',
        generatedAt: '2024-01-01T00:00:00Z',
        downloadUrl: '/api/reports/database/db-report-123',
        source: 'database',
        status: 'COMPLETED',
        competitorName: 'Test Competitor',
      };

      expect(databaseReport.source).toBe('database');
      expect(databaseReport.id).toBe('db-report-123');
      expect(databaseReport.filename).toBeUndefined(); // Not used for database reports
    });

    it('should accept a complete ReportFile object for file reports', () => {
      const fileReport: ReportFile = {
        filename: 'report-20240101.md',
        projectId: 'project-789',
        title: 'File Report',
        generatedAt: '2024-01-01T00:00:00Z',
        size: 2048,
        downloadUrl: '/api/reports/download?filename=report-20240101.md',
        source: 'file',
      };

      expect(fileReport.source).toBe('file');
      expect(fileReport.filename).toBe('report-20240101.md');
      expect(fileReport.size).toBe(2048);
      expect(fileReport.id).toBeUndefined(); // Not used for file reports
    });

    it('should accept minimal ReportFile with required fields only', () => {
      const minimalReport: ReportFile = {
        projectId: 'project-minimal',
        generatedAt: '2024-01-01T00:00:00Z',
        downloadUrl: '/api/reports/some-url',
        source: 'database',
      };

      expect(minimalReport.projectId).toBe('project-minimal');
      expect(minimalReport.source).toBe('database');
      expect(minimalReport.title).toBeUndefined();
    });

    it('should only accept valid source values', () => {
      const databaseReport: ReportFile = {
        projectId: 'test',
        generatedAt: '2024-01-01T00:00:00Z',
        downloadUrl: '/test',
        source: 'database',
      };

      const fileReport: ReportFile = {
        projectId: 'test',
        generatedAt: '2024-01-01T00:00:00Z',
        downloadUrl: '/test',
        source: 'file',
      };

      expect(databaseReport.source).toBe('database');
      expect(fileReport.source).toBe('file');
      
      // TypeScript would prevent invalid source values like:
      // source: 'invalid' // This would cause a compilation error
    });
  });

  describe('Type Compatibility', () => {
    it('should allow ReportData sections to use ReportSection interface', () => {
      const sections: ReportSection[] = [
        { title: 'Summary', content: 'Content', order: 0 },
        { title: 'Details', content: 'More content', order: 1 },
      ];

      const report: ReportData = {
        title: 'Compatible Report',
        sections: sections, // Should be compatible
      };

      expect(report.sections).toBe(sections);
      expect(report.sections?.[0].title).toBe('Summary');
    });

    it('should handle date string formats consistently', () => {
      const isoDate = '2024-01-01T00:00:00Z';
      const reportData: ReportData = {
        generatedAt: isoDate,
        metadata: {
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        },
      };

      const reportFile: ReportFile = {
        projectId: 'test',
        generatedAt: isoDate,
        downloadUrl: '/test',
        source: 'database',
      };

      expect(reportData.generatedAt).toBe(isoDate);
      expect(reportFile.generatedAt).toBe(isoDate);
      expect(reportData.metadata?.dateRange?.start).toBe('2024-01-01');
    });
  });

  describe('Optional Field Behavior', () => {
    it('should handle undefined optional fields properly', () => {
      const reportWithUndefinedFields: ReportData = {
        title: 'Test Report',
        description: undefined,
        metadata: undefined,
        sections: undefined,
      };

      expect(reportWithUndefinedFields.title).toBe('Test Report');
      expect(reportWithUndefinedFields.description).toBeUndefined();
      expect(reportWithUndefinedFields.metadata).toBeUndefined();
      expect(reportWithUndefinedFields.sections).toBeUndefined();
    });

    it('should handle empty arrays and objects', () => {
      const reportWithEmptyFields: ReportData = {
        title: 'Empty Fields Report',
        sections: [], // Empty array should be valid
        metadata: {
          // Empty metadata object should be valid
        },
      };

      expect(reportWithEmptyFields.sections).toEqual([]);
      expect(reportWithEmptyFields.metadata).toEqual({});
    });
  });
}); 