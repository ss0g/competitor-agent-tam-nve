import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/projectService';
import { logger, generateCorrelationId } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Default mock user for testing without authentication
const DEFAULT_USER_EMAIL = 'mock@example.com';

async function getOrCreateMockUser() {
  let mockUser = await prisma.user.findFirst({
    where: { email: DEFAULT_USER_EMAIL }
  });
  
  if (!mockUser) {
    mockUser = await prisma.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        name: 'Mock User'
      }
    });
  }
  return mockUser;
}

// GET /api/projects
export async function GET() {
  try {
    const correlationId = generateCorrelationId();
    const context = { operation: 'GET /api/projects', correlationId };

    logger.info('Fetching projects', context);

         // Get or create mock user for testing
     const mockUser = await getOrCreateMockUser();

     // Fetch projects for mock user
     const projects = await projectService.getProjectsByUserId(mockUser.id);

    logger.info('Projects fetched successfully', {
      ...context,
      projectCount: projects.length
    });

    return NextResponse.json(projects);

  } catch (error) {
    console.error('Error fetching projects:', error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching projects', errorObj);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const correlationId = generateCorrelationId();
    const context = { operation: 'POST /api/projects', correlationId };

    logger.info('Creating new project', context);

    const json = await request.json();

    // Validate required fields
    if (!json.name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

         // Get or create mock user for testing
     const mockUser = await getOrCreateMockUser();

     // Use projectService to create the project
     const projectData = {
       name: json.name,
       description: json.description,
       userId: mockUser.id,
       parameters: {
         productWebsite: json.productWebsite,
         productName: json.productName,
         frequency: json.frequency || 'weekly',
         reportTemplate: json.reportTemplate || 'comprehensive'
       }
     };

    const project = await projectService.createProject(projectData);

    logger.info('Project created successfully', {
      ...context,
      projectId: project.id,
      projectName: project.name
    });

    return NextResponse.json(project, { status: 201 });

  } catch (error) {
    console.error('Error creating project:', error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to create project', errorObj);
    
    return NextResponse.json({ 
      error: 'Failed to create project',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 