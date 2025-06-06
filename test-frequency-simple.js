require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simple frequency parser for testing
function parseFrequency(input) {
  const normalizedInput = input.toLowerCase().trim();

  const frequencyMappings = [
    {
      patterns: ['biweekly', 'bi-weekly', 'every two weeks', 'every 2 weeks', 'twice a month'],
      frequency: 'BIWEEKLY',
      cronExpression: '0 9 * * 1/2',
      description: 'Bi-weekly scraping every other Monday at 9:00 AM'
    },
    {
      patterns: ['daily', 'every day', 'day', 'daily reports'],
      frequency: 'DAILY',
      cronExpression: '0 9 * * *',
      description: 'Daily scraping at 9:00 AM'
    },
    {
      patterns: ['weekly', 'every week', 'week', 'weekly reports', 'once a week'],
      frequency: 'WEEKLY',
      cronExpression: '0 9 * * 1',
      description: 'Weekly scraping on Mondays at 9:00 AM'
    },
    {
      patterns: ['monthly', 'every month', 'month', 'monthly reports', 'once a month'],
      frequency: 'MONTHLY',
      cronExpression: '0 9 1 * *',
      description: 'Monthly scraping on the 1st at 9:00 AM'
    }
  ];

  for (const mapping of frequencyMappings) {
    if (mapping.patterns.some(pattern => normalizedInput.includes(pattern))) {
      return {
        frequency: mapping.frequency,
        cronExpression: mapping.cronExpression,
        description: mapping.description
      };
    }
  }

  // Default to weekly
  return {
    frequency: 'WEEKLY',
    cronExpression: '0 9 * * 1',
    description: 'Weekly scraping on Mondays at 9:00 AM (default)'
  };
}

async function testFrequencyIntegration() {
  console.log('🧪 Testing Chat Frequency Integration (Simple Test)\n');

  try {
    // Test frequency parsing
    console.log('📝 Testing frequency parsing:\n');

    const testInputs = [
      'daily',
      'weekly', 
      'monthly',
      'bi-weekly',
      'every week',
      'invalid input'
    ];

    testInputs.forEach(input => {
      const parsed = parseFrequency(input);
      console.log(`Input: "${input}"`);
      console.log(`  → Frequency: ${parsed.frequency}`);
      console.log(`  → Cron: ${parsed.cronExpression}`);
      console.log(`  → Description: ${parsed.description}`);
      console.log();
    });

    // Test project creation with frequency
    console.log('📋 Testing project creation with frequency:\n');

    // Clean up existing test projects
    await prisma.project.deleteMany({
      where: {
        name: { startsWith: 'Test Chat Frequency' }
      }
    });

    // Get or create mock user
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

    console.log(`Found ${competitors.length} competitors`);

    // Test creating a project with weekly frequency
    const frequencyInput = 'weekly';
    const parsedFrequency = parseFrequency(frequencyInput);

    console.log(`Simulating chat input: user@example.com | ${frequencyInput} | Test Project`);
    console.log(`Parsed frequency: ${parsedFrequency.frequency}`);

    const project = await prisma.project.create({
      data: {
        name: 'Test Chat Frequency Project',
        description: `Test project with ${frequencyInput} frequency`,
        userId: mockUser.id,
        status: 'ACTIVE',
        priority: 'MEDIUM',
        scrapingFrequency: parsedFrequency.frequency,
        userEmail: 'user@example.com',
        parameters: {
          chatCreated: true,
          userEmail: 'user@example.com',
          testProject: true,
          originalFrequencyInput: frequencyInput,
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

    console.log(`✅ Project created successfully!`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Name: ${project.name}`);
    console.log(`   Frequency: ${project.scrapingFrequency}`);
    console.log(`   User Email: ${project.userEmail}`);
    console.log(`   Competitors: ${project.competitors.length}`);
    console.log(`   Status: ${project.status}`);

    // Verify parameters were stored correctly
    const params = project.parameters;
    console.log('\n📋 Stored parameters:');
    console.log(`   Original input: "${params.originalFrequencyInput}"`);
    console.log(`   Parsed frequency: ${params.parsedFrequency}`);
    console.log(`   Cron expression: ${params.cronExpression}`);
    console.log(`   Description: ${params.frequencyDescription}`);

    console.log('\n✅ Test completed successfully!');
    
    // Test what happens when the chat interface processes this
    console.log('\n💬 Simulating chat conversation flow:');
    console.log('User input: "user@example.com\\nweekly\\nMy Weekly Report"');
    
    // Parse the simulated input as the chat would
    const lines = 'user@example.com\nweekly\nMy Weekly Report'.split('\n').map(line => line.trim()).filter(line => line);
    const [email, frequency, reportName] = lines;
    
    console.log(`   Extracted email: ${email}`);
    console.log(`   Extracted frequency: ${frequency}`);
    console.log(`   Extracted report name: ${reportName}`);
    
    const chatParsedFreq = parseFrequency(frequency);
    console.log(`   Chat would parse frequency as: ${chatParsedFreq.frequency}`);
    console.log(`   Chat would set cron expression: ${chatParsedFreq.cronExpression}`);
    
    console.log('\n🎯 This demonstrates the complete chat frequency parsing flow!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrequencyIntegration(); 