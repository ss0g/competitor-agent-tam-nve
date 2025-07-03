export const ERROR_MESSAGES = {
  // URL validation errors
  INVALID_URL_FOR_SCRAPING: 'Invalid URL format for scraping workflow',
  INVALID_PRODUCT_ID_FOR_SCRAPING: 'Invalid product ID for scraping workflow',
  INVALID_PROJECT_ID_FOR_SCRAPING: 'Invalid project ID for scraping workflow',
  
  // Analysis errors
  INVALID_ANALYSIS_INPUT: 'Invalid analysis input for workflow',
  ANALYSIS_MISSING_REQUIRED_FIELD: 'Analysis missing required field for reporting',
  
  // Template errors
  TEMPLATE_NOT_FOUND: 'Template with ID {{templateId}} not found',
  
  // Report generation errors
  REPORT_GENERATION_FAILED: 'Failed to generate report',
  
  // Service errors
  INCOMPLETE_PRODUCT_DATA: 'Incomplete product data in chat state',
  PRODUCT_NOT_FOUND: 'Product not found',
  
  // General validation errors
  MISSING_REQUIRED_FIELD: 'Missing required field: {{field}}',
  INVALID_INPUT_PARAMETERS: 'Invalid input parameters'
} as const;

// AWS Error Messages
export const AWS_ERROR_MESSAGES = {
  CREDENTIALS_NOT_CONFIGURED: {
    title: 'AWS Not Configured',
    message: 'AWS credentials are not configured. Comparative analysis is currently unavailable.',
    userAction: 'Please contact your system administrator to configure AWS credentials.',
    technical: 'Missing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_REGION environment variables'
  },
  CREDENTIALS_INVALID: {
    title: 'Invalid AWS Credentials',
    message: 'AWS credentials are invalid or have insufficient permissions.',
    userAction: 'Please refresh your AWS credentials or contact your administrator.',
    technical: 'AWS authentication failed with provided credentials'
  },
  CREDENTIALS_EXPIRED: {
    title: 'AWS Credentials Expired',
    message: 'Your AWS session has expired and needs to be refreshed.',
    userAction: 'Please refresh your AWS credentials to continue using comparative analysis.',
    technical: 'AWS session token has expired'
  },
  CONNECTION_FAILED: {
    title: 'AWS Connection Failed',
    message: 'Unable to connect to AWS services. This may be a temporary network issue.',
    userAction: 'Please check your internet connection and try again in a few moments.',
    technical: 'Network error connecting to AWS Bedrock service'
  },
  SERVICE_UNAVAILABLE: {
    title: 'AWS Service Unavailable',
    message: 'AWS Bedrock service is temporarily unavailable.',
    userAction: 'Please try again later. If the issue persists, contact support.',
    technical: 'AWS Bedrock service returned an error'
  },
  RATE_LIMITED: {
    title: 'Rate Limit Exceeded',
    message: 'Too many requests have been made to AWS services.',
    userAction: 'Please wait a few minutes before generating another comparative report.',
    technical: 'AWS API rate limit exceeded'
  },
  QUOTA_EXCEEDED: {
    title: 'AWS Quota Exceeded',
    message: 'Your AWS usage quota has been exceeded.',
    userAction: 'Please contact your administrator to increase your AWS service limits.',
    technical: 'AWS service quota or limit exceeded'
  },
  REGION_UNAVAILABLE: {
    title: 'AWS Region Unavailable',
    message: 'The configured AWS region is not available or does not support this service.',
    userAction: 'Please contact your administrator to configure a supported AWS region.',
    technical: 'AWS region not available for Bedrock service'
  }
} as const;

// Comparative Analysis Error Messages
export const ANALYSIS_ERROR_MESSAGES = {
  INSUFFICIENT_DATA: {
    title: 'Insufficient Data',
    message: 'Not enough data is available to perform comparative analysis.',
    userAction: 'Please ensure competitor snapshots are captured and try again.',
    technical: 'Missing or incomplete product/competitor snapshot data'
  },
  DATA_COLLECTION_FAILED: {
    title: 'Data Collection Failed',
    message: 'Unable to collect the required data for analysis.',
    userAction: 'Please check competitor URLs are accessible and try capturing snapshots again.',
    technical: 'Smart data collection service failed'
  },
  ANALYSIS_TIMEOUT: {
    title: 'Analysis Timeout',
    message: 'The analysis is taking longer than expected.',
    userAction: 'Please try again. For large datasets, consider using a smaller timeframe.',
    technical: 'Comparative analysis exceeded timeout threshold'
  },
  AI_SERVICE_ERROR: {
    title: 'AI Analysis Failed',
    message: 'The AI service encountered an error while processing your request.',
    userAction: 'Please try again. If the issue persists, contact support.',
    technical: 'AI service returned an error during analysis'
  },
  VALIDATION_ERROR: {
    title: 'Invalid Input Data',
    message: 'The provided data does not meet the requirements for analysis.',
    userAction: 'Please ensure all required fields are completed and data is valid.',
    technical: 'Input validation failed for comparative analysis'
  }
} as const;

