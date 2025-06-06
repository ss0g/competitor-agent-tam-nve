require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTest060503() {
  console.log('🔍 Checking for test060503 Project and Report Generation');
  console.log('=' .repeat(60));

  try {
    // Check for test060503 project
    console.log('\n📋 Searching for test060503 project...');
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { contains: 'test060503' } },
          { name: { contains: '060503' } },
          { id: { contains: 'test060503' } }
        ]
      },
      include: {
        competitors: true
      }
    });

    if (project) {
      console.log('✅ Project found:', {
        id: project.id,
        name: project.name,
        status: project.status,
        createdAt: project.createdAt,
        competitorsCount: project.competitors.length
      });

      // Check for reports
      for (const competitor of project.competitors) {
        console.log(`\n📊 Checking reports for competitor: ${competitor.name}`);
        const reports = await prisma.report.findMany({
          where: { competitorId: competitor.id },
          orderBy: { createdAt: 'desc' },
          include: {
            versions: true
          }
        });

        console.log(`   Reports found: ${reports.length}`);
        reports.forEach(report => {
          console.log(`   - ${report.name} (${report.id})`);
          console.log(`     Created: ${report.createdAt}`);
          console.log(`     Versions: ${report.versions.length}`);
        });
      }
    } else {
      console.log('❌ No project found with name containing "test060503"');
      
      // Show what projects do exist
      console.log('\n📋 All projects in database:');
      const allProjects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          competitors: true
        }
      });

      allProjects.forEach((proj, index) => {
        console.log(`${index + 1}. "${proj.name}" (${proj.id})`);
        console.log(`   Status: ${proj.status}`);
        console.log(`   Created: ${proj.createdAt}`);
        console.log(`   Competitors: ${proj.competitors.length}`);
        console.log('');
      });
    }

    // Check for any reports that might be related to test060503
    console.log('\n🔍 Searching for any reports containing "060503"...');
    const relatedReports = await prisma.report.findMany({
      where: {
        OR: [
          { name: { contains: '060503' } },
          { description: { contains: '060503' } }
        ]
      },
      include: {
        competitor: true,
        versions: true
      }
    });

    if (relatedReports.length > 0) {
      console.log(`✅ Found ${relatedReports.length} related reports:`);
      relatedReports.forEach(report => {
        console.log(`   - ${report.name}`);
        console.log(`     Competitor: ${report.competitor.name}`);
        console.log(`     Created: ${report.createdAt}`);
        console.log(`     Versions: ${report.versions.length}`);
      });
    } else {
      console.log('❌ No reports found containing "060503"');
    }

    // Check file system
    console.log('\n📁 Checking file system for 060503 files...');
    const fs = require('fs');
    const path = require('path');
    const reportsDir = path.join(process.cwd(), 'reports');

    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      const relatedFiles = files.filter(file => 
        file.includes('060503') || 
        file.includes('test060503')
      );

      if (relatedFiles.length > 0) {
        console.log(`✅ Found ${relatedFiles.length} related files:`);
        relatedFiles.forEach(file => {
          const filePath = path.join(reportsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`   - ${file}`);
          console.log(`     Size: ${stats.size} bytes`);
          console.log(`     Modified: ${stats.mtime}`);
        });
      } else {
        console.log('❌ No files found containing "060503"');
        console.log(`\n📄 Recent files in reports directory (${files.length} total):`);
        files.slice(0, 5).forEach(file => {
          console.log(`   - ${file}`);
        });
      }
    } else {
      console.log('❌ Reports directory does not exist');
    }

    // Summary and recommendations
    console.log('\n📋 SUMMARY AND RECOMMENDATIONS:');
    console.log('=' .repeat(40));
    
    if (!project) {
      console.log('🔍 ROOT CAUSE ANALYSIS:');
      console.log('   1. No project named "test060503" exists in the database');
      console.log('   2. This explains why no report is visible for this project');
      console.log('   3. The project creation step may have failed or used a different name');
      
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('   1. Verify the exact project name used during creation');
      console.log('   2. Check application logs for project creation attempts');
      console.log('   3. Look for any error messages during project setup');
      console.log('   4. Consider creating the project manually if needed');
      
      console.log('\n🔧 WITH NEW LOGGING IMPROVEMENTS:');
      console.log('   - Project creation will now be tracked with correlation IDs');
      console.log('   - Database operations will be logged with detailed context');
      console.log('   - End-to-end request tracing will show exactly where failures occur');
      console.log('   - File system operations will be monitored for consistency');
    } else {
      console.log('✅ Project exists - investigating report generation...');
    }

  } catch (error) {
    console.error('❌ Error during investigation:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTest060503(); 