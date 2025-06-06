require('dotenv').config();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function scrapeCompetitorWebsite(url, competitorName) {
  let browser;
  let page;

  try {
    console.log(`🔍 Scraping: ${competitorName} - ${url}`);

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Block images and fonts to speed up scraping
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate to the page
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (!response) {
      throw new Error('Failed to get response from page');
    }

    // Get page content
    const html = await page.content();
    const title = await page.title();

    // Use Cheerio to extract data
    const $ = cheerio.load(html);
    
    // Extract meta description
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       '';

    // Extract text content
    $('script, style, nav, footer, header, aside').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    // Extract headings
    const h1Headings = $('h1').map((_, el) => $(el).text().trim()).get();
    const h2Headings = $('h2').map((_, el) => $(el).text().trim()).get();

    // Count various elements
    const imageCount = $('img').length;
    const linkCount = $('a[href]').length;
    const formCount = $('form').length;

    const scrapedData = {
      url,
      title: title || '',
      description: description || '',
      html,
      text: text.substring(0, 5000), // Limit text length for demo
      timestamp: new Date(),
      statusCode: response.status(),
      contentLength: html.length,
      metadata: {
        headings: {
          h1: h1Headings.slice(0, 5), // Limit headings
          h2: h2Headings.slice(0, 10)
        },
        counts: {
          images: imageCount,
          links: linkCount,
          forms: formCount
        },
        ogData: {
          title: $('meta[property="og:title"]').attr('content') || '',
          image: $('meta[property="og:image"]').attr('content') || '',
          url: $('meta[property="og:url"]').attr('content') || ''
        }
      }
    };

    console.log(`✅ Successfully scraped ${competitorName}`);
    console.log(`   - Title: ${title}`);
    console.log(`   - HTML Length: ${html.length} chars`);
    console.log(`   - Text Length: ${text.length} chars`);
    console.log(`   - Status Code: ${response.status()}`);
    console.log(`   - H1 Headings: ${h1Headings.length}`);
    console.log(`   - Images: ${imageCount}, Links: ${linkCount}, Forms: ${formCount}`);

    return scrapedData;

  } catch (error) {
    console.error(`❌ Error scraping ${competitorName}:`, error.message);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

async function testRealWebScrapingSimple() {
  try {
    console.log('🌐 Testing Real Web Scraping (Simple Version)');
    console.log('===============================================\n');

    // 1. Get competitors from database
    console.log('📋 Step 1: Getting competitors from database...');
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

    // 2. Test scraping the first competitor
    console.log('\n🎯 Step 2: Testing single competitor scraping...');
    const testCompetitor = competitors[0];

    try {
      const scrapedData = await scrapeCompetitorWebsite(testCompetitor.website, testCompetitor.name);

      // 3. Save scraped data to database
      console.log('\n💾 Step 3: Saving scraped data to database...');
      const snapshot = await prisma.snapshot.create({
        data: {
          competitorId: testCompetitor.id,
          metadata: scrapedData
        }
      });

      console.log(`✅ Created snapshot: ${snapshot.id}`);

      // 4. Verify the snapshot
      console.log('\n📊 Step 4: Verifying saved data...');
      const savedSnapshot = await prisma.snapshot.findUnique({
        where: { id: snapshot.id },
        include: {
          competitor: { select: { name: true } }
        }
      });

      if (savedSnapshot) {
        const metadata = savedSnapshot.metadata;
        console.log('✅ Snapshot verification successful:');
        console.log(`   - Competitor: ${savedSnapshot.competitor.name}`);
        console.log(`   - Created: ${savedSnapshot.createdAt.toISOString()}`);
        console.log(`   - Title: ${metadata.title}`);
        console.log(`   - Description: ${(metadata.description || '').substring(0, 100)}...`);
        console.log(`   - HTML Size: ${metadata.html?.length || 0} characters`);
        console.log(`   - Status Code: ${metadata.statusCode}`);
        
        if (metadata.metadata) {
          console.log(`   - H1 Headings: ${metadata.metadata.headings?.h1?.length || 0}`);
          console.log(`   - Images: ${metadata.metadata.counts?.images || 0}`);
          console.log(`   - Links: ${metadata.metadata.counts?.links || 0}`);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to process ${testCompetitor.name}:`, error.message);
    }

    // 5. Optional: Scrape all competitors
    const shouldScrapeAll = false; // Set to true to scrape all competitors

    if (shouldScrapeAll && competitors.length > 1) {
      console.log('\n🌐 Step 5: Scraping all competitors...');
      
      const results = [];
      const errors = [];

      for (let i = 0; i < competitors.length; i++) {
        const competitor = competitors[i];
        
        try {
          console.log(`\n🎯 Processing ${i + 1}/${competitors.length}: ${competitor.name}`);
          
          const scrapedData = await scrapeCompetitorWebsite(competitor.website, competitor.name);
          
          const snapshot = await prisma.snapshot.create({
            data: {
              competitorId: competitor.id,
              metadata: scrapedData
            }
          });

          results.push({ competitor: competitor.name, snapshotId: snapshot.id });
          
          // Add delay between requests
          if (i < competitors.length - 1) {
            console.log('⏳ Waiting 2 seconds before next request...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          console.error(`❌ Failed to scrape ${competitor.name}:`, error.message);
          errors.push({ competitor: competitor.name, error: error.message });
        }
      }

      console.log(`\n📊 Batch Scraping Results:`);
      console.log(`✅ Successful: ${results.length}/${competitors.length}`);
      console.log(`❌ Failed: ${errors.length}/${competitors.length}`);

      if (results.length > 0) {
        console.log('\n✅ Successful snapshots:');
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.competitor}: ${result.snapshotId}`);
        });
      }

      if (errors.length > 0) {
        console.log('\n❌ Errors:');
        errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.competitor}: ${error.error}`);
        });
      }
    }

    console.log('\n🎊 Real web scraping test completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Run the report generation to see real scraped data in reports');
    console.log('   2. Set up scheduled scraping for regular updates');
    console.log('   3. Compare real data vs. fake test data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the test
testRealWebScrapingSimple(); 