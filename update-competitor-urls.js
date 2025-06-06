const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCompetitors() {
  try {
    console.log('🔧 Updating competitor URLs to real websites...');
    
    // First get the competitors to find their IDs
    const competitors = await prisma.competitor.findMany({
      select: { id: true, name: true, website: true }
    });
    
    console.log('📋 Current competitors:');
    competitors.forEach((comp, index) => {
      console.log(`   ${index + 1}. ${comp.name}: ${comp.website}`);
    });
    
    // Find Butcher Box and update URL
    const butcherBox = competitors.find(c => c.name === 'Butcher Box');
    if (butcherBox) {
      await prisma.competitor.update({
        where: { id: butcherBox.id },
        data: { website: 'https://www.butcherbox.com' }
      });
      console.log('✅ Updated Butcher Box URL');
    }
    
    // Find Good Ranchers and update URL
    const goodRanchers = competitors.find(c => c.name === 'Good Ranchers');
    if (goodRanchers) {
      await prisma.competitor.update({
        where: { id: goodRanchers.id },
        data: { website: 'https://www.goodranchers.com' }
      });
      console.log('✅ Updated Good Ranchers URL');
    }
    
    console.log('✅ Updated competitor URLs');
    
    const updated = await prisma.competitor.findMany({
      select: { name: true, website: true }
    });
    
    console.log('📊 Current competitors:');
    updated.forEach((comp, index) => {
      console.log(`   ${index + 1}. ${comp.name}: ${comp.website}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating competitors:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCompetitors(); 