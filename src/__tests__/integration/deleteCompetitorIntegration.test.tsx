import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DeleteCompetitorButton from '@/components/competitors/DeleteCompetitorButton';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

describe('Delete Competitor Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Complete Delete Flow', () => {
    const defaultProps = {
      competitorId: 'test-competitor-id',
      competitorName: 'Test Competitor',
    };

    it('should complete successful deletion flow with API integration', async () => {
      // Mock successful API response
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          message: 'Competitor deleted successfully',
          deletedCompetitor: {
            id: 'test-competitor-id',
            name: 'Test Competitor'
          },
          relatedDataCount: {
            reports: 2,
            snapshots: 5
          },
          correlationId: 'test-correlation-id'
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockApiResponse);

      render(<DeleteCompetitorButton {...defaultProps} />);

      // Step 1: Click delete button to open modal
      const deleteButton = screen.getByRole('button', { name: /delete competitor/i });
      fireEvent.click(deleteButton);

      // Step 2: Verify modal opens with correct content
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Competitor')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      expect(screen.getByText(/Test Competitor/)).toBeInTheDocument();

      // Step 3: Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      fireEvent.click(confirmButton);

      // Step 4: Verify API call is made with correct parameters
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/competitors/test-competitor-id', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });

      // Step 5: Verify navigation after successful deletion
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/competitors');
        expect(mockRouter.refresh).toHaveBeenCalled();
      });

      // Step 6: Verify modal closes after successful deletion
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle API error responses gracefully', async () => {
      // Mock error API response (404 - competitor not found)
      const mockErrorResponse = {
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Competitor not found',
          message: 'No competitor found with ID: test-competitor-id',
          correlationId: 'error-correlation-id'
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockErrorResponse);

      const mockOnDeleteError = jest.fn();

      render(
        <DeleteCompetitorButton 
          {...defaultProps} 
          onDeleteError={mockOnDeleteError}
        />
      );

      // Open modal and confirm deletion
      const deleteButton = screen.getByRole('button', { name: /delete competitor/i });
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      fireEvent.click(confirmButton);

      // Verify error handling
      await waitFor(() => {
        expect(mockOnDeleteError).toHaveBeenCalledWith('Competitor not found');
      });

      // Verify modal stays open on error
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle network errors', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const mockOnDeleteError = jest.fn();

      render(
        <DeleteCompetitorButton 
          {...defaultProps} 
          onDeleteError={mockOnDeleteError}
        />
      );

      // Open modal and confirm deletion
      const deleteButton = screen.getByRole('button', { name: /delete competitor/i });
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      fireEvent.click(confirmButton);

      // Verify network error handling
      await waitFor(() => {
        expect(mockOnDeleteError).toHaveBeenCalledWith(
          'Network error occurred. Please check your connection and try again.'
        );
      });
    });
  });

  describe('Callback Functions', () => {
    const defaultProps = {
      competitorId: 'test-competitor-id',
      competitorName: 'Test Competitor',
    };

    it('should call onDeleteSuccess callback after successful deletion', async () => {
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          message: 'Competitor deleted successfully',
          correlationId: 'test-correlation-id'
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockApiResponse);

      const mockOnDeleteSuccess = jest.fn();

      render(
        <DeleteCompetitorButton 
          {...defaultProps} 
          onDeleteSuccess={mockOnDeleteSuccess}
        />
      );

      // Open modal and confirm deletion
      const deleteButton = screen.getByRole('button', { name: /delete competitor/i });
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      fireEvent.click(confirmButton);

      // Verify success callback is called
      await waitFor(() => {
        expect(mockOnDeleteSuccess).toHaveBeenCalled();
      });
    });
  });
}); 