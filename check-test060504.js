require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function investigateTest060504() {
  console.log('🔍 Investigating test060504 Project and Report "test 04"');
  console.log('=' .repeat(65));

  try {
    // Step 1: Check if project exists
    console.log('\n📋 Step 1: Checking for test060504 project...');
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { contains: 'test060504' } },
          { name: { contains: '060504' } },
          { name: { equals: 'test060504' } }
        ]
      },
      include: {
        competitors: true,
        user: true
      }
    });

    if (project) {
      console.log('✅ Project found:', {
        id: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        userId: project.userId,
        competitorsCount: project.competitors.length
      });

      // Step 2: Check competitors
      console.log('\n👥 Step 2: Analyzing project competitors...');
      if (project.competitors.length === 0) {
        console.log('⚠️  ISSUE IDENTIFIED: Project has no competitors assigned!');
        console.log('   This is likely the root cause - reports require competitors to analyze.');
      } else {
        console.log(`✅ Project has ${project.competitors.length} competitor(s):`);
        project.competitors.forEach((competitor, index) => {
          console.log(`   ${index + 1}. ${competitor.name} (${competitor.id})`);
          console.log(`      Website: ${competitor.website}`);
          console.log(`      Industry: ${competitor.industry}`);
        });
      }

      // Step 3: Check for reports
      console.log('\n📊 Step 3: Checking for reports...');
      for (const competitor of project.competitors) {
        console.log(`\n  📈 Reports for ${competitor.name}:`);
        const reports = await prisma.report.findMany({
          where: { competitorId: competitor.id },
          orderBy: { createdAt: 'desc' },
          include: {
            versions: {
              orderBy: { createdAt: 'desc' }
            }
          }
        });

        console.log(`     Reports found: ${reports.length}`);
        reports.forEach((report, index) => {
          console.log(`     ${index + 1}. "${report.name}" (${report.id})`);
          console.log(`        Description: ${report.description || 'None'}`);
          console.log(`        Created: ${report.createdAt}`);
          console.log(`        Updated: ${report.updatedAt}`);
          console.log(`        Versions: ${report.versions.length}`);
          
          // Check if this matches our expected report name
          if (report.name.includes('test 04') || report.name.includes('test04')) {
            console.log(`        🎯 MATCH: This appears to be our target report!`);
          }
        });

        // Step 4: Check snapshots and analyses
        console.log(`\n  📸 Data availability for ${competitor.name}:`);
        const snapshots = await prisma.snapshot.findMany({
          where: { competitorId: competitor.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            analyses: {
              take: 2,
              orderBy: { createdAt: 'desc' }
            }
          }
        });

        console.log(`     Snapshots: ${snapshots.length}`);
        if (snapshots.length === 0) {
          console.log('     ⚠️  No snapshots available - this prevents report generation!');
        } else {
          const totalAnalyses = snapshots.reduce((sum, snapshot) => sum + snapshot.analyses.length, 0);
          console.log(`     Total analyses: ${totalAnalyses}`);
          if (totalAnalyses === 0) {
            console.log('     ⚠️  No analyses available - this prevents meaningful reports!');
          }
        }
      }
    } else {
      console.log('❌ No project found with name containing "test060504"');
    }

    // Step 5: Search for any reports containing "test 04" or related patterns
    console.log('\n🔍 Step 5: Searching for reports with name "test 04"...');
    const reportsByName = await prisma.report.findMany({
      where: {
        OR: [
          { name: { contains: 'test 04' } },
          { name: { contains: 'test04' } },
          { name: { contains: 'test_04' } },
          { description: { contains: 'test 04' } },
          { description: { contains: 'test060504' } }
        ]
      },
      include: {
        competitor: true,
        versions: true
      }
    });

    if (reportsByName.length > 0) {
      console.log(`✅ Found ${reportsByName.length} reports matching "test 04":`);
      reportsByName.forEach((report, index) => {
        console.log(`   ${index + 1}. "${report.name}" (${report.id})`);
        console.log(`      Competitor: ${report.competitor.name}`);
        console.log(`      Created: ${report.createdAt}`);
        console.log(`      Versions: ${report.versions.length}`);
      });
    } else {
      console.log('❌ No reports found with name containing "test 04"');
    }

    // Step 6: Check file system
    console.log('\n📁 Step 6: Checking file system for report files...');
    const fs = require('fs');
    const path = require('path');
    const reportsDir = path.join(process.cwd(), 'reports');

    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      
      // Look for files related to test060504 or "test 04"
      const relatedFiles = files.filter(file => 
        file.includes('test060504') || 
        file.includes('test-060504') ||
        file.includes('test_04') ||
        file.includes('test-04') ||
        file.includes('test04')
      );

      if (relatedFiles.length > 0) {
        console.log(`✅ Found ${relatedFiles.length} related files:`);
        relatedFiles.forEach(file => {
          const filePath = path.join(reportsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`   - ${file}`);
          console.log(`     Size: ${stats.size} bytes`);
          console.log(`     Created: ${stats.birthtime}`);
          console.log(`     Modified: ${stats.mtime}`);
        });
      } else {
        console.log('❌ No files found for test060504 or "test 04"');
      }

      // Show the most recent files for comparison
      console.log('\n📄 Most recent files in reports directory:');
      const recentFiles = files
        .filter(file => file !== '.DS_Store') // Filter out system files
        .map(file => ({
          name: file,
          stats: fs.statSync(path.join(reportsDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime)
        .slice(0, 5);

      recentFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name}`);
        console.log(`      Modified: ${file.stats.mtime}`);
        console.log(`      Size: ${file.stats.size} bytes`);
      });
    } else {
      console.log('❌ Reports directory does not exist');
    }

    // Step 7: Check recent activity
    console.log('\n⏰ Step 7: Checking recent activity (last 2 hours)...');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const recentReports = await prisma.report.findMany({
      where: {
        createdAt: {
          gte: twoHoursAgo
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        competitor: true
      }
    });

    console.log(`📊 Reports created in the last 2 hours: ${recentReports.length}`);
    recentReports.forEach(report => {
      console.log(`   - "${report.name}" for ${report.competitor.name}`);
      console.log(`     Created: ${report.createdAt}`);
      console.log(`     ID: ${report.id}`);
    });

    const recentProjects = await prisma.project.findMany({
      where: {
        createdAt: {
          gte: twoHoursAgo
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Projects created in the last 2 hours: ${recentProjects.length}`);
    recentProjects.forEach(proj => {
      console.log(`   - "${proj.name}" (${proj.status})`);
      console.log(`     Created: ${proj.createdAt}`);
      console.log(`     ID: ${proj.id}`);
    });

    // Final analysis and recommendations
    console.log('\n📋 ANALYSIS AND RECOMMENDATIONS:');
    console.log('=' .repeat(50));

    if (!project) {
      console.log('🔍 ISSUE: Project "test060504" not found');
      console.log('   Possible causes:');
      console.log('   - Project creation failed silently');
      console.log('   - Project was created with a different name');
      console.log('   - Database transaction was rolled back');
    } else if (project.competitors.length === 0) {
      console.log('🔍 ISSUE: Project exists but has no competitors');
      console.log('   This is the most likely cause of the missing report');
      console.log('   Reports cannot be generated without competitor data to analyze');
    } else if (reportsByName.length === 0) {
      console.log('🔍 ISSUE: No reports found with name "test 04"');
      console.log('   Possible causes:');
      console.log('   - Report generation API was never called');
      console.log('   - Report generation failed during processing');
      console.log('   - Report was created with a different name');
    }

    console.log('\n💡 NEXT STEPS:');
    if (!project) {
      console.log('   1. Check application logs for project creation attempts');
      console.log('   2. Verify the exact project name used');
      console.log('   3. Try creating the project again with logging enabled');
    } else if (project.competitors.length === 0) {
      console.log('   1. Add competitors to the project');
      console.log('   2. Ensure competitors have snapshot data');
      console.log('   3. Try generating the report again');
    } else {
      console.log('   1. Check application logs for report generation attempts');
      console.log('   2. Verify the report generation API was called');
      console.log('   3. Check for any error messages during report creation');
    }

    console.log('\n🔧 WITH ENHANCED LOGGING:');
    console.log('   - Future report generation attempts will be fully traced');
    console.log('   - Database operations will be logged with detailed context');
    console.log('   - File system operations will be monitored');
    console.log('   - Correlation IDs will enable end-to-end tracking');

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateTest060504(); 