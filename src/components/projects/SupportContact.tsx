'use client';

import React, { useState } from 'react';
import { ProjectCreationErrorState } from './ErrorHandling';

interface SupportContactProps {
  error?: ProjectCreationErrorState;
  projectId?: string;
  context?: string;
  onClose?: () => void;
}

export default function SupportContact({ 
  error, 
  projectId, 
  context = 'general',
  onClose 
}: SupportContactProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare support ticket data
      const supportData = {
        subject: `Issue Report: ${context}`,
        description,
        metadata: {
          errorCorrelationId: error?.supportInfo?.correlationId,
          errorCode: error?.supportInfo?.errorCode,
          errorType: error?.type,
          projectId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          technicalDetails: error?.technicalDetails
        }
      };

      // This would integrate with your support ticket system
      // For now, we'll simulate the API call
      console.log('Support ticket data:', supportData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit support ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-green-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-green-900">Support Request Submitted</h3>
            <p className="text-green-700 mt-1">
              We've received your report and will get back to you shortly.
            </p>
            {error?.supportInfo?.correlationId && (
              <p className="text-sm text-green-600 mt-2">
                Reference ID: <span className="font-mono">{error.supportInfo.correlationId}</span>
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 text-green-500 hover:text-green-700"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Contact Support</h3>
          <p className="text-sm text-gray-600 mt-1">
            Help us understand what went wrong so we can assist you better.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            What were you trying to do when the error occurred?
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            placeholder="Please describe what you were trying to accomplish and any steps that led to the error..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Error Context Information */}
        {error && (
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Error Information</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div>Error Type: <span className="font-mono">{error.type}</span></div>
              <div>Impact Level: <span className="font-mono">{error.userImpact}</span></div>
              {error.supportInfo?.errorCode && (
                <div>Error Code: <span className="font-mono">{error.supportInfo.errorCode}</span></div>
              )}
              {error.supportInfo?.correlationId && (
                <div>Reference ID: <span className="font-mono">{error.supportInfo.correlationId}</span></div>
              )}
              {projectId && (
                <div>Project ID: <span className="font-mono">{projectId}</span></div>
              )}
            </div>
          </div>
        )}

        {/* Alternative Contact Methods */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Alternative Contact Methods</h4>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Email: support@example.com
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              Phone: (555) 123-4567
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Live Chat: Available 9 AM - 5 PM EST
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 