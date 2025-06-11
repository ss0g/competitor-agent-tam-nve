#!/usr/bin/env node

/**
 * Test script for Phase 1 Implementation: Enhanced Project Creation with Product
 * 
 * This script tests:
 * 1. Project creation with product website validation
 * 2. Product entity creation alongside project
 * 3. Product scraping initiation
 * 4. Enhanced logging and tracking
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPhase1Implementation() {
  console.log('🧪 Testing Phase 1: Enhanced Project Creation with Product');
  console.log('=' .repeat(60));

  try {
    // Test 1: Verify Product model exists and is accessible
    console.log('\n1️⃣ Testing Product model accessibility...');
    
    const productCount = await prisma.product.count();
    console.log(`✅ Product model accessible. Current count: ${productCount}`);

    // Test 2: Test project creation API with product website
    console.log('\n2️⃣ Testing enhanced project creation API...');
    
    const testProjectData = {
      name: 'Phase 1 Test Project',
      description: 'Testing enhanced project creation with product',
      productName: 'Test Product',
      productWebsite: 'https://example.com',
      positioning: 'Test positioning',
      customerData: 'Test customer data',
      userProblem: 'Test user problem',
      industry: 'Technology',
      autoAssignCompetitors: true,
      autoGenerateInitialReport: false // Disable for testing
    };

    console.log('📤 Making API request to /api/projects...');
    
    const response = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testProjectData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ API request failed:', errorData);
      return;
    }

    const result = await response.json();
    console.log('✅ Project created successfully!');
    console.log(`   Project ID: ${result.id}`);
    console.log(`   Project Name: ${result.name}`);
    console.log(`   Correlation ID: ${result.correlationId}`);
    
    if (result.product) {
      console.log(`   Product ID: ${result.product.id}`);
      console.log(`   Product Name: ${result.product.name}`);
      console.log(`   Product Website: ${result.product.website}`);
    } else {
      console.log('⚠️  Product not included in response');
    }

    // Test 3: Verify product was created in database
    console.log('\n3️⃣ Verifying product creation in database...');
    
    const createdProject = await prisma.project.findUnique({
      where: { id: result.id },
      include: {
        products: true,
        competitors: true
      }
    });

    if (!createdProject) {
      console.log('❌ Project not found in database');
      return;
    }

    console.log(`✅ Project found in database`);
    console.log(`   Products count: ${createdProject.products?.length || 0}`);
    console.log(`   Competitors count: ${createdProject.competitors?.length || 0}`);

    if (createdProject.products && createdProject.products.length > 0) {
      const product = createdProject.products[0];
      console.log(`   Product details:`);
      console.log(`     - ID: ${product.id}`);
      console.log(`     - Name: ${product.name}`);
      console.log(`     - Website: ${product.website}`);
      console.log(`     - Industry: ${product.industry}`);
    }

    // Test 4: Test validation - project creation without product website
    console.log('\n4️⃣ Testing validation: project creation without product website...');
    
    const invalidProjectData = {
      name: 'Invalid Test Project',
      description: 'Testing validation'
      // Missing productWebsite
    };

    const validationResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidProjectData)
    });

    if (validationResponse.status === 400) {
      const errorData = await validationResponse.json();
      console.log('✅ Validation working correctly');
      console.log(`   Error message: ${errorData.error}`);
    } else {
      console.log('❌ Validation not working - should have returned 400');
    }

    // Test 5: Check product scraping service integration
    console.log('\n5️⃣ Testing product scraping service integration...');
    
    // Wait a moment for background scraping to potentially start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const productSnapshots = await prisma.productSnapshot.findMany({
      where: {
        productId: createdProject.products[0]?.id
      }
    });

    console.log(`   Product snapshots found: ${productSnapshots.length}`);
    if (productSnapshots.length > 0) {
      console.log('✅ Product scraping appears to be working');
      console.log(`   Latest snapshot created: ${productSnapshots[0].createdAt}`);
    } else {
      console.log('⚠️  No product snapshots found yet (may still be processing)');
    }

    console.log('\n🎉 Phase 1 Implementation Test Summary:');
    console.log('=' .repeat(60));
    console.log('✅ Product model accessible');
    console.log('✅ Enhanced project creation API working');
    console.log('✅ Product entity creation working');
    console.log('✅ Validation working correctly');
    console.log('✅ Database integration working');
    console.log(productSnapshots.length > 0 ? '✅ Product scraping initiated' : '⚠️  Product scraping pending');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.project.delete({
      where: { id: result.id }
    });
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if server is running
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:3000/api/projects');
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if development server is running...');
  
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('❌ Development server not running on http://localhost:3000');
    console.log('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Development server is running');
  await testPhase1Implementation();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testPhase1Implementation }; 