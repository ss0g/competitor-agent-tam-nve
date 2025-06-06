require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testProjectReportGeneration() {
  try {
    console.log('🧪 Testing Project-Based Report Generation');
    console.log('==========================================\n');

    // 1. Find a project with competitors
    console.log('📋 Step 1: Finding projects with competitors...');
    const projects = await prisma.project.findMany({
      include: {
        competitors: {
          select: {
            id: true,
            name: true,
            website: true
          }
        },
        reports: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (projects.length === 0) {
      console.log('❌ No projects found. Creating a test project...');
      
      // Create a test project with all competitors
      const allCompetitors = await prisma.competitor.findMany({
        select: { id: true, name: true }
      });

      if (allCompetitors.length === 0) {
        console.log('❌ No competitors found in database. Please add competitors first.');
        return;
      }

      // Get or create mock user
      const DEFAULT_USER_EMAIL = 'mock@example.com';
      let mockUser = await prisma.user.findFirst({
        where: { email: DEFAULT_USER_EMAIL }
      });
      
      if (!mockUser) {
        mockUser = await prisma.user.create({
          data: {
            email: DEFAULT_USER_EMAIL,
            name: 'Mock User'
          }
        });
      }

      const testProject = await prisma.project.create({
        data: {
          name: 'Test Project for Report Generation',
          description: 'Test project created to verify project-based report generation',
          userId: mockUser.id,
          status: 'DRAFT',
          priority: 'MEDIUM',
          parameters: {
            testProject: true,
            autoAssignedCompetitors: true,
            competitorCount: allCompetitors.length
          },
          competitors: {
            connect: allCompetitors.map(competitor => ({ id: competitor.id }))
          }
        },
        include: {
          competitors: {
            select: {
              id: true,
              name: true,
              website: true
            }
          }
        }
      });

      projects.push(testProject);
      console.log(`✅ Created test project "${testProject.name}" with ${allCompetitors.length} competitors`);
    }

    // 2. Select the first project with competitors
    const targetProject = projects.find(p => p.competitors.length > 0);
    
    if (!targetProject) {
      console.log('❌ No projects with competitors found.');
      return;
    }

    console.log(`\n📊 Selected Project: "${targetProject.name}"`);
    console.log(`   - ID: ${targetProject.id}`);
    console.log(`   - Competitors: ${targetProject.competitors.length}`);
    console.log(`   - Competitor Names: ${targetProject.competitors.map(c => c.name).join(', ')}`);
    console.log(`   - Existing Reports: ${targetProject.reports.length}`);

    // 3. Check current reports before generation
    console.log('\n📈 Step 2: Checking existing reports...');
    const existingReports = await prisma.report.findMany({
      where: { projectId: targetProject.id },
      include: {
        competitor: {
          select: { name: true }
        }
      }
    });

    console.log(`Found ${existingReports.length} existing reports for this project:`);
    existingReports.forEach((report, index) => {
      console.log(`   ${index + 1}. ${report.name} (${report.competitor.name}) - ${report.status}`);
    });

    // 4. Generate reports for all competitors in the project
    console.log('\n🚀 Step 3: Generating reports for all competitors...');
    console.log(`Calling: POST /api/reports/generate-for-project?projectId=${targetProject.id}&timeframe=30`);
    
    const startTime = Date.now();
    
    const response = await fetch(`http://localhost:3000/api/reports/generate-for-project?projectId=${targetProject.id}&timeframe=30`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportName: 'Multi-Competitor Analysis Test',
        reportOptions: {
          fallbackToSimpleReport: true,
          maxRetries: 2,
          retryDelay: 500
        }
      })
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n⏱️  Request completed in ${duration.toFixed(2)} seconds`);
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Request failed:');
      console.log(JSON.stringify(errorData, null, 2));
      return;
    }

    const result = await response.json();
    
    // 5. Display results
    console.log('\n✅ Step 4: Report Generation Results');
    console.log('=====================================');
    console.log(`Project: ${result.projectName} (${result.projectId})`);
    console.log(`Total Competitors: ${result.totalCompetitors}`);
    console.log(`Successful Reports: ${result.successfulReports}`);
    console.log(`Failed Reports: ${result.failedReports}`);
    console.log(`Correlation ID: ${result.correlationId}`);

    if (result.reports && result.reports.length > 0) {
      console.log('\n📋 Successfully Generated Reports:');
      result.reports.forEach((report, index) => {
        console.log(`   ${index + 1}. ${report.competitorName} (${report.competitorId})`);
        console.log(`      - Title: ${report.report?.title || 'N/A'}`);
        console.log(`      - Sections: ${report.report?.sections?.length || 0}`);
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Failed Reports:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.competitorName} (${error.competitorId})`);
        console.log(`      - Error: ${error.error}`);
      });
    }

    // 6. Verify reports were saved to database
    console.log('\n🔍 Step 5: Verifying reports in database...');
    const newReports = await prisma.report.findMany({
      where: { 
        projectId: targetProject.id,
        createdAt: {
          gte: new Date(startTime)
        }
      },
      include: {
        competitor: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${newReports.length} new reports in database:`);
    newReports.forEach((report, index) => {
      console.log(`   ${index + 1}. ${report.name} (${report.competitor.name})`);
      console.log(`      - Status: ${report.status}`);
      console.log(`      - Created: ${report.createdAt.toISOString()}`);
    });

    // 7. Summary
    console.log('\n📊 Summary');
    console.log('===========');
    console.log(`✅ Project-based report generation ${result.success ? 'SUCCESSFUL' : 'FAILED'}`);
    console.log(`📈 Generated ${result.successfulReports}/${result.totalCompetitors} reports`);
    console.log(`💾 Saved ${newReports.length} reports to database`);
    
    if (result.successfulReports === result.totalCompetitors) {
      console.log('🎉 ALL COMPETITORS NOW HAVE REPORTS! The issue has been resolved.');
    } else if (result.successfulReports > 0) {
      console.log('⚠️  Partial success - some competitors have reports, others failed.');
    } else {
      console.log('❌ No reports were generated successfully.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testProjectReportGeneration(); 