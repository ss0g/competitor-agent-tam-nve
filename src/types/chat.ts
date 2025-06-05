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
  expectedInputType: 'email' | 'text' | 'url' | 'json' | 'selection';
  projectId?: string;
  projectName?: string;
  isValidated?: boolean;
  databaseProjectCreated?: boolean;
  collectedData?: {
    userEmail?: string;
    reportFrequency?: string;
    reportName?: string;
    productName?: string;
    industry?: string;
    positioning?: string;
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