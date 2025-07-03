import { NextRequest, NextResponse } from 'next/server';
import { AWSCredentialsService } from '@/services/aws/awsCredentialsService';

const awsCredentialsService = new AWSCredentialsService();

export async function GET(request: NextRequest) {
  try {
    // Get force refresh parameter
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Get AWS credentials status
    const status = await awsCredentialsService.getCredentialsStatus(forceRefresh);
    const summary = awsCredentialsService.getStatusSummary(status);
    const errorMessage = awsCredentialsService.getErrorMessage(status);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: summary.status,
      configured: status.isConfigured,
      valid: status.isValid,
      region: status.region,
      message: summary.message,
      details: summary.details,
      errorMessage: status.isValid ? null : errorMessage,
      lastChecked: status.lastChecked.toISOString(),
      connectionTest: status.connectionTest ? {
        success: status.connectionTest.success,
        latency: status.connectionTest.latency,
        error: status.connectionTest.error
      } : null
    });

  } catch (error: any) {
    console.error('AWS health check failed:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      configured: false,
      valid: false,
      region: 'unknown',
      message: 'Health Check Failed',
      details: 'Unable to check AWS status',
      errorMessage: `Health check error: ${error.message}`,
      lastChecked: new Date().toISOString(),
      connectionTest: null
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Force refresh the status
    const status = await awsCredentialsService.getCredentialsStatus(true);
    const summary = awsCredentialsService.getStatusSummary(status);
    const errorMessage = awsCredentialsService.getErrorMessage(status);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: summary.status,
      configured: status.isConfigured,
      valid: status.isValid,
      region: status.region,
      message: summary.message,
      details: summary.details,
      errorMessage: status.isValid ? null : errorMessage,
      lastChecked: status.lastChecked.toISOString(),
      connectionTest: status.connectionTest ? {
        success: status.connectionTest.success,
        latency: status.connectionTest.latency,
        error: status.connectionTest.error
      } : null,
      refreshed: true
    });

  } catch (error: any) {
    console.error('AWS health refresh failed:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      configured: false,
      valid: false,
      region: 'unknown',
      message: 'Health Refresh Failed',
      details: 'Unable to refresh AWS status',
      errorMessage: `Health refresh error: ${error.message}`,
      lastChecked: new Date().toISOString(),
      connectionTest: null,
      refreshed: false
    }, { status: 500 });
  }
} 