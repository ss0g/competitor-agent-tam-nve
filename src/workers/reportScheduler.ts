import { ReportScheduler } from '@/lib/scheduler';

async function processScheduledReports() {
  const scheduler = new ReportScheduler();

  try {
    console.log('Processing scheduled reports...');
    await scheduler.processScheduledReports();
    console.log('Finished processing scheduled reports');
  } catch (error) {
    console.error('Error processing scheduled reports:', error);
  }
}

// If running directly (not imported as a module)
if (require.main === module) {
  processScheduledReports()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
} 