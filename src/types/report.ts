export interface ReportData {
  id?: string;
  title?: string;
  description?: string;
  projectName?: string;
  competitorName?: string;
  generatedAt?: string;
  status?: string;
  metadata?: {
    competitor?: { url?: string };
    dateRange?: { start: string; end: string };
    analysisCount?: number;
    significantChanges?: number;
  };
  sections?: Array<{
    title: string;
    content: string;
    order: number;
  }>;
  rawContent?: string;
}

export interface ReportSection {
  title: string;
  content: string;
  order: number;
}

export interface ReportFile {
  id?: string;
  filename?: string;
  projectId: string;
  projectName?: string;
  title?: string;
  generatedAt: string;
  size?: number;
  downloadUrl: string;
  source: 'database' | 'file';
  status?: string;
  competitorName?: string;
} 