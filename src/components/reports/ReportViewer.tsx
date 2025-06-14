import React, { useEffect, JSX } from 'react';
import { ReportData } from '@/types/report';
import { useObservability } from '@/hooks/useObservability';

interface ReportViewerProps {
  report: ReportData;
  className?: string;
}

export default function ReportViewer({ report, className = '' }: ReportViewerProps) {
  // Initialize observability tracking
  const observability = useObservability({
    feature: 'report_viewer_component',
    userId: 'anonymous',
    sessionId: 'session_' + Date.now(),
  });

  // Track component render and report data
  useEffect(() => {
    if (report) {
      observability.logEvent('report_viewer_rendered', 'system_event', {
        reportTitle: report.title,
        sectionCount: report.sections?.length || 0,
        hasMetadata: !!(report.projectName || report.competitorName || report.generatedAt),
        contentLength: report.rawContent?.length || 0,
      });
    }
  }, [report, observability]);
  return (
    <article className={`bg-white shadow-lg rounded-lg overflow-hidden ${className}`}>
      {/* Report Header */}
      <div className="px-8 py-6 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {report.title || 'Untitled Report'}
        </h1>
        {report.description && (
          <p className="text-lg text-gray-600 mb-4">{report.description}</p>
        )}
        
        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
          {report.projectName && (
            <div>
              <span className="font-medium">Project:</span> {report.projectName}
            </div>
          )}
          {report.competitorName && (
            <div>
              <span className="font-medium">Competitor:</span> {report.competitorName}
            </div>
          )}
          {report.generatedAt && (
            <div>
              <span className="font-medium">Generated:</span> {report.generatedAt}
            </div>
          )}
          {report.status && (
            <div>
              <span className="font-medium">Status:</span> 
              <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                report.status === 'COMPLETED' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {report.status}
              </span>
            </div>
          )}
        </div>

        {/* Additional Metadata */}
        {report.metadata && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-500">
              {report.metadata.competitor?.url && (
                <div>
                  <span className="font-medium">Website:</span>{' '}
                  <a 
                    href={report.metadata.competitor.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                    onClick={() => {
                      observability.trackInteraction('click', 'competitor_website_link', {
                        reportTitle: report.title,
                        competitorUrl: report.metadata?.competitor?.url,
                      });
                    }}
                  >
                    {report.metadata.competitor.url}
                  </a>
                </div>
              )}
              {report.metadata.dateRange && (
                <div>
                  <span className="font-medium">Analysis Period:</span>{' '}
                  {new Date(report.metadata.dateRange.start).toLocaleDateString()} - {' '}
                  {new Date(report.metadata.dateRange.end).toLocaleDateString()}
                </div>
              )}
              {report.metadata.analysisCount && (
                <div>
                  <span className="font-medium">Data Points:</span> {report.metadata.analysisCount}
                </div>
              )}
              {report.metadata.significantChanges && (
                <div>
                  <span className="font-medium">Significant Changes:</span> {report.metadata.significantChanges}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="px-8 py-6">
        {report.sections && report.sections.length > 0 ? (
          // Structured sections
                     <div className="space-y-8">
             {report.sections.map((section, index) => (
               <ReportSectionComponent key={index} section={section} />
             ))}
           </div>
        ) : (
          // Raw markdown content
          <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {report.rawContent}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <p>
            This report was generated automatically by the Competitor Research Agent.
          </p>
          {report.id && (
            <p className="font-mono text-xs">
              Report ID: {report.id}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

interface ReportSectionProps {
  section: {
    title: string;
    content: string;
    order: number;
  };
}

function ReportSectionComponent({ section }: ReportSectionProps) {
  // Process content to handle markdown-like formatting
  const processContent = (content: string) => {
    const elements: JSX.Element[] = [];
    let elementIndex = 0;
    
    // Split content into lines and process more granularly
    const lines = content.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (!line) {
        i++;
        continue;
      }
      
      // Handle sub-headers (### or ####)
      if (line.startsWith('### ') || line.startsWith('#### ')) {
        const headerText = line.replace(/^#{3,4}\s+/, '');
        elements.push(
          <h3 key={elementIndex++} className="text-lg font-semibold text-gray-800 mt-6 mb-3">
            {headerText}
          </h3>
        );
        i++;
        continue;
      }
      
      // Handle bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const items: string[] = [];
        
        // Collect consecutive bullet points
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
          items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
          i++;
        }
        
        elements.push(
          <ul key={elementIndex++} className="list-disc list-inside space-y-1 mb-4">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="text-gray-700">
                {item}
              </li>
            ))}
          </ul>
        );
        continue;
      }
      
      // Handle numbered lists
      if (/^\d+\.\s/.test(line)) {
        const items: string[] = [];
        
        // Collect consecutive numbered items
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
          i++;
        }
        
        elements.push(
          <ol key={elementIndex++} className="list-decimal list-inside space-y-1 mb-4">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="text-gray-700">
                {item}
              </li>
            ))}
          </ol>
        );
        continue;
      }
      
      // Handle regular paragraphs
      const paragraphLines: string[] = [];
      
      // Collect lines until we hit an empty line or special formatting
      while (i < lines.length && lines[i].trim() && 
             !lines[i].trim().startsWith('### ') && 
             !lines[i].trim().startsWith('#### ') &&
             !lines[i].trim().startsWith('- ') && 
             !lines[i].trim().startsWith('* ') &&
             !/^\d+\.\s/.test(lines[i].trim())) {
        paragraphLines.push(lines[i].trim());
        i++;
      }
      
      if (paragraphLines.length > 0) {
        const paragraphText = paragraphLines.join(' ');
        const processedText = paragraphText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        elements.push(
          <p 
            key={elementIndex++} 
            className="text-gray-700 leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: processedText }}
          />
        );
      }
    }
    
    return elements;
  };

  return (
    <section className="border-b border-gray-100 pb-8 last:border-b-0 last:pb-0">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">
        {section.title}
      </h2>
      <div className="prose prose-lg max-w-none">
        {processContent(section.content)}
      </div>
    </section>
  );
} 