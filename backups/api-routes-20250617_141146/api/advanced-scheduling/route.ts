/**
 * Advanced Scheduling Algorithms API
 * Phase 3.2: ML-based optimization and predictive scheduling endpoints
 * 
 * GET  /api/advanced-scheduling - Get optimization summary and insights
 * POST /api/advanced-scheduling - Generate optimized schedules or analyze patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import AdvancedSchedulingService from '../../../services/advancedSchedulingService';

// Generate correlation ID for request tracking
function generateCorrelationId(): string {
  return `adv-sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const advancedSchedulingService = new AdvancedSchedulingService();

/**
 * GET /api/advanced-scheduling
 * Get optimization summary, patterns, and predictive insights
 */
export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  console.log(`[${correlationId}] GET /api/advanced-scheduling`);
  
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'summary';
    
    switch (action) {
      case 'summary':
        // Get comprehensive optimization summary
        const summary = await advancedSchedulingService.getOptimizationSummary();
        
        return NextResponse.json({
          success: true,
          data: summary,
          correlationId
        });
        
      case 'patterns':
        // Get data change patterns analysis
        const patterns = await advancedSchedulingService.analyzeDataChangePatterns();
        
        return NextResponse.json({
          success: true,
          data: patterns,
          correlationId
        });
        
      case 'insights':
        // Get predictive insights
        const insights = await advancedSchedulingService.generatePredictiveInsights();
        
        return NextResponse.json({
          success: true,
          data: insights,
          correlationId
        });
        
      case 'schedules':
        // Get optimized schedules
        const schedules = await advancedSchedulingService.generateOptimizedSchedules();
        
        return NextResponse.json({
          success: true,
          data: schedules,
          correlationId
        });
        
      case 'load-balancing':
        // Get load balancing strategy
        const loadBalancing = await advancedSchedulingService.implementLoadBalancing();
        
        return NextResponse.json({
          success: true,
          data: loadBalancing,
          correlationId
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter',
          availableActions: ['summary', 'patterns', 'insights', 'schedules', 'load-balancing'],
          correlationId
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error(`[${correlationId}] Advanced scheduling GET failed:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get scheduling data',
      correlationId
    }, { status: 500 });
  }
}

/**
 * POST /api/advanced-scheduling
 * Generate optimized schedules or trigger pattern analysis
 */
export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  console.log(`[${correlationId}] POST /api/advanced-scheduling`);
  
  try {
    const body = await request.json();
    const { action, projectId, parameters } = body;
    
    switch (action) {
      case 'generateOptimizedSchedules':
        // Generate new optimized schedules
        const optimizedSchedules = await advancedSchedulingService.generateOptimizedSchedules();
        
        return NextResponse.json({
          success: true,
          data: optimizedSchedules,
          message: `Generated ${optimizedSchedules.length} optimized schedules`,
          correlationId
        });
        
      case 'analyzePatterns':
        // Analyze data change patterns
        const patterns = await advancedSchedulingService.analyzeDataChangePatterns();
        
        return NextResponse.json({
          success: true,
          data: patterns,
          message: `Analyzed patterns for ${patterns.length} entities`,
          correlationId
        });
        
      case 'generateInsights':
        // Generate predictive insights
        const insights = await advancedSchedulingService.generatePredictiveInsights();
        
        return NextResponse.json({
          success: true,
          data: insights,
          message: `Generated ${insights.length} predictive insights`,
          correlationId
        });
        
      case 'updateLoadBalancing':
        // Update load balancing strategy
        const loadBalancing = await advancedSchedulingService.implementLoadBalancing();
        
        return NextResponse.json({
          success: true,
          data: loadBalancing,
          message: 'Load balancing strategy updated',
          correlationId
        });
        
      case 'getOptimizationSummary':
        // Get comprehensive optimization summary
        const summary = await advancedSchedulingService.getOptimizationSummary();
        
        return NextResponse.json({
          success: true,
          data: summary,
          message: 'Optimization summary generated',
          correlationId
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter',
          availableActions: [
            'generateOptimizedSchedules',
            'analyzePatterns',
            'generateInsights',
            'updateLoadBalancing',
            'getOptimizationSummary'
          ],
          correlationId
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error(`[${correlationId}] Advanced scheduling POST failed:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Advanced scheduling action failed',
      correlationId
    }, { status: 500 });
  }
} 