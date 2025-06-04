const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('Creating test data for competitor analysis...');
    
    // Get the existing competitor
    const competitor = await prisma.competitor.findFirst();
    if (!competitor) {
      console.log('No competitor found. Creating a test competitor...');
      const newCompetitor = await prisma.competitor.create({
        data: {
          name: 'Test Competitor',
          website: 'https://example.com',
          industry: 'Technology',
          description: 'A test competitor for demonstration purposes'
        }
      });
      console.log('Created competitor:', newCompetitor.id);
      return;
    }
    
    console.log(`Found competitor: ${competitor.name} (${competitor.id})`);
    
    // Create some test snapshots
    console.log('Creating test snapshots...');
    
    const testSnapshots = [
      {
        metadata: {
          url: competitor.website,
          title: 'Test Competitor - Homepage',
          description: 'Welcome to our test competitor website',
          html: '<html><head><title>Test Competitor</title></head><body><h1>Welcome to Test Competitor</h1><p>We offer amazing products and services.</p></body></html>',
          text: 'Welcome to Test Competitor\nWe offer amazing products and services.',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          statusCode: 200,
          headers: { 'content-type': 'text/html' },
          contentLength: 150
        }
      },
      {
        metadata: {
          url: competitor.website,
          title: 'Test Competitor - Updated Homepage',
          description: 'Welcome to our improved test competitor website',
          html: '<html><head><title>Test Competitor</title></head><body><h1>Welcome to Test Competitor</h1><p>We offer amazing products and services. New feature: AI-powered analytics!</p></body></html>',
          text: 'Welcome to Test Competitor\nWe offer amazing products and services. New feature: AI-powered analytics!',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          statusCode: 200,
          headers: { 'content-type': 'text/html' },
          contentLength: 180
        }
      },
      {
        metadata: {
          url: competitor.website,
          title: 'Test Competitor - Latest Updates',
          description: 'Welcome to our cutting-edge test competitor website',
          html: '<html><head><title>Test Competitor</title></head><body><h1>Welcome to Test Competitor</h1><p>We offer amazing products and services. New features: AI-powered analytics and real-time reporting!</p></body></html>',
          text: 'Welcome to Test Competitor\nWe offer amazing products and services. New features: AI-powered analytics and real-time reporting!',
          timestamp: new Date(), // Now
          statusCode: 200,
          headers: { 'content-type': 'text/html' },
          contentLength: 200
        }
      }
    ];
    
    const createdSnapshots = [];
    for (const snapshotData of testSnapshots) {
      const snapshot = await prisma.snapshot.create({
        data: {
          competitorId: competitor.id,
          metadata: snapshotData.metadata
        }
      });
      createdSnapshots.push(snapshot);
      console.log(`Created snapshot: ${snapshot.id} (${snapshotData.metadata.timestamp})`);
    }
    
    // Create some test analyses
    console.log('Creating test analyses...');
    
    for (let i = 0; i < createdSnapshots.length; i++) {
      const snapshot = createdSnapshots[i];
      const analysisData = {
        primary: {
          summary: `Analysis ${i + 1}: Detected ${i === 0 ? 'initial' : i === 1 ? 'moderate' : 'significant'} changes in website content`,
          keyChanges: i === 0 ? [] : [
            `Added new feature: ${i === 1 ? 'AI-powered analytics' : 'real-time reporting'}`,
            'Updated homepage messaging',
            'Improved user experience'
          ],
          marketingChanges: i === 0 ? [] : [
            'Enhanced value proposition',
            'Updated call-to-action buttons'
          ],
          productChanges: i === 0 ? [] : [
            `New product feature: ${i === 1 ? 'Analytics dashboard' : 'Reporting suite'}`
          ],
          competitiveInsights: [
            'Competitor is investing in new technology',
            'Focus on data-driven solutions'
          ],
          suggestedActions: [
            'Monitor their new feature rollout',
            'Consider similar feature development'
          ]
        }
      };
      
      const analysis = await prisma.analysis.create({
        data: {
          competitorId: competitor.id,
          snapshotId: snapshot.id,
          data: analysisData,
          timestamp: testSnapshots[i].metadata.timestamp
        }
      });
      console.log(`Created analysis: ${analysis.id} for snapshot ${snapshot.id}`);
    }
    
    console.log('Test data creation completed successfully!');
    
    // Verify the data
    const updatedCompetitor = await prisma.competitor.findUnique({
      where: { id: competitor.id },
      include: {
        snapshots: {
          include: {
            analyses: true
          }
        }
      }
    });
    
    console.log(`\nVerification:`);
    console.log(`- Competitor: ${updatedCompetitor.name}`);
    console.log(`- Snapshots: ${updatedCompetitor.snapshots.length}`);
    console.log(`- Total analyses: ${updatedCompetitor.snapshots.reduce((sum, s) => sum + s.analyses.length, 0)}`);
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData(); 