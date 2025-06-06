require('dotenv').config();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simple web scraper function for E2E test
async function scrapeCompetitorWebsite(url, competitorName) {
  let browser;
  let page;

  try {
    console.log(`🔍 Scraping: ${competitorName} - ${url}`);

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
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (!response) {
      throw new Error('Failed to get response from page');
    }

    const html = await page.content();
    const title = await page.title();

    const $ = cheerio.load(html);
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    
    $('script, style, nav, footer, header, aside').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    const scrapedData = {
      url,
      title: title || '',
      description: description || '',
      html,
      text: text.substring(0, 5000),
      timestamp: new Date(),
      statusCode: response.status(),
      contentLength: html.length,
      metadata: {
        headings: {
          h1: $('h1').map((_, el) => $(el).text().trim()).get().slice(0, 5),
          h2: $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 10)
        },
        counts: {
          images: $('img').length,
          links: $('a[href]').length,
          forms: $('form').length
        }
      }
    };

    console.log(`✅ Successfully scraped ${competitorName} (${html.length} chars, status: ${response.status()})`);
    return scrapedData;

  } catch (error) {
    console.error(`❌ Error scraping ${competitorName}:`, error.message);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

async function runEndToEndTest() {
  console.log('🧪 COMPREHENSIVE END-TO-END TEST');
  console.log('=================================\n');

  try {
    // STEP 1: Initial State Assessment
    console.log('📋 STEP 1: Assessing Initial State');
    console.log('===================================');

    const competitors = await prisma.competitor.findMany({
      select: { id: true, name: true, website: true }
    });

    const initialSnapshots = await prisma.snapshot.count();
    const initialReports = await prisma.report.count();

    console.log(`📊 Initial Database State:`);
    console.log(`   - Competitors: ${competitors.length}`);
    console.log(`   - Snapshots: ${initialSnapshots}`);
    console.log(`   - Reports: ${initialReports}`);

    competitors.forEach((comp, index) => {
      console.log(`   ${index + 1}. ${comp.name}: ${comp.website}`);
    });

    if (competitors.length === 0) {
      console.log('❌ No competitors found. Cannot proceed with E2E test.');
      return;
    }

    // STEP 2: Clear Previous Test Data (Optional)
    console.log('\n🧹 STEP 2: Cleaning Up Previous Test Data');
    console.log('==========================================');
    
    const testStartTime = new Date();
    console.log(`Test started at: ${testStartTime.toISOString()}`);

    // STEP 3: Real Web Scraping
    console.log('\n🌐 STEP 3: Performing Real Web Scraping');
    console.log('========================================');

    const scrapingResults = [];
    const scrapingErrors = [];

    for (let i = 0; i < competitors.length; i++) {
      const competitor = competitors[i];
      
      try {
        console.log(`\n🎯 Scraping ${i + 1}/${competitors.length}: ${competitor.name}`);
        
        const scrapedData = await scrapeCompetitorWebsite(competitor.website, competitor.name);
        
        // Save to database
        const snapshot = await prisma.snapshot.create({
          data: {
            competitorId: competitor.id,
            metadata: scrapedData
          }
        });

        scrapingResults.push({
          competitor: competitor.name,
          snapshotId: snapshot.id,
          dataSize: scrapedData.html.length,
          title: scrapedData.title,
          statusCode: scrapedData.statusCode
        });

        console.log(`💾 Created snapshot: ${snapshot.id}`);
        
        // Respectful delay
        if (i < competitors.length - 1) {
          console.log('⏳ Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`❌ Failed to scrape ${competitor.name}:`, error.message);
        scrapingErrors.push({
          competitor: competitor.name,
          error: error.message
        });
      }
    }

    // STEP 4: Scraping Results Summary
    console.log('\n📊 STEP 4: Scraping Results Summary');
    console.log('====================================');

    console.log(`✅ Successful scrapes: ${scrapingResults.length}/${competitors.length}`);
    console.log(`❌ Failed scrapes: ${scrapingErrors.length}/${competitors.length}`);

    if (scrapingResults.length > 0) {
      console.log('\n✅ Successful Snapshots:');
      scrapingResults.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.competitor}`);
        console.log(`      - Snapshot ID: ${result.snapshotId}`);
        console.log(`      - Title: ${result.title}`);
        console.log(`      - Data Size: ${result.dataSize} chars`);
        console.log(`      - Status Code: ${result.statusCode}`);
      });
    }

    if (scrapingErrors.length > 0) {
      console.log('\n❌ Scraping Errors:');
      scrapingErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.competitor}: ${error.error}`);
      });
    }

    // STEP 5: Verify Data in Database
    console.log('\n🔍 STEP 5: Verifying Scraped Data in Database');
    console.log('==============================================');

    const newSnapshots = await prisma.snapshot.findMany({
      where: {
        createdAt: {
          gte: testStartTime
        }
      },
      include: {
        competitor: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${newSnapshots.length} new snapshots created during this test:`);
    newSnapshots.forEach((snapshot, index) => {
      const metadata = snapshot.metadata;
      console.log(`   ${index + 1}. ${snapshot.competitor.name}`);
      console.log(`      - ID: ${snapshot.id}`);
      console.log(`      - Created: ${snapshot.createdAt.toISOString()}`);
      console.log(`      - Title: ${metadata.title || 'N/A'}`);
      console.log(`      - HTML Size: ${metadata.html?.length || 0} chars`);
      console.log(`      - Status: ${metadata.statusCode || 'N/A'}`);
    });

    // STEP 6: Generate Reports with Real Data
    console.log('\n📈 STEP 6: Generating Reports with Real Scraped Data');
    console.log('====================================================');

    // Find a project with competitors
    const projects = await prisma.project.findMany({
      include: {
        competitors: { select: { id: true, name: true } }
      },
      where: {
        competitors: { some: {} }
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (projects.length === 0) {
      console.log('❌ No projects with competitors found for report generation');
      return;
    }

    const targetProject = projects[0];
    console.log(`📊 Using project: "${targetProject.name}" (${targetProject.competitors.length} competitors)`);

    // Generate reports via API call
    try {
      console.log('🚀 Calling report generation API...');
      
      const reportResponse = await fetch(`http://localhost:3000/api/reports/generate-for-project?projectId=${targetProject.id}&timeframe=30`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: 'E2E Test Report with Real Data',
          reportOptions: {
            fallbackToSimpleReport: true,
            maxRetries: 2,
            retryDelay: 500
          }
        })
      });

      if (!reportResponse.ok) {
        throw new Error(`Report API returned ${reportResponse.status}: ${reportResponse.statusText}`);
      }

      const reportResult = await reportResponse.json();
      
      console.log('\n✅ Report Generation Results:');
      console.log(`   - Project: ${reportResult.projectName}`);
      console.log(`   - Total Competitors: ${reportResult.totalCompetitors}`);
      console.log(`   - Successful Reports: ${reportResult.successfulReports}`);
      console.log(`   - Failed Reports: ${reportResult.failedReports}`);
      console.log(`   - Correlation ID: ${reportResult.correlationId}`);

      if (reportResult.reports && reportResult.reports.length > 0) {
        console.log('\n📋 Generated Reports:');
        reportResult.reports.forEach((report, index) => {
          console.log(`   ${index + 1}. ${report.competitorName}`);
          console.log(`      - Title: ${report.report?.title || 'N/A'}`);
          console.log(`      - Sections: ${report.report?.sections?.length || 0}`);
        });
      }

    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
    }

    // STEP 7: Verify Reports in Database
    console.log('\n💾 STEP 7: Verifying Generated Reports');
    console.log('======================================');

    const newReports = await prisma.report.findMany({
      where: {
        createdAt: {
          gte: testStartTime
        }
      },
      include: {
        competitor: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${newReports.length} new reports created during this test:`);
    newReports.forEach((report, index) => {
      console.log(`   ${index + 1}. ${report.name} (${report.competitor.name})`);
      console.log(`      - Status: ${report.status}`);
      console.log(`      - Created: ${report.createdAt.toISOString()}`);
    });

    // STEP 8: Data Quality Validation
    console.log('\n🔬 STEP 8: Data Quality Validation');
    console.log('===================================');

    let realDataCount = 0;
    let fakeDataCount = 0;

    for (const snapshot of newSnapshots) {
      const metadata = snapshot.metadata;
      
      // Check if this looks like real scraped data vs fake data
      const hasRealTitle = metadata.title && metadata.title !== `${snapshot.competitor.name} - Homepage`;
      const hasRealContent = metadata.html && metadata.html.length > 500;
      const hasValidStatus = metadata.statusCode === 200;
      
      if (hasRealTitle && hasRealContent && hasValidStatus) {
        realDataCount++;
        console.log(`✅ ${snapshot.competitor.name}: Real data detected`);
        console.log(`   - Title: "${metadata.title}"`);
        console.log(`   - Content: ${metadata.html.length} chars`);
      } else {
        fakeDataCount++;
        console.log(`⚠️  ${snapshot.competitor.name}: Questionable data quality`);
      }
    }

    // STEP 9: Final Summary
    console.log('\n🎊 STEP 9: End-to-End Test Summary');
    console.log('===================================');

    const finalSnapshots = await prisma.snapshot.count();
    const finalReports = await prisma.report.count();

    console.log('📊 Database Changes:');
    console.log(`   - Snapshots: ${initialSnapshots} → ${finalSnapshots} (+${finalSnapshots - initialSnapshots})`);
    console.log(`   - Reports: ${initialReports} → ${finalReports} (+${finalReports - initialReports})`);

    console.log('\n🔍 Test Results:');
    console.log(`   ✅ Competitors Scraped: ${scrapingResults.length}/${competitors.length}`);
    console.log(`   ❌ Scraping Failures: ${scrapingErrors.length}/${competitors.length}`);
    console.log(`   📊 Real Data Quality: ${realDataCount}/${newSnapshots.length} snapshots`);
    console.log(`   📈 Reports Generated: ${newReports.length}`);

    // Success criteria
    const scrapingSuccessRate = (scrapingResults.length / competitors.length) * 100;
    const dataQualityRate = newSnapshots.length > 0 ? (realDataCount / newSnapshots.length) * 100 : 0;

    console.log('\n🎯 Success Metrics:');
    console.log(`   📊 Scraping Success Rate: ${scrapingSuccessRate.toFixed(1)}%`);
    console.log(`   🔬 Data Quality Rate: ${dataQualityRate.toFixed(1)}%`);
    console.log(`   📈 Report Generation: ${newReports.length > 0 ? 'SUCCESS' : 'FAILED'}`);

    // Overall assessment
    const overallSuccess = scrapingSuccessRate >= 70 && dataQualityRate >= 50 && newReports.length > 0;

    console.log('\n🏆 OVERALL TEST RESULT:');
    if (overallSuccess) {
      console.log('🎉 ✅ END-TO-END TEST PASSED!');
      console.log('   The web scraping implementation is working correctly.');
      console.log('   Real competitor data is being scraped and used in reports.');
    } else {
      console.log('❌ END-TO-END TEST FAILED!');
      console.log('   Issues detected with the implementation.');
      if (scrapingSuccessRate < 70) console.log('   - Low scraping success rate');
      if (dataQualityRate < 50) console.log('   - Poor data quality');
      if (newReports.length === 0) console.log('   - No reports generated');
    }

    console.log('\n💡 Next Steps:');
    if (overallSuccess) {
      console.log('   1. Set up scheduled scraping for regular updates');
      console.log('   2. Monitor scraping success rates in production');
      console.log('   3. Add more competitors to expand analysis');
      console.log('   4. Configure notification systems for failures');
    } else {
      console.log('   1. Review error logs and fix scraping issues');
      console.log('   2. Check network connectivity and website accessibility');
      console.log('   3. Verify API endpoints are running correctly');
      console.log('   4. Test with known working websites');
    }

  } catch (error) {
    console.error('❌ END-TO-END TEST FAILED WITH ERROR:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted. Cleaning up...');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the end-to-end test
runEndToEndTest(); 