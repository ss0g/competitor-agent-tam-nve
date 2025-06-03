import { NextResponse } from 'next/server';
import { ClaudeService, createClaudeConfig } from '@/services/ai/claude';

export async function GET() {
  try {
    const config = createClaudeConfig(process.env.ANTHROPIC_API_KEY);
    const claudeService = new ClaudeService(config);
    
    const response = await claudeService.sendMessage('Hello, are you working correctly?');
    
    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Error testing Claude service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test Claude service' },
      { status: 500 }
    );
  }
} 