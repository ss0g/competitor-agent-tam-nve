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