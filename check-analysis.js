const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnalysisData() {
  try {
    const analyses = await prisma.analysis.findMany({
      include: {
        snapshot: true
      }
    });
    
    console.log('Analysis data structure:');
    analyses.forEach((analysis, i) => {
      console.log(`Analysis ${i + 1}:`);
      console.log('- ID:', analysis.id);
      console.log('- Snapshot ID:', analysis.snapshotId);
      console.log('- Data:', JSON.stringify(analysis.data, null, 2));
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnalysisData(); 