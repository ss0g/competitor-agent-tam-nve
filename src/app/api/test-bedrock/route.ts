import { NextResponse } from 'next/server';
import { BedrockService } from '@/services/bedrock';

export async function GET() {
  try {
    // Test AWS Bedrock with Claude
    const bedrockService = new BedrockService({}, 'anthropic');
    
    const messages = [{
      role: 'user' as const,
      content: [{
        type: 'text' as const,
        text: 'Hello, are you working correctly via AWS Bedrock?'
      }]
    }];
    
    const response = await bedrockService.generateCompletion(messages);
    
    return NextResponse.json({ 
      success: true, 
      response,
      provider: 'AWS Bedrock - Claude',
      region: process.env.AWS_REGION 
    });
  } catch (error) {
    console.error('Error testing Bedrock service:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test Bedrock service',
        details: error instanceof Error ? error.message : 'Unknown error',
        provider: 'AWS Bedrock - Claude'
      },
      { status: 500 }
    );
  }
} 