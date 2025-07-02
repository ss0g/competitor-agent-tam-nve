/**
 * Prometheus Metrics Endpoint for Initial Reports Monitoring
 * Phase 5.2.1: Production monitoring setup
 * 
 * Exposes metrics in Prometheus format for scraping by Prometheus server
 */

import { NextRequest, NextResponse } from 'next/server';
import InitialReportMonitoringService from '../../../../../services/monitoring/initialReportMonitoringService';
import { generateCorrelationId } from '../../../../../lib/logger';

const monitoringService = new InitialReportMonitoringService();

export async function GET(_request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = performance.now();
  
  try {
    console.log(`[${correlationId}] Generating Prometheus metrics for initial reports`);

    // Get dashboard metrics with 1 hour timeframe for real-time monitoring
    const dashboardData = await monitoringService.getDashboardMetrics('1h');
    const { overview, realTimeMetrics } = dashboardData;

    // Convert metrics to Prometheus format
    const prometheusMetrics = [
      // System Health (0=CRITICAL, 1=WARNING, 2=HEALTHY)
      `# HELP initial_reports_system_health System health status (0=CRITICAL, 1=WARNING, 2=HEALTHY)`,
      `# TYPE initial_reports_system_health gauge`,
      `initial_reports_system_health ${getHealthScore(overview.systemHealth)}`,
      '',

      // Generation Success Rate
      `# HELP initial_reports_generation_success_rate Percentage of successful initial report generations`,
      `# TYPE initial_reports_generation_success_rate gauge`,
      `initial_reports_generation_success_rate ${realTimeMetrics.generationSuccessRate}`,
      '',

      // Generation Times
      `# HELP initial_reports_avg_generation_time Average generation time in milliseconds`,
      `# TYPE initial_reports_avg_generation_time gauge`,
      `initial_reports_avg_generation_time ${realTimeMetrics.averageGenerationTime}`,
      '',

      `# HELP initial_reports_peak_generation_time Peak generation time in milliseconds`,
      `# TYPE initial_reports_peak_generation_time gauge`,
      `initial_reports_peak_generation_time ${realTimeMetrics.peakGenerationTime}`,
      '',

      // Active Reports
      `# HELP initial_reports_active_count Number of currently active initial reports`,
      `# TYPE initial_reports_active_count gauge`,
      `initial_reports_active_count ${overview.activeInitialReports}`,
      '',

      // Data Quality Metrics
      `# HELP initial_reports_fresh_data_utilization Percentage of reports using fresh snapshot data`,
      `# TYPE initial_reports_fresh_data_utilization gauge`,
      `initial_reports_fresh_data_utilization ${realTimeMetrics.freshDataUtilization}`,
      '',

      `# HELP initial_reports_snapshot_capture_success_rate Percentage of successful snapshot captures`,
      `# TYPE initial_reports_snapshot_capture_success_rate gauge`,
      `initial_reports_snapshot_capture_success_rate ${realTimeMetrics.snapshotCaptureSuccessRate}`,
      '',

      `# HELP initial_reports_fallback_usage_rate Percentage of reports using fallback data`,
      `# TYPE initial_reports_fallback_usage_rate gauge`,
      `initial_reports_fallback_usage_rate ${realTimeMetrics.fallbackUsageRate}`,
      '',

      // User Experience Metrics
      `# HELP initial_reports_user_satisfaction_score User satisfaction score (1-5 scale)`,
      `# TYPE initial_reports_user_satisfaction_score gauge`,
      `initial_reports_user_satisfaction_score ${realTimeMetrics.userSatisfactionScore}`,
      '',

      `# HELP initial_reports_report_view_rate Percentage of generated reports that are viewed`,
      `# TYPE initial_reports_report_view_rate gauge`,
      `initial_reports_report_view_rate ${realTimeMetrics.reportViewRate}`,
      '',

      `# HELP initial_reports_retry_attempt_rate Percentage of reports requiring retry`,
      `# TYPE initial_reports_retry_attempt_rate gauge`,
      `initial_reports_retry_attempt_rate ${realTimeMetrics.retryAttemptRate}`,
      '',

      // Resource Metrics
      `# HELP initial_reports_resource_utilization System resource utilization percentage`,
      `# TYPE initial_reports_resource_utilization gauge`,
      `initial_reports_resource_utilization ${realTimeMetrics.resourceUtilization}`,
      '',

      `# HELP initial_reports_rate_limit_trigger_frequency Rate limiting trigger frequency`,
      `# TYPE initial_reports_rate_limit_trigger_frequency gauge`,
      `initial_reports_rate_limit_trigger_frequency ${realTimeMetrics.rateLimitTriggerFrequency}`,
      '',

      // Cost Metrics
      `# HELP initial_reports_cost_per_report Cost per report in USD`,
      `# TYPE initial_reports_cost_per_report gauge`,
      `initial_reports_cost_per_report ${realTimeMetrics.costPerReport}`,
      '',

      `# HELP initial_reports_daily_cost_estimate Estimated daily cost in USD`,
      `# TYPE initial_reports_daily_cost_estimate gauge`,
      `initial_reports_daily_cost_estimate ${realTimeMetrics.costPerReport * overview.totalInitialReportsGenerated}`,
      '',

      // Overall Score
      `# HELP initial_reports_overall_score Overall system score (0-100)`,
      `# TYPE initial_reports_overall_score gauge`,
      `initial_reports_overall_score ${overview.overallScore}`,
      '',

      // Data Completeness Distribution
      `# HELP initial_reports_data_completeness_excellent Percentage of reports with excellent data completeness`,
      `# TYPE initial_reports_data_completeness_excellent gauge`,
      `initial_reports_data_completeness_excellent ${realTimeMetrics.dataCompletenessDistribution.excellent || 0}`,
      '',

      `# HELP initial_reports_data_completeness_good Percentage of reports with good data completeness`,
      `# TYPE initial_reports_data_completeness_good gauge`,
      `initial_reports_data_completeness_good ${realTimeMetrics.dataCompletenessDistribution.good || 0}`,
      '',

      `# HELP initial_reports_data_completeness_fair Percentage of reports with fair data completeness`,
      `# TYPE initial_reports_data_completeness_fair gauge`,
      `initial_reports_data_completeness_fair ${realTimeMetrics.dataCompletenessDistribution.fair || 0}`,
      '',

      `# HELP initial_reports_data_completeness_poor Percentage of reports with poor data completeness`,
      `# TYPE initial_reports_data_completeness_poor gauge`,
      `initial_reports_data_completeness_poor ${realTimeMetrics.dataCompletenessDistribution.poor || 0}`,
      '',

      // Counter metrics for rate calculations
      `# HELP initial_reports_total Total number of initial reports generated`,
      `# TYPE initial_reports_total counter`,
      `initial_reports_total ${overview.totalInitialReportsGenerated}`,
      '',

      `# HELP initial_reports_snapshots_captured_total Total number of snapshots captured`,
      `# TYPE initial_reports_snapshots_captured_total counter`,
      `initial_reports_snapshots_captured_total ${Math.round(overview.totalInitialReportsGenerated * realTimeMetrics.snapshotCaptureSuccessRate * 2)}`, // Estimate: 2 snapshots per report
      '',

      // Error rate (calculated from success rate)
      `# HELP initial_reports_error_rate Error rate for initial report generation`,
      `# TYPE initial_reports_error_rate gauge`,
      `initial_reports_error_rate ${1 - realTimeMetrics.generationSuccessRate}`,
      '',

      // Average data completeness score
      `# HELP initial_reports_avg_data_completeness_score Average data completeness score`,
      `# TYPE initial_reports_avg_data_completeness_score gauge`,
      `initial_reports_avg_data_completeness_score ${calculateAvgCompletenessScore(realTimeMetrics.dataCompletenessDistribution)}`,
      '',

      // Storage usage (placeholder - would integrate with actual storage monitoring)
      `# HELP initial_reports_storage_usage_percentage Storage usage percentage`,
      `# TYPE initial_reports_storage_usage_percentage gauge`,
      `initial_reports_storage_usage_percentage 0.65`, // Placeholder value
      '',

      // Metadata
      `# HELP initial_reports_last_updated_timestamp Last update timestamp`,
      `# TYPE initial_reports_last_updated_timestamp gauge`,
      `initial_reports_last_updated_timestamp ${Math.floor(Date.now() / 1000)}`,
      ''
    ];

    const responseTime = performance.now() - startTime;
    console.log(`[${correlationId}] Prometheus metrics generated in ${responseTime.toFixed(2)}ms`);

    return new NextResponse(prometheusMetrics.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'X-Correlation-ID': correlationId,
        'Cache-Control': 'no-cache, max-age=0'
      }
    });

  } catch (error) {
    console.error(`[${correlationId}] Prometheus metrics generation error:`, error);
    
    // Return error metrics instead of failing completely
    const errorMetrics = [
      `# HELP initial_reports_metrics_error Metrics generation error indicator`,
      `# TYPE initial_reports_metrics_error gauge`,
      `initial_reports_metrics_error 1`,
      '',
      `# HELP initial_reports_last_error_timestamp Last error timestamp`,
      `# TYPE initial_reports_last_error_timestamp gauge`,
      `initial_reports_last_error_timestamp ${Math.floor(Date.now() / 1000)}`,
      ''
    ];

    return new NextResponse(errorMetrics.join('\n'), {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'X-Correlation-ID': correlationId
      }
    });
  }
}

// Helper function to convert health status to numeric score
function getHealthScore(health: string): number {
  switch (health) {
    case 'HEALTHY': return 2;
    case 'WARNING': return 1;
    case 'CRITICAL': return 0;
    default: return 0;
  }
}

// Helper function to calculate average completeness score from distribution
function calculateAvgCompletenessScore(distribution: Record<string, number>): number {
  const scores = {
    excellent: 95, // Midpoint of 90-100
    good: 82,      // Midpoint of 75-89
    fair: 67,      // Midpoint of 60-74
    poor: 30       // Midpoint of 0-59
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [tier, percentage] of Object.entries(distribution)) {
    if (scores[tier as keyof typeof scores]) {
      weightedSum += scores[tier as keyof typeof scores] * percentage;
      totalWeight += percentage;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
} 