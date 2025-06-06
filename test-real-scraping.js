require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Import the compiled JavaScript version
const { webScraperService } = require('./dist/src/services/webScraper.js');

const prisma = new PrismaClient();

async function testRealWebScraping() {
  try {
    console.log('🌐 Testing Real Web Scraping Functionality');
    console.log('==========================================\n');

    // 1. Initialize the web scraper
    console.log('🚀 Step 1: Initializing web scraper...');
    await webScraperService.initialize();
    
    // 2. Get competitors from database
    console.log('\n📋 Step 2: Getting competitors from database...');
    const competitors = await prisma.competitor.findMany({
      select: {
        id: true,
        name: true,
        website: true
      }
    });

    if (competitors.length === 0) {
      console.log('❌ No competitors found in database');
      return;
    }

    console.log(`Found ${competitors.length} competitors:`);
    competitors.forEach((comp, index) => {
      console.log(`   ${index + 1}. ${comp.name}: ${comp.website}`);
    });

    // 3. Test scraping options
    const scrapingOptions = {
      timeout: 30000,
      retries: 2,
      retryDelay: 1000,
      blockedResourceTypes: ['image', 'font', 'media'], // Speed up scraping
      enableJavaScript: true
    };

    console.log('\n🔧 Scraping Options:');
    console.log(`   - Timeout: ${scrapingOptions.timeout}ms`);
    console.log(`   - Retries: ${scrapingOptions.retries}`);
    console.log(`   - Blocked Resources: ${scrapingOptions.blockedResourceTypes.join(', ')}`);

    // 4. Test scraping a single competitor first
    console.log('\n🎯 Step 3: Testing single competitor scraping...');
    const testCompetitor = competitors[0];
    console.log(`Testing with: ${testCompetitor.name} (${testCompetitor.website})`);

    try {
      const startTime = Date.now();
      const snapshotId = await webScraperService.scrapeCompetitor(testCompetitor.id, scrapingOptions);
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log(`✅ Successfully scraped ${testCompetitor.name}`);
      console.log(`   - Snapshot ID: ${snapshotId}`);
      console.log(`   - Duration: ${duration.toFixed(2)} seconds`);

      // Verify the snapshot was created
      const snapshot = await prisma.snapshot.findUnique({
        where: { id: snapshotId },
        include: {
          competitor: {
            select: { name: true }
          }
        }
      });

      if (snapshot) {
        const metadata = snapshot.metadata;
        console.log(`\n📊 Scraped Data Summary:`);
        console.log(`   - Title: ${metadata.title || 'N/A'}`);
        console.log(`   - Description: ${(metadata.description || '').substring(0, 100)}...`);
        console.log(`   - HTML Length: ${metadata.html?.length || 0} characters`);
        console.log(`   - Text Length: ${metadata.text?.length || 0} characters`);
        console.log(`   - Status Code: ${metadata.statusCode || 'N/A'}`);
        console.log(`   - Images Found: ${metadata.images?.length || 0}`);
        console.log(`   - Links Found: ${metadata.links?.length || 0}`);
        console.log(`   - Timestamp: ${metadata.timestamp || 'N/A'}`);
        
        if (metadata.metadata) {
          console.log(`   - Headings (H1): ${metadata.metadata.headings?.h1?.length || 0}`);
          console.log(`   - Headings (H2): ${metadata.metadata.headings?.h2?.length || 0}`);
          console.log(`   - Forms: ${metadata.metadata.forms || 0}`);
          console.log(`   - Buttons: ${metadata.metadata.buttons || 0}`);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to scrape ${testCompetitor.name}:`, error.message);
    }

    // 5. Option to scrape all competitors
    console.log('\n🤔 Step 4: Scrape all competitors? (This will take longer)');
    console.log('Note: This will scrape all competitors and create snapshots for each');
    
    // For demo purposes, let's just scrape all competitors
    // In a real scenario, you might want user confirmation
    const shouldScrapeAll = true; // Set to false if you want to skip this step

    if (shouldScrapeAll && competitors.length > 1) {
      console.log('\n🌐 Step 5: Scraping all competitors...');
      console.log('⚠️  This may take a while depending on the number of competitors');
      
      const allStartTime = Date.now();
      
      try {
        const snapshotIds = await webScraperService.scrapeAllCompetitors(scrapingOptions);
        
        const allEndTime = Date.now();
        const totalDuration = (allEndTime - allStartTime) / 1000;
        
        console.log(`\n✅ Batch scraping completed!`);
        console.log(`   - Total time: ${totalDuration.toFixed(2)} seconds`);
        console.log(`   - Successful snapshots: ${snapshotIds.length}`);
        console.log(`   - Average time per site: ${(totalDuration / competitors.length).toFixed(2)} seconds`);
        
        // Verify all snapshots
        const recentSnapshots = await prisma.snapshot.findMany({
          where: {
            createdAt: {
              gte: new Date(allStartTime)
            }
          },
          include: {
            competitor: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        console.log(`\n📊 Recent Snapshots Created:`);
        recentSnapshots.forEach((snapshot, index) => {
          const metadata = snapshot.metadata;
          console.log(`   ${index + 1}. ${snapshot.competitor.name}`);
          console.log(`      - Title: ${metadata.title || 'N/A'}`);
          console.log(`      - HTML: ${metadata.html?.length || 0} chars`);
          console.log(`      - Status: ${metadata.statusCode || 'N/A'}`);
          console.log(`      - Created: ${snapshot.createdAt.toISOString()}`);
        });
        
      } catch (error) {
        console.error('❌ Error during batch scraping:', error.message);
      }
    } else {
      console.log('⏭️  Skipping batch scraping (only 1 competitor or disabled)');
    }

    // 6. Compare with old fake data approach
    console.log('\n🔄 Step 6: Comparison with previous approach');
    console.log('============================================');
    console.log('Previous approach (fake data):');
    console.log('   ✅ Fast and reliable');
    console.log('   ❌ Not real competitor data');
    console.log('   ❌ No actual insights from real websites');
    console.log('');
    console.log('New approach (real scraping):');
    console.log('   ✅ Real competitor data');
    console.log('   ✅ Actual website content and structure');
    console.log('   ✅ Real-time competitive intelligence');
    console.log('   ⚠️  Slower (network dependent)');
    console.log('   ⚠️  May fail if websites are down/protected');

    console.log('\n🎊 Real web scraping test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await webScraperService.close();
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await webScraperService.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await webScraperService.close();
  await prisma.$disconnect();
  process.exit(0);
});

// Run the test
testRealWebScraping(); 