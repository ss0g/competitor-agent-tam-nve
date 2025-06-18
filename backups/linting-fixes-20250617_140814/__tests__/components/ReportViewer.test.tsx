import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportViewer from '@/components/reports/ReportViewer';
import { ReportData } from '@/types/report';

describe('ReportViewer Component (Step 3)', () => {
  const mockReportData: ReportData = {
    id: 'test-report-123',
    title: 'Quarterly Competitor Analysis',
    description: 'Analysis of competitor activities for Q1 2024',
    projectName: 'Q1 2024 Analysis',
    competitorName: 'Acme Corp',
    generatedAt: '2024-01-15T10:30:00Z',
    status: 'COMPLETED',
    metadata: {
      competitor: { url: 'https://acme.com' },
      dateRange: { start: '2024-01-01', end: '2024-03-31' },
      analysisCount: 25,
      significantChanges: 5,
    },
    sections: [
      {
        title: 'Executive Summary',
        content: 'This is the executive summary.\n\n**Key points:**\n- Point 1\n- Point 2\n\n### Market Position\nStrong position in the market.',
        order: 0,
      },
      {
        title: 'Significant Changes',
        content: '1. First significant change\n2. Second significant change\n\n### Impact Analysis\nHigh impact expected.',
        order: 1,
      },
    ],
    rawContent: '# Quarterly Competitor Analysis\n\nFull raw content here...',
  };

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      const { container } = render(
        <ReportViewer report={mockReportData} className="custom-class" />
      );
      const article = container.querySelector('article');
      expect(article).toHaveClass('custom-class');
    });

    it('should have default styling classes', () => {
      const { container } = render(<ReportViewer report={mockReportData} />);
      const article = container.querySelector('article');
      expect(article).toHaveClass('bg-white', 'shadow-lg', 'rounded-lg', 'overflow-hidden');
    });
  });

  describe('Report Header', () => {
    it('should display report title', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('Quarterly Competitor Analysis')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quarterly Competitor Analysis');
    });

    it('should display report description', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('Analysis of competitor activities for Q1 2024')).toBeInTheDocument();
    });

    it('should display default title when title is missing', () => {
      const reportWithoutTitle = { ...mockReportData, title: undefined };
      render(<ReportViewer report={reportWithoutTitle} />);
      expect(screen.getByText('Untitled Report')).toBeInTheDocument();
    });

    it('should not render description if not provided', () => {
      const reportWithoutDescription = { ...mockReportData, description: undefined };
      render(<ReportViewer report={reportWithoutDescription} />);
      expect(screen.queryByText('Analysis of competitor activities for Q1 2024')).not.toBeInTheDocument();
    });
  });

  describe('Basic Metadata Display', () => {
    it('should display project name', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('Q1 2024 Analysis')).toBeInTheDocument();
      expect(screen.getByText('Project:')).toBeInTheDocument();
    });

    it('should display competitor name', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Competitor:')).toBeInTheDocument();
    });

    it('should display generated date', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('2024-01-15T10:30:00Z')).toBeInTheDocument();
      expect(screen.getByText('Generated:')).toBeInTheDocument();
    });

    it('should display status badge for completed reports', () => {
      render(<ReportViewer report={mockReportData} />);
      const statusBadge = screen.getByText('COMPLETED');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should display status badge for non-completed reports', () => {
      const reportInProgress = { ...mockReportData, status: 'IN_PROGRESS' };
      render(<ReportViewer report={reportInProgress} />);
      const statusBadge = screen.getByText('IN_PROGRESS');
      expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  describe('Enhanced Metadata Display', () => {
    it('should display competitor website as clickable link', () => {
      render(<ReportViewer report={mockReportData} />);
      const websiteLink = screen.getByText('https://acme.com');
      expect(websiteLink).toBeInTheDocument();
      expect(websiteLink.closest('a')).toHaveAttribute('href', 'https://acme.com');
      expect(websiteLink.closest('a')).toHaveAttribute('target', '_blank');
    });

    it('should display analysis period', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('Analysis Period:')).toBeInTheDocument();
      // Check for formatted dates
      expect(screen.getByText(/1\/1\/2024.*3\/31\/2024/)).toBeInTheDocument();
    });

    it('should display data points count', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('Data Points:')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should display significant changes count', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('Significant Changes:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not display metadata section if metadata is missing', () => {
      const reportWithoutMetadata = { ...mockReportData, metadata: undefined };
      render(<ReportViewer report={reportWithoutMetadata} />);
      expect(screen.queryByText('Website:')).not.toBeInTheDocument();
      expect(screen.queryByText('Analysis Period:')).not.toBeInTheDocument();
    });
  });

  describe('Sections Rendering', () => {
    it('should render all report sections', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      expect(screen.getByText('Significant Changes')).toBeInTheDocument();
    });

    it('should render section content', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('This is the executive summary.')).toBeInTheDocument();
      expect(screen.getByText('First significant change')).toBeInTheDocument();
    });

    it('should render sections as h2 headings', () => {
      render(<ReportViewer report={mockReportData} />);
      const executiveSummary = screen.getByRole('heading', { level: 2, name: 'Executive Summary' });
      expect(executiveSummary).toBeInTheDocument();
    });
  });

  describe('Content Processing', () => {
    it('should process bullet points into HTML lists', () => {
      render(<ReportViewer report={mockReportData} />);
      
      // Check for list items
      expect(screen.getByText('Point 1')).toBeInTheDocument();
      expect(screen.getByText('Point 2')).toBeInTheDocument();
      
      // Verify they are in a list structure
      const point1 = screen.getByText('Point 1');
      expect(point1.closest('li')).toBeInTheDocument();
      expect(point1.closest('ul')).toBeInTheDocument();
    });

    it('should process numbered lists into HTML ordered lists', () => {
      render(<ReportViewer report={mockReportData} />);
      
      expect(screen.getByText('First significant change')).toBeInTheDocument();
      expect(screen.getByText('Second significant change')).toBeInTheDocument();
      
      const firstChange = screen.getByText('First significant change');
      expect(firstChange.closest('li')).toBeInTheDocument();
      expect(firstChange.closest('ol')).toBeInTheDocument();
    });

    it('should process sub-headers (### and ####)', () => {
      render(<ReportViewer report={mockReportData} />);
      
      expect(screen.getByText('Market Position')).toBeInTheDocument();
      expect(screen.getByText('Impact Analysis')).toBeInTheDocument();
      
      const marketPosition = screen.getByText('Market Position');
      expect(marketPosition.tagName).toBe('H3');
    });

    it('should process bold text (**text**)', () => {
      render(<ReportViewer report={mockReportData} />);
      
      const keyPoints = screen.getByText('Key points:');
      expect(keyPoints.closest('strong')).toBeInTheDocument();
    });

    it('should render regular paragraphs', () => {
      render(<ReportViewer report={mockReportData} />);
      
      const summary = screen.getByText('This is the executive summary.');
      expect(summary.closest('p')).toBeInTheDocument();
    });
  });

  describe('Raw Content Fallback', () => {
    it('should display raw content when sections are not available', () => {
      const reportWithoutSections = {
        ...mockReportData,
        sections: undefined,
      };
      
      render(<ReportViewer report={reportWithoutSections} />);
      
      expect(screen.getByText(/# Quarterly Competitor Analysis/)).toBeInTheDocument();
      expect(screen.getByText(/Full raw content here/)).toBeInTheDocument();
    });

    it('should display raw content when sections array is empty', () => {
      const reportWithEmptySections = {
        ...mockReportData,
        sections: [],
      };
      
      render(<ReportViewer report={reportWithEmptySections} />);
      
      expect(screen.getByText(/# Quarterly Competitor Analysis/)).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('should display attribution text', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('This report was generated automatically by the Competitor Research Agent.')).toBeInTheDocument();
    });

    it('should display report ID when provided', () => {
      render(<ReportViewer report={mockReportData} />);
      expect(screen.getByText('Report ID: test-report-123')).toBeInTheDocument();
    });

    it('should not display report ID when not provided', () => {
      const reportWithoutId = { ...mockReportData, id: undefined };
      render(<ReportViewer report={reportWithoutId} />);
      expect(screen.queryByText(/Report ID:/)).not.toBeInTheDocument();
    });
  });

  describe('Section Separation', () => {
    it('should separate sections with proper styling', () => {
      const { container } = render(<ReportViewer report={mockReportData} />);
      const sections = container.querySelectorAll('section');
      
      sections.forEach((section, index) => {
        if (index < sections.length - 1) {
          expect(section).toHaveClass('border-b', 'border-gray-100', 'pb-8');
        } else {
          expect(section).toHaveClass('last:border-b-0', 'last:pb-0');
        }
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive metadata grid', () => {
      const { container } = render(<ReportViewer report={mockReportData} />);
      const metadataGrid = container.querySelector('[class*="grid-cols-1"][class*="md:grid-cols-2"]');
      expect(metadataGrid).toBeInTheDocument();
    });

    it('should have responsive enhanced metadata grid', () => {
      const { container } = render(<ReportViewer report={mockReportData} />);
      const enhancedGrid = container.querySelector('[class*="lg:grid-cols-3"]');
      expect(enhancedGrid).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const minimalReport: ReportData = {
        title: 'Minimal Report',
      };
      
      render(<ReportViewer report={minimalReport} />);
      
      expect(screen.getByText('Minimal Report')).toBeInTheDocument();
      expect(screen.queryByText('Project:')).not.toBeInTheDocument();
      expect(screen.queryByText('Competitor:')).not.toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      const emptyReport: ReportData = {
        title: 'Empty Report',
        sections: [
          { title: 'Empty Section', content: '', order: 0 },
        ],
      };
      
      render(<ReportViewer report={emptyReport} />);
      
      expect(screen.getByText('Empty Report')).toBeInTheDocument();
      expect(screen.getByText('Empty Section')).toBeInTheDocument();
    });
  });
}); 