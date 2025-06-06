require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testChatFrequencyIntegration() {
  console.log('🧪 Testing Chat Frequency Integration\n');

  try {
    // Clean up any existing test projects
    await prisma.project.deleteMany({
      where: {
        name: {
          startsWith: 'Test Frequency Project'
        }
      }
    });

    console.log('🗑️ Cleaned up existing test projects\n');

    // Test different frequency scenarios
    const testScenarios = [
      {
        name: 'Test Frequency Project - Daily',
        email: 'test@example.com',
        frequency: 'daily',
        expectedFreq: 'DAILY'
      },
      {
        name: 'Test Frequency Project - Weekly', 
        email: 'test@example.com',
        frequency: 'weekly',
        expectedFreq: 'WEEKLY'
      },
      {
        name: 'Test Frequency Project - Monthly',
        email: 'test@example.com', 
        frequency: 'monthly',
        expectedFreq: 'MONTHLY'
      },
      {
        name: 'Test Frequency Project - Biweekly',
        email: 'test@example.com',
        frequency: 'bi-weekly',
        expectedFreq: 'BIWEEKLY'
      }
    ];

    console.log('📋 Creating test projects with different frequencies:\n');

    for (const scenario of testScenarios) {
      console.log(`Creating project: ${scenario.name}`);
      console.log(`Frequency input: "${scenario.frequency}"`);

      try {
        // Simulate the chat conversation flow
        const chatMessage = `${scenario.email}\n${scenario.frequency}\n${scenario.name}`;
        
        console.log(`Chat input: ${chatMessage.replace(/\n/g, ' | ')}`);

        // Parse the frequency using our utility
        const { parseFrequency, frequencyToString } = await import('./src/utils/frequencyParser.ts');
        const parsedFrequency = parseFrequency(scenario.frequency);

        console.log(`Parsed frequency: ${parsedFrequency.frequency}`);
        console.log(`Cron expression: ${parsedFrequency.cronExpression}`);
        console.log(`Description: ${parsedFrequency.description}`);

        // Get mock user
        let mockUser = await prisma.user.findFirst({
          where: { email: 'mock@example.com' }
        });
        
        if (!mockUser) {
          mockUser = await prisma.user.create({
            data: {
              email: 'mock@example.com',
              name: 'Mock User'
            }
          });
        }

        // Get competitors
        const competitors = await prisma.competitor.findMany({
          select: { id: true, name: true }
        });

        console.log(`Found ${competitors.length} competitors to assign`);

        // Create project with frequency
        const project = await prisma.project.create({
          data: {
            name: scenario.name,
            description: `Test project created with ${scenario.frequency} frequency`,
            userId: mockUser.id,
            status: 'ACTIVE',
            priority: 'MEDIUM',
            scrapingFrequency: parsedFrequency.frequency,
            userEmail: scenario.email,
            parameters: {
              chatCreated: true,
              userEmail: scenario.email,
              testProject: true,
              originalFrequencyInput: scenario.frequency,
              parsedFrequency: parsedFrequency.frequency,
              cronExpression: parsedFrequency.cronExpression,
              frequencyDescription: parsedFrequency.description
            },
            competitors: {
              connect: competitors.map(c => ({ id: c.id }))
            }
          },
          include: {
            competitors: { select: { id: true, name: true } }
          }
        });

        console.log(`✅ Project created: ${project.id}`);
        console.log(`   Frequency: ${project.scrapingFrequency}`);
        console.log(`   Competitors: ${project.competitors.length}`);
        console.log(`   User Email: ${project.userEmail}`);

        // Verify the frequency was set correctly
        if (project.scrapingFrequency === scenario.expectedFreq) {
          console.log(`✅ Frequency correctly set to ${scenario.expectedFreq}`);
        } else {
          console.log(`❌ Expected ${scenario.expectedFreq}, got ${project.scrapingFrequency}`);
        }

        console.log(''); // Empty line for readability

      } catch (error) {
        console.error(`❌ Error creating project for ${scenario.name}:`, error.message);
      }
    }

    // Query and display all test projects
    console.log('📊 Summary of created test projects:\n');

    const testProjects = await prisma.project.findMany({
      where: {
        name: {
          startsWith: 'Test Frequency Project'
        }
      },
      include: {
        competitors: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    testProjects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Frequency: ${project.scrapingFrequency}`);
      console.log(`   User Email: ${project.userEmail}`);
      console.log(`   Competitors: ${project.competitors.length}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Created: ${project.createdAt.toISOString()}`);
      
      const params = project.parameters;
      if (params?.originalFrequencyInput) {
        console.log(`   Original Input: "${params.originalFrequencyInput}"`);
      }
      if (params?.cronExpression) {
        console.log(`   Cron: ${params.cronExpression}`);
      }
      console.log('');
    });

    console.log(`✅ Integration test completed! Created ${testProjects.length} test projects.`);

    // Test the API endpoint
    console.log('🔗 Testing project scraping API endpoint:\n');

    if (testProjects.length > 0) {
      const testProject = testProjects[0];
      console.log(`Testing with project: ${testProject.name} (${testProject.id})`);

      // Test getting scraping status
      try {
        const { projectScrapingService } = await import('./src/services/projectScrapingService.ts');
        
        const status = await projectScrapingService.getProjectScrapingStatus(testProject.id);
        console.log('Scraping status:', JSON.stringify(status, null, 2));

        // Test manual scraping trigger
        console.log('\n🔧 Testing manual scraping trigger...');
        const manualResult = await projectScrapingService.triggerManualProjectScraping(testProject.id);
        console.log(`Manual scraping result: ${manualResult ? 'Success' : 'Failed'}`);

      } catch (error) {
        console.error('❌ Error testing API:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testChatFrequencyIntegration(); 