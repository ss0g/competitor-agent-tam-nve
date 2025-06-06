require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkReports() {
  try {
    console.log('🔍 Checking for test050602 reports...');
    
    // Check for reports with test050602 in name or ID
    const matchingReports = await prisma.report.findMany({
      where: {
        OR: [
          { name: { contains: 'test050602' } },
          { id: { contains: 'test050602' } }
        ]
      }
    });
    console.log('Found matching reports:', matchingReports.length);
    if (matchingReports.length > 0) {
      console.log(JSON.stringify(matchingReports, null, 2));
    }

    // Check all recent reports
    console.log('\n📋 Recent reports in database:');
    const recentReports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        competitorId: true
      }
    });
    
    console.log('Total reports found:', recentReports.length);
    recentReports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.name} (${report.id})`);
      console.log(`   Created: ${report.createdAt}, Competitor: ${report.competitorId}`);
    });

    // Check for any reports created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const veryRecentReports = await prisma.report.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n⏰ Reports created in last hour: ${veryRecentReports.length}`);
    veryRecentReports.forEach(report => {
      console.log(`- ${report.name} (${report.id}) - ${report.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReports(); 