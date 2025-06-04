const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('Checking database connection...');
    
    const competitors = await prisma.competitor.findMany({
      include: {
        snapshots: {
          include: {
            analyses: true
          },
          take: 5
        }
      }
    });
    
    console.log(`Found ${competitors.length} competitors:`);
    competitors.forEach(c => {
      console.log(`- ${c.name} (${c.id}): ${c.snapshots.length} snapshots`);
      c.snapshots.forEach(s => {
        console.log(`  * Snapshot ${s.id}: ${s.analyses.length} analyses`);
      });
    });
    
    const totalSnapshots = await prisma.snapshot.count();
    const totalAnalyses = await prisma.analysis.count();
    const totalReports = await prisma.report.count();
    
    console.log(`Total snapshots: ${totalSnapshots}`);
    console.log(`Total analyses: ${totalAnalyses}`);
    console.log(`Total reports: ${totalReports}`);
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData(); 