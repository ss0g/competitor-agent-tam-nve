import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      );
    }

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Construct file path (reports are stored in ./reports directory)
    const reportsDir = './reports';
    const filePath = join(reportsDir, filename);

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      
      // Return the markdown content with appropriate headers
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (fileError) {
      return NextResponse.json(
        { error: 'Report file not found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Report download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 