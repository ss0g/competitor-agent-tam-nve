require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignAllCompetitorsToAllProjects() {
  console.log('🔍 Starting competitor assignment process...\n');
  
  try {
    // 1. Get all competitors
    const competitors = await prisma.competitor.findMany();
    console.log(`📊 Found ${competitors.length} competitors:`);
    competitors.forEach((comp, index) => {
      console.log(`  ${index + 1}. ${comp.name} (${comp.id})`);
    });
    console.log('');

    // 2. Get all projects
    const projects = await prisma.project.findMany({
      include: {
        competitors: true
      }
    });
    console.log(`📋 Found ${projects.length} projects:`);
    projects.forEach((proj, index) => {
      console.log(`  ${index + 1}. "${proj.name}" (${proj.id}) - Currently has ${proj.competitors.length} competitors`);
    });
    console.log('');

    if (competitors.length === 0) {
      console.log('❌ No competitors found. Cannot assign competitors to projects.');
      return;
    }

    if (projects.length === 0) {
      console.log('❌ No projects found. Cannot assign competitors to projects.');
      return;
    }

    // 3. For each project, assign all competitors
    let totalAssignments = 0;
    let updatedProjects = 0;

    for (const project of projects) {
      console.log(`🔗 Processing project: "${project.name}" (${project.id})`);
      
      // Get competitors already assigned to this project
      const existingCompetitorIds = project.competitors.map(comp => comp.id);
      
      // Find competitors that need to be added
      const competitorsToAdd = competitors.filter(comp => !existingCompetitorIds.includes(comp.id));
      
      if (competitorsToAdd.length === 0) {
        console.log(`  ✅ Already has all ${competitors.length} competitors assigned`);
        continue;
      }

      console.log(`  📝 Adding ${competitorsToAdd.length} new competitors...`);
      
      // Add all missing competitors to this project
      const updateResult = await prisma.project.update({
        where: { id: project.id },
        data: {
          competitors: {
            connect: competitorsToAdd.map(comp => ({ id: comp.id }))
          }
        },
        include: {
          competitors: true
        }
      });

      totalAssignments += competitorsToAdd.length;
      updatedProjects++;
      
      console.log(`  ✅ Successfully assigned ${competitorsToAdd.length} competitors. Total now: ${updateResult.competitors.length}`);
      
      // Log which competitors were added
      competitorsToAdd.forEach(comp => {
        console.log(`    + Added: ${comp.name}`);
      });
    }

    console.log('\n🎉 Assignment process completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Projects updated: ${updatedProjects}`);
    console.log(`  - Total new assignments: ${totalAssignments}`);
    console.log(`  - All projects now have all ${competitors.length} competitors assigned`);

    // 4. Verify the results by checking test060505 projects specifically
    console.log('\n🔍 Verifying test060505 projects:');
    const test060505Projects = await prisma.project.findMany({
      where: {
        name: {
          contains: 'test060505',
          mode: 'insensitive'
        }
      },
      include: {
        competitors: true
      }
    });

    test060505Projects.forEach((project, index) => {
      console.log(`  ${index + 1}. "${project.name}" (${project.id})`);
      console.log(`     Status: ${project.status}`);
      console.log(`     Competitors: ${project.competitors.length}`);
      if (project.competitors.length > 0) {
        project.competitors.forEach((comp, compIndex) => {
          console.log(`       ${compIndex + 1}. ${comp.name}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error during competitor assignment:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignAllCompetitorsToAllProjects(); 