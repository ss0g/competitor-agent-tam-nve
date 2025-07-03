export interface AWSError {
  code: string;
  message: string;
  statusCode?: number;
  retryable?: boolean;
  service?: string;
  operation?: string;
  requestId?: string;
}

export interface AWSConnectionError extends AWSError {
  code: 'AWS_CONNECTION_ERROR';
  latency?: number;
  region?: string;
}

export interface AWSCredentialsError extends AWSError {
  code: 'AWS_CREDENTIALS_ERROR';
  credentialType: 'missing' | 'invalid' | 'expired';
  missingFields?: string[];
}

export interface AWSServiceError extends AWSError {
  code: 'AWS_SERVICE_ERROR';
  service: 'bedrock' | 's3' | 'lambda' | 'other';
  modelId?: string;
}

export interface AWSQuotaError extends AWSError {
  code: 'AWS_QUOTA_ERROR';
  quotaType: 'rate_limit' | 'token_limit' | 'request_limit';
  retryAfter?: number;
}

export interface AWSRegionError extends AWSError {
  code: 'AWS_REGION_ERROR';
  region: string;
  availableRegions?: string[];
}

export type AWSErrorType = 
  | AWSConnectionError 
  | AWSCredentialsError 
  | AWSServiceError 
  | AWSQuotaError 
  | AWSRegionError;

export interface AWSErrorContext {
  operation: string;
  timestamp: Date;
  correlationId?: string;
  userAction?: string;
  recoverySteps?: string[];
}

export interface AWSErrorResponse {
  error: AWSErrorType;
  context: AWSErrorContext;
  userMessage: string;
  technicalMessage: string;
  canRetry: boolean;
  suggestedAction: string;
}

// Error classification helpers
export const AWS_ERROR_CODES = {
  CONNECTION: 'AWS_CONNECTION_ERROR',
  CREDENTIALS: 'AWS_CREDENTIALS_ERROR', 
  SERVICE: 'AWS_SERVICE_ERROR',
  QUOTA: 'AWS_QUOTA_ERROR',
  REGION: 'AWS_REGION_ERROR'
} as const;

export const AWS_ERROR_PATTERNS = {
  CREDENTIALS_INVALID: /invalid.*(credential|key|token)/i,
  CREDENTIALS_EXPIRED: /expired.*(credential|key|token)/i,
  RATE_LIMIT: /throttling|rate.?limit|too.?many.?requests/i,
  QUOTA_EXCEEDED: /quota.?exceeded|limit.?exceeded/i,
  REGION_UNAVAILABLE: /region.*not.*available|invalid.*region/i,
  NETWORK_ERROR: /network|timeout|connection.*refused|dns/i,
  UNAUTHORIZED: /unauthorized|access.?denied|forbidden/i
} as const;

// Error factory functions
export function createAWSConnectionError(
  message: string, 
  latency?: number,
  region?: string
): AWSConnectionError {
  return {
    code: AWS_ERROR_CODES.CONNECTION,
    message,
    retryable: true,
    service: 'aws',
    statusCode: 503,
    ...(latency !== undefined && { latency }),
    ...(region !== undefined && { region })
  };
}

export function createAWSCredentialsError(
  message: string,
  credentialType: 'missing' | 'invalid' | 'expired',
  missingFields?: string[]
): AWSCredentialsError {
  return {
    code: AWS_ERROR_CODES.CREDENTIALS,
    message,
    credentialType,
    retryable: false,
    service: 'aws',
    statusCode: 401,
    ...(missingFields !== undefined && { missingFields })
  };
}

export function createAWSServiceError(
  message: string,
  service: 'bedrock' | 's3' | 'lambda' | 'other',
  modelId?: string
): AWSServiceError {
  return {
    code: AWS_ERROR_CODES.SERVICE,
    message,
    service,
    retryable: true,
    statusCode: 500,
    ...(modelId !== undefined && { modelId })
  };
}

// Error classification function
export function classifyAWSError(error: Error): AWSErrorType {
  const message = error.message.toLowerCase();

  if (AWS_ERROR_PATTERNS.CREDENTIALS_INVALID.test(message)) {
    return createAWSCredentialsError(error.message, 'invalid');
  }

  if (AWS_ERROR_PATTERNS.CREDENTIALS_EXPIRED.test(message)) {
    return createAWSCredentialsError(error.message, 'expired');
  }

  if (AWS_ERROR_PATTERNS.RATE_LIMIT.test(message) || AWS_ERROR_PATTERNS.QUOTA_EXCEEDED.test(message)) {
    return {
      code: AWS_ERROR_CODES.QUOTA,
      message: error.message,
      quotaType: 'rate_limit',
      retryable: true,
      service: 'aws',
      statusCode: 429
    };
  }

  if (AWS_ERROR_PATTERNS.REGION_UNAVAILABLE.test(message)) {
    return {
      code: AWS_ERROR_CODES.REGION,
      message: error.message,
      region: 'unknown',
      retryable: false,
      service: 'aws',
      statusCode: 400
    };
  }

  if (AWS_ERROR_PATTERNS.NETWORK_ERROR.test(message)) {
    return createAWSConnectionError(error.message);
  }

  // Default to service error
  return createAWSServiceError(error.message, 'other');
} 