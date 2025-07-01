'use client';

import React from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useChat } from '@/hooks/useChat';

export default function ChatPage() {
  const { messages, chatState, isLoading, error, sendMessage, clearError } = useChat();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mx-6 mt-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={clearError}
                  className="bg-red-100 px-2 py-1 rounded-md text-xs font-medium text-red-800 hover:bg-red-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 min-h-0">
        <ChatInterface
          onSendMessage={sendMessage}
          messages={messages}
          isLoading={isLoading}
          chatState={chatState}
        />
      </div>
    </div>
  );
} 