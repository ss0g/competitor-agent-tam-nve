#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Performance testing script for Jest test suite
 * Measures execution times and provides optimization metrics
 */

const PERFORMANCE_LOG_FILE = path.join(__dirname, '../test-reports/performance-metrics.json');

class TestPerformanceAnalyzer {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      testRuns: [],
      summary: {},
    };
  }

  async runPerformanceTest(testPattern, description) {
    console.log(`\n🔍 Running performance test: ${description}`);
    console.log(`📋 Test pattern: ${testPattern}`);
    
    const startTime = Date.now();
    
    try {
      const output = execSync(
        `npm test -- --testPathPattern="${testPattern}" --silent --passWithNoTests --maxWorkers=1`,
        { 
          encoding: 'utf8',
          timeout: 60000, // 1 minute timeout
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Parse test results from output
      const testResults = this.parseTestOutput(output);
      
      const result = {
        testPattern,
        description,
        duration,
        success: true,
        ...testResults,
      };
      
      this.metrics.testRuns.push(result);
      
      console.log(`✅ Completed in ${duration}ms`);
      console.log(`📊 Tests: ${testResults.testsTotal} (${testResults.testsPassed} passed, ${testResults.testsFailed} failed)`);
      
      return result;
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = {
        testPattern,
        description,
        duration,
        success: false,
        error: error.message,
      };
      
      this.metrics.testRuns.push(result);
      
      console.log(`❌ Failed after ${duration}ms`);
      console.log(`🚨 Error: ${error.message.split('\n')[0]}`);
      
      return result;
    }
  }

  parseTestOutput(output) {
    const results = {
      testsTotal: 0,
      testsPassed: 0,
      testsFailed: 0,
      testSuites: 0,
    };

    // Parse Jest output for test statistics
    const testSuiteMatch = output.match(/Test Suites:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?(?:,\s*(\d+)\s*total)?/);
    if (testSuiteMatch) {
      results.testSuites = parseInt(testSuiteMatch[3] || testSuiteMatch[1], 10);
    }

    const testsMatch = output.match(/Tests:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?(?:,\s*(\d+)\s*total)?/);
    if (testsMatch) {
      results.testsPassed = parseInt(testsMatch[1], 10);
      results.testsFailed = parseInt(testsMatch[2] || '0', 10);
      results.testsTotal = parseInt(testsMatch[3] || testsMatch[1], 10);
    }

    return results;
  }

  generateSummary() {
    const totalDuration = this.metrics.testRuns.reduce((sum, run) => sum + run.duration, 0);
    const successfulRuns = this.metrics.testRuns.filter(run => run.success);
    const failedRuns = this.metrics.testRuns.filter(run => !run.success);
    
    const totalTests = this.metrics.testRuns.reduce((sum, run) => sum + (run.testsTotal || 0), 0);
    const totalPassed = this.metrics.testRuns.reduce((sum, run) => sum + (run.testsPassed || 0), 0);
    const totalFailed = this.metrics.testRuns.reduce((sum, run) => sum + (run.testsFailed || 0), 0);

    this.metrics.summary = {
      totalDuration,
      averageDuration: Math.round(totalDuration / this.metrics.testRuns.length),
      successfulRuns: successfulRuns.length,
      failedRuns: failedRuns.length,
      totalTestRuns: this.metrics.testRuns.length,
      totalTests,
      totalPassed,
      totalFailed,
      successRate: Math.round((totalPassed / totalTests) * 100),
      performanceGrade: this.calculatePerformanceGrade(totalDuration, totalTests),
    };
  }

  calculatePerformanceGrade(totalDuration, totalTests) {
    const avgTimePerTest = totalDuration / totalTests;
    
    if (avgTimePerTest < 50) return 'A+';
    if (avgTimePerTest < 100) return 'A';
    if (avgTimePerTest < 200) return 'B';
    if (avgTimePerTest < 500) return 'C';
    return 'D';
  }

  saveMetrics() {
    // Ensure directory exists
    const dir = path.dirname(PERFORMANCE_LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(PERFORMANCE_LOG_FILE, JSON.stringify(this.metrics, null, 2));
    console.log(`\n📊 Performance metrics saved to: ${PERFORMANCE_LOG_FILE}`);
  }

  printSummary() {
    const { summary } = this.metrics;
    
    console.log('\n' + '='.repeat(60));
    console.log('🏆 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${summary.totalDuration}ms`);
    console.log(`📊 Average Duration: ${summary.averageDuration}ms per test run`);
    console.log(`✅ Successful Runs: ${summary.successfulRuns}/${summary.totalTestRuns}`);
    console.log(`🧪 Total Tests: ${summary.totalTests} (${summary.totalPassed} passed, ${summary.totalFailed} failed)`);
    console.log(`📈 Success Rate: ${summary.successRate}%`);
    console.log(`🎯 Performance Grade: ${summary.performanceGrade}`);
    console.log('='.repeat(60));
  }
}

async function main() {
  console.log('🚀 Starting Jest Performance Analysis');
  console.log('📅 ' + new Date().toISOString());
  
  const analyzer = new TestPerformanceAnalyzer();
  
  // Define performance test scenarios
  const testScenarios = [
    { pattern: 'logger.test.ts', description: 'Unit Tests - Logger (Fast)' },
    { pattern: 'productScrapingService.test.ts', description: 'Unit Tests - Product Scraping (Complex)' },
    { pattern: 'unit', description: 'All Unit Tests' },
    { pattern: 'integration', description: 'All Integration Tests' },
    { pattern: 'regression', description: 'All Regression Tests' },
  ];
  
  // Run performance tests
  for (const scenario of testScenarios) {
    await analyzer.runPerformanceTest(scenario.pattern, scenario.description);
    
    // Small delay between tests to avoid resource contention
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate summary and save results
  analyzer.generateSummary();
  analyzer.printSummary();
  analyzer.saveMetrics();
  
  console.log('\n✨ Performance analysis complete!');
}

// Run the performance analysis
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Performance analysis failed:', error);
    process.exit(1);
  });
}

module.exports = { TestPerformanceAnalyzer }; 