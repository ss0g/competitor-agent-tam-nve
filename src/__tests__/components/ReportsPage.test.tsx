import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportsPage from '@/app/reports/page';

// Mock fetch
global.fetch = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('ReportsPage - Read Report Feature (Step 1)', () => {
  const mockReports = [
    {
      id: 'report-1',
      filename: 'test-report.md',
      projectId: 'project-1',
      projectName: 'Test Project',
      title: 'Test Report',
      generatedAt: '2024-01-01T00:00:00Z',
      size: 1024,
      downloadUrl: '/api/reports/database/report-1',
      source: 'database' as const,
      status: 'COMPLETED',
      competitorName: 'Test Competitor',
    },
    {
      filename: 'file-report.md',
      projectId: 'project-2',
      title: 'File Report',
      generatedAt: '2024-01-02T00:00:00Z',
      size: 2048,
      downloadUrl: '/api/reports/download?filename=file-report.md',
      source: 'file' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reports: mockReports }),
    });
  });

  describe('Read Report Button Rendering', () => {
    it('should render "Read Report" button for each report', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const readButtons = screen.getAllByText('Read Report');
        expect(readButtons).toHaveLength(2);
      });
    });

    it('should render "Read Report" button with correct styling', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const readButton = screen.getAllByText('Read Report')[0];
        expect(readButton).toHaveClass('text-blue-700', 'bg-blue-50', 'hover:bg-blue-100');
      });
    });

    it('should render both "Read Report" and "Download" buttons', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Read Report')).toHaveLength(2);
        expect(screen.getAllByText('Download')).toHaveLength(2);
      });
    });
  });

  describe('Read Report Button Links', () => {
    it('should create correct href for database reports using report ID', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const readButtons = screen.getAllByText('Read Report');
        const firstButton = readButtons[0].closest('a');
        expect(firstButton).toHaveAttribute('href', '/reports/report-1');
      });
    });

    it('should create correct href for file reports using filename', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const readButtons = screen.getAllByText('Read Report');
        const secondButton = readButtons[1].closest('a');
        expect(secondButton).toHaveAttribute('href', '/reports/file-report.md');
      });
    });

    it('should open links in new tab', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const readButtons = screen.getAllByText('Read Report');
        readButtons.forEach(button => {
          const link = button.closest('a');
          expect(link).toHaveAttribute('target', '_blank');
          expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });
      });
    });
  });

  describe('Icons and Visual Elements', () => {
    it('should render Eye icon in Read Report button', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const readButtons = screen.getAllByText('Read Report');
        readButtons.forEach(button => {
          const icon = button.parentElement?.querySelector('svg');
          expect(icon).toBeInTheDocument();
        });
      });
    });

    it('should maintain Download button functionality', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const downloadButtons = screen.getAllByText('Download');
        const firstDownloadButton = downloadButtons[0].closest('a');
        expect(firstDownloadButton).toHaveAttribute('href', '/api/reports/database/report-1');
        expect(firstDownloadButton).toHaveAttribute('download');
      });
    });
  });

  describe('Button Positioning and Layout', () => {
    it('should position Read Report button before Download button', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const buttonContainer = screen.getAllByText('Read Report')[0]
          .closest('[class*="space-x-2"]');
        expect(buttonContainer).toBeInTheDocument();
        
        const buttons = buttonContainer?.querySelectorAll('a');
        expect(buttons?.[0]).toHaveTextContent('Read Report');
        expect(buttons?.[1]).toHaveTextContent('Download');
      });
    });

    it('should maintain proper spacing between buttons', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const container = screen.getAllByText('Read Report')[0]
          .closest('[class*="space-x-2"]');
        expect(container).toHaveClass('space-x-2');
      });
    });
  });

  describe('Error and Loading States', () => {
    it('should not show Read Report buttons during loading', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<ReportsPage />);
      
      expect(screen.queryByText('Read Report')).not.toBeInTheDocument();
      // The component shows a spinner - look for the element with animate-spin class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('rounded-full', 'border-b-2', 'border-blue-600');
    });

    it('should not show Read Report buttons when reports list is empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reports: [] }),
      });

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Read Report')).not.toBeInTheDocument();
        expect(screen.getByText('No reports yet')).toBeInTheDocument();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Read Report')).not.toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button text', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const readButtons = screen.getAllByText('Read Report');
        readButtons.forEach(button => {
          expect(button).toBeVisible();
          expect(button).toHaveTextContent('Read Report');
        });
      });
    });

    it('should have proper focus management', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const readButton = screen.getAllByText('Read Report')[0].closest('a');
        expect(readButton).toHaveClass('focus:outline-none', 'focus:ring-2');
      });
    });
  });
}); 