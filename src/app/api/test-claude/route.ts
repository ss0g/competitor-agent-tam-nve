import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check for required environment variables
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.' },
        { status: 500 }
      );
    }

    if (!process.env.AWS_REGION) {
      return NextResponse.json(
        { error: 'AWS region not configured. Please set AWS_REGION environment variable.' },
        { status: 500 }
      );
    }

    // Initialize Bedrock client
    const bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Create the command for Claude
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: '2023-06-01',
        max_tokens: 1000,
        temperature: 0.7,
        system: 'You are a helpful assistant. Respond clearly and concisely.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    // Call Claude via Bedrock
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return NextResponse.json({
      success: true,
      response: responseBody.content[0].text,
      model: 'anthropic.claude-3-sonnet-20240229-v1:0',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Claude test error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to connect to Claude via Bedrock';
    
    if (error instanceof Error) {
      if (error.message.includes('AccessDenied')) {
        errorMessage = 'Access denied. Please check your AWS credentials and permissions for Bedrock.';
      } else if (error.message.includes('ValidationException')) {
        errorMessage = 'Invalid request format. Please check your AWS configuration.';
      } else if (error.message.includes('ResourceNotFound')) {
        errorMessage = 'Claude model not available in your region. Please check Bedrock model availability.';
      } else {
        errorMessage = `Bedrock error: ${error.message}`;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Claude test endpoint. Send a POST request with a "prompt" field to test the integration.',
    example: {
      method: 'POST',
      body: {
        prompt: 'Hello, Claude! Can you confirm you are working?'
      }
    }
  });
} 