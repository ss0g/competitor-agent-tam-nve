import React from 'react';
import { Message } from '@/types/chat';
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/outline';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Fix: Ensure timestamp is a Date object
  const getFormattedTime = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[90%] sm:max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-2 sm:ml-3' : 'mr-2 sm:mr-3'}`}>
          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-blue-600 text-white' 
              : isSystem 
                ? 'bg-gray-500 text-white'
                : 'bg-green-600 text-white'
          }`}>
            {isUser ? (
              <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <CpuChipIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : isSystem
              ? 'bg-gray-100 text-gray-800 border border-gray-200'
              : 'bg-white text-gray-800 border border-gray-200'
        }`}>
          <div className="whitespace-pre-wrap break-words text-sm sm:text-base">
            {message.content}
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs mt-1 sm:mt-2 ${
            isUser 
              ? 'text-blue-100' 
              : 'text-gray-500'
          }`}>
            {getFormattedTime(message.timestamp)}
            {message.metadata?.step && (
              <span className="ml-2 hidden sm:inline">
                • Step {message.metadata.step}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 