// Report Generation Error Messages
export const REPORT_ERROR_MESSAGES = {
  GENERATION_FAILED: {
    title: 'Report Generation Failed',
    message: 'Unable to generate the requested report.',
    userAction: 'Please try again. If the issue persists, contact support.',
    technical: 'Report generation service encountered an error'
  },
  TEMPLATE_NOT_FOUND: {
    title: 'Report Template Error',
    message: 'The requested report template is not available.',
    userAction: 'Please select a different report template and try again.',
    technical: 'Report template not found or invalid'
  },
  SAVE_FAILED: {
    title: 'Report Save Failed',
    message: 'The report was generated but could not be saved.',
    userAction: 'Please try generating the report again.',
    technical: 'Database or file system error while saving report'
  }
} as const;

// Data Collection Error Messages
export const DATA_ERROR_MESSAGES = {
  SNAPSHOT_FAILED: {
    title: 'Snapshot Capture Failed',
    message: 'Unable to capture a snapshot of the competitor website.',
    userAction: 'Please check the website URL is correct and accessible, then try again.',
    technical: 'Website snapshot capture failed'
  },
  URL_INACCESSIBLE: {
    title: 'Website Unavailable',
    message: 'The competitor website is not accessible.',
    userAction: 'Please verify the URL is correct and the website is online.',
    technical: 'HTTP error or timeout accessing competitor URL'
  },
  CONTENT_EXTRACTION_FAILED: {
    title: 'Content Extraction Failed',
    message: 'Unable to extract meaningful content from the website.',
    userAction: 'The website may have protection measures. Please try a different URL or contact support.',
    technical: 'Content extraction or parsing failed'
  }
} as const;

// General Error Messages
export const GENERAL_ERROR_MESSAGES = {
  UNKNOWN_ERROR: {
    title: 'Unknown Error',
    message: 'An unexpected error occurred.',
    userAction: 'Please try again. If the issue persists, contact support.',
    technical: 'Unhandled exception or unexpected error condition'
  },
  NETWORK_ERROR: {
    title: 'Network Error',
    message: 'Unable to connect to the service.',
    userAction: 'Please check your internet connection and try again.',
    technical: 'Network connectivity issue'
  },
  SERVER_ERROR: {
    title: 'Server Error',
    message: 'The server encountered an error processing your request.',
    userAction: 'Please try again later. If the issue persists, contact support.',
    technical: 'Internal server error'
  }
} as const;

// Helper function to get user-friendly error message
export function getUserFriendlyError(errorType: string, errorMessage?: string) {
  // Check AWS errors first
  if (errorMessage?.toLowerCase().includes('credential')) {
    if (errorMessage.toLowerCase().includes('expired')) {
      return AWS_ERROR_MESSAGES.CREDENTIALS_EXPIRED;
    }
    if (errorMessage.toLowerCase().includes('invalid')) {
      return AWS_ERROR_MESSAGES.CREDENTIALS_INVALID;
    }
    return AWS_ERROR_MESSAGES.CREDENTIALS_NOT_CONFIGURED;
  }

  if (errorMessage?.toLowerCase().includes('rate limit') || errorMessage?.toLowerCase().includes('throttle')) {
    return AWS_ERROR_MESSAGES.RATE_LIMITED;
  }

  if (errorMessage?.toLowerCase().includes('quota') || errorMessage?.toLowerCase().includes('limit exceeded')) {
    return AWS_ERROR_MESSAGES.QUOTA_EXCEEDED;
  }

  if (errorMessage?.toLowerCase().includes('network') || errorMessage?.toLowerCase().includes('connection')) {
    return AWS_ERROR_MESSAGES.CONNECTION_FAILED;
  }

  // Check analysis errors
  if (errorType === 'INSUFFICIENT_DATA') {
    return ANALYSIS_ERROR_MESSAGES.INSUFFICIENT_DATA;
  }

  if (errorType === 'AI_SERVICE_ERROR') {
    return ANALYSIS_ERROR_MESSAGES.AI_SERVICE_ERROR;
  }

  if (errorType === 'VALIDATION_ERROR') {
    return ANALYSIS_ERROR_MESSAGES.VALIDATION_ERROR;
  }

  // Default to general error
  return GENERAL_ERROR_MESSAGES.UNKNOWN_ERROR;
}

// Helper function to format error for API response
export function formatErrorResponse(errorType: string, errorMessage?: string, correlationId?: string) {
  const friendlyError = getUserFriendlyError(errorType, errorMessage);
  
  return {
    error: {
      code: errorType,
      title: friendlyError.title,
      message: friendlyError.message,
      userAction: friendlyError.userAction,
      technical: friendlyError.technical,
      originalMessage: errorMessage,
      correlationId,
      timestamp: new Date().toISOString()
    }
  };
} 