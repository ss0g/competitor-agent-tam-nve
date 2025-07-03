'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProjectCreationWizard, { 
  ProjectFormData, 
  ReportGenerationInfo,
  ProjectCreationWizardProps 
} from '@/components/projects/ProjectCreationWizard';
import { ProjectCreationErrorState } from '@/components/projects/ErrorHandling';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function NewProject() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Set page title for E2E tests
  useEffect(() => {
    document.title = 'Create New Project - Competitor Research Agent';
    return () => {
      document.title = 'Competitor Research Agent';
    };
  }, []);

  const handleProjectCreated: ProjectCreationWizardProps['onProjectCreated'] = (
    projectId: string, 
    reportInfo?: ReportGenerationInfo
  ) => {
    setIsLoading(true);
    
    // If a report was generated, redirect to the report view
    if (reportInfo?.reportId) {
      setTimeout(() => {
        router.push(`/reports/${reportInfo.reportId}`);
      }, 1500);
    } else {
      // Otherwise, redirect to the project view
      setTimeout(() => {
        router.push(`/projects/${projectId}`);
      }, 1500);
    }
  };

  const handleWizardError: ProjectCreationWizardProps['onError'] = (error: ProjectCreationErrorState) => {
    console.error('Project creation wizard error:', error);
    // Error handling is managed by the wizard itself
    // We could add additional analytics/monitoring here if needed
  };

  // Load draft data if available
  const loadDraftData = (): Partial<ProjectFormData> | undefined => {
    try {
      // Check if we're running in the browser
      if (typeof window === 'undefined') {
        return undefined;
      }
      
      const draftData = localStorage.getItem('project_draft');
      if (draftData) {
        const parsed = JSON.parse(draftData);
        // Clear the draft after loading
        localStorage.removeItem('project_draft');
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to load draft data:', error);
      // Only clear localStorage if we're in the browser
      if (typeof window !== 'undefined') {
        localStorage.removeItem('project_draft'); // Clear corrupted data
      }
    }
    return undefined;
  };

  return (
    <ErrorBoundary
      context={{
        component: 'NewProjectPage',
        phase: 'project_creation'
      }}
      onError={(error, errorInfo) => {
        console.error('Project creation page error:', error, errorInfo);
        // Could send to analytics/monitoring service
      }}
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
            <p className="mt-2 text-lg text-gray-600">
              Set up your competitive analysis project with immediate report generation
            </p>
          </div>

          {/* Project Creation Wizard */}
          {(() => {
            const draftData = loadDraftData();
            return (
              <ProjectCreationWizard
                onProjectCreated={handleProjectCreated}
                onError={handleWizardError}
                {...(draftData ? { initialData: draftData } : {})}
              />
            );
          })()}

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              Need help? Check out our{' '}
              <a 
                href="/help/immediate-reports" 
                target="_blank" 
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                project creation guide
              </a>{' '}
              or{' '}
              <a 
                href="/support" 
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                contact support
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
} 