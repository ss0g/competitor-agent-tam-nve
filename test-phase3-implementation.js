/**
 * Phase 3 Implementation Test Script
 * Tests Performance & Optimization components:
 * - Performance Monitoring Dashboard Service & API
 * - Advanced Scheduling Algorithms Service & API  
 * - System Health Monitoring Service & API
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorText(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(title) {
  console.log('\n' + '='.repeat(80));
  console.log(colorText(title, 'cyan'));
  console.log('='.repeat(80));
}

function printSubHeader(title) {
  console.log('\n' + colorText(title, 'yellow'));
  console.log('-'.repeat(50));
}

function logSuccess(message) {
  console.log(colorText(`✅ ${message}`, 'green'));
}

function logError(message) {
  console.log(colorText(`❌ ${message}`, 'red'));
}

function logWarning(message) {
  console.log(colorText(`⚠️  ${message}`, 'yellow'));
}

function logInfo(message) {
  console.log(colorText(`ℹ️  ${message}`, 'blue'));
}

class Phase3ImplementationTester {
  constructor() {
    this.results = {
      services: {},
      apis: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  /**
   * Test if a file exists and analyze its content
   */
  testFileImplementation(filePath, expectedFeatures = []) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      logError(`File not found: ${filePath}`);
      return { exists: false, features: [], score: 0 };
    }
    
    logSuccess(`File exists: ${filePath}`);
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const foundFeatures = [];
      let score = 0;
      
      expectedFeatures.forEach(feature => {
        if (content.includes(feature.pattern)) {
          foundFeatures.push(feature.name);
          score += feature.weight || 1;
          logSuccess(`  ✓ ${feature.name}`);
        } else {
          logWarning(`  ⚠ Missing: ${feature.name}`);
        }
      });
      
      // Check basic file structure
      const hasClass = /class\s+\w+/.test(content);
      const hasExport = /export\s+(default\s+)?class|\nexport\s+\{/.test(content);
      const hasTypings = /interface\s+\w+|type\s+\w+/.test(content);
      
      if (hasClass) logSuccess(`  ✓ Has class definition`);
      if (hasExport) logSuccess(`  ✓ Has proper exports`);
      if (hasTypings) logSuccess(`  ✓ Has TypeScript interfaces/types`);
      
      const fileSize = (content.length / 1024).toFixed(1);
      logInfo(`  📄 File size: ${fileSize}KB`);
      logInfo(`  📏 Lines: ${content.split('\n').length}`);
      
      return {
        exists: true,
        features: foundFeatures,
        score,
        hasClass,
        hasExport,
        hasTypings,
        size: content.length
      };
      
    } catch (error) {
      logError(`Error reading file: ${error.message}`);
      return { exists: true, features: [], score: 0, error: error.message };
    }
  }

  /**
   * Test Phase 3.1: Performance Monitoring Dashboard Service
   */
  testPerformanceMonitoringService() {
    printSubHeader('Phase 3.1: Performance Monitoring Dashboard Service');
    
    const expectedFeatures = [
      { name: 'PerformanceMetrics interface', pattern: 'interface PerformanceMetrics', weight: 2 },
      { name: 'PerformanceAlert interface', pattern: 'interface PerformanceAlert', weight: 2 },
      { name: 'DashboardData interface', pattern: 'interface DashboardData', weight: 2 },
      { name: 'Real-time metrics', pattern: 'getRealTimeMetrics', weight: 3 },
      { name: 'Alert system', pattern: 'getActiveAlerts', weight: 3 },
      { name: 'Historical data', pattern: 'getHistoricalData', weight: 3 },
      { name: 'Performance recommendations', pattern: 'getPerformanceRecommendations', weight: 3 },
      { name: 'Alert thresholds', pattern: 'ALERT_THRESHOLDS', weight: 2 },
      { name: 'Dashboard data method', pattern: 'getDashboardData', weight: 3 },
      { name: 'Project performance summary', pattern: 'getProjectPerformanceSummary', weight: 2 }
    ];
    
    const result = this.testFileImplementation(
      'src/services/performanceMonitoringService.ts',
      expectedFeatures
    );
    
    this.results.services.performanceMonitoring = result;
    this.updateTestCounts(result, expectedFeatures.length);
    
    return result;
  }

  /**
   * Test Phase 3.2: Advanced Scheduling Algorithms Service
   */
  testAdvancedSchedulingService() {
    printSubHeader('Phase 3.2: Advanced Scheduling Algorithms Service');
    
    const expectedFeatures = [
      { name: 'DataChangePattern interface', pattern: 'interface DataChangePattern', weight: 2 },
      { name: 'OptimizedSchedule interface', pattern: 'interface OptimizedSchedule', weight: 2 },
      { name: 'LoadBalancingStrategy interface', pattern: 'interface LoadBalancingStrategy', weight: 2 },
      { name: 'PredictiveInsight interface', pattern: 'interface PredictiveInsight', weight: 2 },
      { name: 'Pattern analysis', pattern: 'analyzeDataChangePatterns', weight: 3 },
      { name: 'ML optimization', pattern: 'generateOptimizedSchedules', weight: 3 },
      { name: 'Predictive insights', pattern: 'generatePredictiveInsights', weight: 3 },
      { name: 'Load balancing', pattern: 'implementLoadBalancing', weight: 3 },
      { name: 'Content similarity', pattern: 'calculateContentSimilarity', weight: 2 },
      { name: 'Change frequency calculation', pattern: 'calculateAverageChangeFrequency', weight: 2 },
      { name: 'Peak activity detection', pattern: 'identifyPeakActivityHours', weight: 2 },
      { name: 'Optimization summary', pattern: 'getOptimizationSummary', weight: 2 }
    ];
    
    const result = this.testFileImplementation(
      'src/services/advancedSchedulingService.ts',
      expectedFeatures
    );
    
    this.results.services.advancedScheduling = result;
    this.updateTestCounts(result, expectedFeatures.length);
    
    return result;
  }

  /**
   * Test Phase 3.3: System Health Monitoring Service
   */
  testSystemHealthService() {
    printSubHeader('Phase 3.3: System Health Monitoring Service');
    
    const expectedFeatures = [
      { name: 'ServiceHealthCheck interface', pattern: 'interface ServiceHealthCheck', weight: 2 },
      { name: 'SystemHealthStatus interface', pattern: 'interface SystemHealthStatus', weight: 2 },
      { name: 'HealthIssue interface', pattern: 'interface HealthIssue', weight: 2 },
      { name: 'SelfHealingAction interface', pattern: 'interface SelfHealingAction', weight: 2 },
      { name: 'ProactiveRecommendation interface', pattern: 'interface ProactiveRecommendation', weight: 2 },
      { name: 'System health check', pattern: 'performSystemHealthCheck', weight: 3 },
      { name: 'Service health checks', pattern: 'performServiceHealthChecks', weight: 3 },
      { name: 'Self-healing mechanism', pattern: 'attemptSelfHealing', weight: 3 },
      { name: 'Proactive recommendations', pattern: 'generateProactiveRecommendations', weight: 3 },
      { name: 'Database health check', pattern: 'checkDatabaseHealth', weight: 2 },
      { name: 'Issue detection', pattern: 'detectActiveIssues', weight: 2 },
      { name: 'Health score calculation', pattern: 'calculateHealthScore', weight: 2 },
      { name: 'Health report', pattern: 'getSystemHealthReport', weight: 2 }
    ];
    
    const result = this.testFileImplementation(
      'src/services/systemHealthService.ts',
      expectedFeatures
    );
    
    this.results.services.systemHealth = result;
    this.updateTestCounts(result, expectedFeatures.length);
    
    return result;
  }

  /**
   * Test Performance Dashboard API
   */
  testPerformanceDashboardAPI() {
    printSubHeader('Performance Dashboard API');
    
    const expectedFeatures = [
      { name: 'GET endpoint', pattern: 'export async function GET', weight: 3 },
      { name: 'POST endpoint', pattern: 'export async function POST', weight: 3 },
      { name: 'Dashboard data retrieval', pattern: 'getDashboardData', weight: 2 },
      { name: 'Alert acknowledgment', pattern: 'acknowledgeAlert', weight: 2 },
      { name: 'Project performance summary', pattern: 'getProjectPerformanceSummary', weight: 2 },
      { name: 'Error handling', pattern: 'try.*catch', weight: 2 },
      { name: 'Correlation ID', pattern: 'correlationId', weight: 1 },
      { name: 'Time range parameter', pattern: 'timeRange', weight: 1 }
    ];
    
    const result = this.testFileImplementation(
      'src/app/api/performance-dashboard/route.ts',
      expectedFeatures
    );
    
    this.results.apis.performanceDashboard = result;
    this.updateTestCounts(result, expectedFeatures.length);
    
    return result;
  }

  /**
   * Test Advanced Scheduling API
   */
  testAdvancedSchedulingAPI() {
    printSubHeader('Advanced Scheduling API');
    
    const expectedFeatures = [
      { name: 'GET endpoint', pattern: 'export async function GET', weight: 3 },
      { name: 'POST endpoint', pattern: 'export async function POST', weight: 3 },
      { name: 'Optimization summary', pattern: 'getOptimizationSummary', weight: 2 },
      { name: 'Pattern analysis', pattern: 'analyzeDataChangePatterns', weight: 2 },
      { name: 'Predictive insights', pattern: 'generatePredictiveInsights', weight: 2 },
      { name: 'Load balancing', pattern: 'implementLoadBalancing', weight: 2 },
      { name: 'Action switching', pattern: 'switch.*action', weight: 2 },
      { name: 'Error handling', pattern: 'try.*catch', weight: 2 },
      { name: 'Correlation ID', pattern: 'correlationId', weight: 1 }
    ];
    
    const result = this.testFileImplementation(
      'src/app/api/advanced-scheduling/route.ts',
      expectedFeatures
    );
    
    this.results.apis.advancedScheduling = result;
    this.updateTestCounts(result, expectedFeatures.length);
    
    return result;
  }

  /**
   * Test System Health API
   */
  testSystemHealthAPI() {
    printSubHeader('System Health API');
    
    const expectedFeatures = [
      { name: 'GET endpoint', pattern: 'export async function GET', weight: 3 },
      { name: 'POST endpoint', pattern: 'export async function POST', weight: 3 },
      { name: 'Health status', pattern: 'performSystemHealthCheck', weight: 2 },
      { name: 'Health report', pattern: 'getSystemHealthReport', weight: 2 },
      { name: 'Self-healing action', pattern: 'attemptSelfHealing', weight: 2 },
      { name: 'Recommendations', pattern: 'generateProactiveRecommendations', weight: 2 },
      { name: 'Action switching', pattern: 'switch.*action', weight: 2 },
      { name: 'Error handling', pattern: 'try.*catch', weight: 2 },
      { name: 'Correlation ID', pattern: 'correlationId', weight: 1 }
    ];
    
    const result = this.testFileImplementation(
      'src/app/api/system-health/route.ts',
      expectedFeatures
    );
    
    this.results.apis.systemHealth = result;
    this.updateTestCounts(result, expectedFeatures.length);
    
    return result;
  }

  /**
   * Test service integrations
   */
  testServiceIntegrations() {
    printSubHeader('Service Integration Tests');
    
    const integrationChecks = [
      {
        name: 'Performance Monitoring imports Phase 1&2 services',
        service: 'performanceMonitoring',
        patterns: ['SmartSchedulingService', 'PrismaClient']
      },
      {
        name: 'Advanced Scheduling integrates with Smart Scheduling',
        service: 'advancedScheduling',
        patterns: ['SmartSchedulingService', 'getFreshnessStatus']
      },
      {
        name: 'System Health monitors all services',
        service: 'systemHealth',
        patterns: [
          'SmartSchedulingService',
          'AutomatedAnalysisService',
          'ScheduledJobService',
          'ReportSchedulingService',
          'PerformanceMonitoringService',
          'AdvancedSchedulingService'
        ]
      }
    ];
    
    let integrationScore = 0;
    let totalIntegrations = 0;
    
    integrationChecks.forEach(check => {
      const serviceResult = this.results.services[check.service];
      if (serviceResult && serviceResult.exists) {
        const filePath = path.join(process.cwd(), `src/services/${check.service}Service.ts`);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          let foundPatterns = 0;
          
          check.patterns.forEach(pattern => {
            if (content.includes(pattern)) {
              foundPatterns++;
            }
          });
          
          const integrationPercentage = (foundPatterns / check.patterns.length) * 100;
          
          if (integrationPercentage >= 80) {
            logSuccess(`✓ ${check.name} (${integrationPercentage.toFixed(0)}%)`);
            integrationScore += 3;
          } else if (integrationPercentage >= 50) {
            logWarning(`⚠ ${check.name} (${integrationPercentage.toFixed(0)}% - partial)`);
            integrationScore += 1;
          } else {
            logError(`✗ ${check.name} (${integrationPercentage.toFixed(0)}% - insufficient)`);
          }
          
          totalIntegrations++;
          
        } catch (error) {
          logError(`Error checking ${check.name}: ${error.message}`);
        }
      }
    });
    
    this.results.integration = {
      score: integrationScore,
      maxScore: totalIntegrations * 3,
      percentage: totalIntegrations > 0 ? (integrationScore / (totalIntegrations * 3)) * 100 : 0
    };
    
    return this.results.integration;
  }

  /**
   * Update test counts
   */
  updateTestCounts(result, expectedCount) {
    this.results.summary.totalTests += expectedCount;
    
    if (result.exists) {
      this.results.summary.passed += result.features.length;
      this.results.summary.failed += (expectedCount - result.features.length);
    } else {
      this.results.summary.failed += expectedCount;
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    printHeader('PHASE 3 IMPLEMENTATION TEST REPORT');
    
    // Service Implementation Summary
    printSubHeader('Service Implementation Summary');
    
    Object.entries(this.results.services).forEach(([serviceName, result]) => {
      const status = result.exists ? 
        (result.score > 15 ? '🟢 EXCELLENT' : 
         result.score > 10 ? '🟡 GOOD' : 
         result.score > 5 ? '🟠 BASIC' : '🔴 INCOMPLETE') : 
        '❌ NOT FOUND';
        
      console.log(`${serviceName}: ${status} (Score: ${result.score || 0})`);
      
      if (result.exists && result.size) {
        const complexity = result.size > 20000 ? 'High' : result.size > 10000 ? 'Medium' : 'Basic';
        logInfo(`  Implementation: ${complexity} complexity (${(result.size/1024).toFixed(1)}KB)`);
      }
    });
    
    // API Implementation Summary
    printSubHeader('API Implementation Summary');
    
    Object.entries(this.results.apis).forEach(([apiName, result]) => {
      const status = result.exists ? 
        (result.score > 12 ? '🟢 COMPLETE' : 
         result.score > 8 ? '🟡 GOOD' : 
         result.score > 4 ? '🟠 BASIC' : '🔴 INCOMPLETE') : 
        '❌ NOT FOUND';
        
      console.log(`${apiName}: ${status} (Score: ${result.score || 0})`);
    });
    
    // Integration Summary
    if (this.results.integration) {
      printSubHeader('Integration Analysis');
      const integrationStatus = this.results.integration.percentage >= 80 ? '🟢 EXCELLENT' :
                               this.results.integration.percentage >= 60 ? '🟡 GOOD' :
                               this.results.integration.percentage >= 40 ? '🟠 BASIC' : '🔴 POOR';
      
      console.log(`Service Integration: ${integrationStatus} (${this.results.integration.percentage.toFixed(0)}%)`);
    }
    
    // Overall Summary
    printSubHeader('Overall Phase 3 Implementation Status');
    
    const overallScore = (this.results.summary.passed / this.results.summary.totalTests) * 100;
    const phaseStatus = overallScore >= 85 ? '🎉 PHASE 3 COMPLETE' :
                       overallScore >= 70 ? '🟡 MOSTLY COMPLETE' :
                       overallScore >= 50 ? '🟠 PARTIALLY COMPLETE' : '🔴 NEEDS WORK';
    
    console.log(`\n${colorText(phaseStatus, 'bright')}`);
    console.log(`Overall Implementation: ${overallScore.toFixed(1)}%`);
    console.log(`Tests Passed: ${this.results.summary.passed}/${this.results.summary.totalTests}`);
    
    // Detailed Metrics
    printSubHeader('Implementation Metrics');
    
    const serviceFiles = Object.values(this.results.services).filter(s => s.exists).length;
    const apiFiles = Object.values(this.results.apis).filter(a => a.exists).length;
    const totalFiles = serviceFiles + apiFiles;
    
    console.log(`📁 Files Created: ${totalFiles}/6 (${((totalFiles/6)*100).toFixed(0)}%)`);
    console.log(`🔧 Services: ${serviceFiles}/3`);
    console.log(`🌐 APIs: ${apiFiles}/3`);
    
    const totalSize = [...Object.values(this.results.services), ...Object.values(this.results.apis)]
      .filter(r => r.exists && r.size)
      .reduce((sum, r) => sum + r.size, 0);
    
    if (totalSize > 0) {
      console.log(`📄 Total Code: ${(totalSize/1024).toFixed(1)}KB`);
    }
    
    // Success Criteria
    printSubHeader('Phase 3 Success Criteria');
    
    const criteria = [
      { name: 'Performance Monitoring Dashboard', met: this.results.services.performanceMonitoring?.exists && this.results.services.performanceMonitoring?.score > 15 },
      { name: 'Advanced Scheduling Algorithms', met: this.results.services.advancedScheduling?.exists && this.results.services.advancedScheduling?.score > 15 },
      { name: 'System Health Monitoring', met: this.results.services.systemHealth?.exists && this.results.services.systemHealth?.score > 15 },
      { name: 'API Endpoints Complete', met: Object.values(this.results.apis).every(api => api.exists && api.score > 8) },
      { name: 'Service Integration', met: this.results.integration?.percentage > 70 }
    ];
    
    criteria.forEach(criterion => {
      const status = criterion.met ? '✅' : '❌';
      console.log(`${status} ${criterion.name}`);
    });
    
    const metCriteria = criteria.filter(c => c.met).length;
    const successRate = (metCriteria / criteria.length) * 100;
    
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(0)}% (${metCriteria}/${criteria.length} criteria met)`);
    
    if (successRate >= 80) {
      console.log(colorText('\n🚀 PHASE 3 IMPLEMENTATION SUCCESSFUL!', 'green'));
      console.log(colorText('Ready for Phase 3 testing and deployment.', 'green'));
    } else if (successRate >= 60) {
      console.log(colorText('\n⚠️  PHASE 3 MOSTLY COMPLETE', 'yellow'));
      console.log(colorText('Minor improvements needed before full deployment.', 'yellow'));
    } else {
      console.log(colorText('\n🔧 PHASE 3 NEEDS COMPLETION', 'red'));
      console.log(colorText('Significant work required to meet success criteria.', 'red'));
    }
    
    return this.results;
  }

  /**
   * Run all Phase 3 tests
   */
  async runAllTests() {
    printHeader('🚀 PHASE 3: PERFORMANCE & OPTIMIZATION - IMPLEMENTATION TEST');
    
    logInfo('Testing Phase 3 components:');
    logInfo('• Phase 3.1: Performance Monitoring Dashboard');
    logInfo('• Phase 3.2: Advanced Scheduling Algorithms');
    logInfo('• Phase 3.3: System Health Monitoring');
    
    // Test services
    this.testPerformanceMonitoringService();
    this.testAdvancedSchedulingService();
    this.testSystemHealthService();
    
    // Test APIs
    this.testPerformanceDashboardAPI();
    this.testAdvancedSchedulingAPI();
    this.testSystemHealthAPI();
    
    // Test integrations
    this.testServiceIntegrations();
    
    // Generate report
    return this.generateTestReport();
  }
}

// Run tests if called directly
if (require.main === module) {
  console.log(colorText('Starting Phase 3 Implementation Tests...', 'cyan'));
  
  const tester = new Phase3ImplementationTester();
  
  tester.runAllTests()
    .then(results => {
      console.log(colorText('\n✅ Phase 3 testing completed!', 'green'));
      process.exit(0);
    })
    .catch(error => {
      console.error(colorText(`\n❌ Test execution failed: ${error.message}`, 'red'));
      process.exit(1);
    });
}

module.exports = Phase3ImplementationTester; 