export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
  metadata?: {
    step?: number;
    stepType?: string;
    inputType?: string;
    projectId?: string;
  };
}

export interface ChatState {
  currentStep: number | null;
  stepDescription: string;
  expectedInputType: 'email' | 'text' | 'url' | 'json' | 'selection' | 'comprehensive_form';
  projectId?: string;
  projectName?: string;
  isValidated?: boolean;
  databaseProjectCreated?: boolean;
  useComprehensiveFlow?: boolean;
  collectedData?: {
    userEmail?: string;
    reportFrequency?: string;
    reportName?: string;
    // Enhanced PRODUCT data collection
    productName?: string;
    productUrl?: string;
    positioning?: string;
    customerData?: string;
    userProblem?: string;
    industry?: string;
    // Legacy fields for backward compatibility
    customerProblems?: string;
    businessChallenges?: string;
    competitors?: string[];
    customerDescription?: string;
  };
}

export interface ConversationSession {
  id: string;
  userId: string;
  projectId?: string;
  messages: Message[];
  chatState: ChatState;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatResponse {
  message: string;
  nextStep?: number;
  stepDescription?: string;
  expectedInputType?: ChatState['expectedInputType'];
  isComplete?: boolean;
  projectCreated?: boolean;
  error?: string;
}

export interface ComprehensiveProjectRequirements {
  // Required fields (9 total)
  userEmail: string;
  reportFrequency: string;
  projectName: string;
  productName: string;
  productUrl: string;
  industry: string;
  positioning: string;
  customerData: string;
  userProblem: string;
  
  // Optional enhancements
  competitorHints?: string[];
  focusAreas?: string[];
  reportTemplate?: string;
}

// Phase 4.1: Validation types for comprehensive validation
export interface ValidationError {
  field: string;
  type: 'required' | 'format' | 'length' | 'accessibility' | 'business_logic';
  message: string;
  suggestion: string;
}

export interface ValidationWarning {
  field: string;
  type: 'length' | 'accessibility' | 'consistency' | 'detail' | 'business_logic' | 'alignment';
  message: string;
  suggestion: string;
} 