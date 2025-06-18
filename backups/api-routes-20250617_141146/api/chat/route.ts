import { NextRequest, NextResponse } from 'next/server';
import { ConversationManager } from '@/lib/chat/conversation';

// In-memory storage for demo purposes - in production, use Redis or database
const conversations = new Map<string, ConversationManager>();

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Get or create conversation session
    const conversationId = sessionId || 'default';
    let conversation = conversations.get(conversationId);
    
    if (!conversation) {
      conversation = new ConversationManager();
      conversations.set(conversationId, conversation);
    }

    // Process the user message
    const response = await conversation.processUserMessage(message);

    // Return response with updated state
    return NextResponse.json({
      response: response.message,
      chatState: conversation.getChatState(),
      messages: conversation.getMessages(),
      sessionId: conversationId,
      isComplete: response.isComplete || false,
      projectCreated: response.projectCreated || false,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || 'default';

    const conversation = conversations.get(sessionId);
    
    if (!conversation) {
      return NextResponse.json({
        messages: [],
        chatState: {
          currentStep: null,
          stepDescription: 'Welcome',
          expectedInputType: 'text' as const,
        },
        sessionId,
      });
    }

    return NextResponse.json({
      messages: conversation.getMessages(),
      chatState: conversation.getChatState(),
      sessionId,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 