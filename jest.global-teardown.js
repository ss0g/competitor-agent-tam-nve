const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up regression testing environment...');
  
  // Generate final test summary report
  const reportsDir = path.join(process.cwd(), 'test-reports');
  const summaryPath = path.join(reportsDir, 'test-summary.json');
  
  if (fs.existsSync(reportsDir)) {
    const summary = {
      testRunId: process.env.TEST_RUN_ID,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      coverage: {
        reportPath: path.join(reportsDir, 'lcov-report', 'index.html')
      },
      reports: {
        junit: path.join(reportsDir, 'junit.xml'),
        html: path.join(reportsDir, 'regression-test-report.html')
      }
    };
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Test summary written to: ${summaryPath}`);
  }
  
  // Clean up temporary test files if any
  // You can add cleanup logic here
  
  console.log('✅ Regression testing cleanup complete');
}; 