require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProjects() {
  try {
    console.log('📋 Available Projects:');
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (ID: ${project.id})`);
      console.log(`   Created: ${project.createdAt}, Status: ${project.status}`);
    });

    console.log(`\nTotal projects: ${projects.length}`);
    
    console.log('\n📋 Available Competitors:');
    const competitors = await prisma.competitor.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    competitors.forEach((comp, index) => {
      console.log(`${index + 1}. ${comp.name} (ID: ${comp.id})`);
      console.log(`   Website: ${comp.website}, Created: ${comp.createdAt}`);
    });

    console.log(`\nTotal competitors: ${competitors.length}`);
    
    // Look for any projects with test060606 in name
    console.log('\n🔍 Searching for test060606 projects:');
    const test060606Projects = await prisma.project.findMany({
      where: {
        name: { contains: 'test060606', mode: 'insensitive' }
      },
      include: {
        competitors: true,
        reports: true
      }
    });
    
    console.log(`Found ${test060606Projects.length} test060606 projects:`);
    test060606Projects.forEach(project => {
      console.log(`- "${project.name}" (${project.id})`);
      console.log(`  Created: ${project.createdAt}`);
      console.log(`  Status: ${project.status}`);
      console.log(`  Competitors: ${project.competitors.length}`);
      console.log(`  Reports: ${project.reports.length}`);
    });

    // Check recent projects (last 30 minutes)
    console.log('\n⏰ Recent projects (last 30 minutes):');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentProjects = await prisma.project.findMany({
      where: {
        createdAt: { gte: thirtyMinutesAgo }
      },
      include: {
        competitors: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${recentProjects.length} recent projects:`);
    recentProjects.forEach(project => {
      console.log(`- "${project.name}" (${project.id})`);
      console.log(`  Created: ${project.createdAt}`);
      console.log(`  Competitors: ${project.competitors.length}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects(); 