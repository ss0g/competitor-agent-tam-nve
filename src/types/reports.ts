import { Analysis, Competitor } from '@prisma/client';

export interface ReportSection {
  title: string;
  content: string;
  type: 'summary' | 'changes' | 'trends' | 'recommendations';
  order: number;
}

export interface ReportMetadata {
  competitor: {
    name: string;
    url: string;
  };
  dateRange: {
    start: Date;
    end: Date;
  };
  analysisCount: number;
  significantChanges: number;
}

export interface ReportVersion {
  number: number;
  createdAt: Date;
  changeLog?: string;
}

export interface ReportData {
  title: string;
  description: string;
  sections: ReportSection[];
  metadata: ReportMetadata;
  version?: ReportVersion;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface ModelUsage {
  model: string;
  tokenUsage: TokenUsage;
}

export interface AnalysisResult {
  summary: string;
  keyChanges: string[];
  marketingChanges: string[];
  productChanges: string[];
  competitiveInsights: string[];
  suggestedActions: string[];
  confidence: {
    agreement: number;
    keyPointsOverlap: number;
  };
  tokenUsage: ModelUsage[];
}

export interface TrendAnalysis {
  category: string;
  trend: string;
  impact: number;
  confidence: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  validationErrors?: ValidationError[];
}

export interface CreateReportRequest {
  competitorId: string;
  timeframe: number;
  changeLog?: string;
}

export interface UpdateReportRequest {
  title?: string;
  description?: string;
  sections?: ReportSection[];
}

export interface GenerateAnalysisRequest {
  snapshotId: string;
  options?: {
    primaryModel?: string;
    secondaryModel?: string;
    maxTokens?: number;
    temperature?: number;
  };
} 