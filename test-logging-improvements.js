require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLoggingImprovements() {
  console.log('🔍 Testing Logging Improvements for Report Generation');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check for test060503 project
    console.log('\n📋 Test 1: Checking for test060503 project...');
    const project = await prisma.project.findFirst({
      where: {
        name: { contains: 'test060503' }
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

      // Test 2: Check for reports related to this project's competitors
      console.log('\n📊 Test 2: Checking for reports related to project competitors...');
      for (const competitor of project.competitors) {
        console.log(`\n  Competitor: ${competitor.name} (${competitor.id})`);
        
        const reports = await prisma.report.findMany({
          where: { competitorId: competitor.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            versions: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });

        console.log(`    Reports found: ${reports.length}`);
        reports.forEach((report, index) => {
          console.log(`    ${index + 1}. ${report.name}`);
          console.log(`       ID: ${report.id}`);
          console.log(`       Created: ${report.createdAt}`);
          console.log(`       Versions: ${report.versions.length}`);
        });

        // Test 3: Check for snapshots and analyses
        console.log(`\n  📸 Snapshots for ${competitor.name}:`);
        const snapshots = await prisma.snapshot.findMany({
          where: { competitorId: competitor.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            analyses: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            }
          }
        });

        console.log(`    Snapshots found: ${snapshots.length}`);
        snapshots.forEach((snapshot, index) => {
          console.log(`    ${index + 1}. Snapshot ${snapshot.id}`);
          console.log(`       Created: ${snapshot.createdAt}`);
          console.log(`       Analyses: ${snapshot.analyses.length}`);
        });
      }
    } else {
      console.log('❌ No project found with name containing "test060503"');
      
      // Check all recent projects
      console.log('\n📋 Recent projects in database:');
      const recentProjects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          competitors: true
        }
      });

      recentProjects.forEach((proj, index) => {
        console.log(`${index + 1}. ${proj.name} (${proj.id})`);
        console.log(`   Status: ${proj.status}, Created: ${proj.createdAt}`);
        console.log(`   Competitors: ${proj.competitors.length}`);
      });
    }

    // Test 4: Check file system for report files
    console.log('\n📁 Test 4: Checking file system for report files...');
    const fs = require('fs');
    const path = require('path');
    const reportsDir = path.join(process.cwd(), 'reports');

    try {
      if (fs.existsSync(reportsDir)) {
        const files = fs.readdirSync(reportsDir);
        console.log(`✅ Reports directory exists with ${files.length} files`);
        
        // Look for files related to test060503
        const testFiles = files.filter(file => 
          file.toLowerCase().includes('test060503') || 
          file.toLowerCase().includes('test-060503')
        );
        
        console.log(`📄 Files related to test060503: ${testFiles.length}`);
        testFiles.forEach(file => {
          const filePath = path.join(reportsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  - ${file} (${stats.size} bytes, ${stats.mtime})`);
        });

        // Show recent files
        const recentFiles = files
          .map(file => ({
            name: file,
            path: path.join(reportsDir, file),
            stats: fs.statSync(path.join(reportsDir, file))
          }))
          .sort((a, b) => b.stats.mtime - a.stats.mtime)
          .slice(0, 5);

        console.log(`\n📄 5 most recent report files:`);
        recentFiles.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name}`);
          console.log(`     Size: ${file.stats.size} bytes`);
          console.log(`     Modified: ${file.stats.mtime}`);
        });
      } else {
        console.log('❌ Reports directory does not exist');
      }
    } catch (fsError) {
      console.log('❌ Error checking file system:', fsError.message);
    }

    // Test 5: Simulate logging flow for debugging
    console.log('\n🔧 Test 5: Demonstrating enhanced logging capabilities...');
    
    // Import the enhanced logger
    const { 
      logger, 
      generateCorrelationId, 
      trackReportFlow, 
      trackDatabaseOperation,
      trackFileSystemOperation,
      trackCorrelation 
    } = require('./src/lib/logger');

    const correlationId = generateCorrelationId();
    console.log(`📋 Generated correlation ID: ${correlationId}`);

    // Simulate a report generation flow with logging
    const context = {
      correlationId,
      projectName: 'test060503',
      competitorId: 'test-competitor',
      userId: 'test-user'
    };

    trackCorrelation(correlationId, 'test_logging_flow_started', context);
    trackReportFlow('test_initialization', {
      ...context,
      stepStatus: 'started',
      stepData: { testType: 'logging_verification' }
    });

    trackDatabaseOperation('findFirst', 'project', {
      ...context,
      query: 'test060503 project lookup',
      recordData: project ? { found: true, id: project.id } : { found: false }
    });

    trackFileSystemOperation('readdir', reportsDir);

    trackReportFlow('test_completed', {
      ...context,
      stepStatus: 'completed',
      stepData: { 
        projectFound: !!project,
        filesChecked: true,
        loggingVerified: true
      }
    });

    console.log('✅ Enhanced logging demonstration completed');

    // Test 6: Check for any orphaned data
    console.log('\n🔍 Test 6: Checking for potential data inconsistencies...');
    
    // Check for reports without corresponding files
    const allReports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        competitor: true
      }
    });

    console.log(`📊 Checking ${allReports.length} recent reports for file consistency...`);
    
    for (const report of allReports) {
      const expectedFileName = `${report.competitor.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
      
      try {
        if (fs.existsSync(reportsDir)) {
          const files = fs.readdirSync(reportsDir);
          const matchingFiles = files.filter(file => 
            file.toLowerCase().includes(expectedFileName) ||
            file.includes(report.id)
          );
          
          if (matchingFiles.length === 0) {
            console.log(`⚠️  Report "${report.name}" (${report.id}) has no corresponding file`);
            console.log(`    Expected pattern: ${expectedFileName}`);
            console.log(`    Competitor: ${report.competitor.name}`);
            console.log(`    Created: ${report.createdAt}`);
          } else {
            console.log(`✅ Report "${report.name}" has ${matchingFiles.length} file(s)`);
          }
        }
      } catch (error) {
        console.log(`❌ Error checking files for report ${report.id}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testLoggingImprovements(); 