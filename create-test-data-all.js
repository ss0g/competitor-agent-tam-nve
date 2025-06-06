const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestDataForAllCompetitors() {
  try {
    console.log('Creating test data for ALL competitors...');
    
    // Get all competitors
    const competitors = await prisma.competitor.findMany();
    if (competitors.length === 0) {
      console.log('No competitors found in database.');
      return;
    }
    
    console.log(`Found ${competitors.length} competitors:`);
    competitors.forEach(c => console.log(`- ${c.name} (${c.id})`));
    
    for (const competitor of competitors) {
      console.log(`\n📊 Creating data for: ${competitor.name}`);
      
      // Check if competitor already has data
      const existingSnapshots = await prisma.snapshot.count({
        where: { competitorId: competitor.id }
      });
      
      if (existingSnapshots > 0) {
        console.log(`  ℹ️  Already has ${existingSnapshots} snapshots, skipping...`);
        continue;
      }
      
      // Create test snapshots with competitor-specific content
      const testSnapshots = [
        {
          metadata: {
            url: competitor.website,
            title: `${competitor.name} - Homepage`,
            description: `Welcome to ${competitor.name} - your trusted partner`,
            html: `<html><head><title>${competitor.name}</title></head><body><h1>Welcome to ${competitor.name}</h1><p>We provide excellent products and services in the industry.</p></body></html>`,
            text: `Welcome to ${competitor.name}\nWe provide excellent products and services in the industry.`,
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            statusCode: 200,
            headers: { 'content-type': 'text/html' },
            contentLength: 150
          }
        },
        {
          metadata: {
            url: competitor.website,
            title: `${competitor.name} - Updated Homepage`,
            description: `${competitor.name} - Now with enhanced features`,
            html: `<html><head><title>${competitor.name}</title></head><body><h1>Welcome to ${competitor.name}</h1><p>We provide excellent products and services. NEW: Advanced analytics platform!</p></body></html>`,
            text: `Welcome to ${competitor.name}\nWe provide excellent products and services. NEW: Advanced analytics platform!`,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            statusCode: 200,
            headers: { 'content-type': 'text/html' },
            contentLength: 180
          }
        },
        {
          metadata: {
            url: competitor.website,
            title: `${competitor.name} - Latest Updates`,
            description: `${competitor.name} - Leading innovation in the industry`,
            html: `<html><head><title>${competitor.name}</title></head><body><h1>Welcome to ${competitor.name}</h1><p>We provide excellent products and services. Latest: AI-powered insights and premium support!</p></body></html>`,
            text: `Welcome to ${competitor.name}\nWe provide excellent products and services. Latest: AI-powered insights and premium support!`,
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
        console.log(`  ✅ Created snapshot: ${snapshot.id}`);
      }
      
      // Create test analyses for each snapshot
      for (let i = 0; i < createdSnapshots.length; i++) {
        const snapshot = createdSnapshots[i];
        const analysisData = {
          primary: {
            summary: `Analysis ${i + 1} for ${competitor.name}: Detected ${i === 0 ? 'baseline' : i === 1 ? 'moderate' : 'significant'} changes in digital presence`,
            keyChanges: i === 0 ? [] : [
              `${competitor.name} added new feature: ${i === 1 ? 'Advanced analytics platform' : 'AI-powered insights'}`,
              'Updated website messaging',
              'Enhanced user experience'
            ],
            marketingChanges: i === 0 ? [] : [
              'Improved value proposition',
              'Updated marketing copy',
              'New call-to-action elements'
            ],
            productChanges: i === 0 ? [] : [
              `New offering: ${i === 1 ? 'Analytics dashboard' : 'Premium support package'}`
            ],
            competitiveInsights: [
              `${competitor.name} is investing in technology advancement`,
              'Strong focus on data-driven solutions',
              'Competitive positioning in premium market'
            ],
            suggestedActions: [
              `Monitor ${competitor.name}'s feature development`,
              'Analyze their pricing strategy',
              'Consider similar feature offerings'
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
        console.log(`  ✅ Created analysis: ${analysis.id}`);
      }
      
      console.log(`  🎉 Completed data creation for ${competitor.name}`);
    }
    
    console.log('\n🎊 Test data creation completed for ALL competitors!');
    
    // Final verification
    console.log('\n📊 Final Verification:');
    for (const competitor of competitors) {
      const snapshots = await prisma.snapshot.count({
        where: { competitorId: competitor.id }
      });
      const analyses = await prisma.analysis.count({
        where: { competitorId: competitor.id }
      });
      console.log(`- ${competitor.name}: ${snapshots} snapshots, ${analyses} analyses`);
    }
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestDataForAllCompetitors(); 