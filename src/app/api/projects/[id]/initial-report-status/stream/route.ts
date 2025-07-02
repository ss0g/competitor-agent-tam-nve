import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger, generateCorrelationId } from '@/lib/logger';
import { realTimeStatusService } from '@/services/realTimeStatusService';
import { createId } from '@paralleldrive/cuid2';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = generateCorrelationId();
  const { id: projectId } = await context.params;
  const connectionId = createId();
  
  const logContext = {
    operation: 'initialReportStatusSSE',
    projectId,
    connectionId,
    correlationId
  };

  try {
    logger.info('SSE connection request received', logContext);

    // 1. Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true }
    });

    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    // 2. Set up SSE response headers
    const responseHeaders = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // 3. Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        logger.info('SSE stream started', logContext);

        // Send initial connection message
        const initialMessage = `data: ${JSON.stringify({
          type: 'connection',
          projectId,
          connectionId,
          message: 'Connected to initial report status stream',
          timestamp: new Date().toISOString()
        })}\n\n`;
        
        controller.enqueue(new TextEncoder().encode(initialMessage));

        // Function to write data to the SSE stream
        const writeToClient = (data: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            logger.warn('Failed to write to SSE stream', {
              ...logContext,
              error: (error as Error).message
            });
            throw error; // Will be caught by realTimeStatusService
          }
        };

        // Register connection with real-time service
        realTimeStatusService.addConnection(projectId, connectionId, writeToClient);

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeatMessage = `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`;
            
            controller.enqueue(new TextEncoder().encode(heartbeatMessage));
          } catch (error) {
            logger.warn('Heartbeat failed, clearing interval', logContext);
            clearInterval(heartbeatInterval);
          }
        }, 30000);

        // Clean up on stream close
        request.signal.addEventListener('abort', () => {
          logger.info('SSE connection aborted by client', logContext);
          clearInterval(heartbeatInterval);
          realTimeStatusService.removeConnection(projectId, connectionId);
          controller.close();
        });

        // Also handle controller close
        const originalClose = controller.close.bind(controller);
        controller.close = () => {
          logger.info('SSE stream closed', logContext);
          clearInterval(heartbeatInterval);
          realTimeStatusService.removeConnection(projectId, connectionId);
          originalClose();
        };
      },

      cancel() {
        logger.info('SSE stream cancelled', logContext);
        realTimeStatusService.removeConnection(projectId, connectionId);
      }
    });

    return new Response(stream, {
      headers: responseHeaders,
    });

  } catch (error) {
    logger.error('Failed to establish SSE connection', error as Error, logContext);
    
    return new Response(
      `data: ${JSON.stringify({
        type: 'error',
        error: 'Failed to establish connection',
        timestamp: new Date().toISOString()
      })}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
} 