const { ReportGenerator } = require('./src/lib/reports.ts');

async function testReportGeneration() {
  try {
    console.log('Initializing ReportGenerator...');
    const generator = new ReportGenerator();
    
    console.log('Attempting to generate report for competitor: cmbide23q0000l8a2ckg6h2o8');
    const result = await generator.generateReport('cmbide23q0000l8a2ckg6h2o8', 30);
    
    console.log('Report generation result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error during report generation:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testReportGeneration(); 